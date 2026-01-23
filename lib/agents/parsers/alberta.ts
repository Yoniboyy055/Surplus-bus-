/**
 * Alberta Surplus Auction Parser
 * Parses listings from Alberta government surplus auction site
 * 
 * Target: https://surplus.gov.ab.ca (Alberta Surplus Sales)
 * Fallback: Manual URL ingest if site structure changes
 */

import * as cheerio from 'cheerio';
import type { ParsedListing, PropertyData, PropertyCategory } from '../types';
import { calculateQualityScore, determineBucket } from '../scoring';

const SOURCE_PLATFORM = 'alberta_auction' as const;
const BASE_URL = 'https://surplus.gov.ab.ca';
const LISTING_URL = `${BASE_URL}/Search/AdvancedSearch`;

// Category mapping from site categories to our standard categories
const CATEGORY_MAP: Record<string, PropertyCategory> = {
  'vehicles': 'Vehicles',
  'vehicle': 'Vehicles',
  'cars': 'Vehicles',
  'trucks': 'Vehicles',
  'equipment': 'Equipment',
  'machinery': 'Equipment',
  'heavy equipment': 'Equipment',
  'furniture': 'Furniture',
  'office furniture': 'Furniture',
  'electronics': 'Electronics',
  'computers': 'Electronics',
  'it equipment': 'Electronics',
  'real estate': 'Real Estate',
  'land': 'Real Estate',
  'building': 'Real Estate',
  'industrial': 'Industrial',
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
  // Common Alberta cities/regions to look for
  const locations = [
    'Edmonton', 'Calgary', 'Red Deer', 'Lethbridge', 'Medicine Hat',
    'Grande Prairie', 'Fort McMurray', 'Lloydminster', 'Camrose',
    'Brooks', 'Cold Lake', 'Wetaskiwin', 'AB', 'Alberta'
  ];
  
  for (const loc of locations) {
    if (text.includes(loc)) {
      return `${loc}, AB`;
    }
  }
  
  return 'Alberta, Canada';
}

function extractPrice(text: string): number | null {
  // Look for price patterns like $1,234 or $1234.56
  const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
  if (priceMatch) {
    const cleaned = priceMatch[0].replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractClosingDate(text: string): string | null {
  // Look for date patterns
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,            // Month DD, YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
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
 * Parse the Alberta surplus listing page HTML
 */
export function parseAlbertaListings(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  
  // Try multiple selectors as site structure may vary
  const itemSelectors = [
    '.auction-item',
    '.listing-item', 
    '.search-result-item',
    '.item-card',
    '[data-item-id]',
    '.lot-item',
  ];
  
  let $items: ReturnType<typeof $> | null = null;
  
  for (const selector of itemSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      $items = found;
      break;
    }
  }
  
  // Fallback: try to find any reasonable listing structure
  if (!$items || $items.length === 0) {
    // Look for repeated elements with links
    $items = $('a[href*="lot"], a[href*="item"], a[href*="auction"]').parent();
  }
  
  if (!$items || $items.length === 0) {
    return listings;
  }
  
  $items.each((index: number, element: cheerio.Element) => {
    try {
      const $item = $(element);
      
      // Extract title
      const title = $item.find('h2, h3, h4, .title, .item-title, [class*="title"]').first().text().trim() ||
                    $item.find('a').first().text().trim();
      
      if (!title || title.length < 3) return; // Skip items without valid title
      
      // Extract description
      const description = $item.find('.description, .item-description, p, [class*="desc"]').first().text().trim() ||
                         title; // Fallback to title
      
      // Extract URL
      let itemUrl = $item.find('a[href]').first().attr('href') || '';
      if (itemUrl && !itemUrl.startsWith('http')) {
        itemUrl = `${BASE_URL}${itemUrl.startsWith('/') ? '' : '/'}${itemUrl}`;
      }
      
      // Extract source ID from URL or generate one
      const sourceIdMatch = itemUrl.match(/[?&](?:id|lot|item)=(\d+)/i) || 
                           itemUrl.match(/\/(\d+)(?:\/|$)/);
      const sourceId = sourceIdMatch ? `ab-${sourceIdMatch[1]}` : `ab-${Date.now()}-${index}`;
      
      // Extract category
      const categoryText = $item.find('.category, [class*="category"], [data-category]').text() ||
                          $item.attr('data-category') || '';
      const category = normalizeCategory(categoryText || title);
      
      // Extract location
      const locationText = $item.find('.location, [class*="location"], [data-location]').text() ||
                          description;
      const location = extractLocation(locationText);
      
      // Extract price
      const priceText = $item.find('.price, [class*="price"], .bid, [class*="bid"]').text() ||
                       $item.text();
      const price = extractPrice(priceText);
      
      // Extract closing date
      const dateText = $item.find('.date, .closing, [class*="date"], [class*="end"]').text() ||
                      $item.text();
      const closingDate = extractClosingDate(dateText);
      
      // Extract photos
      const photos: string[] = [];
      $item.find('img[src]').each((_, img) => {
        let src = $(img).attr('src') || $(img).attr('data-src') || '';
        if (src && !src.includes('placeholder') && !src.includes('loading')) {
          if (!src.startsWith('http')) {
            src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
          }
          photos.push(src);
        }
      });
      
      // Extract lot number if available
      const lotNumber = $item.find('.lot-number, [class*="lot"]').text().trim() ||
                       (sourceIdMatch ? sourceIdMatch[1] : undefined);
      
      const propertyData: PropertyData = {
        title,
        description,
        category,
        location,
        price,
        photos,
        closing_date: closingDate,
        lot_number: lotNumber,
      };
      
      const { score, breakdown } = calculateQualityScore(propertyData, SOURCE_PLATFORM);
      
      listings.push({
        source_platform: SOURCE_PLATFORM,
        source_url: itemUrl || `${BASE_URL}/search`,
        source_id: sourceId,
        property_data: propertyData,
        quality_score: score,
        quality_breakdown: breakdown,
        bucket: determineBucket(score),
      });
      
    } catch (error) {
      // Skip malformed items silently
      console.error('Error parsing Alberta listing item:', error);
    }
  });
  
  return listings;
}

/**
 * Parse a single Alberta listing detail page
 */
export function parseAlbertaSingleListing(html: string, sourceUrl: string): ParsedListing | null {
  const $ = cheerio.load(html);
  
  try {
    // Extract title from page
    const title = $('h1, .item-title, .lot-title, [class*="title"]').first().text().trim() ||
                 $('title').text().split('|')[0]?.trim() || '';
    
    if (!title || title.length < 3) return null;
    
    // Extract description - try multiple locations
    const description = 
      $('.description, .item-description, [class*="description"]').text().trim() ||
      $('meta[name="description"]').attr('content') ||
      $('.content, .details, .item-details').text().trim() ||
      title;
    
    // Extract all relevant text for parsing
    const pageText = $('body').text();
    
    // Extract source ID from URL
    const sourceIdMatch = sourceUrl.match(/[?&](?:id|lot|item)=(\d+)/i) || 
                         sourceUrl.match(/\/(\d+)(?:\/|$)/);
    const sourceId = sourceIdMatch ? `ab-${sourceIdMatch[1]}` : `ab-${Date.now()}`;
    
    // Extract category
    const categoryEl = $('.category, .item-category, [class*="category"]').first().text().trim();
    const category = normalizeCategory(categoryEl || title);
    
    // Extract location
    const location = extractLocation($('.location, [class*="location"]').text() || pageText);
    
    // Extract price
    const price = extractPrice($('.price, .current-bid, [class*="price"]').text() || pageText);
    
    // Extract closing date
    const closingDate = extractClosingDate($('.closing-date, .end-date, [class*="closing"]').text() || pageText);
    
    // Extract photos
    const photos: string[] = [];
    $('.gallery img, .photos img, .images img, [class*="image"] img').each((_, img) => {
      let src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src && !src.includes('placeholder')) {
        if (!src.startsWith('http')) {
          src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
        }
        photos.push(src);
      }
    });
    
    // Also check for image gallery data attributes
    $('[data-images], [data-gallery]').each((_, el) => {
      const dataImages = $(el).attr('data-images') || $(el).attr('data-gallery');
      if (dataImages) {
        try {
          const parsed = JSON.parse(dataImages);
          if (Array.isArray(parsed)) {
            photos.push(...parsed.filter((p): p is string => typeof p === 'string'));
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    });
    
    // Extract condition if available
    const conditionEl = $('.condition, [class*="condition"]').first().text().trim();
    
    const propertyData: PropertyData = {
      title,
      description: description.substring(0, 2000), // Limit description length
      category,
      location,
      price,
      photos: [...new Set(photos)].slice(0, 10), // Dedupe and limit
      closing_date: closingDate,
      condition: conditionEl || undefined,
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
    console.error('Error parsing Alberta single listing:', error);
    return null;
  }
}

/**
 * Fetch and parse Alberta surplus listings
 */
export async function scrapeAlbertaListings(): Promise<{
  listings: ParsedListing[];
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    const response = await fetch(LISTING_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // 30 second timeout
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      errors.push(`HTTP ${response.status}: ${response.statusText}`);
      return { listings: [], errors };
    }
    
    const html = await response.text();
    
    // Check for captcha/block indicators
    if (html.includes('captcha') || html.includes('blocked') || html.includes('access denied')) {
      errors.push('Site appears to be blocking automated access. Use manual ingest.');
      return { listings: [], errors };
    }
    
    const listings = parseAlbertaListings(html);
    
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
