'use client';

import { useEffect, useRef, useMemo } from 'react';
import { CafeMatch } from '@/types';
import { loadGoogleMaps } from '@/lib/maps-loader';
import { analytics } from '@/lib/analytics';

interface ResultsMapProps {
  results: CafeMatch[];
  center: google.maps.LatLngLiteral;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  onMarkerClick: (index: number) => void;
}

export default function ResultsMap({
  results,
  center,
  selectedIndex,
  hoveredIndex,
  onMarkerClick,
}: ResultsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Create stable identifiers for results and center
  const resultsKey = useMemo(() =>
    results.map(r => r.place.id).join(','),
    [results]
  );

  const centerKey = useMemo(() =>
    center ? `${center.lat},${center.lng}` : '',
    [center]
  );

  // Initialize map once on mount
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const google = await loadGoogleMaps();

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        gestureHandling: 'greedy', // Better mobile touch handling
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      // Cleanup map instance on unmount
      mapInstanceRef.current = null;
    };
  }, []); // Only run once on mount

  // Update markers when results actually change (using stable resultsKey)
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstanceRef.current) return;

      const google = await loadGoogleMaps();
      const map = mapInstanceRef.current;

      console.log('[ResultsMap] Updating markers and bounds', {
        resultsKey,
        centerKey,
        resultsCount: results.length,
      });

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create new markers
      results.forEach((result, index) => {
        if (!result.place.location) return;

        const marker = new google.maps.Marker({
          position: result.place.location,
          map,
          label: {
            text: String(index + 1),
            color: 'white',
            fontWeight: 'bold',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#5B4636',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
        });

        // When marker is clicked, open the details drawer (same as clicking a card)
        marker.addListener('click', () => {
          analytics.resultClick({ rank: index + 1, place_id: results[index].place.id });
          onMarkerClick(index);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (results.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        results.forEach(result => {
          if (result.place.location) {
            bounds.extend(result.place.location);
          }
        });
        map.fitBounds(bounds);
      } else if (center) {
        // If no results, center on the provided center
        map.setCenter(center);
      }
    };

    // Only run if we have results
    if (resultsKey) {
      updateMarkers();
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [resultsKey, centerKey]); // Only depend on stable keys, not the objects themselves

  // Update marker styles based on selection/hover
  useEffect(() => {
    const highlightIndex = selectedIndex !== null ? selectedIndex : hoveredIndex;

    markersRef.current.forEach((marker, index) => {
      const isHighlighted = highlightIndex === index;

      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: isHighlighted ? 24 : 20,
        fillColor: isHighlighted ? '#3D2E24' : '#5B4636',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: isHighlighted ? 3 : 2,
      });

      marker.setZIndex(isHighlighted ? 1000 : index);
    });
  }, [selectedIndex, hoveredIndex]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-none sm:rounded-2xl overflow-hidden shadow-lg"
      style={{ minHeight: '400px' }}
    />
  );
}
