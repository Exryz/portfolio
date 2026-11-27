export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "PHP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "SGD";

export type DocumentLayout =
  | "corporate_table"
  | "modern_sidebar"
  | "thermal_receipt";

export type RuleId =
  | "line_item_math"
  | "subtotal_math"
  | "tax_breakdown"
  | "grand_total_math"
  | "invoice_due_date_order"
  | "iban_mod97"
  | "duplicate_vendor_invoice";

export type RuleSeverity = "error" | "warning";
export type RuleStatus = "pass" | "warning" | "error";

export interface NormalizedBbox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface FieldGrounding {
  readonly fieldPath: string;
  readonly label: string;
  readonly extractedValue: string;
  readonly confidence: number;
  readonly bbox: NormalizedBbox;
}

export interface LineItemInput {
  readonly id: string;
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly amount: string;
}

export interface TaxLineInput {
  readonly name: string;
  readonly rate: string;
  readonly taxableBase: string;
  readonly amount: string;
}

export interface InvoiceDocumentInput {
  readonly id: string;
  readonly label: string;
  readonly filename: string;
  readonly layout: DocumentLayout;
  readonly vendorName: string;
  readonly vendorTaxId: string;
  readonly vendorIban: string;
  readonly invoiceNumber: string;
  readonly currency: CurrencyCode;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly lineItems: readonly LineItemInput[];
  readonly taxLines: readonly TaxLineInput[];
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxTotal: string;
  readonly shippingTotal: string;
  readonly total: string;
}

export interface PostedLedgerEntry {
  readonly docId: string;
  readonly vendorName: string;
  readonly invoiceNumber: string;
  readonly postedAt: string;
  readonly total: string;
  readonly currency: CurrencyCode;
}

export interface ValidationFinding {
  readonly ruleId: RuleId;
  readonly code: string;
  readonly severity: RuleSeverity;
  readonly fieldPath: string;
  readonly message: string;
  readonly expectedValue?: string;
  readonly actualValue?: string;
}

export interface RuleAuditRow {
  readonly ruleId: RuleId;
  readonly label: string;
  readonly description: string;
  readonly status: RuleStatus;
  readonly fieldPath: string;
  readonly message: string;
  readonly expectedValue?: string;
  readonly actualValue?: string;
}

export interface RepairPatchEntry {
  readonly fieldPath: string;
  readonly ruleId: RuleId;
  readonly before: string;
  readonly after: string;
  readonly reason: string;
}

export interface DocExtractEvaluationResult {
  readonly inputDocument: InvoiceDocumentInput;
  readonly activeDocument: InvoiceDocumentInput;
  readonly applyRepair: boolean;
  readonly preRepairErrorCount: number;
  readonly preRepairWarningCount: number;
  readonly postRepairErrorCount: number;
  readonly postRepairWarningCount: number;
  readonly rulesPassed: number;
  readonly totalRules: number;
  readonly confidence: number;
  readonly bboxCoverage: number;
  readonly reviewStatus: "verified" | "repaired" | "needs_review";
  readonly findings: readonly ValidationFinding[];
  readonly ruleAudit: readonly RuleAuditRow[];
  readonly groundings: readonly FieldGrounding[];
  readonly patchedFields: readonly RepairPatchEntry[];
  readonly duplicateMatch: PostedLedgerEntry | null;
  readonly telemetry: {
    readonly ocrMs: number;
    readonly extractMs: number;
    readonly validateMs: number;
    readonly repairMs: number;
    readonly totalMs: number;
  };
}

export interface RuleMetadataItem {
  readonly id: RuleId;
  readonly label: string;
  readonly description: string;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "PHP",
  "JPY",
  "CAD",
  "AUD",
  "SGD",
];

export const SUPPORTED_LAYOUTS: readonly DocumentLayout[] = [
  "corporate_table",
  "modern_sidebar",
  "thermal_receipt",
];

export const RULE_METADATA: readonly RuleMetadataItem[] = [
  {
    id: "line_item_math",
    label: "line_item_math",
    description: "(quantity × unit_price) − discount == line amount (±0.02)",
  },
  {
    id: "subtotal_math",
    label: "subtotal_math",
    description: "sum(line_items.amount) == subtotal (±0.02)",
  },
  {
    id: "tax_breakdown",
    label: "tax_breakdown",
    description: "taxable_base × rate == tax amount, sum == tax_total, rate ≤ 35%",
  },
  {
    id: "grand_total_math",
    label: "grand_total_math",
    description: "subtotal − discount + tax + shipping/tip == total (±0.02)",
  },
  {
    id: "invoice_due_date_order",
    label: "invoice_due_date_order",
    description: "due_date >= issue_date (ISO YYYY-MM-DD ordering)",
  },
  {
    id: "iban_mod97",
    label: "iban_mod97",
    description: "ISO-7064 mod-97 checksum & country BBAN length",
  },
  {
    id: "duplicate_vendor_invoice",
    label: "duplicate_vendor_invoice",
    description: "Normalized (vendor_name, invoice_number) uniqueness vs posted ledger",
  },
];

export const KNOWN_POSTED_LEDGER: readonly PostedLedgerEntry[] = [
  {
    docId: "posted-0398",
    vendorName: "Kestrel Cloud Systems GmbH",
    invoiceNumber: "INV-2026-0398",
    postedAt: "2026-02-14",
    total: "1840.00",
    currency: "USD",
  },
  {
    docId: "posted-0412",
    vendorName: "Nordic Compute AG",
    invoiceNumber: "INV-2026-0412",
    postedAt: "2026-03-02",
    total: "2650.00",
    currency: "EUR",
  },
  {
    docId: "posted-0774",
    vendorName: "Solstice Artisan Roasters",
    invoiceNumber: "RCP-2026-0774",
    postedAt: "2026-03-10",
    total: "28.60",
    currency: "USD",
  },
];

export const PRESET_DOCUMENTS: readonly InvoiceDocumentInput[] = [
  {
    id: "inv-subtotal-fault",
    label: "INV-2026-0419 · Subtotal Fault",
    filename: "INV-2026-0419.pdf",
    layout: "corporate_table",
    vendorName: "Kestrel Cloud Systems GmbH",
    vendorTaxId: "DE298451029",
    vendorIban: "DE89 3704 0044 0532 0130 00",
    invoiceNumber: "INV-2026-0419",
    currency: "USD",
    issueDate: "2026-03-12",
    dueDate: "2026-04-11",
    lineItems: [
      {
        id: "li-1",
        description: "GPU Inference Cluster (A10G hrs)",
        quantity: "10",
        unitPrice: "85.00",
        discount: "0.00",
        amount: "850.00",
      },
      {
        id: "li-2",
        description: "Vector Index Storage (2 TB NVMe)",
        quantity: "4",
        unitPrice: "95.00",
        discount: "0.00",
        amount: "380.00",
      },
      {
        id: "li-3",
        description: "Gateway SLA Support Retainer",
        quantity: "2",
        unitPrice: "110.00",
        discount: "0.00",
        amount: "220.00",
      },
    ],
    taxLines: [
      {
        name: "Compute VAT",
        rate: "0.0825",
        taxableBase: "1450.00",
        amount: "119.63",
      },
    ],
    subtotal: "1500.00",
    discountTotal: "0.00",
    taxTotal: "119.63",
    shippingTotal: "0.00",
    total: "1619.63",
  },
  {
    id: "inv-iban-dates-fault",
    label: "INV-2026-0524 · Multi-Fault",
    filename: "INV-2026-0524.pdf",
    layout: "modern_sidebar",
    vendorName: "Veridian Data Foundry AG",
    vendorTaxId: "DE314159265",
    vendorIban: "DE00 3704 0044 0532 0130 00",
    invoiceNumber: "INV-2026-0524",
    currency: "EUR",
    issueDate: "2026-03-18",
    dueDate: "2026-03-03",
    lineItems: [
      {
        id: "li-1",
        description: "OCR Batch Calibration Suite",
        quantity: "3",
        unitPrice: "240.00",
        discount: "0.00",
        amount: "745.00",
      },
      {
        id: "li-2",
        description: "Schema Audit Connector",
        quantity: "2",
        unitPrice: "180.00",
        discount: "0.00",
        amount: "360.00",
      },
    ],
    taxLines: [
      {
        name: "Standard VAT",
        rate: "0.19",
        taxableBase: "1080.00",
        amount: "205.20",
      },
    ],
    subtotal: "1080.00",
    discountTotal: "0.00",
    taxTotal: "205.20",
    shippingTotal: "0.00",
    total: "1285.20",
  },
  {
    id: "rcp-thermal-clean",
    label: "RCP-2026-0891 · Clean Receipt",
    filename: "RCP-2026-0891.png",
    layout: "thermal_receipt",
    vendorName: "Solstice Artisan Roasters",
    vendorTaxId: "US-94-3829104",
    vendorIban: "",
    invoiceNumber: "RCP-2026-0891",
    currency: "USD",
    issueDate: "2026-04-04",
    dueDate: "2026-04-04",
    lineItems: [
      {
        id: "li-1",
        description: "Single Origin Pour Over",
        quantity: "2",
        unitPrice: "6.50",
        discount: "0.00",
        amount: "13.00",
      },
      {
        id: "li-2",
        description: "Cardamom Morning Bun",
        quantity: "1",
        unitPrice: "5.25",
        discount: "0.00",
        amount: "5.25",
      },
      {
        id: "li-3",
        description: "Whole Bean Espresso 250g",
        quantity: "1",
        unitPrice: "16.25",
        discount: "0.00",
        amount: "16.25",
      },
    ],
    taxLines: [
      {
        name: "Sales Tax",
        rate: "0.08",
        taxableBase: "34.50",
        amount: "2.76",
      },
    ],
    subtotal: "34.50",
    discountTotal: "0.00",
    taxTotal: "2.76",
    shippingTotal: "4.00",
    total: "41.26",
  },
  {
    id: "inv-duplicate-ledger",
    label: "INV-2026-0398 · Duplicate",
    filename: "INV-2026-0398.pdf",
    layout: "corporate_table",
    vendorName: "Kestrel Cloud Systems GmbH",
    vendorTaxId: "DE298451029",
    vendorIban: "DE89 3704 0044 0532 0130 00",
    invoiceNumber: "INV-2026-0398",
    currency: "USD",
    issueDate: "2026-02-14",
    dueDate: "2026-03-16",
    lineItems: [
      {
        id: "li-1",
        description: "Managed Qdrant Cluster (Pro)",
        quantity: "4",
        unitPrice: "300.00",
        discount: "0.00",
        amount: "1200.00",
      },
      {
        id: "li-2",
        description: "Telemetry Ingestion Tier",
        quantity: "2",
        unitPrice: "200.00",
        discount: "0.00",
        amount: "400.00",
      },
    ],
    taxLines: [
      {
        name: "Platform VAT",
        rate: "0.15",
        taxableBase: "1600.00",
        amount: "240.00",
      },
    ],
    subtotal: "1600.00",
    discountTotal: "0.00",
    taxTotal: "240.00",
    shippingTotal: "0.00",
    total: "1840.00",
  },
];

// Scale factor 10^4 (4 fractional digits) keeps quantities, rates, and cents exact in BigInt.
const SCALE4 = 10_000n;
export const ROUNDING_TOLERANCE_SCALED4 = 200n; // 0.02 in scale 10^4

const IBAN_COUNTRY_LENGTHS: Readonly<Record<string, number>> = {
  DE: 22,
  GB: 22,
  FR: 27,
  NL: 18,
  ES: 24,
  IT: 27,
  AT: 20,
  BE: 16,
  CH: 21,
  IE: 22,
  PL: 28,
  SE: 24,
  NO: 15,
  DK: 18,
  FI: 18,
  PT: 25,
};

function divideRoundHalfUp(numerator: bigint, divisor: bigint): bigint {
  const negative = numerator < 0n !== divisor < 0n;
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDiv = divisor < 0n ? -divisor : divisor;
  const q = absNum / absDiv;
  const r = absNum % absDiv;
  const rounded = r * 2n >= absDiv ? q + 1n : q;
  return negative ? -rounded : rounded;
}

/**
 * Parses a strict decimal string (optional leading `-`, digits, optional `.` + up to 4 fractional digits)
 * into a 10^4-scaled BigInt so currency calculations never touch IEEE-754 floats.
 */
export function parseDecimalScaled(value: string): bigint | null {
  const trimmed = value.trim();
  const match = /^(-)?(\d+)(?:\.(\d{1,4}))?$/.exec(trimmed);
  if (!match) return null;

  const neg = Boolean(match[1]);
  const intPart = match[2] ?? "0";
  const fracPart = (match[3] ?? "").padEnd(4, "0");
  const absScaled = BigInt(intPart) * SCALE4 + BigInt(fracPart);
  return neg ? -absScaled : absScaled;
}

/** Quantizes a 10^4-scaled value using ROUND_HALF_UP to currency minor units (1 for JPY, 0.01 otherwise). */
export function quantizeHalfUp(scaled4: bigint, currency: CurrencyCode): bigint {
  if (currency === "JPY") {
    return divideRoundHalfUp(scaled4, SCALE4) * SCALE4;
  }
  return divideRoundHalfUp(scaled4, 100n) * 100n;
}

/** Formats a 10^4-scaled value into an exact currency string without float coercion. */
export function formatMoney(scaled4: bigint, currency: CurrencyCode): string {
  const q = quantizeHalfUp(scaled4, currency);
  const neg = q < 0n;
  const absQ = neg ? -q : q;
  const whole = absQ / SCALE4;
  if (currency === "JPY") {
    return `${neg ? "-" : ""}${whole.toString()}`;
  }
  const cents = (absQ % SCALE4) / 100n;
  return `${neg ? "-" : ""}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

export function multiplyScaled4(a: bigint, b: bigint): bigint {
  return divideRoundHalfUp(a * b, SCALE4);
}

function absDiff(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : b - a;
}

function ibanToDigits(alphanumeric: string): string {
  let digits = "";
  for (let i = 0; i < alphanumeric.length; i += 1) {
    const ch = alphanumeric[i];
    if (!ch) continue;
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      digits += ch;
    } else if (code >= 65 && code <= 90) {
      digits += String(code - 55);
    }
  }
  return digits;
}

export interface IbanValidationResult {
  readonly valid: boolean;
  readonly cleaned: string;
  readonly reason?: string;
}

/** Validates an IBAN using country length constraints and ISO-7064 mod-97-10. */
export function validateIbanMod97(iban: string): IbanValidationResult {
  const cleaned = iban.replace(/[\s-]+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      reason: "Invalid IBAN character format or missing 2-letter country + 2 check digits",
    };
  }

  const country = cleaned.slice(0, 2);
  const expectedLength = IBAN_COUNTRY_LENGTHS[country];
  if (expectedLength !== undefined && cleaned.length !== expectedLength) {
    return {
      valid: false,
      cleaned,
      reason: `${country} IBAN must be ${expectedLength} characters (got ${cleaned.length})`,
    };
  }

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = ibanToDigits(rearranged);
  const remainder = BigInt(numeric) % 97n;
  if (remainder !== 1n) {
    return {
      valid: false,
      cleaned,
      reason: `ISO-7064 mod-97 remainder is ${remainder.toString()} (expected 1)`,
    };
  }

  return { valid: true, cleaned };
}

/** Computes valid ISO-7064 check digits for an IBAN with intact country + BBAN and formats in groups of 4. */
export function computeRepairedIban(iban: string): string | null {
  const cleaned = iban.replace(/[\s-]+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return null;
  }
  const country = cleaned.slice(0, 2);
  const expectedLength = IBAN_COUNTRY_LENGTHS[country];
  if (expectedLength !== undefined && cleaned.length !== expectedLength) {
    return null;
  }

  const bban = cleaned.slice(4);
  const template = `${bban}${country}00`;
  const numeric = ibanToDigits(template);
  const check = 98n - (BigInt(numeric) % 97n);
  const checkStr = check.toString().padStart(2, "0");
  const repaired = `${country}${checkStr}${bban}`;
  return repaired.match(/.{1,4}/g)?.join(" ") ?? repaired;
}

function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function addDaysIso(isoDate: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  const y = dt.getUTCFullYear().toString().padStart(4, "0");
  const mo = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = dt.getUTCDate().toString().padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findPostedDuplicate(
  doc: InvoiceDocumentInput,
  ledger: readonly PostedLedgerEntry[] = KNOWN_POSTED_LEDGER,
): PostedLedgerEntry | null {
  const vKey = normalizeKey(doc.vendorName);
  const invKey = normalizeKey(doc.invoiceNumber);
  if (!vKey || !invKey) return null;

  return (
    ledger.find(
      (entry) =>
        normalizeKey(entry.vendorName) === vKey &&
        normalizeKey(entry.invoiceNumber) === invKey,
    ) ?? null
  );
}

export interface DocumentValidationReport {
  readonly findings: readonly ValidationFinding[];
  readonly ruleAudit: readonly RuleAuditRow[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly duplicateMatch: PostedLedgerEntry | null;
}

/** Runs all 7 deterministic rules matching docextract rules.py and queue duplicate guard. */
export function validateInvoiceDocument(
  doc: InvoiceDocumentInput,
  ledger: readonly PostedLedgerEntry[] = KNOWN_POSTED_LEDGER,
): DocumentValidationReport {
  const findings: ValidationFinding[] = [];
  const currency = doc.currency;

  // Rule 1: line_item_math
  let lineMathErrorField = "lineItems[0].amount";
  let lineMathMsg = `${doc.lineItems.length} line item(s) verified within ±0.02`;
  let lineMathExpected: string | undefined;
  let lineMathActual: string | undefined;
  let lineMathFailed = false;

  for (let i = 0; i < doc.lineItems.length; i += 1) {
    const item = doc.lineItems[i];
    if (!item) continue;
    const qty = parseDecimalScaled(item.quantity);
    const price = parseDecimalScaled(item.unitPrice);
    const disc = parseDecimalScaled(item.discount);
    const amt = parseDecimalScaled(item.amount);
    const fPath = `lineItems[${i}].amount`;

    if (qty === null || price === null || disc === null || amt === null) {
      findings.push({
        ruleId: "line_item_math",
        code: "line_item_parse_error",
        severity: "error",
        fieldPath: fPath,
        message: `Row ${i + 1} (${item.description || "line item"}) has invalid decimal formatting`,
      });
      if (!lineMathFailed) {
        lineMathFailed = true;
        lineMathErrorField = fPath;
        lineMathMsg = `Row ${i + 1} contains non-decimal values`;
      }
      continue;
    }

    const expected = quantizeHalfUp(multiplyScaled4(qty, price) - disc, currency);
    if (absDiff(expected, amt) > ROUNDING_TOLERANCE_SCALED4) {
      const expStr = formatMoney(expected, currency);
      const actStr = formatMoney(amt, currency);
      findings.push({
        ruleId: "line_item_math",
        code: "line_item_amount_mismatch",
        severity: "error",
        fieldPath: fPath,
        message: `Row ${i + 1}: ${item.quantity} × ${item.unitPrice} = ${expStr}, extracted ${actStr}`,
        expectedValue: expStr,
        actualValue: actStr,
      });
      if (!lineMathFailed) {
        lineMathFailed = true;
        lineMathErrorField = fPath;
        lineMathMsg = `Row ${i + 1} expected ${expStr}, got ${actStr}`;
        lineMathExpected = expStr;
        lineMathActual = actStr;
      }
    }
  }

  // Rule 2: subtotal_math
  let subtotalStatus: RuleStatus = "pass";
  let subtotalMsg = "sum(line_items.amount) matches subtotal";
  let subtotalExpected: string | undefined;
  let subtotalActual: string | undefined;

  let linesSum = 0n;
  let allLinesNumeric = true;
  for (let i = 0; i < doc.lineItems.length; i += 1) {
    const item = doc.lineItems[i];
    if (!item) continue;
    const amt = parseDecimalScaled(item.amount);
    if (amt === null) {
      allLinesNumeric = false;
      break;
    }
    linesSum += amt;
  }
  const parsedSubtotal = parseDecimalScaled(doc.subtotal);
  if (!allLinesNumeric || parsedSubtotal === null) {
    subtotalStatus = "error";
    subtotalMsg = "Cannot compare non-decimal line sum or subtotal";
    findings.push({
      ruleId: "subtotal_math",
      code: "subtotal_parse_error",
      severity: "error",
      fieldPath: "subtotal",
      message: subtotalMsg,
    });
  } else {
    const qLinesSum = quantizeHalfUp(linesSum, currency);
    if (absDiff(qLinesSum, parsedSubtotal) > ROUNDING_TOLERANCE_SCALED4) {
      const expStr = formatMoney(qLinesSum, currency);
      const actStr = formatMoney(parsedSubtotal, currency);
      subtotalStatus = "error";
      subtotalMsg = `sum(lines) is ${expStr}, extracted subtotal is ${actStr}`;
      subtotalExpected = expStr;
      subtotalActual = actStr;
      findings.push({
        ruleId: "subtotal_math",
        code: "subtotal_mismatch",
        severity: "error",
        fieldPath: "subtotal",
        message: subtotalMsg,
        expectedValue: expStr,
        actualValue: actStr,
      });
    } else {
      const formatted = formatMoney(parsedSubtotal, currency);
      subtotalExpected = formatted;
      subtotalActual = formatted;
      subtotalMsg = `sum(lines) == ${formatted} verified`;
    }
  }

  // Rule 3: tax_breakdown
  let taxStatus: RuleStatus = "pass";
  let taxMsg = "Tax lines and effective rate verified";
  let taxExpected: string | undefined;
  let taxActual: string | undefined;

  const parsedTaxTotal = parseDecimalScaled(doc.taxTotal);
  if (parsedTaxTotal === null) {
    taxStatus = "error";
    taxMsg = "tax_total is not a valid decimal";
    findings.push({
      ruleId: "tax_breakdown",
      code: "tax_parse_error",
      severity: "error",
      fieldPath: "taxTotal",
      message: taxMsg,
    });
  } else {
    let taxLinesSum = 0n;
    for (let i = 0; i < doc.taxLines.length; i += 1) {
      const tl = doc.taxLines[i];
      if (!tl) continue;
      const rate = parseDecimalScaled(tl.rate);
      const base = parseDecimalScaled(tl.taxableBase);
      const amt = parseDecimalScaled(tl.amount);
      if (rate === null || base === null || amt === null) {
        taxStatus = "error";
        taxMsg = `Tax line '${tl.name}' contains invalid decimal`;
        findings.push({
          ruleId: "tax_breakdown",
          code: "tax_line_parse_error",
          severity: "error",
          fieldPath: "taxTotal",
          message: taxMsg,
        });
        continue;
      }

      taxLinesSum += amt;
      const expectedLineTax = quantizeHalfUp(multiplyScaled4(base, rate), currency);
      if (absDiff(expectedLineTax, amt) > ROUNDING_TOLERANCE_SCALED4) {
        const expStr = formatMoney(expectedLineTax, currency);
        const actStr = formatMoney(amt, currency);
        taxStatus = "error";
        taxMsg = `${tl.name}: base × rate = ${expStr}, got ${actStr}`;
        taxExpected = expStr;
        taxActual = actStr;
        findings.push({
          ruleId: "tax_breakdown",
          code: "tax_line_math",
          severity: "error",
          fieldPath: "taxTotal",
          message: taxMsg,
          expectedValue: expStr,
          actualValue: actStr,
        });
      }

      if (rate > 3500n && taxStatus !== "error") {
        taxStatus = "warning";
        taxMsg = `Tax rate ${(Number(rate) / 100).toFixed(2)}% exceeds 35% threshold`;
        findings.push({
          ruleId: "tax_breakdown",
          code: "tax_rate_plausibility",
          severity: "warning",
          fieldPath: "taxTotal",
          message: taxMsg,
        });
      }
    }

    if (doc.taxLines.length > 0 && absDiff(quantizeHalfUp(taxLinesSum, currency), parsedTaxTotal) > ROUNDING_TOLERANCE_SCALED4) {
      const expStr = formatMoney(quantizeHalfUp(taxLinesSum, currency), currency);
      const actStr = formatMoney(parsedTaxTotal, currency);
      taxStatus = "error";
      taxMsg = `sum(tax_lines) is ${expStr}, extracted tax_total is ${actStr}`;
      taxExpected = expStr;
      taxActual = actStr;
      findings.push({
        ruleId: "tax_breakdown",
        code: "tax_total_math",
        severity: "error",
        fieldPath: "taxTotal",
        message: taxMsg,
        expectedValue: expStr,
        actualValue: actStr,
      });
    } else if (
      doc.taxLines.length === 0 &&
      parsedSubtotal !== null &&
      parsedSubtotal > 0n &&
      parsedTaxTotal * 100n > parsedSubtotal * 35n &&
      taxStatus === "pass"
    ) {
      taxStatus = "warning";
      taxMsg = "Effective tax ratio exceeds 35% plausibility cap";
      findings.push({
        ruleId: "tax_breakdown",
        code: "tax_rate_plausibility",
        severity: "warning",
        fieldPath: "taxTotal",
        message: taxMsg,
      });
    } else if (taxStatus === "pass") {
      const fmt = formatMoney(parsedTaxTotal, currency);
      taxExpected = fmt;
      taxActual = fmt;
      taxMsg = `tax_total ${fmt} verified within rate & rounding limits`;
    }
  }

  // Rule 4: grand_total_math
  let totalStatus: RuleStatus = "pass";
  let totalMsg = "subtotal − discount + tax + shipping == total";
  let totalExpected: string | undefined;
  let totalActual: string | undefined;

  const parsedDiscTotal = parseDecimalScaled(doc.discountTotal);
  const parsedShipTotal = parseDecimalScaled(doc.shippingTotal);
  const parsedGrandTotal = parseDecimalScaled(doc.total);
  if (
    parsedSubtotal === null ||
    parsedDiscTotal === null ||
    parsedTaxTotal === null ||
    parsedShipTotal === null ||
    parsedGrandTotal === null
  ) {
    totalStatus = "error";
    totalMsg = "Cannot verify grand total due to non-decimal summary field";
    findings.push({
      ruleId: "grand_total_math",
      code: "grand_total_parse_error",
      severity: "error",
      fieldPath: "total",
      message: totalMsg,
    });
  } else {
    const expectedTotal = quantizeHalfUp(
      parsedSubtotal - parsedDiscTotal + parsedTaxTotal + parsedShipTotal,
      currency,
    );
    if (absDiff(expectedTotal, parsedGrandTotal) > ROUNDING_TOLERANCE_SCALED4) {
      const expStr = formatMoney(expectedTotal, currency);
      const actStr = formatMoney(parsedGrandTotal, currency);
      totalStatus = "error";
      totalMsg = `Expected grand total ${expStr}, extracted ${actStr}`;
      totalExpected = expStr;
      totalActual = actStr;
      findings.push({
        ruleId: "grand_total_math",
        code: "grand_total_mismatch",
        severity: "error",
        fieldPath: "total",
        message: totalMsg,
        expectedValue: expStr,
        actualValue: actStr,
      });
    } else {
      const fmt = formatMoney(parsedGrandTotal, currency);
      totalExpected = fmt;
      totalActual = fmt;
      totalMsg = `Grand total ${fmt} reconciles`;
    }
  }

  // Rule 5: invoice_due_date_order
  let dateStatus: RuleStatus = "pass";
  let dateMsg = `dueDate (${doc.dueDate}) >= issueDate (${doc.issueDate})`;
  let dateExpected: string | undefined = `>= ${doc.issueDate}`;
  let dateActual: string | undefined = doc.dueDate;

  if (!isValidIsoDate(doc.issueDate) || !isValidIsoDate(doc.dueDate)) {
    dateStatus = "error";
    dateMsg = "Dates must use valid ISO YYYY-MM-DD calendar format";
    findings.push({
      ruleId: "invoice_due_date_order",
      code: "invalid_date_format",
      severity: "error",
      fieldPath: "dueDate",
      message: dateMsg,
    });
  } else if (doc.dueDate < doc.issueDate) {
    dateStatus = "error";
    dateMsg = `due_date (${doc.dueDate}) precedes issue_date (${doc.issueDate})`;
    findings.push({
      ruleId: "invoice_due_date_order",
      code: "due_date_before_issue",
      severity: "error",
      fieldPath: "dueDate",
      message: dateMsg,
      expectedValue: `>= ${doc.issueDate}`,
      actualValue: doc.dueDate,
    });
  } else if (doc.issueDate < "2000-01-01" || doc.dueDate > "2027-01-07") {
    dateStatus = "warning";
    dateMsg = "Date lies outside nominal [2000-01-01 .. 2027-01-07] range";
    findings.push({
      ruleId: "invoice_due_date_order",
      code: "date_range_sanity",
      severity: "warning",
      fieldPath: "dueDate",
      message: dateMsg,
    });
  } else {
    dateExpected = `>= ${doc.issueDate}`;
    dateActual = doc.dueDate;
  }

  // Rule 6: iban_mod97
  let ibanStatus: RuleStatus = "pass";
  let ibanMsg = "No IBAN on document (retail receipt / wire omitted)";
  let ibanExpected: string | undefined;
  let ibanActual: string | undefined;

  if (doc.vendorIban.trim().length > 0) {
    const ibanCheck = validateIbanMod97(doc.vendorIban);
    ibanActual = ibanCheck.cleaned || doc.vendorIban.trim();
    if (!ibanCheck.valid) {
      ibanStatus = "error";
      ibanMsg = ibanCheck.reason ?? "IBAN failed ISO-7064 mod-97 check";
      const repairedPreview = computeRepairedIban(doc.vendorIban);
      if (repairedPreview) {
        ibanExpected = repairedPreview;
      }
      findings.push({
        ruleId: "iban_mod97",
        code: "iban_checksum",
        severity: "error",
        fieldPath: "vendorIban",
        message: ibanMsg,
        expectedValue: repairedPreview ?? "mod-97 == 1",
        actualValue: doc.vendorIban.trim(),
      });
    } else {
      ibanExpected = "mod-97 == 1";
      ibanActual = "mod-97 == 1";
      ibanMsg = `${ibanCheck.cleaned.slice(0, 4)}···${ibanCheck.cleaned.slice(-4)} passed ISO-7064 mod-97`;
    }
  }

  // Rule 7: duplicate_vendor_invoice
  const duplicateMatch = findPostedDuplicate(doc, ledger);
  let dupStatus: RuleStatus = "pass";
  let dupMsg = `Unique (${doc.vendorName}, ${doc.invoiceNumber}) against posted ledger`;
  let dupExpected: string | undefined;
  let dupActual: string | undefined;

  if (duplicateMatch) {
    dupStatus = "error";
    dupMsg = `Collides with ${duplicateMatch.docId} posted on ${duplicateMatch.postedAt}`;
    dupExpected = "unique vendor + invoice";
    dupActual = duplicateMatch.invoiceNumber;
    findings.push({
      ruleId: "duplicate_vendor_invoice",
      code: "duplicate_vendor_invoice",
      severity: "error",
      fieldPath: "invoiceNumber",
      message: dupMsg,
      expectedValue: "Unique invoice number",
      actualValue: duplicateMatch.docId,
    });
  }

  const ruleAudit: RuleAuditRow[] = [
    {
      ruleId: "line_item_math",
      label: "line_item_math",
      description: RULE_METADATA[0]?.description ?? "",
      status: lineMathFailed ? "error" : "pass",
      fieldPath: lineMathErrorField,
      message: lineMathMsg,
      expectedValue: lineMathExpected,
      actualValue: lineMathActual,
    },
    {
      ruleId: "subtotal_math",
      label: "subtotal_math",
      description: RULE_METADATA[1]?.description ?? "",
      status: subtotalStatus,
      fieldPath: "subtotal",
      message: subtotalMsg,
      expectedValue: subtotalExpected,
      actualValue: subtotalActual,
    },
    {
      ruleId: "tax_breakdown",
      label: "tax_breakdown",
      description: RULE_METADATA[2]?.description ?? "",
      status: taxStatus,
      fieldPath: "taxTotal",
      message: taxMsg,
      expectedValue: taxExpected,
      actualValue: taxActual,
    },
    {
      ruleId: "grand_total_math",
      label: "grand_total_math",
      description: RULE_METADATA[3]?.description ?? "",
      status: totalStatus,
      fieldPath: "total",
      message: totalMsg,
      expectedValue: totalExpected,
      actualValue: totalActual,
    },
    {
      ruleId: "invoice_due_date_order",
      label: "invoice_due_date_order",
      description: RULE_METADATA[4]?.description ?? "",
      status: dateStatus,
      fieldPath: "dueDate",
      message: dateMsg,
      expectedValue: dateExpected,
      actualValue: dateActual,
    },
    {
      ruleId: "iban_mod97",
      label: "iban_mod97",
      description: RULE_METADATA[5]?.description ?? "",
      status: ibanStatus,
      fieldPath: "vendorIban",
      message: ibanMsg,
      expectedValue: ibanExpected,
      actualValue: ibanActual,
    },
    {
      ruleId: "duplicate_vendor_invoice",
      label: "duplicate_vendor_invoice",
      description: RULE_METADATA[6]?.description ?? "",
      status: dupStatus,
      fieldPath: "invoiceNumber",
      message: dupMsg,
      expectedValue: dupExpected,
      actualValue: dupActual,
    },
  ];

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return {
    findings,
    ruleAudit,
    errorCount,
    warningCount,
    duplicateMatch,
  };
}

/**
 * Generates normalized [0, 1] bounding boxes aligned with the 600x720 SVG preview geometry.
 */
export function buildFieldGroundings(doc: InvoiceDocumentInput): readonly FieldGrounding[] {
  const groundings: FieldGrounding[] = [
    {
      fieldPath: "vendorName",
      label: "Vendor / Issuer",
      extractedValue: doc.vendorName,
      confidence: 0.996,
      bbox: { x0: 0.06, y0: 0.075, x1: 0.56, y1: 0.14 },
    },
    {
      fieldPath: "invoiceNumber",
      label: "Document ID",
      extractedValue: doc.invoiceNumber,
      confidence: 0.998,
      bbox: { x0: 0.6, y0: 0.075, x1: 0.94, y1: 0.14 },
    },
    {
      fieldPath: "issueDate",
      label: "Issue Date",
      extractedValue: doc.issueDate,
      confidence: 0.994,
      bbox: { x0: 0.06, y0: 0.17, x1: 0.34, y1: 0.23 },
    },
    {
      fieldPath: "dueDate",
      label: "Due Date",
      extractedValue: doc.dueDate,
      confidence: 0.989,
      bbox: { x0: 0.36, y0: 0.17, x1: 0.64, y1: 0.23 },
    },
  ];

  if (doc.vendorIban.trim().length > 0) {
    groundings.push({
      fieldPath: "vendorIban",
      label: "Settlement IBAN",
      extractedValue: doc.vendorIban,
      confidence: validateIbanMod97(doc.vendorIban).valid ? 0.995 : 0.842,
      bbox: { x0: 0.06, y0: 0.245, x1: 0.94, y1: 0.3 },
    });
  }

  const maxVisibleRows = Math.min(doc.lineItems.length, 4);
  for (let i = 0; i < maxVisibleRows; i += 1) {
    const item = doc.lineItems[i];
    if (!item) continue;
    const y0 = Number((0.365 + i * 0.064).toFixed(4));
    const y1 = Number((y0 + 0.056).toFixed(4));
    groundings.push({
      fieldPath: `lineItems[${i}].amount`,
      label: `Line ${i + 1} Amount`,
      extractedValue: `${item.quantity} × ${item.unitPrice} = ${item.amount}`,
      confidence: 0.992,
      bbox: { x0: 0.06, y0, x1: 0.94, y1 },
    });
  }

  groundings.push(
    {
      fieldPath: "subtotal",
      label: "Subtotal",
      extractedValue: doc.subtotal,
      confidence: 0.988,
      bbox: { x0: 0.54, y0: 0.635, x1: 0.94, y1: 0.688 },
    },
    {
      fieldPath: "taxTotal",
      label: "Tax Total",
      extractedValue: doc.taxTotal,
      confidence: 0.991,
      bbox: { x0: 0.54, y0: 0.698, x1: 0.94, y1: 0.751 },
    },
    {
      fieldPath: "shippingTotal",
      label: doc.layout === "thermal_receipt" ? "Tip / Service" : "Shipping",
      extractedValue: doc.shippingTotal,
      confidence: 0.99,
      bbox: { x0: 0.54, y0: 0.761, x1: 0.94, y1: 0.814 },
    },
    {
      fieldPath: "total",
      label: "Grand Total",
      extractedValue: doc.total,
      confidence: 0.995,
      bbox: { x0: 0.54, y0: 0.83, x1: 0.94, y1: 0.896 },
    },
  );

  return groundings;
}

export interface RepairOutcome {
  readonly repairedDocument: InvoiceDocumentInput;
  readonly patches: readonly RepairPatchEntry[];
}

/**
 * Runs docextract's deterministic financial/checksum repair pass.
 * Intentionally refuses to rewrite invoiceNumber on duplicate_vendor_invoice collisions.
 */
export function repairInvoiceDocument(doc: InvoiceDocumentInput): RepairOutcome {
  const patches: RepairPatchEntry[] = [];
  const currency = doc.currency;

  const nextItems: LineItemInput[] = doc.lineItems.map((item, idx) => {
    const qty = parseDecimalScaled(item.quantity);
    const price = parseDecimalScaled(item.unitPrice);
    const disc = parseDecimalScaled(item.discount);
    const amt = parseDecimalScaled(item.amount);
    if (qty === null || price === null || disc === null || amt === null) {
      return item;
    }
    const expected = quantizeHalfUp(multiplyScaled4(qty, price) - disc, currency);
    if (absDiff(expected, amt) > ROUNDING_TOLERANCE_SCALED4) {
      const fixedAmount = formatMoney(expected, currency);
      patches.push({
        fieldPath: `lineItems[${idx}].amount`,
        ruleId: "line_item_math",
        before: item.amount,
        after: fixedAmount,
        reason: `Recomputed (${item.quantity} × ${item.unitPrice}) − ${item.discount}`,
      });
      return { ...item, amount: fixedAmount };
    }
    return item;
  });

  // Compute exact subtotal from repaired line items
  let lineSum = 0n;
  let allNumeric = true;
  for (let i = 0; i < nextItems.length; i += 1) {
    const item = nextItems[i];
    if (!item) continue;
    const amt = parseDecimalScaled(item.amount);
    if (amt === null) {
      allNumeric = false;
      break;
    }
    lineSum += amt;
  }

  let nextSubtotal = doc.subtotal;
  const oldSubtotalScaled = parseDecimalScaled(doc.subtotal);
  const repairedSubtotalScaled = allNumeric ? quantizeHalfUp(lineSum, currency) : oldSubtotalScaled;

  if (
    allNumeric &&
    repairedSubtotalScaled !== null &&
    (oldSubtotalScaled === null ||
      absDiff(repairedSubtotalScaled, oldSubtotalScaled) > ROUNDING_TOLERANCE_SCALED4)
  ) {
    const fixedSub = formatMoney(repairedSubtotalScaled, currency);
    patches.push({
      fieldPath: "subtotal",
      ruleId: "subtotal_math",
      before: doc.subtotal,
      after: fixedSub,
      reason: "Aligned subtotal to sum of verified line_item.amount values",
    });
    nextSubtotal = fixedSub;
  }

  // Repair tax lines if taxableBase matched old wrong subtotal or line math drifted
  let taxSum = 0n;
  let taxLinesValid = true;
  const nextTaxLines: TaxLineInput[] = doc.taxLines.map((tl) => {
    const rate = parseDecimalScaled(tl.rate);
    const oldBase = parseDecimalScaled(tl.taxableBase);
    const amt = parseDecimalScaled(tl.amount);
    if (rate === null || oldBase === null || amt === null) {
      taxLinesValid = false;
      return tl;
    }
    const base =
      doc.taxLines.length === 1 &&
      oldSubtotalScaled !== null &&
      repairedSubtotalScaled !== null &&
      absDiff(oldBase, oldSubtotalScaled) <= ROUNDING_TOLERANCE_SCALED4
        ? repairedSubtotalScaled
        : oldBase;
    const expectedTaxAmt = quantizeHalfUp(multiplyScaled4(base, rate), currency);
    if (absDiff(expectedTaxAmt, amt) > ROUNDING_TOLERANCE_SCALED4) {
      const fixedTax = formatMoney(expectedTaxAmt, currency);
      taxSum += expectedTaxAmt;
      return {
        ...tl,
        taxableBase: formatMoney(base, currency),
        amount: fixedTax,
      };
    }
    taxSum += amt;
    return { ...tl, taxableBase: formatMoney(base, currency) };
  });

  let nextTaxTotal = doc.taxTotal;
  const oldTaxTotalScaled = parseDecimalScaled(doc.taxTotal);
  if (nextTaxLines.length > 0 && taxLinesValid) {
    const qTaxSum = quantizeHalfUp(taxSum, currency);
    if (
      oldTaxTotalScaled === null ||
      absDiff(qTaxSum, oldTaxTotalScaled) > ROUNDING_TOLERANCE_SCALED4
    ) {
      const fixedTaxTotal = formatMoney(qTaxSum, currency);
      patches.push({
        fieldPath: "taxTotal",
        ruleId: "tax_breakdown",
        before: doc.taxTotal,
        after: fixedTaxTotal,
        reason: "Recomputed tax_total from taxable_base × rate",
      });
      nextTaxTotal = fixedTaxTotal;
    }
  }

  // Repair grand total
  let nextTotal = doc.total;
  const finalSub = parseDecimalScaled(nextSubtotal);
  const finalDisc = parseDecimalScaled(doc.discountTotal);
  const finalTax = parseDecimalScaled(nextTaxTotal);
  const finalShip = parseDecimalScaled(doc.shippingTotal);
  const oldTotal = parseDecimalScaled(doc.total);
  if (
    finalSub !== null &&
    finalDisc !== null &&
    finalTax !== null &&
    finalShip !== null
  ) {
    const expectedGrand = quantizeHalfUp(finalSub - finalDisc + finalTax + finalShip, currency);
    if (oldTotal === null || absDiff(expectedGrand, oldTotal) > ROUNDING_TOLERANCE_SCALED4) {
      const fixedTotal = formatMoney(expectedGrand, currency);
      patches.push({
        fieldPath: "total",
        ruleId: "grand_total_math",
        before: doc.total,
        after: fixedTotal,
        reason: "Recomputed subtotal − discount + tax + shipping/tip",
      });
      nextTotal = fixedTotal;
    }
  }

  // Repair inverted dueDate
  let nextDueDate = doc.dueDate;
  if (isValidIsoDate(doc.issueDate) && (!isValidIsoDate(doc.dueDate) || doc.dueDate < doc.issueDate)) {
    const fixedDue = addDaysIso(doc.issueDate, 30);
    patches.push({
      fieldPath: "dueDate",
      ruleId: "invoice_due_date_order",
      before: doc.dueDate,
      after: fixedDue,
      reason: "Set dueDate to issueDate + 30 days to resolve inverted date order",
    });
    nextDueDate = fixedDue;
  }

  // Repair invalid IBAN check digits if country + BBAN lengths are intact
  let nextIban = doc.vendorIban;
  if (doc.vendorIban.trim().length > 0 && !validateIbanMod97(doc.vendorIban).valid) {
    const repairedIban = computeRepairedIban(doc.vendorIban);
    if (repairedIban) {
      patches.push({
        fieldPath: "vendorIban",
        ruleId: "iban_mod97",
        before: doc.vendorIban,
        after: repairedIban,
        reason: "Restored ISO-7064 mod-97 check digits while preserving bank BBAN",
      });
      nextIban = repairedIban;
    }
  }

  return {
    repairedDocument: {
      ...doc,
      lineItems: nextItems,
      taxLines: nextTaxLines,
      subtotal: nextSubtotal,
      taxTotal: nextTaxTotal,
      total: nextTotal,
      dueDate: nextDueDate,
      vendorIban: nextIban,
    },
    patches,
  };
}

export interface EvaluateOptions {
  readonly applyRepair?: boolean;
  readonly ledger?: readonly PostedLedgerEntry[];
}

/** Runs end-to-end validation, optional deterministic repair pass, bbox grounding, and telemetry scoring. */
export function evaluateDocumentPipeline(
  inputDoc: InvoiceDocumentInput,
  options: EvaluateOptions = {},
): DocExtractEvaluationResult {
  const applyRepair = Boolean(options.applyRepair);
  const ledger = options.ledger ?? KNOWN_POSTED_LEDGER;

  const preValidation = validateInvoiceDocument(inputDoc, ledger);
  const repairOutcome = applyRepair
    ? repairInvoiceDocument(inputDoc)
    : { repairedDocument: inputDoc, patches: [] };

  const activeDocument = repairOutcome.repairedDocument;
  const postValidation = applyRepair
    ? validateInvoiceDocument(activeDocument, ledger)
    : preValidation;

  const groundings = buildFieldGroundings(activeDocument);
  const totalRules = RULE_METADATA.length;
  const rulesPassed = postValidation.ruleAudit.filter((r) => r.status === "pass").length;

  const penalty =
    postValidation.errorCount * 0.068 + postValidation.warningCount * 0.015;
  const confidence = Number(Math.max(0.5, 0.991 - penalty).toFixed(3));
  const bboxCoverage = groundings.length > 0 ? 0.991 : 0;

  let reviewStatus: "verified" | "repaired" | "needs_review" = "verified";
  if (postValidation.errorCount > 0) {
    reviewStatus = "needs_review";
  } else if (applyRepair && repairOutcome.patches.length > 0) {
    reviewStatus = "repaired";
  }

  const ocrMs = Number((18.4 + activeDocument.lineItems.length * 2.1).toFixed(1));
  const extractMs = Number((26.2 + activeDocument.vendorName.length * 0.3).toFixed(1));
  const validateMs = Number((2.8 + postValidation.ruleAudit.length * 0.2).toFixed(1));
  const repairMs = applyRepair
    ? Number((4.2 + repairOutcome.patches.length * 3.1).toFixed(1))
    : 0.0;
  const totalMs = Number((ocrMs + extractMs + validateMs + repairMs).toFixed(1));

  return {
    inputDocument: inputDoc,
    activeDocument,
    applyRepair,
    preRepairErrorCount: preValidation.errorCount,
    preRepairWarningCount: preValidation.warningCount,
    postRepairErrorCount: postValidation.errorCount,
    postRepairWarningCount: postValidation.warningCount,
    rulesPassed,
    totalRules,
    confidence,
    bboxCoverage,
    reviewStatus,
    findings: postValidation.findings,
    ruleAudit: postValidation.ruleAudit,
    groundings,
    patchedFields: repairOutcome.patches,
    duplicateMatch: postValidation.duplicateMatch,
    telemetry: {
      ocrMs,
      extractMs,
      validateMs,
      repairMs,
      totalMs,
    },
  };
}

export function getPresetDocumentById(id: string): InvoiceDocumentInput | undefined {
  return PRESET_DOCUMENTS.find((preset) => preset.id === id);
}
