/**
 * Quality Scoring for Property Candidates
 * Scores candidates 0-100 to determine bucket (approve vs junk)
 */

import type { PropertyData, QualityBreakdown, SourcePlatform } from './types';

const HIGH_LIQUIDITY_CATEGORIES = ['Vehicles', 'Equipment', 'Real Estate', 'Industrial'];
const MEDIUM_LIQUIDITY_CATEGORIES = ['Electronics', 'Furniture'];

const SOURCE_RELIABILITY: Record<SourcePlatform, number> = {
  gc_surplus: 20,        // Federal government - highest trust
  alberta_auction: 18,   // Provincial government
  bc_auction: 18,        // Provincial government
  sasksurplus: 18,       // Provincial government
  manual: 10,            // Manual entry - lower trust
};

export function calculateQualityScore(
  data: PropertyData,
  source: SourcePlatform
): { score: number; breakdown: QualityBreakdown } {
  const breakdown: QualityBreakdown = {
    completeness: 0,
    condition: 0,
    liquidity: 0,
    source: 0,
    pricing: 0,
  };

  // Completeness (0-25)
  if (data.title && data.title.length > 10) breakdown.completeness += 8;
  if (data.description && data.description.length > 50) breakdown.completeness += 8;
  if (data.photos && data.photos.length > 0) breakdown.completeness += 5;
  if (data.location && data.location.length > 3) breakdown.completeness += 4;

  // Condition (0-20)
  if (data.condition) {
    const conditionLower = data.condition.toLowerCase();
    if (conditionLower.includes('new') || conditionLower.includes('excellent')) {
      breakdown.condition = 20;
    } else if (conditionLower.includes('good') || conditionLower.includes('working')) {
      breakdown.condition = 15;
    } else if (conditionLower.includes('fair') || conditionLower.includes('used')) {
      breakdown.condition = 10;
    } else {
      breakdown.condition = 5;
    }
  } else if (data.description) {
    // Try to infer condition from description
    const descLower = data.description.toLowerCase();
    if (descLower.includes('runs') || descLower.includes('works') || descLower.includes('operational')) {
      breakdown.condition = 12;
    } else if (descLower.includes('as is') || descLower.includes('salvage')) {
      breakdown.condition = 5;
    } else {
      breakdown.condition = 8;
    }
  }

  // Liquidity (0-15)
  if (HIGH_LIQUIDITY_CATEGORIES.includes(data.category)) {
    breakdown.liquidity = 15;
  } else if (MEDIUM_LIQUIDITY_CATEGORIES.includes(data.category)) {
    breakdown.liquidity = 10;
  } else {
    breakdown.liquidity = 5;
  }

  // Source reliability (0-20)
  breakdown.source = SOURCE_RELIABILITY[source] ?? 10;

  // Pricing (0-20)
  if (data.price !== null && data.price > 0) {
    breakdown.pricing = 20;
  } else if (data.closing_date) {
    // Auction without reserve price is still useful
    breakdown.pricing = 10;
  }

  const score = 
    breakdown.completeness + 
    breakdown.condition + 
    breakdown.liquidity + 
    breakdown.source + 
    breakdown.pricing;

  return { score, breakdown };
}

export function determineBucket(score: number): 'approve' | 'junk' {
  // Threshold: 50+ goes to approve queue, below goes to junk
  return score >= 50 ? 'approve' : 'junk';
}
