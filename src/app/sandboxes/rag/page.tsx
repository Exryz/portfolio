import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";
import { RagSandbox } from "@/components/RagSandbox";
import { PROFILE } from "@/data/portfolio";
import { PRESET_EVAL_QUERIES, runRagPipeline } from "@/lib/rag-engine";

export const metadata: Metadata = {
  title: "RAG + MCP Sandbox — Exeryze",
  description:
    "Interactive Hybrid Okapi BM25 + Dense Cosine + Reciprocal Rank Fusion (k=60) and stdio MCP routing sandbox backed by helpdesk-agent runbooks.",
};

export default function RagSandboxPage() {
  const defaultPreset = PRESET_EVAL_QUERIES[0];
  const initialQuery =
    defaultPreset?.query ?? "Dropped my phone in water and locked out of 2FA";
  const initialResult = runRagPipeline(initialQuery, "hybrid_rerank", 4);

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#f3f1ea]">
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-[#090a0d]/95">
        <div className="wrap flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="btn-press flex items-center gap-2.5 text-sm font-medium text-[#f3f1ea]"
            >
              <span className="mark-ring" aria-hidden="true" />
              <span className="font-display text-xl font-medium tracking-tight">
                {PROFILE.handle}
              </span>
            </Link>
            <span className="hidden sm:inline-block text-white/20" aria-hidden="true">
              /
            </span>
            <span className="hidden sm:inline-block font-mono-code text-xs text-[#c9a66b]">
              sandboxes / rag-mcp
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#14161c] px-4 text-[14px] font-medium text-[#f3f1ea] hover:border-[#c9a66b]/60"
            >
              <ArrowLeft className="h-4 w-4 text-[#c9a66b]" aria-hidden="true" />
              <span>Portfolio</span>
            </Link>
            <a
              href="https://github.com/Exryz/helpdesk-agent"
              target="_blank"
              rel="noreferrer"
              className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#f3f1ea] px-4 text-[14px] font-medium text-[#090a0d] hover:bg-white"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">helpdesk-agent</span>
            </a>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20">
        <div className="wrap space-y-10">
          <div className="max-w-3xl" data-enter>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#14161c] px-3.5 py-1 text-xs font-medium text-[#f3f1ea]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c9a66b]" aria-hidden="true" />
              <span>Live Route Handler · POST /api/sandboxes/rag</span>
            </div>

            <h1 className="font-display text-4xl font-normal leading-[1.08] text-[#f3f1ea] sm:text-5xl">
              Hybrid RAG, RRF fusion, and stdio MCP routing.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[#9498a1]">
              Compare pure lexical Okapi BM25 against dense concept cosine similarity and
              cross-encoder reranking across 10 curated Northwind Labs runbooks, then inspect the
              synthesized response and typed MCP tool dispatch payload.
            </p>
          </div>

          <RagSandbox initialResult={initialResult} presets={PRESET_EVAL_QUERIES} />
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#060709] py-12">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#9498a1]">
          <span>{PROFILE.handle} · RAG &amp; MCP Evaluation Sandbox</span>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="hover:text-[#f3f1ea] transition-colors">
              Portfolio
            </Link>
            <Link href="/sandboxes/docextract" className="hover:text-[#f3f1ea] transition-colors">
              DocExtract Sandbox
            </Link>
            <a
              href="https://github.com/Exryz/helpdesk-agent"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f3f1ea] transition-colors"
            >
              helpdesk-agent
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
