import { NextResponse } from "next/server";
import {
  type CurrencyCode,
  type DocumentLayout,
  type InvoiceDocumentInput,
  KNOWN_POSTED_LEDGER,
  type LineItemInput,
  PRESET_DOCUMENTS,
  RULE_METADATA,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LAYOUTS,
  type TaxLineInput,
  evaluateDocumentPipeline,
  getPresetDocumentById,
  parseDecimalScaled,
} from "@/lib/docextract-engine";

interface DocExtractPostPayload {
  presetId?: unknown;
  document?: unknown;
  applyRepair?: unknown;
}

const CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);
const LAYOUT_SET = new Set<string>(SUPPORTED_LAYOUTS);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;
  const [yStr, mStr, dStr] = trimmed.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function validateBoundedString(
  value: unknown,
  field: string,
  minLen: number,
  maxLen: number,
): string | null {
  if (typeof value !== "string") {
    return `Field '${field}' must be a string.`;
  }
  const len = value.trim().length;
  if (len < minLen || len > maxLen) {
    return `Field '${field}' must be between ${minLen} and ${maxLen} characters.`;
  }
  return null;
}

function validateDecimalField(value: unknown, field: string): string | null {
  if (typeof value !== "string" || parseDecimalScaled(value) === null) {
    return `Field '${field}' must be a valid decimal string (up to 4 fractional digits).`;
  }
  return null;
}

function validateDocumentPayload(
  rawDoc: unknown,
): { ok: true; document: InvoiceDocumentInput } | { ok: false; error: string } {
  if (!isPlainObject(rawDoc)) {
    return { ok: false, error: "Field 'document' must be a JSON object." };
  }

  if (typeof rawDoc.currency !== "string" || !CURRENCY_SET.has(rawDoc.currency)) {
    return {
      ok: false,
      error: `Field 'currency' must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.`,
    };
  }

  if (typeof rawDoc.layout !== "string" || !LAYOUT_SET.has(rawDoc.layout)) {
    return {
      ok: false,
      error: `Field 'layout' must be one of: ${SUPPORTED_LAYOUTS.join(", ")}.`,
    };
  }

  const vendorErr = validateBoundedString(rawDoc.vendorName, "vendorName", 1, 120);
  if (vendorErr) return { ok: false, error: vendorErr };

  const invErr = validateBoundedString(rawDoc.invoiceNumber, "invoiceNumber", 1, 120);
  if (invErr) return { ok: false, error: invErr };

  if (!isValidIsoCalendarDate(rawDoc.issueDate)) {
    return { ok: false, error: "Field 'issueDate' must be a valid YYYY-MM-DD date." };
  }
  if (!isValidIsoCalendarDate(rawDoc.dueDate)) {
    return { ok: false, error: "Field 'dueDate' must be a valid YYYY-MM-DD date." };
  }

  const optionalStrings: Array<[unknown, string, number]> = [
    [rawDoc.id ?? "custom-doc", "id", 120],
    [rawDoc.label ?? "Custom Invoice", "label", 120],
    [rawDoc.filename ?? "custom-invoice.pdf", "filename", 120],
    [rawDoc.vendorTaxId ?? "", "vendorTaxId", 64],
    [rawDoc.vendorIban ?? "", "vendorIban", 64],
  ];
  for (const [val, fieldName, maxLen] of optionalStrings) {
    const err = validateBoundedString(val, fieldName, 0, maxLen);
    if (err) return { ok: false, error: err };
  }

  if (!Array.isArray(rawDoc.lineItems) || rawDoc.lineItems.length < 1 || rawDoc.lineItems.length > 12) {
    return { ok: false, error: "Field 'lineItems' must contain between 1 and 12 items." };
  }

  const validatedLineItems: LineItemInput[] = [];
  for (let i = 0; i < rawDoc.lineItems.length; i += 1) {
    const row = rawDoc.lineItems[i];
    if (!isPlainObject(row)) {
      return { ok: false, error: `lineItems[${i}] must be an object.` };
    }
    const descErr = validateBoundedString(row.description, `lineItems[${i}].description`, 1, 160);
    if (descErr) return { ok: false, error: descErr };

    for (const numKey of ["quantity", "unitPrice", "discount", "amount"] as const) {
      const numErr = validateDecimalField(row[numKey], `lineItems[${i}].${numKey}`);
      if (numErr) return { ok: false, error: numErr };
    }

    validatedLineItems.push({
      id: typeof row.id === "string" && row.id.trim().length > 0 ? row.id.trim().slice(0, 64) : `li-${i + 1}`,
      description: (row.description as string).trim(),
      quantity: (row.quantity as string).trim(),
      unitPrice: (row.unitPrice as string).trim(),
      discount: (row.discount as string).trim(),
      amount: (row.amount as string).trim(),
    });
  }

  if (!Array.isArray(rawDoc.taxLines) || rawDoc.taxLines.length > 4) {
    return { ok: false, error: "Field 'taxLines' must be an array with at most 4 rows." };
  }

  const validatedTaxLines: TaxLineInput[] = [];
  for (let i = 0; i < rawDoc.taxLines.length; i += 1) {
    const row = rawDoc.taxLines[i];
    if (!isPlainObject(row)) {
      return { ok: false, error: `taxLines[${i}] must be an object.` };
    }
    const nameErr = validateBoundedString(row.name, `taxLines[${i}].name`, 1, 80);
    if (nameErr) return { ok: false, error: nameErr };

    for (const numKey of ["rate", "taxableBase", "amount"] as const) {
      const numErr = validateDecimalField(row[numKey], `taxLines[${i}].${numKey}`);
      if (numErr) return { ok: false, error: numErr };
    }

    validatedTaxLines.push({
      name: (row.name as string).trim(),
      rate: (row.rate as string).trim(),
      taxableBase: (row.taxableBase as string).trim(),
      amount: (row.amount as string).trim(),
    });
  }

  for (const summaryKey of [
    "subtotal",
    "discountTotal",
    "taxTotal",
    "shippingTotal",
    "total",
  ] as const) {
    const err = validateDecimalField(rawDoc[summaryKey], summaryKey);
    if (err) return { ok: false, error: err };
  }

  return {
    ok: true,
    document: {
      id: typeof rawDoc.id === "string" ? rawDoc.id.trim() : "custom-doc",
      label: typeof rawDoc.label === "string" ? rawDoc.label.trim() : "Custom Invoice",
      filename: typeof rawDoc.filename === "string" ? rawDoc.filename.trim() : "custom-invoice.pdf",
      layout: rawDoc.layout as DocumentLayout,
      vendorName: (rawDoc.vendorName as string).trim(),
      vendorTaxId: typeof rawDoc.vendorTaxId === "string" ? rawDoc.vendorTaxId.trim() : "",
      vendorIban: typeof rawDoc.vendorIban === "string" ? rawDoc.vendorIban.trim() : "",
      invoiceNumber: (rawDoc.invoiceNumber as string).trim(),
      currency: rawDoc.currency as CurrencyCode,
      issueDate: rawDoc.issueDate.trim(),
      dueDate: rawDoc.dueDate.trim(),
      lineItems: validatedLineItems,
      taxLines: validatedTaxLines,
      subtotal: (rawDoc.subtotal as string).trim(),
      discountTotal: (rawDoc.discountTotal as string).trim(),
      taxTotal: (rawDoc.taxTotal as string).trim(),
      shippingTotal: (rawDoc.shippingTotal as string).trim(),
      total: (rawDoc.total as string).trim(),
    },
  };
}

/** Lists synthetic presets, posted ledger fixtures, validation rule metadata, and default evaluation. */
export async function GET(): Promise<NextResponse> {
  const defaultPreset = PRESET_DOCUMENTS[0];
  const defaultResult = defaultPreset
    ? evaluateDocumentPipeline(defaultPreset, { applyRepair: false })
    : null;

  return NextResponse.json(
    {
      presets: PRESET_DOCUMENTS,
      knownLedger: KNOWN_POSTED_LEDGER,
      rules: RULE_METADATA,
      defaultResult,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/** Validates an invoice/receipt preset or custom extracted document and optionally applies repair. */
export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isPlainObject(rawBody)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = rawBody as DocExtractPostPayload;
  if (payload.applyRepair !== undefined && typeof payload.applyRepair !== "boolean") {
    return NextResponse.json(
      { error: "Field 'applyRepair' must be a boolean." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const applyRepair = payload.applyRepair === true;

  let targetDoc: InvoiceDocumentInput | undefined;

  if (payload.document !== undefined) {
    const validated = validateDocumentPayload(payload.document);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    targetDoc = validated.document;
  } else if (typeof payload.presetId === "string") {
    targetDoc = getPresetDocumentById(payload.presetId.trim());
    if (!targetDoc) {
      return NextResponse.json(
        { error: `Unknown presetId '${payload.presetId}'.` },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
  } else {
    return NextResponse.json(
      { error: "Provide either 'presetId' or 'document' in the request body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = evaluateDocumentPipeline(targetDoc, { applyRepair });
  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
