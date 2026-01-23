/**
 * GC Surplus Parser
 * Parses listings from Government of Canada surplus sales
 * 
 * Target: https://www.gcsurplus.ca
 * The federal government surplus auction platform
 */

import * as cheerio from 'cheerio';
import type { ParsedListing, PropertyData, PropertyCategory } from '../types';
import { calculateQualityScore, determineBucket } from '../scoring';

const SOURCE_PLATFORM = 'gc_surplus' as const;
const BASE_URL = 'https://www.gcsurplus.ca';
const SEARCH_URL = `${BASE_URL}/mn-eng.cfm?snc=wfsav&vndsld=0`;

// GC Surplus uses specific category codes
const CATEGORY_MAP: Record<string, PropertyCategory> = {
  'vehicles': 'Vehicles',
  'automobiles': 'Vehicles',
  'trucks': 'Vehicles',
  'boats': 'Vehicles',
  'aircraft': 'Vehicles',
  'machinery': 'Equipment',
  'equipment': 'Equipment',
  'tools': 'Equipment',
  'office': 'Furniture',
  'furniture': 'Furniture',
  'computer': 'Electronics',
  'electronic': 'Electronics',
  'it assets': 'Electronics',
  'real property': 'Real Estate',
  'land': 'Real Estate',
  'buildings': 'Real Estate',
  'industrial': 'Industrial',
  'scientific': 'Equipment',
  'medical': 'Equipment',
};

function normalizeCategory(rawCategory: string): PropertyCategory {
  const lower = rawCategory.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  
  return 'Other';
}

function extractLocation(text: string): string {
  // Canadian provinces and major cities
  const locations: [string, string][] = [
    ['Ottawa', 'ON'],
    ['Toronto', 'ON'],
    ['Montreal', 'QC'],
    ['Montréal', 'QC'],
    ['Vancouver', 'BC'],
    ['Calgary', 'AB'],
    ['Edmonton', 'AB'],
    ['Winnipeg', 'MB'],
    ['Halifax', 'NS'],
    ['Quebec', 'QC'],
    ['Québec', 'QC'],
    ['Victoria', 'BC'],
    ['Regina', 'SK'],
    ['Saskatoon', 'SK'],
    ['Ontario', 'ON'],
    ['British Columbia', 'BC'],
    ['Alberta', 'AB'],
    ['Quebec', 'QC'],
    ['Manitoba', 'MB'],
    ['Saskatchewan', 'SK'],
    ['Nova Scotia', 'NS'],
    ['New Brunswick', 'NB'],
    ['Newfoundland', 'NL'],
  ];
  
  for (const [city, province] of locations) {
    if (text.includes(city)) {
      return `${city}, ${province}`;
    }
  }
  
  // Check for province codes
  const provinceMatch = text.match(/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/);
  if (provinceMatch) {
    return `${provinceMatch[1]}, Canada`;
  }
  
  return 'Canada';
}

function extractPrice(text: string): number | null {
  // Look for CAD price patterns
  const patterns = [
    /\$[\d,]+(?:\.\d{2})?(?:\s*CAD)?/,
    /CAD\s*\$?[\d,]+(?:\.\d{2})?/,
    /Current Bid:?\s*\$?([\d,]+)/i,
    /Reserve:?\s*\$?([\d,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[0].replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  
  return null;
}

function extractClosingDate(text: string): string | null {
  // GC Surplus uses specific date formats
  const patterns = [
    /Closing:?\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)/i,
    /End(?:s|ing)?:?\s*(\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\w+\s+\d{1,2},?\s+\d{4})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date.toISOString();
        }
      } catch {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

/**
 * Parse GC Surplus search results page
 */
export function parseGCSurplusListings(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  
  // GC Surplus typically uses table-based layouts or specific item containers
  const itemSelectors = [
    'table.listTable tr',
    '.sale-item',
    '.auction-item',
    '[class*="listing"]',
    'tr[onclick]',
    'div[data-sale-id]',
  ];
  
  let $items: ReturnType<typeof $> | null = null;
  
  for (const selector of itemSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      $items = found;
      break;
    }
  }
  
  // Fallback: look for links to sale items
  if (!$items || $items.length === 0) {
    $items = $('a[href*="sc=enc-bid"], a[href*="sale"]').closest('tr, div');
  }
  
  if (!$items || $items.length === 0) {
    return listings;
  }
  
  $items.each((index: number, element: cheerio.Element) => {
    try {
      const $item = $(element);
      
      // Skip header rows
      if ($item.find('th').length > 0) return;
      
      // Extract title - look in multiple places
      let title = '';
      const titleCandidates = [
        $item.find('a[href*="enc-bid"], a[href*="sale"]').first().text(),
        $item.find('td:nth-child(2), td:nth-child(1)').first().text(),
        $item.find('.item-title, .sale-title').text(),
      ];
      
      for (const candidate of titleCandidates) {
        const trimmed = candidate.trim();
        if (trimmed.length > 5 && !trimmed.match(/^\d+$/)) {
          title = trimmed;
          break;
        }
      }
      
      if (!title || title.length < 3) return;
      
      // Extract URL
      let itemUrl = $item.find('a[href*="enc-bid"], a[href*="sale"], a[href]').first().attr('href') || '';
      if (itemUrl && !itemUrl.startsWith('http')) {
        itemUrl = `${BASE_URL}/${itemUrl.replace(/^\//, '')}`;
      }
      
      // Extract source ID
      const sourceIdMatch = itemUrl.match(/scn=(\d+)/) || 
                           itemUrl.match(/id=(\d+)/) ||
                           itemUrl.match(/\/(\d+)(?:[?\/]|$)/);
      const sourceId = sourceIdMatch ? `gc-${sourceIdMatch[1]}` : `gc-${Date.now()}-${index}`;
      
      // Extract description
      const description = $item.find('.description, td:nth-child(3)').text().trim() || title;
      
      // Extract category
      const categoryText = $item.find('.category, td.category').text() || 
                          $item.attr('data-category') || '';
      const category = normalizeCategory(categoryText || title);
      
      // Extract location
      const locationText = $item.find('.location, td.location').text() || 
                          $item.text();
      const location = extractLocation(locationText);
      
      // Extract price/current bid
      const priceText = $item.find('.price, .bid, td:contains("$")').text() ||
                       $item.text();
      const price = extractPrice(priceText);
      
      // Extract closing date
      const dateText = $item.find('.closing, .end-date, td:last-child').text() ||
                      $item.text();
      const closingDate = extractClosingDate(dateText);
      
      // Extract photos
      const photos: string[] = [];
      $item.find('img[src]').each((_, img) => {
        let src = $(img).attr('src') || '';
        if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('pixel')) {
          if (!src.startsWith('http')) {
            src = `${BASE_URL}/${src.replace(/^\//, '')}`;
          }
          photos.push(src);
        }
      });
      
      const propertyData: PropertyData = {
        title: title.substring(0, 500),
        description: description.substring(0, 2000),
        category,
        location,
        price,
        photos,
        closing_date: closingDate,
      };
      
      const { score, breakdown } = calculateQualityScore(propertyData, SOURCE_PLATFORM);
      
      listings.push({
        source_platform: SOURCE_PLATFORM,
        source_url: itemUrl || SEARCH_URL,
        source_id: sourceId,
        property_data: propertyData,
        quality_score: score,
        quality_breakdown: breakdown,
        bucket: determineBucket(score),
      });
      
    } catch (error) {
      console.error('Error parsing GC Surplus listing item:', error);
    }
  });
  
  return listings;
}

/**
 * Parse a single GC Surplus listing detail page
 */
export function parseGCSurplusSingleListing(html: string, sourceUrl: string): ParsedListing | null {
  const $ = cheerio.load(html);
  
  try {
    // Extract title
    const title = $('h1, .sale-title, #itemTitle').first().text().trim() ||
                 $('title').text().split('-')[0]?.trim() || '';
    
    if (!title || title.length < 3) return null;
    
    // Extract description
    const description = 
      $('#itemDescription, .description, .sale-description').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      title;
    
    // Extract source ID
    const sourceIdMatch = sourceUrl.match(/scn=(\d+)/) || 
                         sourceUrl.match(/id=(\d+)/);
    const sourceId = sourceIdMatch ? `gc-${sourceIdMatch[1]}` : `gc-${Date.now()}`;
    
    // Extract all page text for parsing
    const pageText = $('body').text();
    
    // Extract category
    const categoryText = $('.category, #category, [class*="category"]').first().text();
    const category = normalizeCategory(categoryText || title);
    
    // Extract location
    const location = extractLocation(
      $('.location, #location, [class*="location"]').text() || pageText
    );
    
    // Extract price
    const price = extractPrice(
      $('.current-bid, .price, #currentBid').text() || pageText
    );
    
    // Extract closing date
    const closingDate = extractClosingDate(
      $('.closing-date, #closingDate, [class*="closing"]').text() || pageText
    );
    
    // Extract photos
    const photos: string[] = [];
    $('.gallery img, #itemImages img, .sale-images img, [class*="photo"] img').each((_, img) => {
      let src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src && !src.includes('thumb') && !src.includes('icon')) {
        if (!src.startsWith('http')) {
          src = `${BASE_URL}/${src.replace(/^\//, '')}`;
        }
        photos.push(src);
      }
    });
    
    // Check for condition info
    const condition = $('#condition, .condition, [class*="condition"]').first().text().trim();
    
    const propertyData: PropertyData = {
      title,
      description: description.substring(0, 2000),
      category,
      location,
      price,
      photos: [...new Set(photos)].slice(0, 10),
      closing_date: closingDate,
      condition: condition || undefined,
    };
    
    const { score, breakdown } = calculateQualityScore(propertyData, SOURCE_PLATFORM);
    
    return {
      source_platform: SOURCE_PLATFORM,
      source_url: sourceUrl,
      source_id: sourceId,
      property_data: propertyData,
      quality_score: score,
      quality_breakdown: breakdown,
      bucket: determineBucket(score),
    };
    
  } catch (error) {
    console.error('Error parsing GC Surplus single listing:', error);
    return null;
  }
}

/**
 * Fetch and parse GC Surplus listings
 */
export async function scrapeGCSurplusListings(): Promise<{
  listings: ParsedListing[];
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    const response = await fetch(SEARCH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      errors.push(`HTTP ${response.status}: ${response.statusText}`);
      return { listings: [], errors };
    }
    
    const html = await response.text();
    
    // Check for access issues
    if (html.includes('Access Denied') || html.includes('blocked') || html.includes('captcha')) {
      errors.push('Site appears to be blocking automated access. Use manual ingest.');
      return { listings: [], errors };
    }
    
    const listings = parseGCSurplusListings(html);
    
    if (listings.length === 0) {
      errors.push('No listings found. Site structure may have changed.');
    }
    
    return { listings, errors };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Fetch error: ${message}`);
    return { listings: [], errors };
  }
}

// Export for testing
export const __testing = {
  normalizeCategory,
  extractLocation,
  extractPrice,
  extractClosingDate,
};
