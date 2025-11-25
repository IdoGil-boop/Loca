// Establishment types supported by Loca
export type EstablishmentType = 'cafe' | 'restaurant' | 'museum' | 'bar';

export interface SearchParams {
  sourcePlaceId: string;
  sourceName: string;
  destinationCity: string;
  destinationCountry?: string;
  establishmentType: EstablishmentType; // Type of establishment to search for
}

export interface PlaceBasicInfo {
  id: string; // New API uses 'id' instead of 'place_id'
  displayName: string; // New API uses 'displayName' instead of 'name'
  formattedAddress?: string; // New API uses camelCase
  location?: google.maps.LatLng; // New API uses location directly (lat/lng object)
  types?: string[];
  primaryType?: string; // New API provides a single primary type classification
  rating?: number;
  userRatingCount?: number; // New API uses 'userRatingCount' instead of 'user_ratings_total'
  priceLevel?: number; // New API uses camelCase
  regularOpeningHours?: google.maps.places.PlaceOpeningHours; // New API uses 'regularOpeningHours'
  photos?: google.maps.places.PlacePhoto[];
  photoUrl?: string; // Cached photo URL for restored results
  editorialSummary?: string; // New API uses camelCase, we'll extract the overview
  // Atmosphere & Amenities (Enterprise + Atmosphere SKU)
  outdoorSeating?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  reservable?: boolean;
  goodForGroups?: boolean;
  goodForChildren?: boolean;
  goodForWatchingSports?: boolean;
  liveMusic?: boolean;
  servesCoffee?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesVegetarianFood?: boolean;
  allowsDogs?: boolean;
  restroom?: boolean;
  menuForChildren?: boolean;
  accessibilityOptions?: any; // Contains detailed accessibility info
  paymentOptions?: any; // Payment methods
  parkingOptions?: any; // Parking availability
}

export interface PlaceMatch {
  place: PlaceBasicInfo;
  score: number;
  reasoning?: string;
  matchedKeywords: string[];
  distanceToCenter?: number;
  redditData?: RedditData;
  imageAnalysis?: string;
  typeOverlapDetails?: string;
  establishmentType?: EstablishmentType; // Type of establishment this match represents
}

// Legacy type alias for backward compatibility
export type CafeMatch = PlaceMatch;

export interface RedditData {
  posts: RedditPost[];
  totalMentions: number;
  averageScore: number;
}

export interface RedditPost {
  title: string;
  body: string;
  score: number;
  author: string;
  created_utc: number;
  permalink: string;
  subreddit: string;
}

export interface UserProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  token?: string; // JWT token for authentication
}

export interface SavedPlace {
  placeId: string;
  name: string;
  savedAt: number;
  photoUrl?: string;
  rating?: number;
  establishmentType?: EstablishmentType; // Type of establishment
}

// Legacy type alias for backward compatibility
export type SavedCafe = SavedPlace;

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

export interface SearchState {
  searchId: string; // Unique identifier for this search
  originPlaces: Array<{
    placeId: string;
    name: string;
  }>;
  destination: string;
  freeText?: string;
  establishmentType: EstablishmentType; // Type of establishment being searched
  timestamp: string;
}

/**
 * Maps Loca establishment types to Google Places API types
 */
export function establishmentTypeToGoogleType(type: EstablishmentType): string {
  const mapping: Record<EstablishmentType, string> = {
    cafe: 'coffee_shop',
    restaurant: 'restaurant',
    museum: 'museum',
    bar: 'bar',
  };
  return mapping[type];
}

/**
 * Maps Google Places API types to Loca establishment types
 * Returns null if the type doesn't match any of our supported establishment types
 */
export function googleTypeToEstablishmentType(googleTypes: string[]): EstablishmentType | null {
  if (!googleTypes || googleTypes.length === 0) {
    return null;
  }

  // Priority order: check for specific types first
  // Cafe/Coffee shop types
  if (googleTypes.some(t => ['coffee_shop', 'cafe', 'bakery'].includes(t))) {
    return 'cafe';
  }

  // Bar types
  if (googleTypes.some(t => ['bar', 'night_club', 'liquor_store'].includes(t))) {
    return 'bar';
  }

  // Museum types
  if (googleTypes.some(t => ['museum', 'art_gallery', 'tourist_attraction'].includes(t))) {
    return 'museum';
  }

  // Restaurant types (checked last as it's most common)
  if (googleTypes.some(t => ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'].includes(t))) {
    return 'restaurant';
  }

  return null;
}

/**
 * Detects establishment type from multiple places
 * Returns the union of types if all places share compatible types
 * If places have incompatible types, returns the most common type
 */
export function detectEstablishmentTypeFromPlaces(places: google.maps.places.PlaceResult[]): EstablishmentType {
  if (places.length === 0) {
    return 'cafe'; // Default fallback
  }

  const detectedTypes: EstablishmentType[] = [];

  for (const place of places) {
    if (place.types) {
      const type = googleTypeToEstablishmentType(place.types);
      if (type) {
        detectedTypes.push(type);
      }
    }
  }

  if (detectedTypes.length === 0) {
    return 'cafe'; // Default fallback
  }

  // Count occurrences of each type
  const typeCounts = detectedTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<EstablishmentType, number>);

  // Get unique types
  const uniqueTypes = Object.keys(typeCounts) as EstablishmentType[];

  // If all places are the same type, return that type
  if (uniqueTypes.length === 1) {
    return uniqueTypes[0];
  }

  // If multiple types, return the most common one
  const mostCommonType = uniqueTypes.reduce((a, b) =>
    typeCounts[a] > typeCounts[b] ? a : b
  );

  return mostCommonType;
}

/**
 * Get human-readable label for establishment type
 */
export function getEstablishmentTypeLabel(type: EstablishmentType): string {
  const labels: Record<EstablishmentType, string> = {
    cafe: 'Café',
    restaurant: 'Restaurant',
    museum: 'Museum',
    bar: 'Bar',
  };
  return labels[type];
}

export interface SearchResultsCache {
  searchState: SearchState;
  allResults: PlaceMatch[]; // All fetched results (could be 15, 30, etc.)
  shownPlaceIds: string[]; // Place IDs already shown to user
  currentPage: number; // Which page of Google results we're on (0-indexed)
  hasMorePages: boolean; // Whether Google has more results
  nextPageToken?: string; // Token for fetching next page from Google
}
