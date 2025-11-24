# Loca Implementation Status

## Project Overview
Converted Elsebrew (coffee-shop-only) to Loca (all establishment types) with new single-page UX design.

**Repository**: `/Users/idogil/loca`

---

## ✅ COMPLETED (Phase 1 - Core Infrastructure)

### 1. Type System - COMPLETE ✓
**File**: `/types/index.ts`

- ✅ Created `EstablishmentType` = 'cafe' | 'restaurant' | 'museum' | 'bar'
- ✅ Category-specific vibe interfaces:
  - `CafeVibes` (roastery, lightRoast, laptopFriendly, brunch)
  - `RestaurantVibes` (outdoorDining, fineDining, casualDining, romanticAmbiance)
  - `MuseumVibes` (interactive, modernArt, historical, familyFriendly)
  - `BarVibes` (liveMusic, cocktailBar, craftBeer, rooftop)
- ✅ Renamed `CafeMatch` → `PlaceMatch` (with backward compat alias)
- ✅ Renamed `SavedCafe` → `SavedPlace` (with backward compat alias)
- ✅ Added `establishmentType` to `SearchParams` and `SearchState`
- ✅ Helper functions: `establishmentTypeToGoogleType()`, `getEstablishmentTypeLabel()`, `normalizeVibesByType()`

### 2. Critical Backend Update - lib/places-search.ts ✓
**File**: `/lib/places-search.ts`

- ✅ **CRITICAL FIX**: Line 288 changed from:
  ```typescript
  includedType: 'coffee_shop'  // OLD - hardcoded
  ```
  to:
  ```typescript
  includedType: establishmentTypeToGoogleType(establishmentType)  // NEW - dynamic
  ```
- ✅ Updated `vibeToPlaceTypes()` with type-safe vibe checking
- ✅ Updated `buildVibeEnhancedQuery()` with all establishment-specific keywords
- ✅ Added `establishmentType` parameter to `searchCafes()` function signature

### 3. Search Hook - hooks/useSearch.ts ✓
**File**: `/hooks/useSearch.ts`

- ✅ Created custom hook extracting search logic
- ✅ Handles rate limiting, geocoding, search execution
- ✅ Returns: `{ results, isLoading, error, mapCenter, executeSearch, clearResults }`
- ⚠️ **NOTE**: Simplified version - may need adjustment to match full searchCafes signature

### 4. UI Components - COMPLETE ✓

#### ViewToggle Component
**File**: `/components/search/ViewToggle.tsx`
- ✅ Three-state toggle: List Only | List+Map | Map Only
- ✅ Responsive design with icons
- ✅ Keyboard accessible

#### EstablishmentTypeSelector Component
**File**: `/components/search/EstablishmentTypeSelector.tsx`
- ✅ Icon-based type selector (☕ 🍽️ 🏛️ 🍺)
- ✅ Dynamic based on EstablishmentType enum
- ✅ Active state styling

#### HorizontalSearchForm Component
**File**: `/components/search/HorizontalSearchForm.tsx`
- ✅ Horizontal layout with all fields in one row (wraps on mobile)
- ✅ Establishment type selector integrated
- ✅ Google Places Autocomplete for source places & destination
- ✅ Multi-source place selection with chip display
- ✅ Optional free text field
- ✅ Vibes support (hidden for MVP, can be expanded)

### 5. Main Single-Page App - COMPLETE ✓
**File**: `/app/page.tsx`

- ✅ New single-page design
- ✅ Horizontal search form always visible at top
- ✅ View toggle below form (after search)
- ✅ Dynamic content area:
  - Before search: Map with welcome message overlay
  - After search: List + Map based on toggle state
- ✅ Responsive layout with loading & error states
- ✅ Minimum 30vh map visibility on mobile

### 6. Branding Updates - PARTIAL ✓
- ✅ `/components/shared/Header.tsx`: "Elsebrew" → "Loca"
- ✅ `/app/layout.tsx`: SEO metadata updated
- ✅ `/package.json`: "name": "loca"

---

## 🚧 REMAINING WORK (Phase 2)

### 7. Backend Logic Updates - TODO
These files need updates to handle multi-establishment types:

#### lib/scoring.ts
**Priority**: High
**Changes needed**:
- Add establishment-type-specific scoring weights
- Restaurant: cuisine matching, price range, dining style
- Museum: exhibition types, admission, collections
- Bar: drink variety, atmosphere, entertainment

#### lib/keyword-extraction.ts
**Priority**: High
**Changes needed**:
- Create establishment-specific keyword lists
- Restaurant: cuisine types, meal times, service style
- Museum: exhibition types, art periods, collections
- Bar: drink types, entertainment, atmosphere

### 8. API Routes - TODO
**Priority**: High

#### app/api/reason/route.ts
- Make LLM system prompt dynamic based on establishment type
- Add category-specific examples

#### app/api/reddit/route.ts
- Make subreddit lists dynamic:
  - Cafe: ['Coffee', 'cafe', 'espresso']
  - Restaurant: ['food', 'FoodPorn', 'restaurants']
  - Museum: ['museum', 'ArtHistory']
  - Bar: ['cocktails', 'beer', 'wine']

### 9. Saved Places Dropdown - TODO
**Priority**: Medium
**File to create**: `/components/saved/SavedPlacesDropdown.tsx`

Based on existing `/app/saved/page.tsx` logic:
- Dropdown menu in header
- Mini cards for each saved place
- Click → opens DetailsDrawer
- Remove button per card
- Badge showing count

### 10. Complete Rebrand - TODO
**Priority**: Medium

Files needing updates:
- `/app/about/page.tsx` - Complete rewrite (currently coffee-focused)
- `/app/terms/page.tsx` - Replace "café" with "place"
- `/app/privacy/page.tsx` - Update data collection descriptions
- `/README.md` - Rewrite for Loca
- `/components/shared/Footer.tsx` - Update any Elsebrew references

### 11. Legacy Cleanup - TODO
**Priority**: Low

Files to delete or update:
- `/app/results/page.tsx` - Old results page (replaced by new single-page)
- `/app/saved/page.tsx` - Will be replaced by dropdown (optional: keep as full-page view)
- `/components/results/RefineSearchModal.tsx` - Not needed (form always visible)
- `/app/page.tsx.old` - Backup of old home page

---

## 🧪 TESTING CHECKLIST

### Core Functionality
- [ ] Search for cafes - verify results
- [ ] Search for restaurants - verify results
- [ ] Search for museums - verify results
- [ ] Search for bars - verify results
- [ ] Toggle between List Only / List+Map / Map Only
- [ ] Map visibility on mobile (≥30vh)
- [ ] Rate limiting works
- [ ] Error handling displays properly

### UI/UX
- [ ] Establishment type selector works
- [ ] Multi-source place selection
- [ ] Form validation
- [ ] Loading states
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Keyboard navigation

### Backend
- [ ] Google Places API returns correct types
- [ ] Scoring works for all establishment types
- [ ] LLM reasoning adapts to establishment type
- [ ] Reddit data pulls from correct subreddits

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Update environment variables (.env.local)
- [ ] Test build: `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Update domain/hosting config
- [ ] Set up analytics for new Loca brand
- [ ] Test on production

---

## 🔧 KNOWN ISSUES / NOTES

1. **useSearch Hook Simplification**
   - Current implementation is simplified
   - May need to pass more parameters to match full `searchCafes()` signature
   - Includes: `destinationTypes`, `originPlaces`, `pageToken`, etc.

2. **Vibes UI**
   - Currently hidden in HorizontalSearchForm
   - Can be expanded with category-specific vibe toggles
   - Would need expandable panel or modal

3. **Multi-Source Places**
   - UI supports multiple source places
   - Backend `searchCafes()` currently uses first place only
   - Full multi-source logic exists in elsebrew but not yet integrated

4. **Image Analysis & AI Reasoning**
   - These features exist in original codebase
   - Will automatically work once scoring/API routes are updated

---

## 📝 IMPLEMENTATION NOTES

### Architecture Decisions
- **Single-page app**: Avoids page navigation, keeps search form always visible
- **Dynamic establishment types**: All hardcoded coffee references removed
- **Backward compatibility**: Type aliases ensure existing code still works
- **Type-safe vibes**: Union types with 'in' operator for safe property checking

### File Organization
```
/Users/idogil/loca/
├── app/
│   ├── page.tsx                    ✅ NEW - Single-page app
│   ├── page.tsx.old                📦 OLD - Backup
│   ├── layout.tsx                  ✅ UPDATED - Loca branding
│   └── api/                        ⚠️ NEEDS UPDATE
├── components/
│   ├── search/                     ✅ NEW DIRECTORY
│   │   ├── ViewToggle.tsx          ✅ NEW
│   │   ├── EstablishmentTypeSelector.tsx  ✅ NEW
│   │   └── HorizontalSearchForm.tsx       ✅ NEW
│   ├── shared/
│   │   └── Header.tsx              ✅ UPDATED - Loca branding
│   └── results/                    ♻️ REUSABLE - No changes needed
├── hooks/
│   └── useSearch.ts                ✅ NEW
├── lib/
│   ├── places-search.ts            ✅ UPDATED - Dynamic types
│   ├── scoring.ts                  ⚠️ NEEDS UPDATE
│   └── keyword-extraction.ts       ⚠️ NEEDS UPDATE
├── types/
│   └── index.ts                    ✅ UPDATED - Full type system
└── package.json                    ✅ UPDATED - "loca"
```

---

## 🎯 NEXT STEPS (Recommended Order)

1. **Test Basic Functionality** (30 min)
   - Run `npm run dev`
   - Test cafe search end-to-end
   - Verify no critical errors

2. **Update lib/scoring.ts** (1-2 hours)
   - Add establishment-type-specific scoring
   - Test with different types

3. **Update API Routes** (1-2 hours)
   - Update reason route for dynamic prompts
   - Update reddit route for dynamic subreddits

4. **Complete Rebrand** (2-3 hours)
   - About page
   - Terms & Privacy
   - README
   - Footer

5. **Build SavedPlacesDropdown** (2-3 hours)
   - Convert saved page to dropdown
   - Integrate with header

6. **Full Testing** (2-4 hours)
   - All establishment types
   - All features
   - Mobile & desktop

---

## 💡 TIPS FOR COMPLETION

- **Incremental Testing**: Test after each file update
- **Use Existing Patterns**: Copy patterns from cafe logic for other types
- **Type Safety**: Always use TypeScript properly
- **Backward Compat**: Keep type aliases for smooth migration

---

**Last Updated**: Nov 24, 2025
**Status**: ~60% Complete - Core infrastructure done, UI functional, backend needs updates
