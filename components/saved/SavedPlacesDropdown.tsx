'use client';

import { useState, useEffect, useRef } from 'react';
import { SavedPlace, UserProfile, PlaceMatch, PlaceBasicInfo } from '@/types';
import { storage } from '@/lib/storage';
import { analytics } from '@/lib/analytics';
import { loadGoogleMaps } from '@/lib/maps-loader';
import DetailsDrawer from '@/components/results/DetailsDrawer';
import SavedPlacesMap from '@/components/saved/SavedPlacesMap';
import { generateGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';

interface SavedPlacesDropdownProps {
  user: UserProfile | null;
}

export default function SavedPlacesDropdown({ user }: SavedPlacesDropdownProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<PlaceMatch | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSavedPlaces = async () => {
      try {
        setIsLoading(true);
        const currentUser = storage.getUserProfile();
        
        if (!currentUser || !currentUser.token) {
          // Not logged in, use localStorage only
          setSavedPlaces(storage.getSavedCafes());
          setIsLoading(false);
          return;
        }

        try {
          // Try to fetch from API first
          const response = await fetch('/api/user/saved-places', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`,
            },
          });

          // Handle token expiration
          if (response.status === 401) {
            console.log('[SavedPlacesDropdown] Token expired - logging out user');
            storage.setUserProfile(null);
            setSavedPlaces(storage.getSavedCafes());
            setIsLoading(false);
            return;
          }

          if (response.ok) {
            const data = await response.json();
            if (data.places && data.places.length > 0) {
              // Convert API format to SavedPlace format
              const places: SavedPlace[] = data.places.map((place: any) => ({
                placeId: place.placeId,
                name: place.name,
                savedAt: new Date(place.savedAt).getTime(),
                photoUrl: place.photoUrl,
                rating: place.rating,
              }));
              setSavedPlaces(places);
              // Also sync to localStorage for offline access
              places.forEach(place => storage.saveCafe(place));
            } else if (!data.localStorage) {
              // API returned empty, use localStorage as fallback
              setSavedPlaces(storage.getSavedCafes());
            } else {
              // AWS not configured, use localStorage
              setSavedPlaces(storage.getSavedCafes());
            }
          } else {
            // API failed, use localStorage
            setSavedPlaces(storage.getSavedCafes());
          }
        } catch (error) {
          console.error('Error fetching saved places:', error);
          // Fallback to localStorage
          setSavedPlaces(storage.getSavedCafes());
        } finally {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[SavedPlacesDropdown] Error loading saved places:', error);
        setSavedPlaces([]);
        setIsLoading(false);
      }
    };

    loadSavedPlaces();

    // Listen for auth changes
    const handleAuthChange = () => {
      loadSavedPlaces();
    };

    // Listen for place saves
    const handlePlaceSaved = () => {
      loadSavedPlaces();
    };

    window.addEventListener('loca_auth_change', handleAuthChange);
    window.addEventListener('loca_place_saved', handlePlaceSaved);
    return () => {
      window.removeEventListener('loca_auth_change', handleAuthChange);
      window.removeEventListener('loca_place_saved', handlePlaceSaved);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleRemove = async (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      analytics.track({ name: 'saved_cafe_remove', params: { place_id: placeId } });
    } catch (error) {
      console.error('Error tracking saved_cafe_remove event:', error);
    }
    
    const userProfile = storage.getUserProfile();
    
    // Remove from localStorage
    storage.removeSavedCafe(placeId);
    
    // Also remove from API if logged in
    if (userProfile?.token) {
      try {
        const response = await fetch(`/api/user/saved-places?placeId=${placeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${userProfile.token}`,
          },
        });

        // Handle token expiration
        if (response.status === 401) {
          console.log('[SavedPlacesDropdown] Token expired during delete - logging out user');
          storage.setUserProfile(null);
        }
      } catch (error) {
        console.error('Error deleting from API:', error);
      }
    }
    
    setSavedPlaces(storage.getSavedCafes());
  };

  const handlePlaceClick = async (place: SavedPlace) => {
    try {
      setIsLoadingDetails(true);
      setIsOpen(false);
      
      // Load Google Maps if not already loaded
      await loadGoogleMaps();
      
      // Create a map instance (required for PlacesService)
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);
      
      // Fetch place details
      const placeDetails = await new Promise<PlaceBasicInfo>((resolve, reject) => {
        service.getDetails(
          {
            placeId: place.placeId,
            fields: [
              'place_id',
              'name',
              'formatted_address',
              'types',
              'rating',
              'user_ratings_total',
              'price_level',
              'opening_hours',
              'photos',
              'editorial_summary',
              'geometry',
            ],
          },
          (placeResult, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && placeResult) {
              const primaryType = placeResult.types && placeResult.types.length > 0 ? placeResult.types[0] : undefined;
              
              resolve({
                id: placeResult.place_id!,
                displayName: placeResult.name!,
                formattedAddress: placeResult.formatted_address,
                types: placeResult.types,
                primaryType: primaryType,
                rating: placeResult.rating,
                userRatingCount: placeResult.user_ratings_total,
                priceLevel: placeResult.price_level,
                regularOpeningHours: placeResult.opening_hours,
                photos: placeResult.photos,
                editorialSummary: (placeResult as any).editorial_summary?.overview,
                location: placeResult.geometry?.location,
                photoUrl: place.photoUrl, // Use cached photo URL
              });
            } else {
              reject(new Error(`Failed to get place details: ${status}`));
            }
          }
        );
      });
      
      // Convert to PlaceMatch format
      const placeMatch: PlaceMatch = {
        place: placeDetails,
        score: 0, // Saved places don't have scores
        reasoning: undefined,
        matchedKeywords: [],
      };
      
      setSelectedResult(placeMatch);
      analytics.resultClick({
        rank: 0,
        place_id: place.placeId,
      });
    } catch (error) {
      console.error('Error loading place details:', error);
      // Fallback: still open the drawer with minimal info
      const placeMatch: PlaceMatch = {
        place: {
          id: place.placeId,
          displayName: place.name,
          photoUrl: place.photoUrl,
          rating: place.rating,
        },
        score: 0,
        reasoning: undefined,
        matchedKeywords: [],
      };
      setSelectedResult(placeMatch);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedResult(null);
  };

  const handleOpenInGoogleMaps = async () => {
    try {
      setIsOpen(false);
      const url = await generateGoogleMapsDirectionsUrl(savedPlaces);
      window.open(url, '_blank');
      analytics.track({ name: 'saved_places_share_google_maps_dropdown', params: { count: savedPlaces.length } });
    } catch (error) {
      console.error('Error generating Google Maps URL:', error);
      alert('Failed to generate Google Maps link. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center space-x-1 hover:opacity-80 transition-opacity"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          {savedPlaces.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-espresso text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {savedPlaces.length > 9 ? '9+' : savedPlaces.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Saved Places</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {savedPlaces.length} {savedPlaces.length === 1 ? 'place' : 'places'}
                  </p>
                </div>
                {savedPlaces.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowMap(true);
                      }}
                      className="text-xs text-gray-600 hover:text-espresso font-medium flex items-center gap-1"
                      title="View on map"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleOpenInGoogleMaps}
                      className="text-xs text-espresso hover:text-espresso/80 font-medium flex items-center gap-1"
                      title="Open in Google Maps"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="text-2xl mb-2 animate-bounce">☕</div>
                  <div className="text-sm text-gray-600">Loading...</div>
                </div>
              ) : savedPlaces.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">📌</div>
                  <div className="text-sm text-gray-600">No saved places yet</div>
                </div>
              ) : (
                <div className="p-2">
                  {savedPlaces.map((place) => (
                    <div
                      key={place.placeId}
                      onClick={() => handlePlaceClick(place)}
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {place.photoUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <img
                            src={place.photoUrl}
                            alt={place.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📍</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {place.name}
                        </h4>
                        {place.rating && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
                            <span className="text-yellow-500">★</span>
                            <span>{place.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => handleRemove(place.placeId, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded text-red-600 flex-shrink-0"
                        aria-label="Remove place"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoadingDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-bounce">☕</div>
              <div className="text-lg text-gray-600">Loading place details...</div>
            </div>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <DetailsDrawer result={selectedResult} onClose={handleCloseDrawer} />

      {/* Map View */}
      {showMap && (
        <SavedPlacesMap places={savedPlaces} onClose={() => setShowMap(false)} />
      )}
    </>
  );
}

