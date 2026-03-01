export type DemoOpportunity = {
  id: string;
  title: string;
  province: string;
  region: string;
  category: "land" | "industrial" | "commercial" | "equipment" | "mixed_use";
  source: string;
  estimatedValue: number;
  closingDate: string;
  score: number;
  confidence: "high" | "medium" | "low";
  tags: string[];
  status: "new" | "watching" | "hot";
};

export type DemoRun = {
  id: string;
  agentName: string;
  status: "success" | "failure" | "partial";
  startedAt: string;
  completedAt: string;
  itemsFound: number;
  itemsUpserted: number;
  notes?: string;
};

export type DemoAlertRule = {
  id: string;
  name: string;
  region: string;
  minScore: number;
  categories: string[];
  frequency: "instant" | "daily" | "weekly";
  active: boolean;
  triggeredToday: number;
};

export const demoAlertRules: DemoAlertRule[] = [
  { id: "ar_1", name: "Ontario Industrial Deals", region: "Ontario", minScore: 78, categories: ["industrial", "equipment"], frequency: "instant", active: true, triggeredToday: 3 },
  { id: "ar_2", name: "Atlantic Land Assemblies", region: "Atlantic", minScore: 70, categories: ["land", "mixed_use"], frequency: "daily", active: true, triggeredToday: 1 },
  { id: "ar_3", name: "High-Value Western Pipeline", region: "West", minScore: 85, categories: ["commercial", "industrial"], frequency: "weekly", active: true, triggeredToday: 0 },
];

export const demoOpportunities: DemoOpportunity[] = [
  { id: "demo-opp-1", title: "Former Transit Yard Redevelopment Parcel", province: "ON", region: "Greater Toronto Area", category: "land", source: "Infrastructure Ontario", estimatedValue: 4200000, closingDate: "2026-04-19", score: 92, confidence: "high", tags: ["rezoning-ready", "municipal-sale"], status: "hot" },
  { id: "demo-opp-2", title: "Fleet Vehicles Bulk Liquidation", province: "AB", region: "Calgary", category: "equipment", source: "City of Calgary Surplus", estimatedValue: 680000, closingDate: "2026-03-22", score: 81, confidence: "high", tags: ["fleet", "quick-close"], status: "watching" },
  { id: "demo-opp-3", title: "Industrial Warehouse + Yard Package", province: "AB", region: "Edmonton", category: "industrial", source: "Government of Alberta Surplus", estimatedValue: 2750000, closingDate: "2026-04-02", score: 88, confidence: "high", tags: ["income-potential", "heavy-access"], status: "hot" },
  { id: "demo-opp-4", title: "Downtown Commercial Building Disposition", province: "ON", region: "Hamilton", category: "commercial", source: "City of Hamilton Surplus", estimatedValue: 1900000, closingDate: "2026-03-17", score: 74, confidence: "medium", tags: ["core-location", "tenant-vacancy-risk"], status: "new" },
  { id: "demo-opp-5", title: "Mixed-Use Civic Block (Phased Sale)", province: "ON", region: "Ottawa", category: "mixed_use", source: "City of Ottawa Surplus", estimatedValue: 5600000, closingDate: "2026-05-01", score: 86, confidence: "medium", tags: ["phased-disposition", "public-private"], status: "watching" },
  { id: "demo-opp-6", title: "Legacy Snow-Clearing Equipment Auction", province: "ON", region: "Toronto", category: "equipment", source: "City of Toronto Surplus", estimatedValue: 215000, closingDate: "2026-03-11", score: 63, confidence: "low", tags: ["high-maintenance", "parts-value"], status: "new" },
  { id: "demo-opp-7", title: "Waterfront Parcel Bundle (Large Data Example)", province: "BC", region: "Vancouver", category: "land", source: "Provincial Crown Assets", estimatedValue: 9800000, closingDate: "2026-06-15", score: 91, confidence: "high", tags: ["high-competition", "environmental-review"], status: "hot" },
  { id: "demo-opp-8", title: "Medical Office Conversion Candidate", province: "NS", region: "Halifax", category: "commercial", source: "Nova Scotia Surplus", estimatedValue: 1250000, closingDate: "2026-03-30", score: 72, confidence: "medium", tags: ["adaptive-reuse", "zoning-variance"], status: "watching" },
];

export const demoRuns: DemoRun[] = [
  { id: "demo-run-1", agentName: "city_toronto_surplus", status: "success", startedAt: "2026-03-01T09:00:00.000Z", completedAt: "2026-03-01T09:03:20.000Z", itemsFound: 126, itemsUpserted: 19 },
  { id: "demo-run-2", agentName: "infrastructure_ontario_surplus", status: "partial", startedAt: "2026-03-01T08:20:00.000Z", completedAt: "2026-03-01T08:26:00.000Z", itemsFound: 42, itemsUpserted: 12, notes: "Source latency warning; retried 2 pages." },
  { id: "demo-run-3", agentName: "city_calgary_surplus", status: "failure", startedAt: "2026-03-01T07:35:00.000Z", completedAt: "2026-03-01T07:36:15.000Z", itemsFound: 0, itemsUpserted: 0, notes: "Rate-limited upstream (429). Auto-recovery scheduled." },
  { id: "demo-run-4", agentName: "ab_surplus", status: "success", startedAt: "2026-03-01T07:00:00.000Z", completedAt: "2026-03-01T07:05:10.000Z", itemsFound: 312, itemsUpserted: 40, notes: "Large import example (300+ rows)." },
];

export const demoTrends = [
  { day: "Mon", opportunities: 15, alerts: 4 },
  { day: "Tue", opportunities: 18, alerts: 6 },
  { day: "Wed", opportunities: 11, alerts: 3 },
  { day: "Thu", opportunities: 23, alerts: 8 },
  { day: "Fri", opportunities: 27, alerts: 9 },
  { day: "Sat", opportunities: 13, alerts: 2 },
  { day: "Sun", opportunities: 16, alerts: 5 },
];
