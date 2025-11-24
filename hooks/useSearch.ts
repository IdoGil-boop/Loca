import { useState, useCallback, useRef } from 'react';
import { PlaceMatch, EstablishmentType, VibeToggles } from '@/types';
import { searchCafes } from '@/lib/places-search';
import { Loader } from '@googlemaps/js-api-loader';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';

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

  // Initialize Google Maps SDK
  const initializeGoogleMaps = useCallback(async () => {
    if (geocoder.current) return geocoder.current;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'marker', 'geocoding'],
    });

    await loader.load();
    geocoder.current = new google.maps.Geocoder();
    return geocoder.current;
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
  const geocodeDestination = useCallback(async (city: string): Promise<google.maps.LatLngLiteral> => {
    const geocoderInstance = await initializeGoogleMaps();

    return new Promise((resolve, reject) => {
      geocoderInstance.geocode({ address: city }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          reject(new Error(`Failed to geocode destination: ${status}`));
        }
      });
    });
  }, [initializeGoogleMaps]);

  // Main search execution
  const executeSearch = useCallback(async (params: SearchParams) => {
    if (isSearchInProgress.current) {
      logger.warn('[useSearch] Search already in progress, skipping');
      return;
    }

    isSearchInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Check rate limit
      await checkRateLimit();

      // 2. Geocode destination
      const center = await geocodeDestination(params.destinationCity);
      setMapCenter(center);

      // 3. Track search start
      analytics.searchSubmit({
        destination: params.destinationCity,
        has_vibes: Object.values(params.vibes).some(v => v),
        multi_cafe: params.sourcePlaceIds.length > 1,
        establishment_type: params.establishmentType,
      });

      // 4. Perform search
      const searchResults = await searchCafes(
        params.sourcePlaceIds[0], // For now, use first place (multi-source coming later)
        params.sourceNames[0],
        params.destinationCity,
        center,
        params.vibes,
        params.freeText,
        params.establishmentType
      );

      // 5. Update results
      setResults(searchResults);

      // 6. Track results loaded
      analytics.resultsLoaded({
        count: searchResults.length,
        destination: params.destinationCity,
        establishment_type: params.establishmentType,
      });

      logger.info('[useSearch] Search completed successfully', {
        resultCount: searchResults.length,
        destination: params.destinationCity,
        establishmentType: params.establishmentType,
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
  }, [checkRateLimit, geocodeDestination]);

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
