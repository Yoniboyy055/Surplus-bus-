import type { ParserContext, ParserResult } from "../types";

/**
 * HOOK (not implemented): GCSurplus “What has Sold” open dataset (OGL–Canada).
 * Dataset: https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4
 * Sold history only — not live open auctions. Enable after Yonatan approves ingest.
 */
export async function parseGcSurplusSoldCsvHook(_ctx: ParserContext): Promise<ParserResult> {
  console.log("[hook] GCSurplus sold CSV ingest not enabled — waiting on feed-direction decision");
  return { opportunities: [] };
}
