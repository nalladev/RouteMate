# OpenAPI Specification Updates for Rider-Passenger Connection Feature

## Changes Made to openapi.yaml

### 1. Added `radius` query parameter to `/driver/nearby-requests`
```yaml
parameters:
  - in: query
    name: radius
    schema:
      type: number
      default: 5
      minimum: 0.5
      maximum: 50
    description: Search radius in kilometers (default 5km)
```

### 2. Added `radius` query parameter to `/passenger/nearby-drivers`
```yaml
parameters:
  - in: query
    name: radius
    schema:
      type: number
      default: 10
      minimum: 1
      maximum: 50
    description: Search radius in kilometers (default 10km)
```

### 3. Enhanced `/user/location` endpoint documentation
- Added description of smart update logic
- Documented update intervals (10s for drivers, 15s for passengers, 30s for idle)
- Added response reasons: `first_location`, `driver_time_interval`, `passenger_time_interval`, `significant_movement`, `no_significant_change`

### 4. Added distance field to response schemas
- Both `/driver/nearby-requests` and `/passenger/nearby-drivers` now return `distance` field in kilometers

### 5. New endpoints added:
- `PUT /driver/ride-requests/{id}/accept` - Accept a ride request
- `PUT /driver/ride-requests/{id}/complete` - Complete a ride and award points
- `GET /passenger/drivers` - Legacy endpoint (deprecated, redirects to nearby-drivers)

### 6. Deprecated `/driver/update-location`
- Marked as deprecated
- Recommends using `/user/location` instead

## Summary of API Changes

All endpoints now respect the OpenAPI specification with:
- Range-based filtering via `radius` query parameter
- Distance calculations included in responses
- Smart location update logic documented
- Backward compatibility maintained with deprecated endpoints
- Clear response schemas and error codes

## Verification

Backend routes in `backend/src/routes/` match the OpenAPI spec:
- ✅ driver.js implements all driver endpoints
- ✅ passenger.js implements all passenger endpoints
- ✅ user.js implements smart location updates
- ✅ rides.js implements ride matching
- ✅ proxy.js implements proxy endpoints

Frontend `api_service.dart` uses these endpoints correctly:
- ✅ getNearbyDrivers() calls /passenger/nearby-drivers
- ✅ getRelevantRideRequests() calls /driver/nearby-requests  
- ✅ updateUserLocation() calls /user/location
- ✅ LocationUpdateManager implements client-side update logic
