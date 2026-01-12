# Quick Start Guide: Testing Rider-Passenger Connection

## Prerequisites
- Backend server running on `http://localhost:3000`
- Two devices/emulators for testing (or use one and test endpoints manually)
- Location permissions enabled

## Step 1: Start the Backend

```bash
cd backend
npm install  # if not already done
npm start
```

Verify backend is running:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

## Step 2: Test the App

### Scenario A: Testing with Two Devices

#### Device 1 (Driver):
1. Open the app and log in
2. Allow location permissions when prompted
3. Select a destination from the search
4. Tap "Start Driving" button
5. Swipe up the bottom panel to see ride requests
6. Wait for passengers to appear in the list

#### Device 2 (Passenger):
1. Open the app and log in
2. Allow location permissions
3. Select a destination
4. Tap "Find Ride" button
5. Swipe up the bottom panel to see available drivers
6. You should see Device 1's driver in the list!
7. Tap on a driver to select them

### Scenario B: Testing with One Device + Backend

#### Using the Device:
1. Open app as passenger
2. Select destination and tap "Find Ride"
3. Swipe up panel - should say "No drivers nearby"

#### Using Backend API:
```bash
# Get your auth token from the app (check logs or use Firebase console)
TOKEN="your_firebase_token_here"

# Manually create a driver session
curl -X POST http://localhost:3000/api/driver/session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": {
      "displayName": "Test Destination",
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }'

# Update driver location (near passenger)
curl -X PUT http://localhost:3000/api/user/location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }'

# Now refresh the passenger app - driver should appear!
```

## Step 3: Verify Features

### ✅ Range-Based Filtering
- Drivers should only see passengers within their radius (default 5km)
- Passengers should only see drivers within their radius (default 10km)
- Test by changing query parameter:
  ```bash
  GET /api/passenger/nearby-drivers?radius=20  # Increase range
  ```

### ✅ Smart Location Updates
Check the console logs:
- When idle: Updates every ~30 seconds
- When driving: Updates every ~10 seconds
- When searching: Updates every ~15 seconds
- After 50+ meter movement: Immediate update

Look for logs like:
```
Location update triggered by distance: 52.3m
Location updated on server
```

### ✅ UI Features
- **Draggable Panel**: Swipe up/down between 15%-85% screen
- **Empty States**: See "No drivers nearby" when list is empty
- **Refresh Button**: Tap refresh icon to manually update
- **Distance Display**: Each item shows distance in km
- **Auto-refresh**: List updates every 10 seconds automatically

## Step 4: Monitor Performance

### Backend Logs
Watch for:
```
[GET] /api/passenger/nearby-drivers → 200
[GET] /api/driver/nearby-requests → 200
[PUT] /api/user/location → 200 (reason: driver_time_interval)
```

### Frontend Logs
Watch for:
```
Found 3 drivers nearby
Location update skipped: no_significant_change
Location updated on server
```

## Common Issues

### "No drivers/passengers nearby"
**Solutions:**
1. Check if both users are in same general area
2. Increase search radius: `?radius=50`
3. Verify locations are being updated (check `/api/user/profile`)
4. Ensure driver has started session (`POST /api/driver/session`)

### Location not updating
**Solutions:**
1. Check location permissions in device settings
2. Verify GPS is enabled
3. Try outdoor location (GPS works better)
4. Check console for location errors
5. Force update by moving device >50 meters

### Panel not showing
**Solutions:**
1. Verify you're in "searching" or "driving" mode
2. Check if `_availableDrivers` or `_relevantRideRequests` have data
3. Look for errors in console
4. Restart app and try again

### Backend not receiving requests
**Solutions:**
1. Check Firebase token is valid
2. Verify backend URL in `api_service.dart`
3. Check CORS settings if using web
4. Verify backend is running (`curl http://localhost:3000/health`)

## Testing Checklist

- [ ] Driver can start/stop session
- [ ] Passenger can request/cancel ride
- [ ] Drivers see nearby passengers
- [ ] Passengers see nearby drivers
- [ ] Distance is displayed correctly
- [ ] Panel is draggable
- [ ] Refresh button works
- [ ] Auto-refresh happens every 10s
- [ ] Empty states display properly
- [ ] Location updates optimally (check intervals)
- [ ] Accept ride request works
- [ ] Points are awarded on completion

## Advanced Testing

### Test Different Radii
```bash
# Narrow search (2km)
GET /api/passenger/nearby-drivers?radius=2

# Wide search (50km)  
GET /api/driver/nearby-requests?radius=50
```

### Test Location Update Logic
```dart
// In location_update_manager.dart, temporarily change intervals:
static const int _driverUpdateInterval = 5;  // Test faster updates
static const int _minDistanceChange = 10.0;  // Test more sensitive distance
```

### Stress Test
1. Create multiple driver sessions
2. Create multiple ride requests
3. Verify sorting by distance
4. Check performance with 20+ items in list

## API Reference

### Quick API Endpoints
```bash
# Driver endpoints
POST   /api/driver/session
DELETE /api/driver/session
GET    /api/driver/nearby-requests?radius=5

# Passenger endpoints
POST   /api/passenger/request-ride
DELETE /api/passenger/cancel-request
GET    /api/passenger/nearby-drivers?radius=10
GET    /api/passenger/request-status

# User endpoints
PUT    /api/user/location
GET    /api/user/profile
```

## Next Steps After Testing

1. **Implement Real Matching Flow**:
   - Add ride acceptance confirmation
   - Handle driver navigation to pickup
   - Track ride progress
   
2. **Add Notifications**:
   - Push notifications when matched
   - Alert when driver is nearby
   
3. **Enhance UI**:
   - Show driver ETA
   - Add driver profile pictures
   - Display vehicle information
   
4. **Add Safety Features**:
   - Share ride details with emergency contact
   - In-app SOS button
   - Ride tracking/recording

## Support

If you encounter issues:
1. Check [RIDER_CONNECTION_IMPLEMENTATION.md](./RIDER_CONNECTION_IMPLEMENTATION.md) for detailed architecture
2. Review console logs for error messages
3. Verify all required files are present
4. Ensure backend routes are properly mounted
5. Check Firebase configuration

Happy testing! 🚗🎉
