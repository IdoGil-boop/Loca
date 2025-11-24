'use client';

import React from 'react';
import { EstablishmentType, getEstablishmentTypeLabel } from '@/types';

interface EstablishmentTypeSelectorProps {
  value: EstablishmentType;
  onChange: (type: EstablishmentType) => void;
  disabled?: boolean;
  className?: string;
}

const ESTABLISHMENT_ICONS: Record<EstablishmentType, string> = {
  cafe: '☕',
  restaurant: '🍽️',
  museum: '🏛️',
  bar: '🍺',
};

export function EstablishmentTypeSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: EstablishmentTypeSelectorProps) {
  const types: EstablishmentType[] = ['cafe', 'restaurant', 'museum', 'bar'];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Type:
      </label>
      <div className="flex gap-1">
        {types.map((type) => {
          const isActive = value === type;
          return (
            <button
              key={type}
              onClick={() => !disabled && onChange(type)}
              disabled={disabled}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-espresso ${
                isActive
                  ? 'bg-espresso text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={`Select ${getEstablishmentTypeLabel(type)}`}
              aria-pressed={isActive}
              title={getEstablishmentTypeLabel(type)}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-base">{ESTABLISHMENT_ICONS[type]}</span>
                <span className="hidden sm:inline">{getEstablishmentTypeLabel(type)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
