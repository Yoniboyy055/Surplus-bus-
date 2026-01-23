/**
 * Agent System Types
 * Common types for listing agents and property candidates
 */

export type SourcePlatform = 
  | 'gc_surplus' 
  | 'alberta_auction' 
  | 'bc_auction' 
  | 'sasksurplus' 
  | 'manual';

export type PropertyCategory = 
  | 'Vehicles'
  | 'Equipment'
  | 'Furniture'
  | 'Electronics'
  | 'Real Estate'
  | 'Industrial'
  | 'Other';

export interface PropertyData {
  title: string;
  description: string;
  category: PropertyCategory | string;
  location: string;
  price: number | null;
  photos: string[];
  closing_date: string | null;
  lot_number?: string;
  condition?: string;
}

export interface QualityBreakdown {
  completeness: number;   // 0-25: title, description, photos present
  condition: number;      // 0-20: condition info available
  liquidity: number;      // 0-15: category demand score
  source: number;         // 0-20: source reliability
  pricing: number;        // 0-20: has pricing info
}

export interface ParsedListing {
  source_platform: SourcePlatform;
  source_url: string;
  source_id: string;
  property_data: PropertyData;
  quality_score: number;
  quality_breakdown: QualityBreakdown;
  bucket: 'approve' | 'junk';
}

export interface ScrapeResult {
  success: boolean;
  items_found: number;
  items_queued: number;
  items_rejected: number;
  errors: string[];
  listings: ParsedListing[];
}

export interface AgentHealthEntry {
  agent_type: 'listing' | 'buyer';
  agent_name: string;
  status: 'success' | 'failure' | 'timeout';
  items_found: number;
  items_queued: number;
  items_rejected: number;
  execution_time_ms: number;
  error_message?: string;
  error_stack?: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
}
