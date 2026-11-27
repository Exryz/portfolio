"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  type DocExtractEvaluationResult,
  type FieldGrounding,
  type InvoiceDocumentInput,
  type RuleStatus,
  formatMoney,
  parseDecimalScaled,
} from "@/lib/docextract-engine";

interface DocExtractSandboxProps {
  initialResult: DocExtractEvaluationResult;
  presets: readonly InvoiceDocumentInput[];
}

const SVG_W = 600;
const SVG_H = 720;

function addIsoDays(iso: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + deltaDays));
  const y = dt.getUTCFullYear().toString().padStart(4, "0");
  const mo = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = dt.getUTCDate().toString().padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function shiftDecimalBy50(raw: string, currency: InvoiceDocumentInput["currency"]): string {
  const parsed = parseDecimalScaled(raw);
  if (parsed === null) return "1500.00";
  return formatMoney(parsed + 500_000n, currency);
}

function getBoxStroke(
  grounding: FieldGrounding,
  errorFields: Set<string>,
  warnFields: Set<string>,
  selectedField: string,
): string {
  if (errorFields.has(grounding.fieldPath)) return "#e47171";
  if (warnFields.has(grounding.fieldPath)) return "#e2b458";
  if (grounding.fieldPath === selectedField) return "#5fb894";
  return "#7ab8d6";
}

function renderStatusBadge(status: RuleStatus) {
  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-code text-[11px] bg-[#5fb894]/15 text-[#5fb894] border border-[#5fb894]/30">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        PASS
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-code text-[11px] bg-[#e2b458]/15 text-[#e2b458] border border-[#e2b458]/30">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        WARN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-code text-[11px] bg-[#e47171]/15 text-[#e47171] border border-[#e47171]/35">
      <XCircle className="h-3 w-3" aria-hidden="true" />
      FAIL
    </span>
  );
}

export function DocExtractSandbox({ initialResult, presets }: DocExtractSandboxProps) {
  const [result, setResult] = useState<DocExtractEvaluationResult>(initialResult);
  const [draftDoc, setDraftDoc] = useState<InvoiceDocumentInput>(initialResult.activeDocument);
  const [rawBeforeRepairDoc, setRawBeforeRepairDoc] = useState<InvoiceDocumentInput>(
    initialResult.inputDocument,
  );
  const [activePresetId, setActivePresetId] = useState<string>(initialResult.inputDocument.id);
  const [selectedField, setSelectedField] = useState<string>(
    initialResult.findings[0]?.fieldPath ?? "subtotal",
  );
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const errorFields = useMemo(() => {
    const set = new Set<string>();
    for (const f of result.findings) {
      if (f.severity === "error") set.add(f.fieldPath);
    }
    return set;
  }, [result.findings]);

  const warnFields = useMemo(() => {
    const set = new Set<string>();
    for (const f of result.findings) {
      if (f.severity === "warning") set.add(f.fieldPath);
    }
    return set;
  }, [result.findings]);

  const selectedGrounding = useMemo(() => {
    return (
      result.groundings.find((g) => g.fieldPath === selectedField) ??
      result.groundings[0] ??
      null
    );
  }, [result.groundings, selectedField]);

  const structuredPayloadJson = useMemo(() => {
    return JSON.stringify(
      {
        document_id: result.activeDocument.invoiceNumber,
        filename: result.activeDocument.filename,
        layout: result.activeDocument.layout,
        vendor: result.activeDocument.vendorName,
        currency: result.activeDocument.currency,
        issue_date: result.activeDocument.issueDate,
        due_date: result.activeDocument.dueDate,
        iban: result.activeDocument.vendorIban || null,
        subtotal: result.activeDocument.subtotal,
        tax_total: result.activeDocument.taxTotal,
        shipping_total: result.activeDocument.shippingTotal,
        total: result.activeDocument.total,
        validation: {
          review_status: result.reviewStatus,
          rules_passed: `${result.rulesPassed}/${result.totalRules}`,
          errors: result.postRepairErrorCount,
          repaired_fields: result.patchedFields.map((p) => p.fieldPath),
        },
      },
      null,
      2,
    );
  }, [result]);

  async function evaluateViaApi(
    payload: { presetId?: string; document?: InvoiceDocumentInput; applyRepair: boolean },
    options?: { updateRawSnapshot?: boolean },
  ) {
    setIsLoading(true);
    setErrorMessage(null);
    setCopiedJson(false);

    try {
      const response = await fetch("/api/sandboxes/docextract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as DocExtractEvaluationResult | { error?: string };

      if (!response.ok || "error" in data) {
        setErrorMessage(
          "error" in data && data.error ? data.error : "Document validation failed.",
        );
        return;
      }

      const evalData = data as DocExtractEvaluationResult;
      setResult(evalData);
      setDraftDoc(evalData.activeDocument);
      if (options?.updateRawSnapshot) {
        setRawBeforeRepairDoc(evalData.inputDocument);
      }
      if (evalData.findings[0]) {
        setSelectedField(evalData.findings[0].fieldPath);
      } else if (evalData.patchedFields[0]) {
        setSelectedField(evalData.patchedFields[0].fieldPath);
      }
    } catch {
      setErrorMessage("Network error calling /api/sandboxes/docextract.");
    } finally {
      setIsLoading(false);
    }
  }

  function handlePresetSelect(preset: InvoiceDocumentInput) {
    setActivePresetId(preset.id);
    setDraftDoc(preset);
    setRawBeforeRepairDoc(preset);
    void evaluateViaApi({ presetId: preset.id, applyRepair: false }, { updateRawSnapshot: true });
  }

  function handleValidateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRawBeforeRepairDoc(draftDoc);
    void evaluateViaApi({ document: draftDoc, applyRepair: false }, { updateRawSnapshot: true });
  }

  function handleRunRepair() {
    void evaluateViaApi({ document: draftDoc, applyRepair: true });
  }

  function handleRevertPreRepair() {
    setDraftDoc(rawBeforeRepairDoc);
    void evaluateViaApi(
      { document: rawBeforeRepairDoc, applyRepair: false },
      { updateRawSnapshot: true },
    );
  }

  function handleInjectSubtotalFault() {
    const mutated: InvoiceDocumentInput = {
      ...draftDoc,
      subtotal: shiftDecimalBy50(draftDoc.subtotal, draftDoc.currency),
    };
    setDraftDoc(mutated);
    setRawBeforeRepairDoc(mutated);
    setSelectedField("subtotal");
    void evaluateViaApi({ document: mutated, applyRepair: false }, { updateRawSnapshot: true });
  }

  function handleCorruptIban() {
    const mutated: InvoiceDocumentInput = {
      ...draftDoc,
      vendorIban: "DE00 3704 0044 0532 0130 00",
    };
    setDraftDoc(mutated);
    setRawBeforeRepairDoc(mutated);
    setSelectedField("vendorIban");
    void evaluateViaApi({ document: mutated, applyRepair: false }, { updateRawSnapshot: true });
  }

  function handleInvertDueDate() {
    const mutated: InvoiceDocumentInput = {
      ...draftDoc,
      dueDate: addIsoDays(draftDoc.issueDate, -15),
    };
    setDraftDoc(mutated);
    setRawBeforeRepairDoc(mutated);
    setSelectedField("dueDate");
    void evaluateViaApi({ document: mutated, applyRepair: false }, { updateRawSnapshot: true });
  }

  function handleResetActivePreset() {
    const found = presets.find((p) => p.id === activePresetId) ?? presets[0];
    if (found) {
      handlePresetSelect(found);
    }
  }

  function updateLineItemField(
    index: number,
    field: "quantity" | "unitPrice" | "amount",
    value: string,
  ) {
    setDraftDoc((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(structuredPayloadJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      setCopiedJson(false);
    }
  }

  const ruleStatusChipClass =
    result.postRepairErrorCount === 0
      ? "ui-chip--ok"
      : result.applyRepair
        ? "ui-chip--gold"
        : "ui-chip--gold";

  return (
    <div className="space-y-8">
      {/* Top Control Console inside Lit Frieren Painterly Backdrop */}
      <div className="panel--painting relative overflow-hidden rounded-[18px] border border-white/15 p-4 sm:p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)]">
        <div className="relative z-10 ui-panel">
          <div className="ui-head flex-wrap justify-between gap-2 h-auto min-h-[42px] py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="ui-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="font-mono-code text-xs text-[#f3f1ea] truncate">
                POST /api/sandboxes/docextract
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`ui-chip tabular-nums ${ruleStatusChipClass}`}>
                {result.rulesPassed}/{result.totalRules} rules
              </span>
              <span className="ui-chip ui-chip--accent tabular-nums">
                {(result.confidence * 100).toFixed(1)}% conf
              </span>
              <span className="ui-chip ui-chip--ok tabular-nums">
                {result.telemetry.totalMs.toFixed(1)} ms
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Synthetic document presets"
            >
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mr-1">
                Documents:
              </span>
              {presets.map((preset) => {
                const active = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    aria-pressed={active}
                    className={`btn-press rounded-md border px-2.5 py-1.5 font-mono-code text-xs transition-colors ${
                      active
                        ? "border-[#c9a66b]/70 bg-[#c9a66b]/15 text-[#f3f1ea]"
                        : "border-white/10 bg-white/[0.02] text-[#9498a1] hover:text-[#f3f1ea] hover:border-white/20"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mr-1">
                  Inject fault:
                </span>
                <button
                  type="button"
                  onClick={handleInjectSubtotalFault}
                  disabled={isLoading}
                  className="btn-press rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono-code text-xs text-[#f3f1ea] hover:border-[#e47171]/60 hover:text-[#e47171]"
                >
                  +50 subtotal
                </button>
                <button
                  type="button"
                  onClick={handleCorruptIban}
                  disabled={isLoading}
                  className="btn-press rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono-code text-xs text-[#f3f1ea] hover:border-[#e47171]/60 hover:text-[#e47171]"
                >
                  Corrupt IBAN
                </button>
                <button
                  type="button"
                  onClick={handleInvertDueDate}
                  disabled={isLoading}
                  className="btn-press rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono-code text-xs text-[#f3f1ea] hover:border-[#e47171]/60 hover:text-[#e47171]"
                >
                  Invert due date
                </button>
                <button
                  type="button"
                  onClick={handleResetActivePreset}
                  disabled={isLoading}
                  className="btn-press inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono-code text-xs text-[#9498a1] hover:text-[#f3f1ea]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  form="docextract-fields-form"
                  disabled={isLoading}
                  className="btn-press flex-1 sm:flex-none h-10 inline-flex items-center justify-center rounded-lg border border-white/20 bg-[#14161c] px-4 text-[13px] font-medium text-[#f3f1ea] hover:border-[#7ab8d6]/70 disabled:opacity-60"
                >
                  {isLoading ? "Validating..." : "Validate extraction"}
                </button>
                <button
                  type="button"
                  onClick={handleRunRepair}
                  disabled={isLoading}
                  className="btn-press flex-1 sm:flex-none h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f3f1ea] px-4 text-[13px] font-medium text-[#090a0d] hover:bg-white disabled:opacity-60"
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  Run repair loop
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p role="alert" className="text-xs font-mono-code text-[#e47171]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Grounded OCR Canvas + Editable Fields */}
        <div className="lg:col-span-6 min-w-0 space-y-6">
          {/* Card 1: Document Canvas with Aligned Bounding Boxes */}
          <section className="card min-w-0 space-y-4" aria-label="Grounded OCR preview">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="card__title">OCR Canvas &amp; Bbox Grounding</h2>
                <p className="text-xs font-mono-code text-[#9498a1] mt-1 truncate">
                  {draftDoc.filename} · layout={draftDoc.layout}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBoxes((prev) => !prev)}
                aria-pressed={showBoxes}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1b1e25] px-3 py-1.5 font-mono-code text-xs text-[#f3f1ea] hover:border-[#7ab8d6]/60"
              >
                {showBoxes ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-[#7ab8d6]" aria-hidden="true" />
                    Boxes on
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-[#9498a1]" aria-hidden="true" />
                    Boxes hidden
                  </>
                )}
              </button>
            </div>

            <div className="panel--sand relative overflow-hidden rounded-xl border border-white/15 p-3 sm:p-4">
              <div className="relative z-10 overflow-hidden rounded-lg border border-white/15 bg-[#0e1015] shadow-2xl">
                <svg
                  viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                  className="w-full h-auto block select-none"
                  role="img"
                  aria-label={`Document preview of ${draftDoc.filename}`}
                >
                  {/* Sheet background */}
                  <rect width={SVG_W} height={SVG_H} fill="#0e1015" />

                  {/* Header accent band */}
                  <rect x="0" y="0" width={SVG_W} height="34" fill="#171b24" />
                  <circle cx="24" cy="17" r="4.5" fill="#c9a66b" opacity="0.85" />
                  <text
                    x="38"
                    y="21"
                    fill="#9498a1"
                    fontSize="11"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.layout === "thermal_receipt"
                      ? "POS THERMAL CAPTURE · 300 DPI"
                      : "PDF TEXT + RAPIDOCR LAYER · NORMALIZED [0,1]"}
                  </text>
                  <text
                    x="564"
                    y="21"
                    textAnchor="end"
                    fill="#7ab8d6"
                    fontSize="11"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.currency}
                  </text>

                  {/* Vendor box text (y0=0.075..0.14 => y=54..100.8) */}
                  <text
                    x="44"
                    y="70"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    VENDOR / ISSUER
                  </text>
                  <text
                    x="44"
                    y="91"
                    fill="#f3f1ea"
                    fontSize="15"
                    fontWeight="600"
                    fontFamily="var(--font-sans), sans-serif"
                  >
                    {draftDoc.vendorName.slice(0, 30)}
                  </text>

                  {/* Invoice number text (x=368..554, y=54..100.8) */}
                  <text
                    x="368"
                    y="70"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    DOCUMENT ID
                  </text>
                  <text
                    x="368"
                    y="91"
                    fill="#c9a66b"
                    fontSize="15"
                    fontWeight="600"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.invoiceNumber}
                  </text>

                  {/* Dates row (y0=0.17..0.23 => y=122.4..165.6) */}
                  <text
                    x="44"
                    y="138"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    ISSUE DATE
                  </text>
                  <text
                    x="44"
                    y="157"
                    fill="#f3f1ea"
                    fontSize="13"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.issueDate}
                  </text>

                  <text
                    x="224"
                    y="138"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    DUE DATE
                  </text>
                  <text
                    x="224"
                    y="157"
                    fill={errorFields.has("dueDate") ? "#e47171" : "#f3f1ea"}
                    fontSize="13"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.dueDate}
                  </text>

                  <text
                    x="554"
                    y="138"
                    textAnchor="end"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    TAX ID
                  </text>
                  <text
                    x="554"
                    y="157"
                    textAnchor="end"
                    fill="#f3f1ea"
                    fontSize="12"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.vendorTaxId || "N/A"}
                  </text>

                  {/* IBAN Strip (y0=0.245..0.30 => y=176.4..216) */}
                  <rect
                    x="36"
                    y="176"
                    width="528"
                    height="40"
                    rx="6"
                    fill="#141821"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <text
                    x="46"
                    y="200"
                    fill="#9498a1"
                    fontSize="11"
                    fontFamily="var(--font-mono), monospace"
                  >
                    IBAN:
                  </text>
                  <text
                    x="92"
                    y="200"
                    fill={
                      errorFields.has("vendorIban")
                        ? "#e47171"
                        : draftDoc.vendorIban.trim()
                          ? "#f3f1ea"
                          : "#9498a1"
                    }
                    fontSize="12.5"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.vendorIban.trim() || "None (retail point-of-sale receipt)"}
                  </text>

                  {/* Line Items Table Header */}
                  <line x1="36" y1="234" x2="564" y2="234" stroke="rgba(255,255,255,0.12)" />
                  <text
                    x="44"
                    y="251"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    DESCRIPTION
                  </text>
                  <text
                    x="338"
                    y="251"
                    textAnchor="end"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    QTY
                  </text>
                  <text
                    x="432"
                    y="251"
                    textAnchor="end"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    UNIT
                  </text>
                  <text
                    x="554"
                    y="251"
                    textAnchor="end"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    AMOUNT
                  </text>

                  {/* Visible Line Items (up to 4) */}
                  {draftDoc.lineItems.slice(0, 4).map((item, idx) => {
                    const yBase = 287 + idx * 46;
                    const rowError = errorFields.has(`lineItems[${idx}].amount`);
                    return (
                      <g key={item.id}>
                        <line
                          x1="36"
                          y1={yBase + 13}
                          x2="564"
                          y2={yBase + 13}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <text
                          x="44"
                          y={yBase}
                          fill="#f3f1ea"
                          fontSize="12"
                          fontFamily="var(--font-sans), sans-serif"
                        >
                          {item.description.slice(0, 34)}
                        </text>
                        <text
                          x="338"
                          y={yBase}
                          textAnchor="end"
                          fill="#9498a1"
                          fontSize="12"
                          fontFamily="var(--font-mono), monospace"
                        >
                          {item.quantity}
                        </text>
                        <text
                          x="432"
                          y={yBase}
                          textAnchor="end"
                          fill="#9498a1"
                          fontSize="12"
                          fontFamily="var(--font-mono), monospace"
                        >
                          {item.unitPrice}
                        </text>
                        <text
                          x="554"
                          y={yBase}
                          textAnchor="end"
                          fill={rowError ? "#e47171" : "#f3f1ea"}
                          fontSize="12.5"
                          fontWeight="600"
                          fontFamily="var(--font-mono), monospace"
                        >
                          {item.amount}
                        </text>
                      </g>
                    );
                  })}

                  {/* Summary Totals Block (right aligned x=324..564) */}
                  <line x1="36" y1="446" x2="564" y2="446" stroke="rgba(255,255,255,0.1)" />

                  <text
                    x="44"
                    y="482"
                    fill="#9498a1"
                    fontSize="11"
                    fontFamily="var(--font-mono), monospace"
                  >
                    DETERMINISTIC CHECK
                  </text>
                  <text
                    x="44"
                    y="502"
                    fill={result.postRepairErrorCount === 0 ? "#5fb894" : "#e2b458"}
                    fontSize="12"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {result.rulesPassed}/{result.totalRules} rules passing
                  </text>

                  <text
                    x="334"
                    y="481"
                    fill="#9498a1"
                    fontSize="12"
                    fontFamily="var(--font-mono), monospace"
                  >
                    Subtotal
                  </text>
                  <text
                    x="554"
                    y="481"
                    textAnchor="end"
                    fill={errorFields.has("subtotal") ? "#e47171" : "#f3f1ea"}
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.subtotal}
                  </text>

                  <text
                    x="334"
                    y="526"
                    fill="#9498a1"
                    fontSize="12"
                    fontFamily="var(--font-mono), monospace"
                  >
                    Tax Total
                  </text>
                  <text
                    x="554"
                    y="526"
                    textAnchor="end"
                    fill={errorFields.has("taxTotal") ? "#e47171" : "#f3f1ea"}
                    fontSize="13"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.taxTotal}
                  </text>

                  <text
                    x="334"
                    y="572"
                    fill="#9498a1"
                    fontSize="12"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.layout === "thermal_receipt" ? "Tip / Service" : "Shipping"}
                  </text>
                  <text
                    x="554"
                    y="572"
                    textAnchor="end"
                    fill="#f3f1ea"
                    fontSize="13"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.shippingTotal}
                  </text>

                  <rect
                    x="324"
                    y="598"
                    width="240"
                    height="48"
                    rx="6"
                    fill="#161a22"
                    stroke="rgba(255,255,255,0.12)"
                  />
                  <text
                    x="334"
                    y="627"
                    fill="#c9a66b"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="var(--font-mono), monospace"
                  >
                    TOTAL ({draftDoc.currency})
                  </text>
                  <text
                    x="554"
                    y="627"
                    textAnchor="end"
                    fill={errorFields.has("total") ? "#e47171" : "#f3f1ea"}
                    fontSize="15"
                    fontWeight="700"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {draftDoc.total}
                  </text>

                  {/* Footer caption inside sheet */}
                  <text
                    x="44"
                    y="690"
                    fill="#9498a1"
                    fontSize="10"
                    fontFamily="var(--font-mono), monospace"
                  >
                    Click any grounded bbox to inspect coordinates &amp; field status
                  </text>

                  {/* Interactive Normalized Bounding Box Overlay */}
                  {showBoxes ? (
                    <g>
                      {result.groundings.map((g) => {
                        const x = g.bbox.x0 * SVG_W;
                        const y = g.bbox.y0 * SVG_H;
                        const w = (g.bbox.x1 - g.bbox.x0) * SVG_W;
                        const h = (g.bbox.y1 - g.bbox.y0) * SVG_H;
                        const stroke = getBoxStroke(g, errorFields, warnFields, selectedField);
                        const isSelected = g.fieldPath === selectedField;
                        const hasFault = errorFields.has(g.fieldPath);

                        return (
                          <g
                            key={g.fieldPath}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select grounded field ${g.fieldPath}`}
                            onClick={() => setSelectedField(g.fieldPath)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedField(g.fieldPath);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              rx={4}
                              fill={stroke}
                              fillOpacity={isSelected ? 0.16 : hasFault ? 0.12 : 0.04}
                              stroke={stroke}
                              strokeWidth={isSelected || hasFault ? 2 : 1.2}
                              strokeDasharray={isSelected ? undefined : "4 3"}
                            />
                            {isSelected || hasFault ? (
                              <g>
                                <rect
                                  x={x}
                                  y={Math.max(y - 15, 2)}
                                  width={Math.min(g.fieldPath.length * 7 + 14, w + 40)}
                                  height={15}
                                  rx={3}
                                  fill={stroke}
                                />
                                <text
                                  x={x + 6}
                                  y={Math.max(y - 4, 13)}
                                  fill="#090a0d"
                                  fontSize="9.5"
                                  fontWeight="700"
                                  fontFamily="var(--font-mono), monospace"
                                >
                                  {g.fieldPath}
                                </text>
                              </g>
                            ) : null}
                          </g>
                        );
                      })}
                    </g>
                  ) : null}
                </svg>
              </div>
            </div>

            {/* Selected Bbox Coordinate Inspector */}
            {selectedGrounding ? (
              <div className="rounded-xl border border-white/10 bg-[#111318] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-mono-code text-[#c9a66b]">{selectedGrounding.fieldPath}</span>
                  <span className="text-[#9498a1]">·</span>
                  <span className="font-mono-code text-[#f3f1ea]/90 tabular-nums">
                    [{selectedGrounding.bbox.x0.toFixed(2)}, {selectedGrounding.bbox.y0.toFixed(2)},{" "}
                    {selectedGrounding.bbox.x1.toFixed(2)}, {selectedGrounding.bbox.y1.toFixed(2)}]
                  </span>
                </div>
                <span className="font-mono-code text-[#5fb894] tabular-nums">
                  OCR {(selectedGrounding.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ) : null}
          </section>

          {/* Card 2: Live Extracted Field Editor */}
          <section className="card min-w-0 space-y-4" aria-label="Extracted invoice fields editor">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card__title">Editable Extracted Fields</h2>
              <span className="font-mono-code text-xs text-[#9498a1]">
                Decimal precision · 0.02 tolerance
              </span>
            </div>

            <form
              id="docextract-fields-form"
              onSubmit={handleValidateSubmit}
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="doc-vendor-name"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Vendor Name
                  </label>
                  <input
                    id="doc-vendor-name"
                    type="text"
                    value={draftDoc.vendorName}
                    onFocus={() => setSelectedField("vendorName")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, vendorName: e.target.value }))
                    }
                    className="w-full min-w-0 h-10 rounded-lg border border-white/15 bg-[#111318] px-3 text-xs font-mono-code text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6]"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-invoice-number"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Invoice Number
                  </label>
                  <input
                    id="doc-invoice-number"
                    type="text"
                    value={draftDoc.invoiceNumber}
                    onFocus={() => setSelectedField("invoiceNumber")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("invoiceNumber") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-issue-date"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Issue Date (YYYY-MM-DD)
                  </label>
                  <input
                    id="doc-issue-date"
                    type="text"
                    value={draftDoc.issueDate}
                    onFocus={() => setSelectedField("issueDate")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, issueDate: e.target.value }))
                    }
                    className="w-full min-w-0 h-10 rounded-lg border border-white/15 bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6]"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-due-date"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Due Date (YYYY-MM-DD)
                  </label>
                  <input
                    id="doc-due-date"
                    type="text"
                    value={draftDoc.dueDate}
                    onFocus={() => setSelectedField("dueDate")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("dueDate") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>

                <div className="sm:col-span-2 min-w-0">
                  <label
                    htmlFor="doc-vendor-iban"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Vendor IBAN (ISO-7064 Mod-97)
                  </label>
                  <input
                    id="doc-vendor-iban"
                    type="text"
                    value={draftDoc.vendorIban}
                    onFocus={() => setSelectedField("vendorIban")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, vendorIban: e.target.value }))
                    }
                    placeholder="Empty for retail thermal receipts"
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] placeholder:text-[#9498a1] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("vendorIban") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>
              </div>

              {/* Line items quick numeric inputs */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1]">
                  Line Items (Qty · Unit Price · Line Amount)
                </div>
                {draftDoc.lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-[#1b1e25]/70 p-2.5 space-y-2"
                  >
                    <div className="text-xs text-[#f3f1ea] font-medium truncate">
                      {idx + 1}. {item.description}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        aria-label={`Line ${idx + 1} quantity`}
                        type="text"
                        value={item.quantity}
                        onFocus={() => setSelectedField(`lineItems[${idx}].amount`)}
                        onChange={(e) => updateLineItemField(idx, "quantity", e.target.value)}
                        className="min-w-0 h-8 rounded border border-white/10 bg-[#111318] px-2 text-xs font-mono-code tabular-nums text-[#f3f1ea]"
                      />
                      <input
                        aria-label={`Line ${idx + 1} unit price`}
                        type="text"
                        value={item.unitPrice}
                        onFocus={() => setSelectedField(`lineItems[${idx}].amount`)}
                        onChange={(e) => updateLineItemField(idx, "unitPrice", e.target.value)}
                        className="min-w-0 h-8 rounded border border-white/10 bg-[#111318] px-2 text-xs font-mono-code tabular-nums text-[#f3f1ea]"
                      />
                      <input
                        aria-label={`Line ${idx + 1} amount`}
                        type="text"
                        value={item.amount}
                        onFocus={() => setSelectedField(`lineItems[${idx}].amount`)}
                        onChange={(e) => updateLineItemField(idx, "amount", e.target.value)}
                        className={`min-w-0 h-8 rounded border bg-[#111318] px-2 text-xs font-mono-code tabular-nums text-[#f3f1ea] ${
                          errorFields.has(`lineItems[${idx}].amount`)
                            ? "border-[#e47171]"
                            : "border-white/10"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial summary inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                <div className="min-w-0">
                  <label
                    htmlFor="doc-subtotal"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Subtotal
                  </label>
                  <input
                    id="doc-subtotal"
                    type="text"
                    value={draftDoc.subtotal}
                    onFocus={() => setSelectedField("subtotal")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, subtotal: e.target.value }))
                    }
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("subtotal") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-tax-total"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Tax Total
                  </label>
                  <input
                    id="doc-tax-total"
                    type="text"
                    value={draftDoc.taxTotal}
                    onFocus={() => setSelectedField("taxTotal")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, taxTotal: e.target.value }))
                    }
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("taxTotal") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-shipping-total"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Shipping / Tip
                  </label>
                  <input
                    id="doc-shipping-total"
                    type="text"
                    value={draftDoc.shippingTotal}
                    onFocus={() => setSelectedField("shippingTotal")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, shippingTotal: e.target.value }))
                    }
                    className="w-full min-w-0 h-10 rounded-lg border border-white/15 bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6]"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="doc-grand-total"
                    className="block font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mb-1"
                  >
                    Grand Total ({draftDoc.currency})
                  </label>
                  <input
                    id="doc-grand-total"
                    type="text"
                    value={draftDoc.total}
                    onFocus={() => setSelectedField("total")}
                    onChange={(e) =>
                      setDraftDoc((prev) => ({ ...prev, total: e.target.value }))
                    }
                    className={`w-full min-w-0 h-10 rounded-lg border bg-[#111318] px-3 text-xs font-mono-code tabular-nums text-[#f3f1ea] focus:outline-none focus:border-[#7ab8d6] ${
                      errorFields.has("total") ? "border-[#e47171]" : "border-white/15"
                    }`}
                  />
                </div>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: 7-Rule Validation Ledger, Repair Loop, Verified JSON */}
        <div className="lg:col-span-6 min-w-0 space-y-6">
          {/* Card 1: 7-Rule Deterministic Validation Ledger */}
          <section className="card min-w-0 space-y-4" aria-label="Deterministic validation rule ledger">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card__title">7-Rule Validation Ledger</h2>
              <span
                className={`ui-chip tabular-nums ${
                  result.postRepairErrorCount === 0 ? "ui-chip--ok" : "ui-chip--gold"
                }`}
              >
                {result.postRepairErrorCount === 0
                  ? "7/7 rules verified"
                  : `${result.postRepairErrorCount} error${result.postRepairErrorCount > 1 ? "s" : ""} flagged`}
              </span>
            </div>

            <div className="space-y-2.5">
              {result.ruleAudit.map((rule) => {
                const isSelected = rule.fieldPath === selectedField;
                return (
                  <button
                    key={rule.ruleId}
                    type="button"
                    onClick={() => setSelectedField(rule.fieldPath)}
                    className={`btn-press w-full text-left rounded-xl border p-3.5 transition-colors ${
                      rule.status === "error"
                        ? "border-[#e47171]/45 bg-[#e47171]/[0.06] hover:border-[#e47171]"
                        : isSelected
                          ? "border-[#c9a66b]/55 bg-[#1b1e25]"
                          : "border-white/10 bg-[#1b1e25]/70 hover:border-white/25"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-code text-xs font-medium text-[#f3f1ea]">
                        {rule.label}
                      </span>
                      {renderStatusBadge(rule.status)}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-snug text-[#f3f1ea]/85">
                      {rule.message}
                    </p>
                    {rule.status !== "pass" && (rule.expectedValue || rule.actualValue) ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono-code tabular-nums">
                        {rule.actualValue ? (
                          <span className="text-[#e47171]">actual={rule.actualValue}</span>
                        ) : null}
                        {rule.expectedValue ? (
                          <span className="text-[#5fb894]">expected={rule.expectedValue}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Card 2: Validation-Error Repair Loop */}
          <section className="card min-w-0 space-y-4" aria-label="Validation error repair loop">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card__title">Validation-Error Repair Loop</h2>
              <span
                className={`ui-chip ${
                  result.reviewStatus === "verified" || result.reviewStatus === "repaired"
                    ? "ui-chip--ok"
                    : "ui-chip--gold"
                }`}
              >
                status={result.reviewStatus}
              </span>
            </div>

            {result.duplicateMatch ? (
              <div className="rounded-xl border border-[#e47171]/45 bg-[#e47171]/[0.08] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono-code font-medium text-[#e47171]">
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Human-in-the-Loop Escalation Required</span>
                </div>
                <p className="text-[13px] leading-relaxed text-[#f3f1ea]/90">
                  Duplicate collision detected against posted ledger record{" "}
                  <code className="font-mono-code text-[#c9a66b]">
                    {result.duplicateMatch.docId}
                  </code>{" "}
                  ({result.duplicateMatch.invoiceNumber} posted {result.duplicateMatch.postedAt} for{" "}
                  {result.duplicateMatch.total} {result.duplicateMatch.currency}). Auto-repair never
                  mutates invoice IDs silently.
                </p>
              </div>
            ) : null}

            {result.applyRepair && result.patchedFields.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono-code text-[#5fb894]">
                    Applied {result.patchedFields.length} deterministic repair patch
                    {result.patchedFields.length > 1 ? "es" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={handleRevertPreRepair}
                    className="btn-press inline-flex items-center gap-1 font-mono-code text-xs text-[#9498a1] hover:text-[#f3f1ea]"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Revert to Pass 1
                  </button>
                </div>

                <div className="space-y-2">
                  {result.patchedFields.map((patch) => (
                    <div
                      key={`${patch.fieldPath}-${patch.ruleId}`}
                      className="rounded-xl border border-[#5fb894]/30 bg-[#1b1e25] p-3 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
                        <span className="text-[#c9a66b]">{patch.fieldPath}</span>
                        <span className="text-[#9498a1]">{patch.ruleId}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono-code text-xs tabular-nums">
                        <span className="line-through text-[#e47171]">{patch.before}</span>
                        <span className="text-[#9498a1]">→</span>
                        <span className="text-[#5fb894] font-medium">{patch.after}</span>
                      </div>
                      <p className="text-xs text-[#9498a1]">{patch.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : result.postRepairErrorCount === 0 ? (
              <div className="rounded-xl border border-[#5fb894]/30 bg-[#5fb894]/[0.07] p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#5fb894] shrink-0" aria-hidden="true" />
                <div className="text-[13px] text-[#f3f1ea]/90">
                  <span className="font-medium text-[#5fb894]">Verified · 0 repairs needed.</span>{" "}
                  All 7 financial rules and identifier checksums passed on the first pass.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#1b1e25] p-4 space-y-3">
                <p className="text-[13px] leading-relaxed text-[#f3f1ea]/85">
                  Pass 1 extraction flagged {result.preRepairErrorCount} deterministic fault
                  {result.preRepairErrorCount > 1 ? "s" : ""}. Run the repair loop to recompute
                  exact integer-scaled amounts, restore ISO-7064 IBAN check digits, or align dates
                  and re-validate.
                </p>
                <button
                  type="button"
                  onClick={handleRunRepair}
                  disabled={isLoading}
                  className="btn-press inline-flex items-center gap-2 rounded-lg bg-[#f3f1ea] px-4 py-2 text-xs font-medium text-[#090a0d] hover:bg-white disabled:opacity-60"
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  Run Repair Pass
                </button>
              </div>
            )}
          </section>

          {/* Card 3: Stage Telemetry & Verified JSON Payload */}
          <section className="card min-w-0" aria-label="Pipeline telemetry and validated JSON output">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card__title">Telemetry &amp; Verified Schema</h2>
              <span className="ui-chip ui-chip--accent tabular-nums">
                {result.telemetry.totalMs.toFixed(1)} ms
              </span>
            </div>

            <ul className="rows mt-4 font-mono-code text-xs tabular-nums">
              <li>
                <span className="text-[#9498a1]">OCR + Bbox Grounding</span>
                <span className="text-[#f3f1ea]">{result.telemetry.ocrMs.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">Schema Extraction</span>
                <span className="text-[#7ab8d6]">{result.telemetry.extractMs.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">7-Rule Decimal Validation</span>
                <span className="text-[#f3f1ea]">{result.telemetry.validateMs.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">Deterministic Repair Loop</span>
                <span className="text-[#5fb894]">{result.telemetry.repairMs.toFixed(1)} ms</span>
              </li>
            </ul>

            <div className="panel panel--sky mt-5 p-4" style={{ ["--p-h" as string]: "220px" }}>
              <div className="relative z-10 ui-panel">
                <div className="ui-head justify-between">
                  <span className="font-mono-code text-xs text-[#f3f1ea] truncate">
                    docextract.schema // {result.reviewStatus}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="btn-press inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono-code text-[#9498a1] hover:text-[#f3f1ea]"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3 w-3 text-[#5fb894]" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 whitespace-pre-wrap break-words overflow-x-auto font-mono-code text-xs leading-relaxed text-[#f3f1ea]/90">
                  <code>{structuredPayloadJson}</code>
                </pre>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <a
              href="https://github.com/Exryz/docextract"
              target="_blank"
              rel="noreferrer"
              className="btn-press inline-flex items-center gap-1.5 text-sm font-medium text-[#c9a66b] hover:text-[#f3f1ea]"
            >
              <span>Inspect full Python implementation in docextract</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
