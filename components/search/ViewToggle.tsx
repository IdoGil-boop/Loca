'use client';

import React from 'react';

export type ViewMode = 'list' | 'split' | 'map';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
  className?: string;
}

export function ViewToggle({ value, onChange, disabled = false, className = '' }: ViewToggleProps) {
  const baseButtonClasses = "px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-espresso";

  const getButtonClasses = (mode: ViewMode) => {
    const isActive = value === mode;
    return `${baseButtonClasses} ${
      isActive
        ? 'bg-espresso text-white'
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
  };

  return (
    <div className={`flex items-center justify-center gap-0 ${className}`}>
      <button
        onClick={() => !disabled && onChange('list')}
        disabled={disabled}
        className={`${getButtonClasses('list')} rounded-l-lg md:border-r-0`}
        aria-label="List only view"
        aria-pressed={value === 'list'}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="hidden sm:inline">List Only</span>
        </span>
      </button>

      <button
        onClick={() => !disabled && onChange('split')}
        disabled={disabled}
        className={`${getButtonClasses('split')} hidden md:inline-flex`}
        aria-label="List and map view"
        aria-pressed={value === 'split'}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
          <span className="hidden sm:inline">List + Map</span>
        </span>
      </button>

      <button
        onClick={() => !disabled && onChange('map')}
        disabled={disabled}
        className={`${getButtonClasses('map')} rounded-r-lg md:border-l-0`}
        aria-label="Map only view"
        aria-pressed={value === 'map'}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="hidden sm:inline">Map Only</span>
        </span>
      </button>
    </div>
  );
}
