'use client';

import { useState, useRef, useEffect } from 'react';
import { EstablishmentType, CafeMatch } from '@/types';
import { HorizontalSearchForm, SearchFormData } from '@/components/search/HorizontalSearchForm';
import { ViewToggle, ViewMode } from '@/components/search/ViewToggle';
import { useSearch } from '@/hooks/useSearch';
import DetailsDrawer from '@/components/results/DetailsDrawer';
import RefineSearchModal from '@/components/results/RefineSearchModal';
import { storage } from '@/lib/storage';
import Toast from '@/components/shared/Toast';
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
  const [selectedResult, setSelectedResult] = useState<CafeMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const searchFormRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showToast, setShowToast] = useState(false);

  // Track current search params for refinement
  const [currentSearchParams, setCurrentSearchParams] = useState<{
    sourcePlaceIds: string[];
    sourceNames: string[];
    destinationCity: string;
    freeText?: string;
  } | null>(null);

  const { results, isLoading, error, mapCenter, executeSearch } = useSearch();

  // Check token expiration on page load
  useEffect(() => {
    const checkTokenExpiration = () => {
      const profile = storage.getUserProfile();
      if (!profile?.token) return;

      try {
        // Decode JWT token to check expiration
        const base64Url = profile.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        // Check if token is expired (with 24 hour grace period like server-side)
        const exp = decoded.exp;
        if (exp) {
          const expirationTime = exp * 1000;
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          // If expired more than 24 hours, log out
          if (now >= expirationTime + twentyFourHours) {
            console.log('[HomePage] Token expired, logging out user');
            storage.setUserProfile(null);
            window.dispatchEvent(new Event('loca_auth_change'));
          }
        }
      } catch (error) {
        console.error('[HomePage] Error checking token expiration:', error);
        // If we can't decode the token, it's invalid - log out
        storage.setUserProfile(null);
        window.dispatchEvent(new Event('loca_auth_change'));
      }
    };

    checkTokenExpiration();
  }, []);

  const handleSearch = async (formData: SearchFormData) => {
    // Check if user is logged in
    const userProfile = storage.getUserProfile();
    if (!userProfile || !userProfile.token) {
      // Show cute login message
      setToastMessage('Hey there! 👋 To find your perfect matches, please sign in with Google first. It\'s quick and helps us personalize your experience! ✨');
      setToastType('warning');
      setShowToast(true);
      return;
    }

    setHasSearched(true);
    setEstablishmentType(formData.establishmentType);

    // Store search params for refinement
    setCurrentSearchParams({
      sourcePlaceIds: formData.sourcePlaceIds,
      sourceNames: formData.sourceNames,
      destinationCity: formData.destinationCity,
      freeText: formData.freeText,
    });

    await executeSearch({
      sourcePlaceIds: formData.sourcePlaceIds,
      sourceNames: formData.sourceNames,
      destinationCity: formData.destinationCity,
      freeText: formData.freeText,
      establishmentType: formData.establishmentType,
    });
  };

  const handleRefineSearch = async (freeText: string) => {
    if (!currentSearchParams) return;

    await executeSearch({
      sourcePlaceIds: currentSearchParams.sourcePlaceIds,
      sourceNames: currentSearchParams.sourceNames,
      destinationCity: currentSearchParams.destinationCity,
      freeText: freeText || undefined,
      establishmentType: establishmentType,
    });

    // Update stored params with new freeText
    setCurrentSearchParams({
      ...currentSearchParams,
      freeText: freeText || undefined,
    });
  };

  const handleSelectResult = (result: CafeMatch, index: number) => {
    setSelectedResult(result);
    setSelectedIndex(index);
  };

  const handleCloseDrawer = () => {
    setSelectedResult(null);
    setSelectedIndex(null);
  };

  const handleMarkerClick = (index: number) => {
    setSelectedResult(results[index]);
    setSelectedIndex(index);
  };

  const handleMainContentClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="button"]') ||
      target.closest('.gm-style') // Google Maps elements
    ) {
      return;
    }

    // Scroll to search form
    if (searchFormRef.current) {
      searchFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Focus on submit button after a short delay to ensure scroll completes
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.focus();
        }
      }, 300);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Horizontal Search Form - Always Visible */}
      <div ref={searchFormRef}>
        <HorizontalSearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
          initialEstablishmentType={establishmentType}
        />
      </div>

      {/* View Toggle and Refine Button - Show after search */}
      {hasSearched && (
        <div className="border-b bg-gray-50 py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              disabled={isLoading}
            />
            {results.length > 0 && (
              <button
                onClick={() => setIsRefineModalOpen(true)}
                className="btn-secondary text-sm px-4 py-2"
              >
                I missed your vibe?
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col md:flex-row overflow-hidden cursor-pointer"
        onClick={handleMainContentClick}
      >
        {/* Show map initially (before search) or based on view mode */}
        {!hasSearched && (
          <div className="w-full h-full relative">
            <ResultsMap
              results={[]}
              center={{ lat: 40.7128, lng: -74.0060 }}
              selectedIndex={null}
              hoveredIndex={null}
              onMarkerClick={() => {}}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl max-w-md mx-4 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Welcome to Loca
                </h1>
                <p className="text-gray-600 text-base md:text-lg">
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
                  viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
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
                    onSelectResult={handleSelectResult}
                    onHover={setHoveredIndex}
                    selectedIndex={selectedIndex}
                    hoveredIndex={hoveredIndex}
                  />
                )}
              </div>
            )}

            {/* Map */}
            {(viewMode === 'map' || viewMode === 'split') && (
              <div
                className={`${viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'} h-full`}
                style={{ minHeight: '30vh' }}
              >
                <ResultsMap
                  results={results}
                  center={mapCenter || { lat: 40.7128, lng: -74.0060 }}
                  selectedIndex={selectedIndex}
                  hoveredIndex={hoveredIndex}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Details drawer */}
      <DetailsDrawer result={selectedResult} onClose={handleCloseDrawer} />

      {/* Refine search modal */}
      {currentSearchParams && (
        <RefineSearchModal
          isOpen={isRefineModalOpen}
          onClose={() => setIsRefineModalOpen(false)}
          currentFreeText={currentSearchParams.freeText}
          sourcePlaceIds={currentSearchParams.sourcePlaceIds}
          sourceNames={currentSearchParams.sourceNames}
          destCity={currentSearchParams.destinationCity}
          establishmentType={establishmentType}
          onApply={handleRefineSearch}
        />
      )}

      {/* Toast for login message */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={6000}
      />
    </div>
  );
}
