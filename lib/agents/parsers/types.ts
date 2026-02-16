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
};

export type ParserResult = {
  opportunities: ParsedOpportunity[];
  error?: string;
};

export type ParserContext = {
  baseUrl: string;
  feedUrl: string | null;
  parserKey: string;
};
