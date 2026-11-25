"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronUp, Copy, Search } from "lucide-react";
import type {
  PresetEvalQuery,
  RagPipelineResponse,
  RetrievalMode,
} from "@/lib/rag-engine";

interface RagSandboxProps {
  readonly initialResult: RagPipelineResponse;
  readonly presets: readonly PresetEvalQuery[];
}

const MODE_OPTIONS: readonly { readonly id: RetrievalMode; readonly label: string }[] = [
  { id: "hybrid_rerank", label: "Hybrid RRF + Rerank" },
  { id: "dense", label: "Dense Cosine" },
  { id: "bm25", label: "Okapi BM25" },
];

const PRIORITY_BADGE_STYLES: Readonly<Record<"P1" | "P2" | "P3", string>> = {
  P1: "border-[#e47171]/40 bg-[#e47171]/15 text-[#e47171]",
  P2: "border-[#e2b458]/40 bg-[#e2b458]/15 text-[#e2b458]",
  P3: "border-white/10 bg-white/[0.04] text-[#9498a1]",
};

/** Interactive RAG + RRF + MCP retrieval workbench wired to POST /api/sandboxes/rag. */
export function RagSandbox({ initialResult, presets }: RagSandboxProps) {
  const [queryInput, setQueryInput] = useState(initialResult.query);
  const [mode, setMode] = useState<RetrievalMode>(initialResult.mode);
  const [result, setResult] = useState<RagPipelineResponse>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(
    initialResult.results[0]?.doc.id ?? null,
  );
  const [copiedJson, setCopiedJson] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function runQuery(nextQuery: string, nextMode: RetrievalMode) {
    const trimmed = nextQuery.trim();
    if (trimmed.length === 0) {
      setErrorMessage("Enter an IT support question or symptom between 1 and 300 characters.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/sandboxes/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, mode: nextMode, topK: 4 }),
      });
      const payload = (await response.json()) as RagPipelineResponse | { error?: string };
      if (!response.ok) {
        const msg = "error" in payload && payload.error ? payload.error : "Failed to run retrieval pipeline.";
        setErrorMessage(msg);
        return;
      }
      const nextResult = payload as RagPipelineResponse;
      setResult(nextResult);
      setExpandedDocId(nextResult.results[0]?.doc.id ?? null);
    } catch {
      setErrorMessage("Network error calling /api/sandboxes/rag.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(queryInput, mode);
  }

  function handlePresetClick(presetQuery: string) {
    setQueryInput(presetQuery);
    void runQuery(presetQuery, mode);
  }

  function handleModeChange(nextMode: RetrievalMode) {
    setMode(nextMode);
    const activeQuery = queryInput.trim().length > 0 ? queryInput : result.query;
    void runQuery(activeQuery, nextMode);
  }

  const mcpRpcPayload = JSON.stringify(
    {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        server: result.mcpDispatch.server,
        transport: result.mcpDispatch.transport,
        name: result.mcpDispatch.tool,
        arguments: result.mcpDispatch.arguments,
      },
    },
    null,
    2,
  );

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(mcpRpcPayload);
      setCopiedJson(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopiedJson(false), 1500);
    } catch {
      setCopiedJson(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Query Console inside Lit Frieren Painterly Backdrop */}
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
                POST /api/sandboxes/rag
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-chip ui-chip--gold tabular-nums">
                {result.corpusSize} runbooks · RRF k=60
              </span>
              <span className="ui-chip ui-chip--ok tabular-nums">
                {result.latencyBreakdownMs.total_ms.toFixed(1)} ms
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-12 items-center">
              <div className="md:col-span-9 relative">
                <label htmlFor="rag-query-input" className="sr-only">
                  IT support query
                </label>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7ab8d6]"
                  aria-hidden="true"
                />
                <input
                  id="rag-query-input"
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  maxLength={300}
                  placeholder="Describe an IT issue (e.g. Dropped my phone in water and locked out of 2FA)"
                  className="w-full h-11 rounded-lg border border-white/15 bg-[#111318] pl-10 pr-4 text-[14px] text-[#f3f1ea] placeholder:text-[#9498a1] focus:outline-none focus:border-[#7ab8d6]"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-press w-full h-11 inline-flex items-center justify-center rounded-lg bg-[#f3f1ea] px-5 text-[14px] font-medium text-[#090a0d] hover:bg-white disabled:opacity-60"
                >
                  {isLoading ? "Running..." : "Run pipeline"}
                </button>
              </div>
            </form>

            {errorMessage ? (
              <p role="alert" className="text-xs font-mono-code text-[#e47171]">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Preset benchmark queries">
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#9498a1] mr-1">
                  Presets:
                </span>
                {presets.map((preset) => {
                  const active = result.query === preset.query;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetClick(preset.query)}
                      aria-pressed={active}
                      className={`btn-press rounded-md border px-2.5 py-1 font-mono-code text-xs transition-colors ${
                        active
                          ? "border-[#c9a66b]/65 bg-[#c9a66b]/15 text-[#f3f1ea]"
                          : "border-white/10 bg-white/[0.02] text-[#9498a1] hover:text-[#f3f1ea] hover:border-white/20"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div
                className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-[#111318] p-1 w-full sm:w-auto"
                role="group"
                aria-label="Retrieval mode"
              >
                {MODE_OPTIONS.map((option) => {
                  const active = mode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleModeChange(option.id)}
                      aria-pressed={active}
                      className={`btn-press flex-1 sm:flex-initial rounded-md px-2.5 py-1 font-mono-code text-xs transition-colors ${
                        active
                          ? "bg-[#7ab8d6]/20 text-[#7ab8d6] border border-[#7ab8d6]/35"
                          : "text-[#9498a1] hover:text-[#f3f1ea] border border-transparent"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Ranked Retrieval Telemetry & Runbooks */}
        <section className="card lg:col-span-7 min-w-0 space-y-5" aria-label="Ranked retrieval results">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-normal text-[#f3f1ea]">
                Ranked Runbook Candidates
              </h2>
              <p className="mt-1 text-sm text-[#9498a1]">
                Mode:{" "}
                <span className="font-mono-code text-[#c9a66b]">{result.mode}</span> — showing top{" "}
                <span className="tabular-nums">{result.results.length}</span> of{" "}
                <span className="tabular-nums">{result.corpusSize}</span> indexed runbooks
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {result.results.map((item) => {
              const isExpanded = expandedDocId === item.doc.id;
              return (
                <article
                  key={item.doc.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    item.rank === 1
                      ? "border-[#c9a66b]/45 bg-[#1b1e25]"
                      : "border-white/10 bg-[#171920]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono-code text-xs font-semibold tabular-nums ${
                            item.rank === 1 ? "text-[#c9a66b]" : "text-[#9498a1]"
                          }`}
                        >
                          #{item.rank}
                        </span>
                        <span className="font-mono-code text-xs text-[#7ab8d6]">{item.doc.id}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono-code text-[11px] ${
                            PRIORITY_BADGE_STYLES[item.doc.priority]
                          }`}
                        >
                          {item.doc.priority}
                        </span>
                        <span className="ui-chip">{item.doc.category}</span>
                        {item.rankDelta > 0 ? (
                          <span className="ui-chip ui-chip--ok tabular-nums">
                            +{item.rankDelta} vs BM25
                          </span>
                        ) : item.rankDelta < 0 ? (
                          <span className="ui-chip tabular-nums">{item.rankDelta} vs BM25</span>
                        ) : null}
                      </div>
                    </div>

                    <h3 className="text-[15px] font-medium leading-snug text-[#f3f1ea]">
                      {item.doc.title}
                    </h3>
                  </div>

                  {/* Score Telemetry Grid */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-code text-xs tabular-nums">
                    <div className="rounded-md border border-white/[0.07] bg-[#111318] px-2.5 py-1.5">
                      <div className="text-[11px] text-[#9498a1]">BM25</div>
                      <div className="text-[#f3f1ea]">{item.bm25Score.toFixed(3)}</div>
                    </div>
                    <div className="rounded-md border border-white/[0.07] bg-[#111318] px-2.5 py-1.5">
                      <div className="text-[11px] text-[#9498a1]">Dense Cosine</div>
                      <div className="text-[#7ab8d6]">{item.denseScore.toFixed(3)}</div>
                    </div>
                    <div className="rounded-md border border-white/[0.07] bg-[#111318] px-2.5 py-1.5">
                      <div className="text-[11px] text-[#9498a1]">RRF (k=60)</div>
                      <div className="text-[#f3f1ea]">{item.rrfScore.toFixed(4)}</div>
                    </div>
                    <div className="rounded-md border border-white/[0.07] bg-[#111318] px-2.5 py-1.5">
                      <div className="text-[11px] text-[#9498a1]">Rerank Score</div>
                      <div className="text-[#5fb894] font-semibold">
                        {item.rerankScore.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {/* Matched Lexical Tokens & Toggle */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 text-[#9498a1]">
                      <span className="font-mono-code text-[11px]">Lexical hits:</span>
                      {item.matchedTerms.length > 0 ? (
                        item.matchedTerms.map((term) => (
                          <span
                            key={term}
                            className="rounded border border-[#7ab8d6]/30 bg-[#7ab8d6]/10 px-1.5 py-0.5 font-mono-code text-[11px] text-[#7ab8d6]"
                          >
                            {term}
                          </span>
                        ))
                      ) : (
                        <span className="font-mono-code text-[11px] text-[#c9a66b]">
                          none (retrieved via semantic concept vector)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedDocId(isExpanded ? null : item.doc.id)}
                      aria-expanded={isExpanded}
                      className="btn-press inline-flex items-center gap-1 font-mono-code text-xs text-[#f3f1ea] hover:text-[#7ab8d6]"
                    >
                      <span>{isExpanded ? "Hide runbook" : "Inspect runbook"}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2 text-xs">
                      <div className="font-mono-code text-[#c9a66b]">Resolution steps</div>
                      <ol className="list-decimal pl-4 space-y-1 text-[#f3f1ea]/85 leading-relaxed">
                        {item.doc.resolution.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {/* Right: Grounded Answer + MCP Tool Dispatch */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
          <section className="card min-w-0 space-y-4" aria-label="Grounded response synthesis">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <h2 className="font-display text-2xl font-normal text-[#f3f1ea]">
                Grounded Response
              </h2>
              <div className="flex items-center gap-1.5">
                {result.citations.map((cite) => (
                  <span key={cite} className="ui-chip ui-chip--accent font-mono-code">
                    {cite}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[15px] leading-relaxed text-[#f3f1ea]/90">
              {result.groundedAnswer}
            </p>

            <ul className="rows font-mono-code text-xs tabular-nums">
              <li>
                <span className="text-[#9498a1]">Okapi BM25 stage</span>
                <span className="text-[#f3f1ea]">{result.latencyBreakdownMs.bm25_ms.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">Dense semantic cosine</span>
                <span className="text-[#7ab8d6]">{result.latencyBreakdownMs.dense_ms.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">RRF fusion (k=60)</span>
                <span className="text-[#f3f1ea]">{result.latencyBreakdownMs.rrf_fusion_ms.toFixed(1)} ms</span>
              </li>
              <li>
                <span className="text-[#9498a1]">Cross-encoder rerank</span>
                <span className="text-[#5fb894]">{result.latencyBreakdownMs.rerank_ms.toFixed(1)} ms</span>
              </li>
            </ul>
          </section>

          <section className="card min-w-0" aria-label="stdio MCP tool dispatch">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="card__title">stdio MCP Tool Dispatch</h3>
              <span className={`rounded border px-2 py-0.5 font-mono-code text-xs ${PRIORITY_BADGE_STYLES[result.mcpDispatch.priority]}`}>
                {result.mcpDispatch.priority}
              </span>
            </div>
            <p className="card__text">
              Routes priority escalation and runbook citation directly to{" "}
              <span className="font-mono-code text-[#7ab8d6]">{result.mcpDispatch.tool}</span>.
            </p>

            <div className="panel panel--sky mt-5 p-4" style={{ ["--p-h" as string]: "220px" }}>
              <div className="relative z-10 ui-panel">
                <div className="ui-head justify-between">
                  <span className="font-mono-code text-xs text-[#f3f1ea] truncate">
                    {result.mcpDispatch.server} // {result.mcpDispatch.transport}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyJson()}
                    className="btn-press inline-flex items-center gap-1 rounded border border-white/15 px-2 py-0.5 font-mono-code text-xs text-[#f3f1ea] hover:border-[#c9a66b]"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3 w-3 text-[#5fb894]" aria-hidden="true" />
                        <span className="text-[#5fb894]">Copied ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 whitespace-pre-wrap break-words overflow-x-auto font-mono-code text-xs leading-relaxed text-[#f3f1ea]/90">
                  <code>{mcpRpcPayload}</code>
                </pre>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <a
              href="https://github.com/Exryz/helpdesk-agent"
              target="_blank"
              rel="noreferrer"
              className="btn-press inline-flex items-center gap-1.5 text-sm font-medium text-[#7ab8d6] hover:text-[#f3f1ea]"
            >
              <span>Inspect full Python implementation in helpdesk-agent</span>
              <ArrowUpRight className="h-4 w-4 text-[#c9a66b]" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
