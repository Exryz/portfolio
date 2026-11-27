import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";
import { DocExtractSandbox } from "@/components/DocExtractSandbox";
import { PROFILE } from "@/data/portfolio";
import { PRESET_DOCUMENTS, evaluateDocumentPipeline } from "@/lib/docextract-engine";

export const metadata: Metadata = {
  title: "DocExtract Validator Sandbox — Exeryze",
  description:
    "Interactive Document AI sandbox with normalized OCR bounding boxes, exact Decimal validation across 7 financial rules, ISO-7064 IBAN mod-97 checks, and deterministic repair loops.",
};

export default function DocExtractSandboxPage() {
  const defaultPreset = PRESET_DOCUMENTS[0];
  if (!defaultPreset) {
    throw new Error("PRESET_DOCUMENTS must contain at least one invoice preset.");
  }

  const initialResult = evaluateDocumentPipeline(defaultPreset, { applyRepair: false });

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#f3f1ea]">
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-[#090a0d]/95">
        <div className="wrap flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
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
            <span className="hidden sm:inline-block font-mono-code text-xs text-[#c9a66b] truncate">
              sandboxes / docextract
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/sandboxes/rag"
              className="btn-press hidden md:inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-[14px] font-medium text-[#9498a1] hover:text-[#f3f1ea] hover:border-white/20"
            >
              RAG Sandbox
            </Link>
            <Link
              href="/"
              className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-[#14161c] px-4 text-[14px] font-medium text-[#f3f1ea] hover:border-[#c9a66b]/60"
            >
              <ArrowLeft className="h-4 w-4 text-[#c9a66b]" aria-hidden="true" />
              <span>Portfolio</span>
            </Link>
            <a
              href="https://github.com/Exryz/docextract"
              target="_blank"
              rel="noreferrer"
              className="btn-press inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#f3f1ea] px-4 text-[14px] font-medium text-[#090a0d] hover:bg-white"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">docextract</span>
            </a>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20">
        <div className="wrap space-y-10">
          <div className="max-w-3xl" data-enter>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#14161c] px-3.5 py-1 text-xs font-medium text-[#f3f1ea]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c9a66b]" aria-hidden="true" />
              <span>Live Route Handler · POST /api/sandboxes/docextract</span>
            </div>

            <h1 className="font-display text-4xl font-normal leading-[1.08] text-[#f3f1ea] sm:text-5xl">
              Deterministic Document AI, bbox grounding, and repair loops.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-[#9498a1]">
              Inspect OCR bounding-box coordinates across synthetic invoices and thermal receipts,
              edit extracted figures live against 7 exact integer-scaled financial rules and
              ISO-7064 IBAN mod-97 checks, and step through deterministic validation repair.
            </p>
          </div>

          <DocExtractSandbox
            initialResult={initialResult}
            presets={PRESET_DOCUMENTS}
          />
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#060709] py-12">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#9498a1]">
          <span>{PROFILE.handle} · Document AI &amp; Financial Validator Sandbox</span>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="hover:text-[#f3f1ea] transition-colors">
              Portfolio
            </Link>
            <Link href="/sandboxes/rag" className="hover:text-[#f3f1ea] transition-colors">
              RAG Sandbox
            </Link>
            <a
              href="https://github.com/Exryz/docextract"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f3f1ea] transition-colors"
            >
              docextract
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
