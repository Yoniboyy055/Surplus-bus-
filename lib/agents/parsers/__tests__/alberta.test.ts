/**
 * Alberta Parser Unit Tests
 * Tests parsing logic with fixture HTML
 */

import { parseAlbertaListings, parseAlbertaSingleListing, __testing } from '../alberta';

const { normalizeCategory, extractLocation, extractPrice, extractClosingDate } = __testing;

// ============================================================================
// Unit Tests for Helper Functions
// ============================================================================

describe('Alberta Parser Helpers', () => {
  describe('normalizeCategory', () => {
    it('should map vehicle-related categories', () => {
      expect(normalizeCategory('Vehicles')).toBe('Vehicles');
      expect(normalizeCategory('trucks and automobiles')).toBe('Vehicles');
      expect(normalizeCategory('CARS')).toBe('Vehicles');
    });

    it('should map equipment categories', () => {
      expect(normalizeCategory('Heavy Equipment')).toBe('Equipment');
      expect(normalizeCategory('machinery')).toBe('Equipment');
    });

    it('should map furniture categories', () => {
      expect(normalizeCategory('Office Furniture')).toBe('Furniture');
      expect(normalizeCategory('furniture items')).toBe('Furniture');
    });

    it('should return Other for unknown categories', () => {
      expect(normalizeCategory('Random stuff')).toBe('Other');
      expect(normalizeCategory('')).toBe('Other');
    });
  });

  describe('extractLocation', () => {
    it('should extract Alberta cities', () => {
      expect(extractLocation('Located in Edmonton warehouse')).toBe('Edmonton, AB');
      expect(extractLocation('Calgary storage facility')).toBe('Calgary, AB');
      expect(extractLocation('Red Deer, Alberta')).toBe('Red Deer, AB');
    });

    it('should default to Alberta, Canada', () => {
      expect(extractLocation('some random text')).toBe('Alberta, Canada');
    });
  });

  describe('extractPrice', () => {
    it('should extract dollar amounts', () => {
      expect(extractPrice('Current bid: $1,500')).toBe(1500);
      expect(extractPrice('Price: $12,345.67')).toBe(12345.67);
      expect(extractPrice('$500')).toBe(500);
    });

    it('should return null for no price', () => {
      expect(extractPrice('No reserve')).toBeNull();
      expect(extractPrice('')).toBeNull();
    });
  });

  describe('extractClosingDate', () => {
    it('should extract date formats', () => {
      const result = extractClosingDate('Closes: 12/31/2026');
      expect(result).not.toBeNull();
      expect(new Date(result!).getFullYear()).toBe(2026);
    });

    it('should return null for no date', () => {
      expect(extractClosingDate('No end date')).toBeNull();
    });
  });
});

// ============================================================================
// Integration Tests with Fixture HTML
// ============================================================================

const FIXTURE_LISTING_PAGE = `
<!DOCTYPE html>
<html>
<head><title>Alberta Surplus - Search Results</title></head>
<body>
  <div class="search-results">
    <div class="auction-item" data-item-id="12345">
      <img src="/images/items/12345.jpg" alt="Ford F-150">
      <h3 class="item-title">
        <a href="/item/12345">2019 Ford F-150 XLT SuperCrew</a>
      </h3>
      <p class="description">
        Fleet vehicle, well maintained. 120,000km. Located in Edmonton warehouse. 
        Runs and drives well. Minor wear on interior.
      </p>
      <span class="category">Vehicles</span>
      <span class="price">Current Bid: $22,500</span>
      <span class="closing">Closes: 01/15/2026</span>
      <span class="location">Edmonton, AB</span>
    </div>
    
    <div class="auction-item" data-item-id="12346">
      <img src="/images/items/12346.jpg" alt="Office Chairs">
      <h3 class="item-title">
        <a href="/item/12346">Lot of 25 Office Chairs</a>
      </h3>
      <p class="description">
        Mixed lot of ergonomic office chairs. Various conditions. Sold as-is.
        Located in Calgary. Buyer responsible for pickup.
      </p>
      <span class="category">Furniture</span>
      <span class="price">Starting: $200</span>
      <span class="closing">Closes: 01/20/2026</span>
      <span class="location">Calgary, AB</span>
    </div>
    
    <div class="auction-item" data-item-id="12347">
      <h3 class="item-title">
        <a href="/item/12347">Broken Computer Parts - Salvage</a>
      </h3>
      <p class="description">
        Lot of broken computer parts for salvage/recycling only.
      </p>
      <span class="category">Electronics</span>
    </div>
  </div>
</body>
</html>
`;

const FIXTURE_SINGLE_ITEM = `
<!DOCTYPE html>
<html>
<head>
  <title>2020 Chevrolet Silverado | Alberta Surplus</title>
  <meta name="description" content="Government surplus vehicle for sale">
</head>
<body>
  <div class="item-details">
    <h1 class="item-title">2020 Chevrolet Silverado 1500 LT</h1>
    <div class="gallery">
      <img src="/images/full/99999-1.jpg" alt="Front view">
      <img src="/images/full/99999-2.jpg" alt="Side view">
    </div>
    <div class="description">
      <p>
        Government fleet vehicle being sold at auction. 
        4WD, V8 engine, crew cab configuration.
        85,000 kilometers. Regular maintenance performed.
        Vehicle runs and drives. Good condition overall.
        Located in Red Deer, AB.
      </p>
    </div>
    <div class="specs">
      <span class="category">Vehicles - Trucks</span>
      <span class="condition">Good - Working</span>
      <span class="location">Red Deer, AB</span>
    </div>
    <div class="auction-info">
      <span class="current-bid">Current Bid: $35,000 CAD</span>
      <span class="closing-date">Auction Ends: January 25, 2026</span>
    </div>
  </div>
</body>
</html>
`;

describe('parseAlbertaListings', () => {
  it('should parse multiple listings from search results', () => {
    const results = parseAlbertaListings(FIXTURE_LISTING_PAGE);
    
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    // Check first listing (Ford F-150)
    const ford = results.find(r => r.property_data.title.includes('Ford F-150'));
    expect(ford).toBeDefined();
    expect(ford!.property_data.category).toBe('Vehicles');
    expect(ford!.property_data.price).toBe(22500);
    expect(ford!.property_data.location).toContain('Edmonton');
    expect(ford!.source_platform).toBe('alberta_auction');
    expect(ford!.quality_score).toBeGreaterThan(50); // Should be in approve bucket
    expect(ford!.bucket).toBe('approve');
  });

  it('should parse office furniture listing', () => {
    const results = parseAlbertaListings(FIXTURE_LISTING_PAGE);
    
    const chairs = results.find(r => r.property_data.title.includes('Office Chairs'));
    expect(chairs).toBeDefined();
    expect(chairs!.property_data.category).toBe('Furniture');
    expect(chairs!.property_data.location).toContain('Calgary');
  });

  it('should assign lower scores to incomplete listings', () => {
    const results = parseAlbertaListings(FIXTURE_LISTING_PAGE);
    
    const salvage = results.find(r => r.property_data.title.includes('Salvage'));
    if (salvage) {
      // Incomplete listing should have lower score
      expect(salvage.quality_score).toBeLessThan(60);
    }
  });

  it('should return empty array for empty HTML', () => {
    const results = parseAlbertaListings('');
    expect(results).toEqual([]);
  });

  it('should return empty array for HTML with no listings', () => {
    const results = parseAlbertaListings('<html><body>No auctions available</body></html>');
    expect(results).toEqual([]);
  });
});

describe('parseAlbertaSingleListing', () => {
  it('should parse a single listing detail page', () => {
    const result = parseAlbertaSingleListing(
      FIXTURE_SINGLE_ITEM, 
      'https://surplus.gov.ab.ca/item/99999'
    );
    
    expect(result).not.toBeNull();
    expect(result!.property_data.title).toContain('Chevrolet Silverado');
    expect(result!.property_data.category).toBe('Vehicles');
    expect(result!.property_data.price).toBe(35000);
    expect(result!.property_data.location).toContain('Red Deer');
    expect(result!.property_data.photos.length).toBeGreaterThan(0);
    expect(result!.property_data.condition).toContain('Good');
    expect(result!.source_id).toBe('ab-99999');
  });

  it('should handle missing data gracefully', () => {
    const minimalHtml = `
      <html>
        <head><title>Test Item</title></head>
        <body>
          <h1>Basic Item Title Here</h1>
          <p class="description">Some description text</p>
        </body>
      </html>
    `;
    
    const result = parseAlbertaSingleListing(minimalHtml, 'https://surplus.gov.ab.ca/item/123');
    
    expect(result).not.toBeNull();
    expect(result!.property_data.title).toBe('Basic Item Title Here');
    expect(result!.property_data.price).toBeNull();
    expect(result!.property_data.location).toBe('Alberta, Canada');
  });

  it('should return null for pages without valid title', () => {
    const result = parseAlbertaSingleListing('<html><body>Error</body></html>', 'https://test.com');
    expect(result).toBeNull();
  });
});
