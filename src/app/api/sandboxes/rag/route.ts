import { NextResponse } from "next/server";
import {
  KB_CORPUS,
  PRESET_EVAL_QUERIES,
  type RetrievalMode,
  runRagPipeline,
} from "@/lib/rag-engine";

const VALID_MODES = new Set<RetrievalMode>(["bm25", "dense", "hybrid_rerank"]);
const MAX_QUERY_LENGTH = 300;

interface RagRequestPayload {
  query?: unknown;
  mode?: unknown;
  topK?: unknown;
}

/** Lists corpus metadata, supported retrieval modes, and preset benchmark queries. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      corpusSize: KB_CORPUS.length,
      modes: ["hybrid_rerank", "dense", "bm25"] as const,
      presets: PRESET_EVAL_QUERIES,
      documents: KB_CORPUS.map(({ id, slug, title, category, priority, tags }) => ({
        id,
        slug,
        title,
        category,
        priority,
        tags,
      })),
    },
    { status: 200 },
  );
}

/** Executes hybrid RAG retrieval + RRF + reranking + MCP dispatch for a validated query. */
export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const payload = rawBody as RagRequestPayload;

  if (typeof payload.query !== "string") {
    return NextResponse.json({ error: "Field 'query' must be a string." }, { status: 400 });
  }

  const trimmedQuery = payload.query.trim();
  if (trimmedQuery.length === 0 || trimmedQuery.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Field 'query' must be between 1 and ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let mode: RetrievalMode = "hybrid_rerank";
  if (payload.mode !== undefined) {
    if (typeof payload.mode !== "string" || !VALID_MODES.has(payload.mode as RetrievalMode)) {
      return NextResponse.json(
        { error: "Field 'mode' must be one of: hybrid_rerank, dense, bm25." },
        { status: 400 },
      );
    }
    mode = payload.mode as RetrievalMode;
  }

  let topK = 4;
  if (payload.topK !== undefined) {
    if (typeof payload.topK !== "number" || !Number.isFinite(payload.topK)) {
      return NextResponse.json(
        { error: "Field 'topK' must be a finite integer between 1 and 6." },
        { status: 400 },
      );
    }
    topK = Math.min(Math.max(Math.trunc(payload.topK), 1), 6);
  }

  const result = runRagPipeline(trimmedQuery, mode, topK);
  return NextResponse.json(result, { status: 200 });
}
