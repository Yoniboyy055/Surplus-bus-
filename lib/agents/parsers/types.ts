export type ParsedOpportunity = {
  source: string;
  external_id: string;
  source_url: string;
  province: string;
  category: string | null;
  title: string;
  description: string | null;
  estimated_value: number | null;
  closing_date: string | null;
  issuing_entity: string | null;
  status: string;
  /** Present when the parser can observe live auction pricing data. */
  current_price?: number | null;
  /** Present when the parser can observe the live bid count. */
  bid_count?: number | null;
  /**
   * True when this record represents the final observed state of the lot
   * (e.g. auction closed, item sold/unsold/withdrawn). Once a terminal
   * snapshot is written, `final_price` on canonical_lots becomes immutable.
   */
  is_terminal?: boolean;
};

/**
 * A point-in-time snapshot of a lot's auction state as observed by a parser.
 * Constructed from a `ParsedOpportunity` in the agent run loop and used to
 * drive both `lot_snapshots` writes and the `writeFinalOutcome` call.
 */
export type LotSnapshot = {
  /** canonical_lots.id for the lot this snapshot belongs to. */
  lot_id: string;
  current_price: number | null;
  bid_count: number | null;
  /** Mirrors ParsedOpportunity.status (e.g. 'active', 'sold', 'unsold'). */
  status: string;
  /** True when this snapshot represents the lot's terminal/final state. */
  is_terminal: boolean;
  /** ISO-8601 timestamp of when the parser observed this state. */
  observed_at: string;
  /** The parser_key of the source that produced this snapshot. */
  parser_key: string;
};

export type ParserResult = {
  opportunities: ParsedOpportunity[];
  error?: string;
  /**
   * Set by discovery-role parsers to the real auction vendor URL discovered
   * from the city/government page. When present, the runner writes it to
   * sources.real_host_url and skips source_records / canonical writes.
   */
  reconUrl?: string;
};

export type ParserContext = {
  baseUrl: string;
  feedUrl: string | null;
  parserKey: string;
};
