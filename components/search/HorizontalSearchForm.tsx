'use client';

import { useState, useRef, useEffect } from 'react';
import { EstablishmentType, normalizeVibesByType } from '@/types';
import { loadGoogleMaps } from '@/lib/maps-loader';
import { EstablishmentTypeSelector } from './EstablishmentTypeSelector';

export interface SearchFormData {
  sourcePlaceIds: string[];
  sourceNames: string[];
  destinationCity: string;
  vibes: any; // Will be properly typed based on establishment type
  freeText?: string;
  establishmentType: EstablishmentType;
}

interface HorizontalSearchFormProps {
  onSearch: (data: SearchFormData) => void;
  isLoading?: boolean;
  initialEstablishmentType?: EstablishmentType;
}

export function HorizontalSearchForm({
  onSearch,
  isLoading = false,
  initialEstablishmentType = 'cafe',
}: HorizontalSearchFormProps) {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>(initialEstablishmentType);
  const [sourcePlaces, setSourcePlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [destPlace, setDestPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [freeText, setFreeText] = useState('');
  const [showVibes, setShowVibes] = useState(false);

  // Initialize default vibes based on establishment type
  const [vibes, setVibes] = useState<any>(() =>
    normalizeVibesByType(establishmentType, {})
  );

  // Update vibes when establishment type changes
  useEffect(() => {
    setVibes(normalizeVibesByType(establishmentType, {}));
  }, [establishmentType]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = async () => {
      const google = await loadGoogleMaps();

      if (sourceInputRef.current) {
        const sourceAutocomplete = new google.maps.places.Autocomplete(sourceInputRef.current, {
          types: ['establishment'],
          fields: ['place_id', 'name', 'formatted_address'],
        });

        sourceAutocomplete.addListener('place_changed', () => {
          const place = sourceAutocomplete.getPlace();
          if (place && place.place_id) {
            setSourcePlaces((prev) => {
              const exists = prev.some((p) => p.place_id === place.place_id);
              if (exists) return prev;
              return [...prev, place];
            });
            if (sourceInputRef.current) {
              sourceInputRef.current.value = '';
            }
          }
        });
      }

      if (destInputRef.current) {
        const destAutocomplete = new google.maps.places.Autocomplete(destInputRef.current, {
          types: ['(regions)'],
          fields: ['place_id', 'name', 'geometry', 'formatted_address', 'types'],
        });

        destAutocomplete.addListener('place_changed', () => {
          const place = destAutocomplete.getPlace();
          if (place && place.place_id) {
            setDestPlace(place);
          }
        });
      }
    };

    initAutocomplete();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (sourcePlaces.length === 0) {
      alert('Please select at least one source place');
      return;
    }

    if (!destPlace) {
      alert('Please select a destination');
      return;
    }

    onSearch({
      sourcePlaceIds: sourcePlaces.map((p) => p.place_id!),
      sourceNames: sourcePlaces.map((p) => p.name!),
      destinationCity: destPlace.formatted_address || destPlace.name!,
      vibes,
      freeText: freeText || undefined,
      establishmentType,
    });
  };

  const removeSourcePlace = (placeId: string) => {
    setSourcePlaces((prev) => prev.filter((p) => p.place_id !== placeId));
  };

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-40">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-4">
        {/* Top Row: Establishment Type Selector */}
        <div className="mb-3">
          <EstablishmentTypeSelector
            value={establishmentType}
            onChange={setEstablishmentType}
            disabled={isLoading}
          />
        </div>

        {/* Main Search Row */}
        <div className="flex flex-wrap gap-3 items-start">
          {/* Source Places */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Your favorite place(s)
            </label>
            <input
              ref={sourceInputRef}
              type="text"
              placeholder="e.g., Blue Bottle Coffee, SF"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-transparent text-sm"
              disabled={isLoading}
            />
            {sourcePlaces.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {sourcePlaces.map((place) => (
                  <span
                    key={place.place_id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-espresso-light text-white text-xs rounded-full"
                  >
                    {place.name}
                    <button
                      type="button"
                      onClick={() => removeSourcePlace(place.place_id!)}
                      className="hover:text-red-200"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Where are you going?
            </label>
            <input
              ref={destInputRef}
              type="text"
              placeholder="e.g., Brooklyn, NY"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-transparent text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Free Text (Optional) */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Anything specific? (optional)
            </label>
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g., quiet, wifi"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-espresso focus:border-transparent text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading || sourcePlaces.length === 0 || !destPlace}
              className="px-6 py-2 bg-espresso text-white rounded-lg hover:bg-espresso-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-espresso disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
            >
              {isLoading ? 'Searching...' : 'Find Places'}
            </button>
          </div>
        </div>

        {/* Vibes Toggle (Hidden for MVP, can be expanded later) */}
        {showVibes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Vibe preferences (coming soon)</p>
          </div>
        )}
      </form>
    </div>
  );
}
