export type ProjectId = "helpdesk-agent" | "docextract";

export interface MetricItem {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}

export interface PortfolioProject {
  readonly id: ProjectId;
  readonly name: string;
  readonly title: string;
  readonly tagline: string;
  readonly repoUrl: string;
  readonly stack: readonly string[];
  readonly testCount: number;
  readonly evalCountLabel: string;
  readonly metrics: readonly MetricItem[];
  readonly architectureNodes?: readonly string[];
  readonly validationRules?: readonly string[];
}

export const PROFILE = {
  handle: "Exeryze",
  role: "AI/ML Engineer",
  headline: "Grounded RAG agents and verified Document AI pipelines.",
  subheadline:
    "Production AI systems built with hybrid vector-lexical retrieval, cross-encoder reranking, deterministic Decimal validation loops, and stdio MCP tool orchestration.",
  githubUrl: "https://github.com/Exryz",
} as const;

export const PROJECTS: readonly PortfolioProject[] = [
  {
    id: "helpdesk-agent",
    name: "helpdesk-agent",
    title: "helpdesk-agent — Production RAG & MCP IT Support Agent",
    tagline:
      "Hybrid BM25 + dense Qdrant retrieval with cross-encoder reranking, LangGraph tool routing, stdio MCP ticketing, and SQLite/InfluxDB telemetry.",
    repoUrl: "https://github.com/Exryz/helpdesk-agent",
    stack: [
      "Python",
      "LangGraph",
      "LiteLLM",
      "FastAPI",
      "Qdrant",
      "BM25",
      "FastEmbed",
      "MCP",
      "Playwright",
      "InfluxDB",
      "Chainlit",
    ],
    testCount: 89,
    evalCountLabel: "37 labelled queries",
    metrics: [
      { label: "Hit@4 (hybrid_rerank)", value: "100.0%" },
      { label: "Hybrid Rerank MRR", value: "0.966" },
      { label: "Dense MRR", value: "0.982" },
      { label: "Automated Tests", value: "89", note: "pytest + Chromium e2e" },
      { label: "Eval Queries", value: "37" },
    ],
    architectureNodes: [
      "User Query",
      "BM25 + Qdrant RRF",
      "Cross-Encoder Rerank",
      "LangGraph + MCP Tools",
      "InfluxDB Telemetry",
    ],
  },
  {
    id: "docextract",
    name: "docextract",
    title: "docextract — Verified Invoice & Receipt Document AI Pipeline",
    tagline:
      "Layout-aware PDF/ONNX OCR extraction paired with a validation-error repair loop, deterministic Decimal financial rules, and human-in-the-loop review.",
    repoUrl: "https://github.com/Exryz/docextract",
    stack: [
      "Python",
      "FastAPI",
      "Pydantic",
      "LiteLLM",
      "pypdfium2",
      "RapidOCR",
      "SQLModel",
      "Jinja2",
      "HTMX",
      "Docker",
      "mypy --strict",
    ],
    testCount: 46,
    evalCountLabel: "24 synthetic docs",
    metrics: [
      { label: "Field Micro F1", value: "100.0%", note: "offline synthetic benchmark" },
      { label: "Fault Catch Rate", value: "100.0%", note: "offline synthetic benchmark" },
      { label: "Bbox Grounding", value: "99.1%" },
      { label: "Automated Tests", value: "46", note: "pytest + mypy --strict" },
      { label: "Eval Docs", value: "24" },
    ],
    validationRules: [
      "line_item_math",
      "subtotal_math",
      "tax_breakdown",
      "grand_total_math",
      "invoice_due_date_order",
      "iban_mod97",
      "duplicate_vendor_invoice",
    ],
  },
] as const;

export function getProjectById(id: string): PortfolioProject | undefined {
  return PROJECTS.find((project) => project.id === id);
}

export function getTotalAutomatedTests(): number {
  return PROJECTS.reduce((acc, project) => acc + project.testCount, 0);
}
