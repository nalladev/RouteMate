# RouteMate App Blueprint

## Overview

RouteMate is a Flutter ride-sharing application that connects drivers and passengers efficiently. The app features real-time location tracking, route-based matching, and an integrated reward system. Users can either offer rides as drivers or request rides as passengers, with intelligent matching based on routes and proximity.

## Style, Design, and Features

This section documents the implemented features and design choices from the initial version to the current one.

### Initial Setup & Architecture

**Flutter App Structure:**
- Clean architecture with features, services, models, and widgets separation
- Provider for state management
- Material Design 3 with custom orange theme
- Real-time map integration for location tracking

**Backend Architecture:**
- Node.js Express server with JWT authentication
- Firebase Admin SDK for Firestore integration
- Phone-based authentication system
- RESTful API design with proper middleware

**Current Features Implemented:**
- User authentication via phone number
- Basic location tracking
- Driver session management (start/stop driving)
- Passenger ride requests
- Wallet points system with rewards
- Basic ride matching and completion

### Current Issues Identified

**Firestore Structure Problems:**
- Mixed data in single `users` collection (profile + location + status + destination)
- Inefficient driver discovery (fetches ALL driving users)
- No geospatial queries for nearby matching
- No real-time location tracking optimization
- Inconsistent status management across user types

**Backend Logic Issues:**
- No route-based matching algorithm
- Missing proper session management for active rides
- No efficient proximity-based queries
- Ride state transitions not properly managed

## Current Task: Firestore Structure Redesign & Backend Logic Improvement

### Goal
Restructure Firestore collections for better performance, implement proper geospatial queries, and improve ride matching logic based on routes and proximity.

**Status: COMPLETED ✅**

### New Firestore Structure Design

#### 1. **users** Collection
```
users/{userId}
├── uid: string
├── phone: string
├── walletPoints: number
├── createdAt: timestamp
├── profile: {
│   ├── name?: string
│   ├── profilePicture?: string
│   └── preferences?: object
└── stats: {
    ├── totalRidesAsDriver: number
    ├── totalRidesAsPassenger: number
    ├── rating: number
    └── totalPointsEarned: number
}
```

#### 2. **user_locations** Collection (Optimized for Geoqueries)
```
user_locations/{userId}
├── userId: string
├── location: GeoPoint
├── heading?: number (0-360 degrees)
├── speed?: number (km/h)
├── accuracy?: number (meters)
├── isActive: boolean
└── updatedAt: timestamp
```

#### 3. **driver_sessions** Collection
```
driver_sessions/{sessionId}
├── driverId: string
├── startLocation: GeoPoint
├── destination: {
│   ├── name: string
│   ├── location: GeoPoint
│   └── placeId?: string
├── route: {
│   ├── coordinates: array[GeoPoint] (route path)
│   ├── distance: number (km)
│   └── estimatedDuration: number (minutes)
├── capacity: number (available seats)
├── status: 'active' | 'paused' | 'completed'
├── preferences: {
│   ├── allowDetours: boolean
│   ├── maxDetourDistance: number (km)
│   └── passengerTypes: array[string]
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### 4. **ride_requests** Collection
```
ride_requests/{requestId}
├── passengerId: string
├── pickup: {
│   ├── name: string
│   ├── location: GeoPoint
│   └── placeId?: string
├── destination: {
│   ├── name: string
│   ├── location: GeoPoint
│   └── placeId?: string
├── preferences: {
│   ├── maxWaitTime: number (minutes)
│   ├── maxWalkDistance: number (meters)
│   └── priceRange?: object
├── status: 'waiting' | 'matched' | 'picked_up' | 'completed' | 'cancelled'
├── estimatedDistance: number (km)
├── createdAt: timestamp
└── expiresAt: timestamp
```

#### 5. **active_rides** Collection
```
active_rides/{rideId}
├── driverId: string
├── driverSessionId: string
├── passengerId: string
├── requestId: string
├── pickup: {
│   ├── name: string
│   ├── location: GeoPoint
│   └── estimatedArrival?: timestamp
├── destination: {
│   ├── name: string
│   └── location: GeoPoint
├── route: {
│   ├── pickupToDestination: array[GeoPoint]
│   ├── totalDistance: number (km)
│   └── estimatedDuration: number (minutes)
├── status: 'matched' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'in_progress' | 'completed'
├── timestamps: {
│   ├── matched: timestamp
│   ├── pickup?: timestamp
│   ├── started?: timestamp
│   └── completed?: timestamp
├── fare?: {
│   ├── amount: number
│   ├── currency: string
│   └── pointsUsed?: number
└── rating?: {
    ├── driverRating?: number
    ├── passengerRating?: number
    └── feedback?: string
}
```

#### 6. **rewards** Collection
```
rewards/{rewardId}
├── userId: string
├── type: 'driver_completion' | 'passenger_completion' | 'bonus' | 'referral'
├── amount: number (points)
├── description: string
├── metadata: {
│   ├── rideId?: string
│   ├── sessionId?: string
│   └── category?: string
├── status: 'pending' | 'active' | 'expired'
├── dateEarned: timestamp
└── expiresAt?: timestamp
```

### Implementation Plan

#### Phase 1: Backend Restructuring
1. **Update Firestore Security Rules**
   - Implement proper read/write permissions for new collections
   - Add geospatial query optimizations

2. **Create New API Endpoints**
   - `POST /api/driver/start-session` - Start driving with destination
   - `PUT /api/driver/update-location` - Real-time location updates
   - `GET /api/driver/nearby-requests` - Get ride requests along route
   - `POST /api/passenger/request-ride` - Create ride request
   - `GET /api/passenger/nearby-drivers` - Get drivers going in direction
   - `POST /api/rides/match` - Match driver and passenger
   - `PUT /api/rides/{rideId}/status` - Update ride status

3. **Implement Geospatial Queries**
   - Use Firestore's geohash/geopoint queries for proximity searches
   - Implement route-based matching algorithm
   - Add efficient location update batching

#### Phase 2: Route Matching Algorithm
1. **Smart Matching Logic**
   - Calculate route similarity between driver and passenger
   - Consider detour distance and time
   - Factor in driver preferences and capacity

2. **Real-time Updates**
   - WebSocket-like updates for location tracking
   - Push notifications for ride status changes
   - Efficient batch updates for multiple location changes

#### Phase 3: Flutter App Updates
1. **Update Models**
   - Create new model classes for restructured data
   - Implement proper serialization/deserialization

2. **Update Services**
   - Modify API service to work with new endpoints
   - Implement real-time location service
   - Add geolocation utilities

3. **UI Improvements**
   - Enhanced map with route visualization
   - Real-time driver/passenger tracking
   - Better ride status indicators

### Benefits of New Structure

1. **Performance Improvements**
   - Efficient geospatial queries using dedicated location collection
   - Reduced data transfer with targeted queries
   - Better indexing for common query patterns

2. **Scalability**
   - Separate collections allow independent scaling
   - Optimized for real-time location updates
   - Better support for multiple concurrent rides

3. **Feature Enablement**
   - Route-based intelligent matching
   - Real-time tracking and updates
   - Advanced filtering and preferences
   - Comprehensive ride history and analytics

4. **Maintainability**
   - Clear separation of concerns
   - Consistent data structure across collections
   - Better error handling and debugging capabilities

### Technical Considerations

- **Geospatial Indexing**: Use compound indexes for location + status queries
- **Real-time Updates**: Implement efficient WebSocket connections for live tracking
- **Data Consistency**: Proper transaction handling for multi-collection operations
- **Caching**: Redis layer for frequently accessed location data
- **Security**: Enhanced security rules for location privacy and data protection
