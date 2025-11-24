// Establishment types supported by Loca
export type EstablishmentType = 'cafe' | 'restaurant' | 'museum' | 'bar';

// Base vibes that apply to all establishment types
export interface BaseVibes {
  cozy: boolean;
  minimalist: boolean;
  allowsDogs: boolean;
  nightOwl: boolean;
}

// Cafe-specific vibes
export interface CafeVibes extends BaseVibes {
  roastery: boolean;
  lightRoast: boolean;
  laptopFriendly: boolean;
  brunch: boolean;
}

// Restaurant-specific vibes
export interface RestaurantVibes extends BaseVibes {
  outdoorDining: boolean;
  fineDining: boolean;
  casualDining: boolean;
  brunch: boolean;
  servesVegetarian: boolean;
  romanticAmbiance: boolean;
}

// Museum-specific vibes
export interface MuseumVibes extends BaseVibes {
  interactive: boolean;
  modernArt: boolean;
  historical: boolean;
  familyFriendly: boolean;
  photography: boolean;
}

// Bar-specific vibes
export interface BarVibes extends BaseVibes {
  liveMusic: boolean;
  cocktailBar: boolean;
  sportsBar: boolean;
  rooftop: boolean;
  danceFloor: boolean;
  craftBeer: boolean;
}

// Union type for all vibes (for backward compatibility)
export type VibeToggles = CafeVibes | RestaurantVibes | MuseumVibes | BarVibes;

// Legacy cafe vibes (for backward compatibility)
export interface LegacyCafeVibes {
  roastery: boolean;
  lightRoast: boolean;
  laptopFriendly: boolean;
  nightOwl: boolean;
  cozy: boolean;
  minimalist: boolean;
  allowsDogs: boolean;
  servesVegetarian: boolean;
  brunch: boolean;
}

/**
 * Normalize legacy cafe vibes object to ensure all fields are present with defaults
 * Useful for backward compatibility when parsing from JSON
 */
export function normalizeLegacyCafeVibes(vibes: Partial<LegacyCafeVibes>): LegacyCafeVibes {
  return {
    roastery: vibes.roastery ?? false,
    lightRoast: vibes.lightRoast ?? false,
    laptopFriendly: vibes.laptopFriendly ?? false,
    nightOwl: vibes.nightOwl ?? false,
    cozy: vibes.cozy ?? false,
    minimalist: vibes.minimalist ?? false,
    allowsDogs: vibes.allowsDogs ?? false,
    servesVegetarian: vibes.servesVegetarian ?? false,
    brunch: vibes.brunch ?? false,
  };
}

/**
 * Normalize vibes based on establishment type
 */
export function normalizeVibesByType(
  establishmentType: EstablishmentType,
  vibes: Partial<any>
): VibeToggles {
  const baseDefaults = {
    cozy: vibes.cozy ?? false,
    minimalist: vibes.minimalist ?? false,
    allowsDogs: vibes.allowsDogs ?? false,
    nightOwl: vibes.nightOwl ?? false,
  };

  switch (establishmentType) {
    case 'cafe':
      return {
        ...baseDefaults,
        roastery: vibes.roastery ?? false,
        lightRoast: vibes.lightRoast ?? false,
        laptopFriendly: vibes.laptopFriendly ?? false,
        brunch: vibes.brunch ?? false,
      } as CafeVibes;

    case 'restaurant':
      return {
        ...baseDefaults,
        outdoorDining: vibes.outdoorDining ?? false,
        fineDining: vibes.fineDining ?? false,
        casualDining: vibes.casualDining ?? false,
        brunch: vibes.brunch ?? false,
        servesVegetarian: vibes.servesVegetarian ?? false,
        romanticAmbiance: vibes.romanticAmbiance ?? false,
      } as RestaurantVibes;

    case 'museum':
      return {
        ...baseDefaults,
        interactive: vibes.interactive ?? false,
        modernArt: vibes.modernArt ?? false,
        historical: vibes.historical ?? false,
        familyFriendly: vibes.familyFriendly ?? false,
        photography: vibes.photography ?? false,
      } as MuseumVibes;

    case 'bar':
      return {
        ...baseDefaults,
        liveMusic: vibes.liveMusic ?? false,
        cocktailBar: vibes.cocktailBar ?? false,
        sportsBar: vibes.sportsBar ?? false,
        rooftop: vibes.rooftop ?? false,
        danceFloor: vibes.danceFloor ?? false,
        craftBeer: vibes.craftBeer ?? false,
      } as BarVibes;
  }
}

export interface SearchParams {
  sourcePlaceId: string;
  sourceName: string;
  destinationCity: string;
  destinationCountry?: string;
  vibes: VibeToggles;
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
  vibes: VibeToggles;
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
