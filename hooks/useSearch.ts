import { useState, useCallback, useRef } from 'react';
import { PlaceMatch, EstablishmentType, VibeToggles, PlaceBasicInfo } from '@/types';
// Note: searchCafes is a legacy function name - it works for all establishment types (cafe, restaurant, museum, bar)
import { searchCafes } from '@/lib/places-search';
import { Loader } from '@googlemaps/js-api-loader';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';
// Note: extractKeywordsFromMultipleCafes is a legacy function name - it works for all establishment types
import { extractKeywordsFromMultipleCafes, processFreeTextWithAI } from '@/lib/keyword-extraction';

export interface SearchParams {
  sourcePlaceIds: string[];
  sourceNames: string[];
  destinationCity: string;
  vibes: VibeToggles;
  freeText?: string;
  establishmentType: EstablishmentType;
}

export interface UseSearchResult {
  results: PlaceMatch[];
  isLoading: boolean;
  error: string | null;
  mapCenter: google.maps.LatLngLiteral | null;
  executeSearch: (params: SearchParams) => Promise<void>;
  clearResults: () => void;
}

function getAuthToken(): string | null {
  const userProfile = storage.getUserProfile();
  return userProfile?.token || null;
}

export function useSearch(): UseSearchResult {
  const [results, setResults] = useState<PlaceMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);

  const isSearchInProgress = useRef(false);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const googleMapsRef = useRef<typeof google | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize Google Maps SDK
  const initializeGoogleMaps = useCallback(async () => {
    if (googleMapsRef.current && geocoder.current) {
      return { google: googleMapsRef.current, geocoder: geocoder.current };
    }

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'marker', 'geocoding'],
    });

    await loader.load();
    googleMapsRef.current = google;
    geocoder.current = new google.maps.Geocoder();
    return { google: googleMapsRef.current, geocoder: geocoder.current };
  }, []);

  // Check rate limit
  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    const authToken = getAuthToken();
    const rateLimitHeaders: HeadersInit = {};
    if (authToken) {
      rateLimitHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const rateLimitResponse = await fetch('/api/rate-limit/check', {
        method: 'POST',
        headers: rateLimitHeaders,
      });

      const rateLimitData = await rateLimitResponse.json();

      if (!rateLimitResponse.ok || !rateLimitData.allowed) {
        const resetAt = rateLimitData?.resetAt
          ? new Date(rateLimitData.resetAt)
          : new Date(Date.now() + 12 * 60 * 60 * 1000);

        const now = new Date();
        const hoursUntilReset = Math.ceil((resetAt.getTime() - now.getTime()) / (1000 * 60 * 60));
        const minutesUntilReset = Math.ceil((resetAt.getTime() - now.getTime()) / (1000 * 60));

        let timeUntilReset: string;
        if (hoursUntilReset >= 1) {
          timeUntilReset = hoursUntilReset === 1 ? '1 hour' : `${hoursUntilReset} hours`;
        } else {
          timeUntilReset = minutesUntilReset === 1 ? '1 minute' : `${minutesUntilReset} minutes`;
        }

        const resetTime = resetAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const limit = rateLimitData?.limit || 10;
        const windowHours = rateLimitData?.windowHours || 12;

        throw new Error(
          `You've reached your search limit of ${limit} searches per ${windowHours} hour${windowHours === 1 ? '' : 's'}. ` +
          `Your limit will refresh in ${timeUntilReset} (at ${resetTime}).`
        );
      }

      return true;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Unable to verify rate limit. Please try again later.');
    }
  }, []);

  // Geocode destination city
  const geocodeDestination = useCallback(async (city: string): Promise<google.maps.GeocoderResult> => {
    const { geocoder: geocoderInstance } = await initializeGoogleMaps();

    return new Promise((resolve, reject) => {
      geocoderInstance.geocode({ address: city }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0]);
        } else if (status === 'ZERO_RESULTS') {
          reject(new Error(`Could not find location for "${city}". Please try another city or neighborhood.`));
        } else {
          reject(new Error(`Failed to geocode destination: ${status}`));
        }
      });
    });
  }, [initializeGoogleMaps]);

  const getPlacesService = useCallback(async () => {
    if (!googleMapsRef.current || !geocoder.current) {
      await initializeGoogleMaps();
    }

    if (!googleMapsRef.current) {
      throw new Error('Google Maps failed to initialize.');
    }

    if (!placesServiceRef.current) {
      placesServiceRef.current = new googleMapsRef.current.maps.places.PlacesService(
        document.createElement('div')
      );
    }

    return placesServiceRef.current;
  }, [initializeGoogleMaps]);

  const fetchSourcePlaces = useCallback(async (placeIds: string[]): Promise<PlaceBasicInfo[]> => {
    const service = await getPlacesService();
    const googleMaps = googleMapsRef.current;

    if (!googleMaps) {
      throw new Error('Google Maps not available.');
    }

    return Promise.all(
      placeIds.map((placeId) => {
        return new Promise<PlaceBasicInfo>((resolve, reject) => {
          service.getDetails(
            {
              placeId,
              fields: [
                'place_id',
                'name',
                'formatted_address',
                'geometry',
                'types',
                'rating',
                'user_ratings_total',
                'price_level',
                'opening_hours',
                'photos',
                'editorial_summary',
              ],
            },
            (place, status) => {
              if (status === googleMaps.maps.places.PlacesServiceStatus.OK && place) {
                const primaryType = place.types && place.types.length > 0 ? place.types[0] : undefined;
                resolve({
                  id: place.place_id!,
                  displayName: place.name || 'Unknown',
                  formattedAddress: place.formatted_address,
                  location: place.geometry?.location || undefined,
                  types: place.types || undefined,
                  primaryType,
                  rating: place.rating,
                  userRatingCount: place.user_ratings_total || undefined,
                  priceLevel: place.price_level || undefined,
                  regularOpeningHours: place.opening_hours,
                  photos: place.photos,
                  editorialSummary: (place as any).editorial_summary?.overview,
                });
              } else {
                logger.error('[useSearch] getDetails failed', {
                  placeId,
                  status,
                  statusName: googleMaps.maps.places.PlacesServiceStatus[status],
                });
                reject(new Error(`Failed to load source place (${placeId}): ${status}`));
              }
            }
          );
        });
      })
    );
  }, [getPlacesService]);

  // Main search execution
  const executeSearch = useCallback(async (params: SearchParams) => {
    if (isSearchInProgress.current) {
      logger.warn('[useSearch] Search already in progress, skipping');
      return;
    }

    isSearchInProgress.current = true;
    setIsLoading(true);
    setError(null);
    const searchStartTime = Date.now();

    try {
      // 1. Check rate limit
      await checkRateLimit();

      // 2. Geocode destination
      const destinationResult = await geocodeDestination(params.destinationCity);
      const googleMaps = googleMapsRef.current;

      if (!googleMaps) {
        throw new Error('Google Maps failed to initialize. Please refresh and try again.');
      }

      const destinationGeometry = destinationResult.geometry;
      if (!destinationGeometry || !destinationGeometry.location) {
        throw new Error(`Invalid location data for "${params.destinationCity}". Try a nearby city or neighborhood.`);
      }

      const destinationCenter = destinationGeometry.location;
      let destinationBounds: google.maps.LatLngBounds | null =
        destinationGeometry.viewport || destinationGeometry.bounds || null;

      if (!destinationBounds) {
        const fallbackDelta = 0.1; // ~11km radius
        const sw = new googleMaps.maps.LatLng(
          destinationCenter.lat() - fallbackDelta,
          destinationCenter.lng() - fallbackDelta
        );
        const ne = new googleMaps.maps.LatLng(
          destinationCenter.lat() + fallbackDelta,
          destinationCenter.lng() + fallbackDelta
        );
        destinationBounds = new googleMaps.maps.LatLngBounds(sw, ne);
      }

      if (!destinationBounds) {
        throw new Error('Unable to determine destination bounds for the selected destination.');
      }

      setMapCenter({
        lat: destinationCenter.lat(),
        lng: destinationCenter.lng(),
      });

      // 3. Load source place metadata (works for any establishment type)
      const originPlaces = await fetchSourcePlaces(params.sourcePlaceIds);
      if (!originPlaces.length) {
        throw new Error('Could not load your reference places. Please re-select them and try again.');
      }
      const sourcePlace = originPlaces[0];

      // 4. Build optional custom keywords from multiple source places and/or free text
      let customKeywords: string[] | undefined;
      if (originPlaces.length > 1 || params.freeText) {
        try {
          const baseKeywords = await extractKeywordsFromMultipleCafes(originPlaces, params.vibes, googleMaps);
          const freeTextKeywords = params.freeText ? await processFreeTextWithAI(params.freeText) : [];
          customKeywords = [
            ...baseKeywords.slice(0, 3),
            ...freeTextKeywords.slice(0, 2),
          ].slice(0, 5);
        } catch (keywordError) {
          logger.warn('[useSearch] Keyword enrichment failed', keywordError);
        }
      }

      // 5. Penalize already-seen places
      let placeIdsToPenalize: string[] = [];
      try {
        const authToken = getAuthToken();
        const headers: HeadersInit = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const vibesArray = Object.entries(params.vibes)
          .filter(([_, enabled]) => !!enabled)
          .map(([vibe]) => vibe);

        const filterResponse = await fetch(
          `/api/user/place-interactions/filter?` +
            new URLSearchParams({
              destination: params.destinationCity,
              vibes: JSON.stringify(vibesArray),
              freeText: params.freeText || '',
              originPlaceIds: JSON.stringify(params.sourcePlaceIds),
            }).toString(),
          { headers }
        );

        if (filterResponse.ok) {
          const data = await filterResponse.json();
          placeIdsToPenalize = data.placeIdsToPenalize || [];
          logger.debug('[useSearch] Penalizing seen places', { count: placeIdsToPenalize.length });
        } else {
          logger.warn('[useSearch] Failed to fetch penalized place IDs', filterResponse.status);
        }
      } catch (filterError) {
        logger.warn('[useSearch] Penalization fetch failed', filterError);
      }

      // 6. Track search start
      const sourceNamesForAnalytics =
        params.sourceNames && params.sourceNames.length > 0
          ? params.sourceNames
          : originPlaces.map(place => place.displayName || 'Unknown');

      analytics.searchSubmit({
        source_city: sourceNamesForAnalytics.join(', '),
        dest_city: params.destinationCity,
        toggles: params.vibes,
        multi_place: params.sourcePlaceIds.length > 1,
        has_free_text: !!params.freeText,
      });

      // 7. Perform search (works for all establishment types: cafe, restaurant, museum, bar)
      const searchResult = await searchCafes(
        googleMaps,
        sourcePlace,
        destinationCenter,
        destinationBounds,
        params.vibes,
        customKeywords,
        false,
        destinationResult.types || [],
        destinationResult.place_id,
        originPlaces,
        placeIdsToPenalize,
        undefined,
        params.freeText || '',
        params.establishmentType
      );

      // 8. Update results
      setResults(searchResult.results);

      // 9. Track results loaded
      analytics.resultsLoaded({
        candidate_count: searchResult.results.length,
        latency_ms: Math.max(0, Date.now() - searchStartTime),
      });

      logger.info('[useSearch] Search completed successfully', {
        resultCount: searchResult.results.length,
        destination: params.destinationCity,
        establishmentType: params.establishmentType,
        hasMorePages: searchResult.hasMorePages,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during search';
      setError(errorMessage);
      logger.error('[useSearch] Search failed:', err);

      analytics.track({
        name: 'search_error',
        params: {
          error: errorMessage,
          destination: params.destinationCity,
          establishment_type: params.establishmentType,
        },
      });
    } finally {
      setIsLoading(false);
      isSearchInProgress.current = false;
    }
  }, [checkRateLimit, geocodeDestination, fetchSourcePlaces]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setMapCenter(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    mapCenter,
    executeSearch,
    clearResults,
  };
}
