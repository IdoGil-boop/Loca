# Loca - Next Steps & Testing Guide

## 🎉 Implementation Complete! (~80%)

The core Loca implementation is now ready for testing. All major infrastructure changes have been completed.

---

## ✅ What's Been Completed

### 1. Core Type System ✓
- Multi-establishment support (cafe, restaurant, museum, bar)
- Category-specific vibe interfaces
- PlaceMatch and SavedPlace types
- Helper functions for type conversion

### 2. Backend Infrastructure ✓
- **lib/places-search.ts**: Dynamic establishment type in Google Places API
- **lib/scoring.ts**: Category-specific scoring logic
- **lib/keyword-extraction.ts**: Establishment-type-specific keywords
- **app/api/reason/route.ts**: Dynamic LLM prompts

### 3. New UI Components ✓
- **ViewToggle**: Three-state toggle (List | List+Map | Map)
- **EstablishmentTypeSelector**: Icon-based type picker
- **HorizontalSearchForm**: Always-visible search form
- **Single-page app**: New app/page.tsx with split view

### 4. Branding ✓
- "Loca" branding throughout
- Updated SEO metadata
- Package name updated

---

## 🧪 IMMEDIATE TESTING STEPS

### Step 1: Install Dependencies & Start Dev Server
```bash
cd /Users/idogil/loca
npm install
npm run dev
```

The app should start at `http://localhost:3000`

### Step 2: Basic Functionality Test
1. **Visit the home page** - You should see:
   - Horizontal search form at top
   - Establishment type selector (☕ 🍽️ 🏛️ 🍺)
   - Map visible in background with welcome message

2. **Test Cafe Search**:
   - Select "Café" type
   - Type a source place (e.g., "Blue Bottle Coffee, San Francisco")
   - Type destination (e.g., "Brooklyn, NY")
   - Click "Find Places"
   - **Expected**: Results load in split view (list + map)

3. **Test View Toggle**:
   - Click "List Only" - Map should hide
   - Click "List + Map" - Split view should show
   - Click "Map Only" - List should hide

4. **Test Other Establishment Types**:
   - Try restaurant search
   - Try museum search
   - Try bar search

### Step 3: Check for Errors
Open browser console (F12) and look for:
- TypeScript errors
- API errors
- Missing environment variables

---

## 🐛 Known Issues to Watch For

### 1. Google Maps API Key
Make sure `.env.local` has:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

### 2. useSearch Hook
The simplified `useSearch` hook may need adjustments to match the full `searchCafes` signature. If you see errors about missing parameters, this is why.

### 3. Component Imports
ResultsMap and ResultsList are dynamically imported. If you see loading issues, check the dynamic import configuration.

---

## 📝 REMAINING OPTIONAL WORK

### Medium Priority:
1. **SavedPlacesDropdown** - Convert `/app/saved/page.tsx` to dropdown
2. **About Page** - Rewrite for multi-establishment support
3. **Terms & Privacy** - Update "café" references to "place"
4. **README.md** - Update for Loca

### Low Priority:
5. **Delete Legacy Files**:
   - `/app/results/page.tsx` (old results page)
   - `/components/results/RefineSearchModal.tsx` (not needed)
   - `/app/page.tsx.old` (backup)

6. **Reddit API Integration** - Update subreddit mapping (already coded, needs testing)

7. **Vibes UI Enhancement** - Add expandable vibe toggles to search form

---

## 🚀 DEPLOYMENT CHECKLIST

When ready to deploy:

1. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
   OPENAI_API_KEY=...
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   DYNAMODB_TABLE_NAME=...
   JWT_SECRET=...
   ```

2. **Build Test**:
   ```bash
   npm run build
   ```
   Fix any TypeScript errors that appear.

3. **Update Domain** (if using custom domain):
   - Update DNS settings
   - Configure SSL certificate
   - Update CORS settings if needed

4. **Analytics**:
   - Update Google Analytics property
   - Test event tracking
   - Verify establishment type tracking

---

## 📊 TEST SCENARIOS

### Scenario 1: Coffee Shop Search
- Source: "Stumptown Coffee, Portland"
- Destination: "Seattle, WA"
- Expected: Coffee shops in Seattle similar to Stumptown

### Scenario 2: Restaurant Search
- Source: "Eleven Madison Park, NYC"
- Destination: "San Francisco, CA"
- Expected: Fine dining restaurants in SF

### Scenario 3: Museum Search
- Source: "MoMA, NYC"
- Destination: "Los Angeles, CA"
- Expected: Contemporary art museums in LA

### Scenario 4: Bar Search
- Source: "Dead Rabbit, NYC"
- Destination: "Chicago, IL"
- Expected: Cocktail bars in Chicago

---

## 🔧 TROUBLESHOOTING

### Issue: "No results found"
**Possible Causes**:
1. Google Places API returning no results for that establishment type in that location
2. Rate limit exceeded
3. Invalid establishment type mapping

**Fix**: Check browser console for API errors

### Issue: Map not loading
**Possible Causes**:
1. Missing Google Maps API key
2. API key doesn't have Maps JavaScript API enabled
3. Dynamic import failed

**Fix**: Check `.env.local` and Google Cloud Console

### Issue: TypeScript errors
**Possible Causes**:
1. Missing imports
2. Type mismatches after refactor

**Fix**: Run `npm run build` to see all errors, then fix one by one

### Issue: Search form autocomplete not working
**Possible Causes**:
1. Google Places API not loaded
2. API key missing Places API scope

**Fix**: Check console for Google Maps loading errors

---

## 💡 TIPS FOR SUCCESS

1. **Start Simple**: Test cafes first (most tested type)
2. **Check Console**: Browser console will show most issues
3. **One Type at a Time**: Test each establishment type separately
4. **Use Real Places**: Use actual place names for best results
5. **Monitor Rate Limits**: You have limited Google API calls

---

## 📚 CODE REFERENCE

### Key Files Modified:
- `/types/index.ts` - Type definitions
- `/lib/places-search.ts` - Search logic (Line 288: dynamic type)
- `/lib/scoring.ts` - Scoring logic (Lines 200-262: type-specific)
- `/lib/keyword-extraction.ts` - Keywords (Lines 47-125: type-specific)
- `/app/api/reason/route.ts` - LLM prompts (Lines 39-57: dynamic)
- `/app/page.tsx` - Main single-page app
- `/components/search/*` - New UI components

### Important Functions:
- `establishmentTypeToGoogleType()` - Maps types to Google API
- `normalizeVibesByType()` - Creates type-specific vibes
- `scoreCafe()` - Scores matches (now supports all types)
- `useSearch()` - Custom hook for search logic

---

## 🎯 SUCCESS CRITERIA

The implementation is successful if:
- ✅ Search works for all 4 establishment types
- ✅ View toggle switches between modes
- ✅ Results display correctly
- ✅ Map shows markers for results
- ✅ No critical console errors
- ✅ Responsive on mobile (map ≥30vh)

---

## 🤝 GETTING HELP

If you encounter issues:
1. Check `/IMPLEMENTATION_STATUS.md` for detailed architecture notes
2. Review git commit message for what was changed
3. Check browser console for specific errors
4. Verify all environment variables are set

---

**Project Status**: ~80% Complete - Core functionality ready for testing!

**Git Commit**: `cd692ea` - "Initial Loca implementation - Multi-establishment support"

**Last Updated**: Nov 24, 2025
