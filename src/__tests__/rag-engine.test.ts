import { describe, expect, it } from "vitest";
import {
  KB_CORPUS,
  PRESET_EVAL_QUERIES,
  runRagPipeline,
  scoreBm25,
  scoreDense,
  tokenize,
} from "@/lib/rag-engine";

const FORBIDDEN_TERMS = [
  "datinguinoo",
  "paul andrei",
  "batangas",
  "datinguinoopaulg",
  "+63",
  "cgi",
  "laguna",
  "national university",
  "microsoft student",
  "formcheck",
] as const;

describe("rag-engine", () => {
  it("contains zero personal identifying information or excluded background strings", () => {
    const serialized = JSON.stringify({ KB_CORPUS, PRESET_EVAL_QUERIES }).toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      expect(serialized).not.toContain(term);
    }
    expect(KB_CORPUS).toHaveLength(10);
  });

  it("tokenizes text and scores exact lexical overlap higher via Okapi BM25", () => {
    const tokens = tokenize("Cisco AnyConnect VPN disconnects timeout");
    expect(tokens).toContain("anyconnect");
    expect(tokens).not.toContain("and");

    const vpnDoc = KB_CORPUS.find((d) => d.id === "KB-001");
    const teamsDoc = KB_CORPUS.find((d) => d.id === "KB-011");
    expect(vpnDoc).toBeDefined();
    expect(teamsDoc).toBeDefined();

    if (!vpnDoc || !teamsDoc) return;
    const vpnScore = scoreBm25(tokens, vpnDoc);
    const teamsScore = scoreBm25(tokens, teamsDoc);
    expect(vpnScore.score).toBeGreaterThan(teamsScore.score);
    expect(vpnScore.matchedTerms).toContain("anyconnect");
  });

  it("resolves semantic paraphrase queries cleanly via dense cosine and hybrid reranking", () => {
    const cases: readonly { query: string; expectedId: string; expectedTool: string; expectedPriority: string }[] = [
      {
        query: "Dropped my phone in water and locked out of 2FA",
        expectedId: "KB-007",
        expectedTool: "issue_priority_ticket",
        expectedPriority: "P2",
      },
      {
        query: "Laptop shows blue screen asking for 48 digit encryption code",
        expectedId: "KB-016",
        expectedTool: "issue_priority_ticket",
        expectedPriority: "P2",
      },
      {
        query: "Got a fake CEO email asking for a wire transfer",
        expectedId: "KB-025",
        expectedTool: "escalate_security_incident",
        expectedPriority: "P1",
      },
      {
        query: "AnyConnect keeps dropping Teams calls every hour",
        expectedId: "KB-001",
        expectedTool: "attach_kb_runbook",
        expectedPriority: "P3",
      },
      {
        query: "Okta login keeps spinning in a redirect loop in Chrome",
        expectedId: "KB-028",
        expectedTool: "attach_kb_runbook",
        expectedPriority: "P3",
      },
    ];

    for (const c of cases) {
      const response = runRagPipeline(c.query, "hybrid_rerank", 4);
      expect(response.results[0]?.doc.id).toBe(c.expectedId);
      expect(response.citations).toContain(c.expectedId);
      expect(response.mcpDispatch.tool).toBe(c.expectedTool);
      expect(response.mcpDispatch.priority).toBe(c.expectedPriority);
      expect(response.results[0]?.rrfScore).toBeGreaterThan(0);
      expect(response.results[0]?.rrfScore).toBeLessThanOrEqual(2 / 61 + 1e-4);
    }
  });

  it("computes dense semantic scores in [0, 1] and handles stolen device P1 escalation", () => {
    const stolenDoc = KB_CORPUS.find((d) => d.id === "KB-023");
    expect(stolenDoc).toBeDefined();
    if (!stolenDoc) return;

    const score = scoreDense("My work laptop was stolen from a taxi at the airport", stolenDoc);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);

    const res = runRagPipeline("Laptop stolen at the airport need remote wipe", "dense", 3);
    expect(res.results).toHaveLength(3);
    expect(res.results[0]?.doc.id).toBe("KB-023");
    expect(res.mcpDispatch.priority).toBe("P1");
    expect(res.mcpDispatch.tool).toBe("escalate_security_incident");
  });
});
