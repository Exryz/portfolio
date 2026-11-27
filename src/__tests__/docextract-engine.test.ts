import { describe, expect, it } from "vitest";
import {
  KNOWN_POSTED_LEDGER,
  PRESET_DOCUMENTS,
  RULE_METADATA,
  computeRepairedIban,
  evaluateDocumentPipeline,
  formatMoney,
  getPresetDocumentById,
  parseDecimalScaled,
  validateIbanMod97,
  validateInvoiceDocument,
} from "@/lib/docextract-engine";

const FORBIDDEN_STRINGS = [
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

describe("docextract deterministic decimal & IBAN helpers", () => {
  it("contains zero personal identifying information or excluded terms in presets and ledger", () => {
    const serialized = JSON.stringify({
      PRESET_DOCUMENTS,
      KNOWN_POSTED_LEDGER,
      RULE_METADATA,
    }).toLowerCase();

    for (const term of FORBIDDEN_STRINGS) {
      expect(serialized).not.toContain(term);
    }
    expect(PRESET_DOCUMENTS).toHaveLength(4);
    expect(RULE_METADATA).toHaveLength(7);
  });

  it("performs exact BigInt decimal math without IEEE-754 float drift and supports JPY ROUND_HALF_UP", () => {
    const a = parseDecimalScaled("0.10");
    const b = parseDecimalScaled("0.20");
    const tax = parseDecimalScaled("119.625");
    const jpyHalf = parseDecimalScaled("1234.50");

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(tax).not.toBeNull();
    expect(jpyHalf).not.toBeNull();

    if (a !== null && b !== null && tax !== null && jpyHalf !== null) {
      expect(formatMoney(a + b, "USD")).toBe("0.30");
      expect(formatMoney(tax, "USD")).toBe("119.63");
      expect(formatMoney(jpyHalf, "JPY")).toBe("1235");
    }

    expect(parseDecimalScaled("12.34567")).toBeNull();
    expect(parseDecimalScaled("abc")).toBeNull();
  });

  it("validates ISO-7064 IBAN mod-97 checksums and restores valid check digits", () => {
    expect(validateIbanMod97("DE89 3704 0044 0532 0130 00").valid).toBe(true);

    const corrupted = validateIbanMod97("DE00 3704 0044 0532 0130 00");
    expect(corrupted.valid).toBe(false);
    expect(computeRepairedIban("DE00 3704 0044 0532 0130 00")).toBe(
      "DE89 3704 0044 0532 0130 00",
    );

    const shortDe = validateIbanMod97("DE8937040044");
    expect(shortDe.valid).toBe(false);
  });
});

describe("docextract 7-rule validator and repair loop", () => {
  it("passes 7/7 rules on clean thermal receipt preset", () => {
    const receipt = getPresetDocumentById("rcp-thermal-clean");
    expect(receipt).toBeDefined();
    if (!receipt) return;

    const result = evaluateDocumentPipeline(receipt, { applyRepair: false });
    expect(result.rulesPassed).toBe(7);
    expect(result.postRepairErrorCount).toBe(0);
    expect(result.reviewStatus).toBe("verified");
    expect(result.groundings.length).toBeGreaterThanOrEqual(8);
  });

  it("catches subtotal drift on Pass 1 and repairs subtotal + grand total to 7/7 verified", () => {
    const faulty = getPresetDocumentById("inv-subtotal-fault");
    expect(faulty).toBeDefined();
    if (!faulty) return;

    const pass1 = evaluateDocumentPipeline(faulty, { applyRepair: false });
    expect(pass1.preRepairErrorCount).toBe(1);
    expect(pass1.findings[0]?.ruleId).toBe("subtotal_math");

    const pass2 = evaluateDocumentPipeline(faulty, { applyRepair: true });
    expect(pass2.postRepairErrorCount).toBe(0);
    expect(pass2.rulesPassed).toBe(7);
    expect(pass2.reviewStatus).toBe("repaired");
    expect(pass2.activeDocument.subtotal).toBe("1450.00");
    expect(pass2.activeDocument.total).toBe("1569.63");
    expect(pass2.patchedFields.length).toBe(2);
  });

  it("catches multi-faults (line math, subtotal, due date order, IBAN) and repairs cleanly", () => {
    const multiFault = getPresetDocumentById("inv-iban-dates-fault");
    expect(multiFault).toBeDefined();
    if (!multiFault) return;

    const pass1 = evaluateDocumentPipeline(multiFault, { applyRepair: false });
    const ruleIds = new Set(pass1.findings.map((f) => f.ruleId));
    expect(ruleIds.has("line_item_math")).toBe(true);
    expect(ruleIds.has("subtotal_math")).toBe(true);
    expect(ruleIds.has("invoice_due_date_order")).toBe(true);
    expect(ruleIds.has("iban_mod97")).toBe(true);
    expect(pass1.preRepairErrorCount).toBe(4);

    const pass2 = evaluateDocumentPipeline(multiFault, { applyRepair: true });
    expect(pass2.postRepairErrorCount).toBe(0);
    expect(pass2.activeDocument.lineItems[0]?.amount).toBe("720.00");
    expect(pass2.activeDocument.dueDate).toBe("2026-04-17");
    expect(pass2.activeDocument.vendorIban).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("flags >35% tax rate plausibility warnings and refuses to silently alter duplicate invoices", () => {
    const dup = getPresetDocumentById("inv-duplicate-ledger");
    expect(dup).toBeDefined();
    if (!dup) return;

    const repairedDup = evaluateDocumentPipeline(dup, { applyRepair: true });
    expect(repairedDup.duplicateMatch?.docId).toBe("posted-0398");
    expect(repairedDup.postRepairErrorCount).toBe(1);
    expect(repairedDup.reviewStatus).toBe("needs_review");
    expect(repairedDup.activeDocument.invoiceNumber).toBe("INV-2026-0398");

    const receipt = getPresetDocumentById("rcp-thermal-clean");
    expect(receipt).toBeDefined();
    if (!receipt) return;

    const highTaxReport = validateInvoiceDocument({
      ...receipt,
      taxLines: [
        {
          name: "Luxury Tax",
          rate: "0.42",
          taxableBase: "34.50",
          amount: "14.49",
        },
      ],
      taxTotal: "14.49",
      total: "52.99",
    });
    expect(highTaxReport.warningCount).toBeGreaterThanOrEqual(1);
    expect(highTaxReport.findings.some((f) => f.code === "tax_rate_plausibility")).toBe(true);
  });
});
