'use client';

import { useEffect, useRef, useState } from 'react';
import { SavedPlace } from '@/types';
import { loadGoogleMaps } from '@/lib/maps-loader';

interface SavedPlacesMapProps {
  places: SavedPlace[];
  onClose: () => void;
}

export default function SavedPlacesMap({ places, onClose }: SavedPlacesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load Google Maps
        await loadGoogleMaps();

        // If no places with valid locations, show an error
        if (places.length === 0) {
          setError('No saved places to display on map');
          setIsLoading(false);
          return;
        }

        // Fetch place details to get coordinates
        const placesService = new google.maps.places.PlacesService(
          document.createElement('div')
        );

        const placeDetailsPromises = places.map((place) => {
          return new Promise<{ place: SavedPlace; location: google.maps.LatLng | null }>((resolve) => {
            placesService.getDetails(
              {
                placeId: place.placeId,
                fields: ['geometry', 'name'],
              },
              (result, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
                  resolve({ place, location: result.geometry.location });
                } else {
                  console.warn(`Failed to get location for ${place.name}:`, status);
                  resolve({ place, location: null });
                }
              }
            );
          });
        });

        const placeDetails = await Promise.all(placeDetailsPromises);
        const validPlaces = placeDetails.filter((p) => p.location !== null);

        if (validPlaces.length === 0) {
          setError('Could not load location data for saved places');
          setIsLoading(false);
          return;
        }

        // Calculate bounds to fit all markers
        const bounds = new google.maps.LatLngBounds();
        validPlaces.forEach(({ location }) => {
          if (location) bounds.extend(location);
        });

        // Create map
        const mapInstance = new google.maps.Map(mapRef.current, {
          zoom: 12,
          center: bounds.getCenter(),
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Wait for map to load
        await new Promise((resolve) => {
          google.maps.event.addListenerOnce(mapInstance, 'idle', resolve);
        });

        // Fit bounds after map is ready
        mapInstance.fitBounds(bounds);

        // Import AdvancedMarkerElement
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

        // Create markers for each place
        const markers: google.maps.marker.AdvancedMarkerElement[] = [];

        validPlaces.forEach(({ place, location }, index) => {
          if (!location) return;

          const marker = new AdvancedMarkerElement({
            map: mapInstance,
            position: location,
            title: place.name,
          });

          // Add click listener to show info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${place.name}</h3>
                ${place.rating ? `<div style="color: #666; font-size: 12px;">★ ${place.rating.toFixed(1)}</div>` : ''}
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.placeId}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="display: inline-block; margin-top: 8px; color: #1a73e8; text-decoration: none; font-size: 12px;"
                >
                  Open in Google Maps →
                </a>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
          });

          markers.push(marker);
        });

        markersRef.current = markers;
        setMap(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to load map. Please try again.');
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [places]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-serif font-bold">Saved Places Map</h2>
            <p className="text-sm text-gray-600 mt-1">
              {places.length} {places.length === 1 ? 'place' : 'places'} on the map
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close map"
          >
            <svg
              className="w-6 h-6 text-gray-600"
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

        {/* Map Container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-bounce">🗺️</div>
                <div className="text-lg text-gray-600">Loading map...</div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md px-4">
                <div className="text-4xl mb-4">😕</div>
                <div className="text-lg text-gray-900 font-semibold mb-2">{error}</div>
                <button
                  onClick={onClose}
                  className="btn-primary mt-4"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ display: isLoading || error ? 'none' : 'block' }}
          />
        </div>

        {/* Footer with instructions */}
        {!isLoading && !error && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Click on any marker to see place details and get directions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
