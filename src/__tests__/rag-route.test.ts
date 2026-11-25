import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/sandboxes/rag/route";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sandboxes/rag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/sandboxes/rag route handler", () => {
  it("GET returns corpus metadata, modes, and preset queries", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      corpusSize: number;
      modes: string[];
      presets: unknown[];
      documents: unknown[];
    };
    expect(data.corpusSize).toBe(10);
    expect(data.modes).toEqual(["hybrid_rerank", "dense", "bm25"]);
    expect(data.presets.length).toBeGreaterThanOrEqual(5);
    expect(data.documents).toHaveLength(10);
  });

  it("POST executes RAG pipeline for valid requests and respects mode & topK", async () => {
    const res = await POST(
      makePostRequest({
        query: "Got a fake CEO email asking for a wire transfer",
        mode: "hybrid_rerank",
        topK: 3,
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      mode: string;
      results: { doc: { id: string } }[];
      mcpDispatch: { priority: string; tool: string };
    };
    expect(data.mode).toBe("hybrid_rerank");
    expect(data.results).toHaveLength(3);
    expect(data.results[0]?.doc.id).toBe("KB-025");
    expect(data.mcpDispatch.priority).toBe("P1");
  });

  it("POST rejects empty, oversized, malformed, or invalid payloads with HTTP 400", async () => {
    const invalidBodies: unknown[] = [
      "{not-json",
      [],
      {},
      { query: "   " },
      { query: "a".repeat(301) },
      { query: "VPN drops", mode: "unknown_mode" },
      { query: "VPN drops", topK: "four" },
    ];

    for (const badBody of invalidBodies) {
      const res = await POST(makePostRequest(badBody));
      expect(res.status).toBe(400);
      const errData = (await res.json()) as { error?: string };
      expect(errData.error).toBeTruthy();
    }
  });
});
