import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/sandboxes/docextract/route";
import { getPresetDocumentById } from "@/lib/docextract-engine";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sandboxes/docextract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/sandboxes/docextract route handler", () => {
  it("GET returns presets, posted ledger fixtures, 7 validation rules, and default evaluation", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const data = (await res.json()) as {
      presets: unknown[];
      knownLedger: unknown[];
      rules: unknown[];
      defaultResult: { rulesPassed: number; totalRules: number } | null;
    };

    expect(data.presets).toHaveLength(4);
    expect(data.knownLedger).toHaveLength(3);
    expect(data.rules).toHaveLength(7);
    expect(data.defaultResult?.totalRules).toBe(7);
  });

  it("POST evaluates presetId with repair loop and validates edited custom documents", async () => {
    const repairRes = await POST(
      makePostRequest({
        presetId: "inv-subtotal-fault",
        applyRepair: true,
      }),
    );
    expect(repairRes.status).toBe(200);
    expect(repairRes.headers.get("Cache-Control")).toBe("no-store");

    const repairedData = (await repairRes.json()) as {
      postRepairErrorCount: number;
      rulesPassed: number;
      activeDocument: { subtotal: string; total: string };
    };
    expect(repairedData.postRepairErrorCount).toBe(0);
    expect(repairedData.rulesPassed).toBe(7);
    expect(repairedData.activeDocument.subtotal).toBe("1450.00");
    expect(repairedData.activeDocument.total).toBe("1569.63");

    const cleanReceipt = getPresetDocumentById("rcp-thermal-clean");
    expect(cleanReceipt).toBeDefined();
    if (!cleanReceipt) return;

    const customRes = await POST(
      makePostRequest({
        document: {
          ...cleanReceipt,
          vendorIban: "DE00 3704 0044 0532 0130 00",
        },
        applyRepair: false,
      }),
    );
    expect(customRes.status).toBe(200);
    const customData = (await customRes.json()) as {
      postRepairErrorCount: number;
      findings: { ruleId: string }[];
    };
    expect(customData.postRepairErrorCount).toBe(1);
    expect(customData.findings[0]?.ruleId).toBe("iban_mod97");
  });

  it("POST rejects malformed JSON, invalid dates, non-decimals, or unknown presets with HTTP 400", async () => {
    const cleanReceipt = getPresetDocumentById("rcp-thermal-clean");
    expect(cleanReceipt).toBeDefined();
    if (!cleanReceipt) return;

    const invalidPayloads: unknown[] = [
      "{bad-json",
      [],
      {},
      { presetId: "does-not-exist" },
      { presetId: "rcp-thermal-clean", applyRepair: "yes" },
      { document: { ...cleanReceipt, currency: "DOGE" } },
      { document: { ...cleanReceipt, subtotal: "not-a-number" } },
      { document: { ...cleanReceipt, issueDate: "2026-02-30" } },
      { document: { ...cleanReceipt, lineItems: [] } },
      { document: { ...cleanReceipt, vendorName: "   " } },
    ];

    for (const badBody of invalidPayloads) {
      const res = await POST(makePostRequest(badBody));
      expect(res.status).toBe(400);
      const errData = (await res.json()) as { error?: string };
      expect(errData.error).toBeTruthy();
    }
  });
});
