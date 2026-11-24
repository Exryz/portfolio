"use client";

import { useState } from "react";
import { Check, Flag, Play, Search, Terminal } from "lucide-react";

type RetrievalMode = "hybrid" | "dense" | "bm25";
type HelpdeskScenarioId = "vpn-tls" | "okta-mfa" | "pg-replica";
type DocExtractScenarioId = "inv-0419" | "inv-0422" | "rec-0891";
type ScenarioId = HelpdeskScenarioId | DocExtractScenarioId;

interface ScenarioItem {
  readonly id: ScenarioId;
  readonly group: "helpdesk-agent" | "docextract";
  readonly title: string;
  readonly sub: string;
  readonly badge: string;
}

const SCENARIOS: readonly ScenarioItem[] = [
  {
    id: "vpn-tls",
    group: "helpdesk-agent",
    title: "#VPN-402 · TLS handshake timeout",
    sub: "Qdrant + Cross-Encoder · 3 sources",
    badge: "Hit@4 100%",
  },
  {
    id: "okta-mfa",
    group: "helpdesk-agent",
    title: "#IAM-118 · Okta hardware token reset",
    sub: "MCP ticketing · Policy check",
    badge: "0.982 MRR",
  },
  {
    id: "pg-replica",
    group: "helpdesk-agent",
    title: "#DB-904 · Replica failover lag",
    sub: "Runbook lookup · P1 escalation",
    badge: "0.966 MRR",
  },
  {
    id: "inv-0419",
    group: "docextract",
    title: "INV-2026-0419.pdf · Subtotal fault",
    sub: "subtotal_math + grand_total_math",
    badge: "Repaired",
  },
  {
    id: "inv-0422",
    group: "docextract",
    title: "INV-2026-0422.pdf · IBAN mod-97",
    sub: "iban_mod97 + 99.1% bbox grounding",
    badge: "100.0% F1",
  },
  {
    id: "rec-0891",
    group: "docextract",
    title: "REC-2026-0891.png · Date & duplicate check",
    sub: "invoice_due_date_order + duplicate_vendor_invoice",
    badge: "Verified",
  },
];

interface HelpdeskCase {
  readonly ticket: string;
  readonly userQuestion: string;
  readonly kbFile: string;
  readonly mcpCall: string;
  readonly answer: string;
  readonly metrics: Record<RetrievalMode, { label: string; score: string; mrr: string; latency: string }>;
  readonly chunks: readonly { doc: string; hybridScore: string; denseScore: string; bm25Score: string }[];
}

const HELPDESK_CASES: Record<HelpdeskScenarioId, HelpdeskCase> = {
  "vpn-tls": {
    ticket: "#VPN-402",
    userQuestion: "Corp VPN drops every 90 seconds with TLS handshake timeout on Windows 11.",
    kbFile: "kb/network/vpn_tls.md",
    mcpCall: "mcp.ticket.attach_runbook(id='#VPN-402', doc='vpn_tls.md') -> influxdb.log(24ms)",
    answer:
      "Clear stale MTU clamping (1360 bytes) and re-bind the split-tunnel TLS client certificate under WireGuard adapter settings.",
    metrics: {
      hybrid: { label: "Hybrid + Cross-Encoder Rerank", score: "100.0% Hit@4", mrr: "0.966 MRR", latency: "38 ms" },
      dense: { label: "Dense Qdrant Vectors", score: "97.3% Hit@4", mrr: "0.982 MRR", latency: "19 ms" },
      bm25: { label: "BM25 Lexical Baseline", score: "89.2% Hit@4", mrr: "0.812 MRR", latency: "6 ms" },
    },
    chunks: [
      { doc: "kb/network/vpn_tls.md § MTU & TLS timeouts", hybridScore: "0.96", denseScore: "0.91", bm25Score: "0.84" },
      { doc: "kb/network/wireguard_cert_rotate.md", hybridScore: "0.89", denseScore: "0.87", bm25Score: "0.61" },
      { doc: "kb/windows/split_dns_flush.md", hybridScore: "0.74", denseScore: "0.79", bm25Score: "0.52" },
    ],
  },
  "okta-mfa": {
    ticket: "#IAM-118",
    userQuestion: "Lost YubiKey 5C before travel; need temporary SMS recovery policy and Okta factor reset.",
    kbFile: "kb/identity/okta_mfa_recovery.md",
    mcpCall: "mcp.ticket.escalate_iam(id='#IAM-118', require_manager=true) -> influxdb.log(19ms)",
    answer:
      "SMS fallback is disabled for production IAM accounts. Issue a 24-hour hardware WebAuthn bypass token after manager approval.",
    metrics: {
      hybrid: { label: "Hybrid + Cross-Encoder Rerank", score: "100.0% Hit@4", mrr: "0.966 MRR", latency: "35 ms" },
      dense: { label: "Dense Qdrant Vectors", score: "97.3% Hit@4", mrr: "0.982 MRR", latency: "17 ms" },
      bm25: { label: "BM25 Lexical Baseline", score: "89.2% Hit@4", mrr: "0.812 MRR", latency: "5 ms" },
    },
    chunks: [
      { doc: "kb/identity/okta_mfa_recovery.md § Lost FIDO2 Key", hybridScore: "0.98", denseScore: "0.94", bm25Score: "0.79" },
      { doc: "kb/security/manager_bypass_approval.md", hybridScore: "0.86", denseScore: "0.82", bm25Score: "0.58" },
      { doc: "kb/onboarding/hardware_key_issue.md", hybridScore: "0.71", denseScore: "0.76", bm25Score: "0.49" },
    ],
  },
  "pg-replica": {
    ticket: "#DB-904",
    userQuestion: "Read-replica replication lag exceeded 18 seconds after batch analytics migration.",
    kbFile: "kb/database/postgres_replica.md",
    mcpCall: "mcp.ticket.create_p1(id='#DB-904', service='pg-replica-02') -> influxdb.log(21ms)",
    answer:
      "Throttle background backfill batch size to 2,000 rows/tx and verify wal_receiver_status slots before failing over reads.",
    metrics: {
      hybrid: { label: "Hybrid + Cross-Encoder Rerank", score: "100.0% Hit@4", mrr: "0.966 MRR", latency: "41 ms" },
      dense: { label: "Dense Qdrant Vectors", score: "97.3% Hit@4", mrr: "0.982 MRR", latency: "20 ms" },
      bm25: { label: "BM25 Lexical Baseline", score: "89.2% Hit@4", mrr: "0.812 MRR", latency: "7 ms" },
    },
    chunks: [
      { doc: "kb/database/postgres_replica.md § WAL lag runbook", hybridScore: "0.95", denseScore: "0.92", bm25Score: "0.81" },
      { doc: "kb/database/pgbouncer_read_pool.md", hybridScore: "0.84", denseScore: "0.85", bm25Score: "0.63" },
      { doc: "kb/ops/incident_p1_escalation.md", hybridScore: "0.72", denseScore: "0.69", bm25Score: "0.48" },
    ],
  },
};

interface DocExtractCase {
  readonly docName: string;
  readonly faultBanner: string;
  readonly repairedBanner: string;
  readonly targetRule: string;
  readonly faultValue: string;
  readonly repairedValue: string;
  readonly summaryRule: string;
  readonly summaryFault: string;
  readonly summaryRepaired: string;
  readonly footerRule: string;
}

const DOCEXTRACT_CASES: Record<DocExtractScenarioId, DocExtractCase> = {
  "inv-0419": {
    docName: "INV-2026-0419.pdf",
    faultBanner: "Fault Injected: subtotal_math discrepancy caught deterministically",
    repairedBanner: "Decimal Validation: 7/7 rules passed (100.0% Field Micro F1)",
    targetRule: "subtotal_math",
    faultValue: "− 1,140.00 (OCR '2' -> '1')",
    repairedValue: "+ 1,240.00 (repaired)",
    summaryRule: "grand_total_math",
    summaryFault: "1,288.80 != 1,388.80",
    summaryRepaired: "1,388.80 ✓",
    footerRule: "iban_mod97 · duplicate_vendor_invoice",
  },
  "inv-0422": {
    docName: "INV-2026-0422.pdf",
    faultBanner: "Fault Injected: iban_mod97 checksum failed on transposed digits",
    repairedBanner: "Decimal Validation: 7/7 rules passed (100.0% Field Micro F1)",
    targetRule: "iban_mod97",
    faultValue: "− DE89...0001 (mod-97 = 42 != 1)",
    repairedValue: "+ DE89...0100 (mod-97 = 1 ✓)",
    summaryRule: "tax_breakdown (19% VAT)",
    summaryFault: "Pending IBAN verification",
    summaryRepaired: "2,489.00 ✓",
    footerRule: "subtotal_math · grand_total_math",
  },
  "rec-0891": {
    docName: "REC-2026-0891.png",
    faultBanner: "Fault Injected: invoice_due_date_order earlier than issue date",
    repairedBanner: "Decimal Validation: 7/7 rules passed (100.0% Field Micro F1)",
    targetRule: "invoice_due_date_order",
    faultValue: "− due 2026-09-01 < issued 2026-09-14",
    repairedValue: "+ due 2026-10-14 >= issued 2026-09-14",
    summaryRule: "duplicate_vendor_invoice",
    summaryFault: "Re-validating vendor hash",
    summaryRepaired: "Unique invoice key ✓",
    footerRule: "line_item_math · grand_total_math",
  },
};

function isHelpdeskScenario(id: ScenarioId): id is HelpdeskScenarioId {
  return id === "vpn-tls" || id === "okta-mfa" || id === "pg-replica";
}

function HelpdeskInspector({ scenarioId }: { scenarioId: HelpdeskScenarioId }) {
  const [mode, setMode] = useState<RetrievalMode>("hybrid");
  const item = HELPDESK_CASES[scenarioId];
  const activeMetric = item.metrics[mode];

  return (
    <div className="flex flex-col h-full">
      <div className="ui-head justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono-code font-medium text-[#f3f1ea] truncate">{item.ticket}</span>
          <span className="text-[#9498a1] truncate">{item.kbFile}</span>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Retrieval mode">
          {(["hybrid", "dense", "bm25"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={`btn-press rounded px-2 py-0.5 font-mono-code text-[11px] uppercase tracking-wider border ${
                mode === key
                  ? "border-[#c9a66b]/60 bg-[#c9a66b]/15 text-[#f3f1ea]"
                  : "border-transparent text-[#9498a1] hover:text-[#f3f1ea]"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[#f3f1ea]">
          <div className="text-[11px] font-mono-code uppercase tracking-wider text-[#9498a1]">
            Incoming ticket
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-[#f3f1ea]">{item.userQuestion}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono-code text-[#c9a66b]">{activeMetric.label}</span>
          <div className="flex items-center gap-1.5">
            <span className="ui-chip ui-chip--ok">{activeMetric.score}</span>
            <span className="ui-chip ui-chip--accent">{activeMetric.mrr}</span>
            <span className="ui-chip">{activeMetric.latency}</span>
          </div>
        </div>

        <ul className="space-y-1.5" aria-label="Ranked knowledge base chunks">
          {item.chunks.map((chunk, idx) => {
            const score =
              mode === "hybrid" ? chunk.hybridScore : mode === "dense" ? chunk.denseScore : chunk.bm25Score;
            return (
              <li
                key={chunk.doc}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 font-mono-code text-xs ${
                  idx === 0
                    ? "border-[#7ab8d6]/35 bg-[#7ab8d6]/10 text-[#f3f1ea]"
                    : "border-white/5 bg-white/[0.02] text-[#9498a1]"
                }`}
              >
                <span className="truncate">
                  #{idx + 1} · {chunk.doc}
                </span>
                <span className={idx === 0 ? "text-[#7ab8d6]" : "text-[#9498a1]"}>{score}</span>
              </li>
            );
          })}
        </ul>

        <div className="rounded-lg border border-white/10 bg-[#14161c] p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono-code text-[#9498a1]">
            <span>Grounded response + citation</span>
            <span className="text-[#5fb894]">verified</span>
          </div>
          <p className="text-[13px] leading-snug text-[#f3f1ea]/90">{item.answer}</p>
          <div className="pt-0.5 font-mono-code text-[11px] text-[#7ab8d6] truncate">{item.mcpCall}</div>
        </div>
      </div>
    </div>
  );
}

function DocExtractInspector({ scenarioId }: { scenarioId: DocExtractScenarioId }) {
  const [pass, setPass] = useState<1 | 2>(2);
  const isPass2 = pass === 2;
  const docCase = DOCEXTRACT_CASES[scenarioId];

  return (
    <div className="flex flex-col h-full">
      <div className="ui-head justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono-code font-medium text-[#f3f1ea] truncate">{docCase.docName}</span>
          <span className="ui-chip ui-chip--accent">99.1% Bbox Grounding</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setPass(1)}
            aria-pressed={!isPass2}
            className={`btn-press rounded px-2.5 py-0.5 font-mono-code text-[11px] ${
              !isPass2 ? "bg-[#e47171]/20 text-[#e47171]" : "text-[#9498a1] hover:text-[#f3f1ea]"
            }`}
          >
            Pass 1: Fault
          </button>
          <button
            type="button"
            onClick={() => setPass(2)}
            aria-pressed={isPass2}
            className={`btn-press rounded px-2.5 py-0.5 font-mono-code text-[11px] ${
              isPass2 ? "bg-[#5fb894]/20 text-[#5fb894]" : "text-[#9498a1] hover:text-[#f3f1ea]"
            }`}
          >
            Pass 2: Repaired
          </button>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
          <span className={isPass2 ? "text-[#5fb894]" : "text-[#e47171]"}>
            {isPass2 ? docCase.repairedBanner : docCase.faultBanner}
          </span>
          <span className="ui-chip ui-chip--gold">RapidOCR + pypdfium2</span>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#14161c] overflow-hidden font-mono-code text-xs">
          <div className="px-3.5 py-2 border-b border-white/10 text-[#9498a1] flex justify-between">
            <span>Validation rule ledger</span>
            <span>Decimal precision</span>
          </div>
          <div className="divide-y divide-white/5">
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-[#9498a1]">line_item_math (3 items)</span>
              <span className="text-[#f3f1ea]">1,240.00</span>
            </div>
            <div
              className={`flex items-center justify-between px-3.5 py-2 ${
                isPass2 ? "bg-[#5fb894]/10 text-[#5fb894]" : "bg-[#e47171]/12 text-[#e47171]"
              }`}
            >
              <span>{docCase.targetRule}</span>
              <span>{isPass2 ? docCase.repairedValue : docCase.faultValue}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-[#9498a1]">tax_breakdown (12% VAT)</span>
              <span className="text-[#f3f1ea]">148.80</span>
            </div>
            <div
              className={`flex items-center justify-between px-3.5 py-2 ${
                isPass2 ? "text-[#5fb894]" : "text-[#e2b458]"
              }`}
            >
              <span>{docCase.summaryRule}</span>
              <span>{isPass2 ? docCase.summaryRepaired : docCase.summaryFault}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-[#9498a1]">{docCase.footerRule}</span>
              <span className="text-[#5fb894]">VALID ✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroAppFrame() {
  const [selectedId, setSelectedId] = useState<ScenarioId>("vpn-tls");

  return (
    <div className="hero-window panel--painting" data-enter>
      <div className="app-frame" role="region" aria-label="Interactive AI engineering workbench">
        <div className="app-pane app-pane--list flex flex-col">
          <div className="ui-head justify-between">
            <div className="flex items-center gap-2.5">
              <span className="ui-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="font-mono-code text-xs text-[#f3f1ea]">Exeryze / systems</span>
            </div>
            <span className="ui-chip ui-chip--ok">CI 135/135</span>
          </div>

          <div className="p-1.5 space-y-1">
            {SCENARIOS.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                  className={`btn-press w-full text-left rounded-md px-2.5 py-2 border transition-colors ${
                    active
                      ? "border-[#c9a66b]/45 bg-white/[0.06]"
                      : "border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-xs font-medium text-[#f3f1ea] truncate">
                      {item.title}
                    </span>
                    <span
                      className={`shrink-0 font-mono-code text-[11px] ${
                        active ? "text-[#7ab8d6]" : "text-[#9498a1]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#9498a1] truncate">{item.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="app-pane bg-[#1b1e25]">
          {isHelpdeskScenario(selectedId) ? (
            <HelpdeskInspector scenarioId={selectedId} />
          ) : (
            <DocExtractInspector scenarioId={selectedId} />
          )}
        </div>
      </div>
    </div>
  );
}

const SEARCH_SAMPLES = [
  {
    q: "vpn tls timeout",
    rows: [
      { title: "kb/network/vpn_tls.md", meta: "Rerank 0.96", tag: "Match" },
      { title: "kb/network/wireguard_cert_rotate.md", meta: "Dense 0.89", tag: "Article" },
      { title: "kb/windows/split_dns_flush.md", meta: "BM25 0.52", tag: "Runbook" },
    ],
  },
  {
    q: "okta mfa reset",
    rows: [
      { title: "kb/identity/okta_mfa_recovery.md", meta: "Rerank 0.98", tag: "Match" },
      { title: "kb/security/manager_bypass_approval.md", meta: "Dense 0.86", tag: "Policy" },
      { title: "kb/onboarding/hardware_key_issue.md", meta: "BM25 0.49", tag: "Guide" },
    ],
  },
] as const;

const BBOX_FIELDS = [
  { field: "vendor_iban", coords: "[0.14, 0.42, 0.39, 0.45]", score: "0.99" },
  { field: "subtotal", coords: "[0.68, 0.61, 0.89, 0.64]", score: "0.99" },
  { field: "grand_total", coords: "[0.68, 0.72, 0.89, 0.76]", score: "1.00" },
] as const;

export function BentoFragments() {
  const [searchIdx, setSearchIdx] = useState<0 | 1>(0);
  const [patchApplied, setPatchApplied] = useState(false);
  const [testRunCount, setTestRunCount] = useState(1);
  const [reviewApproved, setReviewApproved] = useState(true);

  const currentSearch = SEARCH_SAMPLES[searchIdx];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Card 1: helpdesk-agent search fragment */}
      <article className="card lg:col-span-7">
        <h3 className="card__title">Retrieves and reranks grounded runbooks</h3>
        <p className="card__text">
          Combines BM25 lexical matching with Qdrant dense vectors and cross-encoder reranking across
          37 labelled support queries.
        </p>

        <div className="panel panel--sand" style={{ ["--p-h" as string]: "264px", ["--p-h-sm" as string]: "228px" }}>
          <div className="stage stage--fade-b px-3 pt-6 sm:px-8 sm:pt-7">
            <div className="ui-panel mx-auto max-w-[460px]">
              <div className="ui-head justify-between">
                <div className="flex items-center gap-2 min-w-0 text-[#f3f1ea]">
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#7ab8d6]" aria-hidden="true" />
                  <span className="font-mono-code font-medium truncate whitespace-nowrap">{currentSearch.q}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {SEARCH_SAMPLES.map((sample, idx) => (
                    <button
                      key={sample.q}
                      type="button"
                      onClick={() => setSearchIdx(idx as 0 | 1)}
                      className={`btn-press rounded px-2 py-0.5 font-mono-code text-[11px] border ${
                        searchIdx === idx
                          ? "border-[#c9a66b]/55 bg-[#c9a66b]/15 text-[#f3f1ea]"
                          : "border-white/10 text-[#9498a1] hover:text-[#f3f1ea]"
                      }`}
                    >
                      {idx === 0 ? "VPN" : "Okta"}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-white/5">
                {currentSearch.rows.map((row, idx) => (
                  <li
                    key={row.title}
                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 font-mono-code text-xs ${
                      idx === 0 ? "bg-[#7ab8d6]/10 text-[#f3f1ea]" : "text-[#9498a1]"
                    }`}
                  >
                    <span className="truncate">{row.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span>{row.meta}</span>
                      <span className={`ui-chip ${idx === 0 ? "ui-chip--ok" : ""}`}>{row.tag}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </article>

      {/* Card 2: docextract validation diff fragment */}
      <article className="card lg:col-span-5">
        <h3 className="card__title">Repairs OCR math errors deterministically</h3>
        <p className="card__text">
          Catches subtotal, VAT, and IBAN mod-97 discrepancies in Decimal rules before re-prompting
          with the exact crop.
        </p>

        <div className="panel panel--sky" style={{ ["--p-h" as string]: "264px", ["--p-h-sm" as string]: "228px" }}>
          <div className="stage stage--fade-b px-3 pt-6 sm:px-7 sm:pt-7">
            <div className="ui-panel mx-auto max-w-[420px]">
              <div className="ui-head justify-between">
                <span className="font-mono-code text-xs text-[#f3f1ea]">validator/rules.py</span>
                <button
                  type="button"
                  onClick={() => setPatchApplied((prev) => !prev)}
                  className={`btn-press inline-flex items-center gap-1 rounded px-2.5 py-1 font-mono-code text-[11px] font-medium ${
                    patchApplied
                      ? "bg-[#5fb894]/20 text-[#5fb894] border border-[#5fb894]/35"
                      : "bg-[#f3f1ea] text-[#090a0d]"
                  }`}
                >
                  {patchApplied ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span>Applied · 100% F1</span>
                    </>
                  ) : (
                    <span>Apply repair patch</span>
                  )}
                </button>
              </div>
              <div className="p-3 font-mono-code text-xs space-y-1">
                <div className="text-[#9498a1] px-2 py-1">@@ Decimal rule: subtotal_math @@</div>
                <div className="rounded bg-[#e47171]/15 px-2 py-1 text-[#e47171]">
                  − subtotal = Decimal(&quot;1140.00&quot;) # OCR misread
                </div>
                <div className="rounded bg-[#5fb894]/15 px-2 py-1 text-[#5fb894]">
                  + subtotal = Decimal(&quot;1240.00&quot;) # verified sum
                </div>
                <div className="px-2 py-1 text-[#f3f1ea]/80 truncate">
                  assert iban_mod97(inv.iban) and total == &quot;1388.80&quot;
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Card 3: CI Terminal runner */}
      <article className="card lg:col-span-4">
        <h3 className="card__title">Verifies every pipeline in CI</h3>
        <p className="card__text">
          Runs 89 helpdesk-agent tests and 46 strict mypy-checked docextract tests before every
          merge.
        </p>

        <div className="panel panel--sage" style={{ ["--p-h" as string]: "252px", ["--p-h-sm" as string]: "224px" }}>
          <div className="stage stage--fade-b px-3 sm:px-5 pt-6">
            <div className="ui-panel">
              <div className="ui-head justify-between">
                <div className="flex items-center gap-2 font-mono-code text-xs text-[#f3f1ea]">
                  <Terminal className="h-3.5 w-3.5 text-[#5fb894]" aria-hidden="true" />
                  <span>pytest · run #{testRunCount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTestRunCount((n) => n + 1)}
                  className="btn-press inline-flex items-center gap-1 rounded border border-white/15 px-2 py-0.5 font-mono-code text-[11px] text-[#f3f1ea] hover:border-[#c9a66b]"
                >
                  <Play className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Re-run</span>
                </button>
              </div>
              <div className="p-3.5 font-mono-code text-xs space-y-1.5">
                <div className="flex justify-between text-[#5fb894]">
                  <span>✓ helpdesk-agent/tests</span>
                  <span>89 passed</span>
                </div>
                <div className="flex justify-between text-[#5fb894]">
                  <span>✓ docextract/tests</span>
                  <span>46 passed</span>
                </div>
                <div className="flex justify-between text-[#7ab8d6]">
                  <span>✓ mypy --strict · ruff</span>
                  <span>0 errors</span>
                </div>
                <div className="pt-1 border-t border-white/10 flex justify-between text-[#f3f1ea]">
                  <span>Total verified</span>
                  <span>135 passed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Card 4: Animated pulsing node-and-line diagram on Frieren meadow */}
      <article className="card lg:col-span-4">
        <h3 className="card__title">Connects tools, OCR, and telemetry</h3>
        <p className="card__text">
          Orchestrates LangGraph tool routing, stdio MCP servers, ONNX RapidOCR, and InfluxDB logs
          in one loop.
        </p>

        <div className="panel panel--painting" style={{ ["--p-h" as string]: "252px", ["--p-h-sm" as string]: "224px" }}>
          <div className="stage flex items-center justify-center p-5">
            <svg viewBox="0 0 320 220" className="w-full h-auto max-w-[310px]" role="img" aria-label="Agent and Document AI architecture diagram">
              <path d="M56 110 C 102 110, 102 52, 156 52" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />
              <path d="M56 110 L 156 110" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />
              <path d="M56 110 C 102 110, 102 168, 156 168" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />
              <path d="M220 52 C 250 52, 250 110, 274 110" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />
              <path d="M220 110 L 274 110" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />
              <path d="M220 168 C 250 168, 250 110, 274 110" fill="none" stroke="rgba(12,16,23,0.42)" strokeWidth="1.75" />

              <path d="M56 110 C 102 110, 102 52, 156 52" fill="none" stroke="#c9a66b" strokeWidth="2.2" className="comet-line" />
              <path d="M56 110 L 156 110" fill="none" stroke="#181b22" strokeWidth="2.2" className="comet-line" />
              <path d="M56 110 C 102 110, 102 168, 156 168" fill="none" stroke="#c9a66b" strokeWidth="2.2" className="comet-line" />

              <g>
                <rect x="8" y="92" width="66" height="36" rx="8" fill="#181b22" stroke="rgba(243,241,234,0.22)" />
                <text x="41" y="114" textAnchor="middle" fill="#f3f1ea" fontSize="11" fontFamily="monospace">
                  FastAPI
                </text>
              </g>

              <g>
                <rect x="136" y="34" width="96" height="34" rx="8" fill="#181b22" stroke="rgba(201,166,107,0.45)" />
                <text x="184" y="55" textAnchor="middle" fill="#f3f1ea" fontSize="11" fontFamily="monospace">
                  Qdrant RRF
                </text>
              </g>
              <g>
                <rect x="136" y="93" width="96" height="34" rx="8" fill="#181b22" stroke="rgba(243,241,234,0.22)" />
                <text x="184" y="114" textAnchor="middle" fill="#f3f1ea" fontSize="11" fontFamily="monospace">
                  RapidOCR
                </text>
              </g>
              <g>
                <rect x="136" y="152" width="96" height="34" rx="8" fill="#181b22" stroke="rgba(243,241,234,0.22)" />
                <text x="184" y="173" textAnchor="middle" fill="#f3f1ea" fontSize="11" fontFamily="monospace">
                  stdio MCP
                </text>
              </g>

              <g>
                <rect x="254" y="92" width="60" height="36" rx="8" fill="#181b22" stroke="rgba(95,184,148,0.45)" />
                <text x="284" y="114" textAnchor="middle" fill="#5fb894" fontSize="11" fontFamily="monospace">
                  Evals
                </text>
              </g>
            </svg>
          </div>
        </div>
      </article>

      {/* Card 5: docextract Bbox Grounding & Human-in-the-Loop Review */}
      <article className="card lg:col-span-4">
        <h3 className="card__title">Scores 99.1% bounding-box grounding</h3>
        <p className="card__text">
          Grounds every extracted invoice and receipt value to normalized PDF coordinates before
          human-in-the-loop review.
        </p>

        <div className="panel panel--sand" style={{ ["--p-h" as string]: "252px", ["--p-h-sm" as string]: "224px" }}>
          <div className="stage stage--fade-b px-3 sm:px-5 pt-6">
            <div className="ui-panel">
              <div className="ui-head justify-between">
                <span className="font-mono-code text-xs text-[#f3f1ea] whitespace-nowrap">
                  Review · #0419
                </span>
                <button
                  type="button"
                  onClick={() => setReviewApproved((prev) => !prev)}
                  className={`btn-press inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-code text-[11px] border shrink-0 ${
                    reviewApproved
                      ? "border-[#5fb894]/40 bg-[#5fb894]/15 text-[#5fb894]"
                      : "border-[#e2b458]/45 bg-[#e2b458]/15 text-[#e2b458]"
                  }`}
                >
                  {reviewApproved ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span>Approve extraction</span>
                    </>
                  ) : (
                    <>
                      <Flag className="h-3 w-3" aria-hidden="true" />
                      <span>Flagged for review</span>
                    </>
                  )}
                </button>
              </div>
              <ul className="divide-y divide-white/5 px-3.5 py-1.5 font-mono-code text-xs">
                {BBOX_FIELDS.map((item) => (
                  <li key={item.field} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <span className="text-[#f3f1ea]">{item.field}</span>
                      <span className="ml-2 text-[#9498a1]">{item.coords}</span>
                    </div>
                    <span className="text-[#7ab8d6] shrink-0">{item.score}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between py-2 text-[#5fb894]">
                  <span>Avg bbox grounding</span>
                  <span>99.1%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
