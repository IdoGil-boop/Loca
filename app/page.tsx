'use client';

import { useState } from 'react';
import { EstablishmentType } from '@/types';
import { HorizontalSearchForm, SearchFormData } from '@/components/search/HorizontalSearchForm';
import { ViewToggle, ViewMode } from '@/components/search/ViewToggle';
import { useSearch } from '@/hooks/useSearch';
import dynamic from 'next/dynamic';

// Dynamically import map and results components (they use Google Maps)
const ResultsMap = dynamic(() => import('@/components/results/ResultsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
});

const ResultsList = dynamic(() => import('@/components/results/ResultsList'), {
  ssr: false,
});

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [hasSearched, setHasSearched] = useState(false);
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('cafe');

  const { results, isLoading, error, mapCenter, executeSearch } = useSearch();

  const handleSearch = async (formData: SearchFormData) => {
    setHasSearched(true);
    setEstablishmentType(formData.establishmentType);

    await executeSearch({
      sourcePlaceIds: formData.sourcePlaceIds,
      sourceNames: formData.sourceNames,
      destinationCity: formData.destinationCity,
      vibes: formData.vibes,
      freeText: formData.freeText,
      establishmentType: formData.establishmentType,
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Horizontal Search Form - Always Visible */}
      <HorizontalSearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        initialEstablishmentType={establishmentType}
      />

      {/* View Toggle - Show after search */}
      {hasSearched && (
        <div className="border-b bg-gray-50 py-3">
          <div className="max-w-7xl mx-auto px-4">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Show map initially (before search) or based on view mode */}
        {!hasSearched && (
          <div className="w-full h-full">
            <ResultsMap
              results={[]}
              center={null}
              onMarkerClick={() => {}}
              onMapLoad={() => {}}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Welcome to Loca
                </h1>
                <p className="text-gray-600 text-lg">
                  Find places that match your vibe, anywhere in the world
                </p>
                <p className="text-gray-500 text-sm mt-4">
                  Start by searching above ↑
                </p>
              </div>
            </div>
          </div>
        )}

        {/* After search - show results based on view mode */}
        {hasSearched && (
          <>
            {/* Results List */}
            {(viewMode === 'list' || viewMode === 'split') && (
              <div
                className={`${
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                } h-full overflow-y-auto border-r`}
              >
                {isLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-espresso mx-auto mb-4"></div>
                      <p className="text-gray-600">Finding your perfect matches...</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                      <h3 className="text-red-800 font-semibold mb-2">Oops! Something went wrong</h3>
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {!isLoading && !error && results.length === 0 && (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <p className="text-gray-500 text-lg">No results yet</p>
                      <p className="text-gray-400 text-sm mt-2">Try searching above</p>
                    </div>
                  </div>
                )}

                {!isLoading && !error && results.length > 0 && (
                  <ResultsList
                    results={results}
                    onResultClick={() => {}}
                    onResultHover={() => {}}
                    selectedIndex={null}
                    hoveredIndex={null}
                  />
                )}
              </div>
            )}

            {/* Map */}
            {(viewMode === 'map' || viewMode === 'split') && (
              <div
                className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full`}
                style={{ minHeight: '30vh' }}
              >
                <ResultsMap
                  results={results}
                  center={mapCenter}
                  onMarkerClick={() => {}}
                  onMapLoad={() => {}}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
