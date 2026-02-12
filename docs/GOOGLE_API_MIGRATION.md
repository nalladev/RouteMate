# Migration from Google APIs to Free Alternatives

## Overview

This document summarizes the migration from Google Maps APIs to free and open-source alternatives. This change eliminates the need for Google Cloud billing while maintaining full functionality for place search and routing.

## Changes Made

### 1. **Place Search / Geocoding**

**Before:** Google Places Autocomplete API
- Required API key with billing enabled
- Package: `react-native-google-places-autocomplete`
- Cost: Pay-per-request after free tier

**After:** Nominatim (OpenStreetMap)
- Completely free
- No API key required
- Custom component: `components/maps/PlaceSearchInput.tsx`
- API: `https://nominatim.openstreetmap.org/search`
- Usage limit: Max 1 request per second (reasonable for our use case)

### 2. **Routing / Directions**

**Before:** Google Directions API
- Required API key with billing enabled
- Endpoint: `https://maps.googleapis.com/maps/api/directions`
- Cost: Pay-per-request after free tier

**After:** OSRM (Open Source Routing Machine)
- Completely free and open-source
- No API key required
- Utility: `utils/routing.ts`
- API: `https://router.project-osrm.org/route/v1/driving`
- No strict rate limits on public server

### 3. **Map Display**

**No Change Required:**
- React Native Maps continues to work without Google API keys
- Uses native maps: Google Maps on Android, Apple Maps on iOS
- No billing required for basic map display

## Files Modified

### Removed
- ❌ Dependency: `react-native-google-places-autocomplete`
- ❌ Environment variable: `GOOGLE_MAPS_API_KEY`
- ❌ Config: `config/env.ts` - removed Google Maps API key getter
- ❌ Config: `app.config.js` - removed iOS/Android Google Maps API key config
- ❌ Workflows: Removed `GOOGLE_MAPS_API_KEY` from GitHub Actions

### Created
- ✅ `components/maps/PlaceSearchInput.tsx` - Custom place search component using Nominatim
- ✅ `utils/routing.ts` - OSRM routing utilities with helper functions
- ✅ `docs/GOOGLE_API_MIGRATION.md` - This document

### Updated
- ✅ `app/(tabs)/index.tsx` - Replaced Google Places Autocomplete with PlaceSearchInput
- ✅ `app/(tabs)/index.tsx` - Replaced Google Directions API with OSRM
- ✅ `docs/plan.md` - Updated to reflect free alternatives
- ✅ `docs/openapi.yaml` - Added documentation about map services
- ✅ `README.md` - Removed Google API key setup, added free alternatives info
- ✅ `package.json` - Removed `react-native-google-places-autocomplete`
- ✅ `.github/workflows/android-release.yml` - Removed Google API key references

## New Components & Utilities

### PlaceSearchInput Component

Location: `components/maps/PlaceSearchInput.tsx`

**Features:**
- Real-time place search using Nominatim
- Debounced search (500ms) to reduce API calls
- Displays formatted results with icons
- Returns coordinates and place name
- Clean, modern UI matching app design

**Usage:**
```tsx
<PlaceSearchInput
  placeholder="Search destination..."
  onPlaceSelected={(place) => {
    // place = { lat, lng, name }
  }}
  onClear={() => {
    // Handle clear
  }}
/>
```

### Routing Utilities

Location: `utils/routing.ts`

**Key Functions:**

1. `getRoute(origin, destination)` - Get route with coordinates
2. `isPointNearRoute(point, route, toleranceMeters)` - Check proximity
3. `calculateDistance(lat1, lng1, lat2, lng2)` - Haversine distance
4. `formatDistance(meters)` - Format for display (e.g., "1.5 km")
5. `formatDuration(seconds)` - Format for display (e.g., "1h 30m")
6. `doRoutesOverlap(route1, route2, toleranceMeters)` - Check route overlap

**Usage:**
```typescript
import { getRoute } from '@/utils/routing';

const route = await getRoute(
  { lat: 28.6139, lng: 77.2090 },
  { lat: 28.7041, lng: 77.1025 }
);

if (route) {
  console.log(route.coordinates); // Array of {latitude, longitude}
  console.log(route.distance);    // meters
  console.log(route.duration);    // seconds
}
```

## Environment Variables

### Removed
```bash
GOOGLE_MAPS_API_KEY=<not-needed-anymore>
```

### Current Required Variables
```bash
FIREBASE_SERVICE_ACCOUNT_ENCODED=<base64-encoded-json>
PHONE_EMAIL_API_KEY=<your-key>
EXPO_PUBLIC_PHONE_EMAIL_CLIENT_ID=<your-client-id>
DIDIT_API_KEY=<your-key>
DIDIT_WORKFLOW_ID=<your-workflow-id>
WALLET_ENCRYPTION_KEY=<random-32-chars>
PASSWORD_HASHING_SEED=<random-string>
```

## Migration Checklist

If you're updating an existing installation:

- [ ] Remove `GOOGLE_MAPS_API_KEY` from `.env.local`
- [ ] Run `pnpm install` to remove old packages
- [ ] Remove `node_modules` and `package-lock.json` if needed
- [ ] Clear build cache: `npx expo prebuild --clean`
- [ ] Rebuild app: `npx expo run:android` or `npx expo run:ios`
- [ ] Test place search functionality
- [ ] Test route display functionality
- [ ] Remove Google Maps API key from GitHub Secrets (if deployed)

## Benefits of This Migration

### Cost Savings
- **Before:** Potential costs after free tier exhausted
- **After:** $0 - completely free forever

### No Billing Setup Required
- No need to enable billing on Google Cloud
- No credit card required
- Easier for new developers to set up

### Open Source
- OSRM and Nominatim are open-source
- Can self-host if needed for higher limits
- Community-maintained and reliable

### Privacy
- No data sent to Google
- Better privacy for users
- Compliant with data protection regulations

## Limitations & Considerations

### Nominatim (Place Search)
- **Rate Limit:** Max 1 request per second
- **Mitigation:** Debounced search (500ms delay) built into component
- **Alternative:** Can tap map to select destination if search fails

### OSRM (Routing)
- **Public Server:** May have occasional rate limits
- **Mitigation:** Graceful error handling built in
- **Alternative:** Can self-host OSRM server if needed

### Accuracy
- Both services use OpenStreetMap data
- Generally very accurate, especially in major cities
- Comparable to Google Maps for most use cases

## Self-Hosting Options (Optional)

If you need higher limits or more control:

### Self-Host Nominatim
```bash
# Docker deployment
docker run -it --rm \
  -e PBF_URL=https://download.geofabrik.de/asia/india-latest.osm.pbf \
  -v nominatim-data:/var/lib/postgresql/12/main \
  -p 8080:8080 \
  mediagis/nominatim:4.2
```

### Self-Host OSRM
```bash
# Download map data and build routing graph
wget http://download.geofabrik.de/asia/india-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm

# Run OSRM server
docker run -t -i -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm
```

Then update endpoints in:
- `components/maps/PlaceSearchInput.tsx` (line 71)
- `utils/routing.ts` (line 42)

## Testing

### Test Place Search
1. Open app
2. Tap search bar
3. Type a location name
4. Verify suggestions appear
5. Select a suggestion
6. Verify coordinates are set correctly

### Test Routing
1. Select a destination
2. Choose "Start Driving" or "Find a Ride"
3. Verify route line appears on map
4. Verify route follows roads correctly

## Support

If you encounter issues:

1. **Check network connectivity** - Both APIs require internet
2. **Respect rate limits** - Wait 1 second between Nominatim requests
3. **Check API status:**
   - Nominatim: https://nominatim.openstreetmap.org/status
   - OSRM: https://router.project-osrm.org/route/v1/driving/77.2090,28.6139;77.1025,28.7041
4. **Fallback:** Use map tap to select destinations if search fails

## Future Enhancements

Potential improvements for the future:

- [ ] Add caching for frequent searches
- [ ] Implement offline routing with downloaded map data
- [ ] Add alternative routing providers as fallback
- [ ] Self-host services for production deployment
- [ ] Add route optimization for multiple waypoints

## Conclusion

This migration successfully removes all dependencies on Google Maps APIs while maintaining full functionality. The app now uses free, open-source alternatives that require no API keys or billing setup, making it easier to develop and deploy without concerns about API costs.

---

**Migration Date:** January 2025  
**Branch:** `without-google`  
**Status:** ✅ Complete