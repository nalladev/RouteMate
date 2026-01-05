# RouteMate API Endpoints

## Configuration

The API base URL is configured in `/lib/config/api_config.dart`. Set the `apiBaseUrl` constant to your deployed backend URL.

Example:
```dart
static const String apiBaseUrl = 'https://your-backend-domain.com/api';
```

## Authentication

### POST `/api/auth/login`
Login or register with phone number.

**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "token": "jwt_token_here"
}
```

## User Endpoints

All user endpoints require authentication (Bearer token).

### PUT `/api/user/location`
Update user's current location.

**Request:**
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

### GET `/api/user/wallet`
Get user's wallet points balance.

**Response:**
```json
{
  "walletPoints": 150
}
```

### GET `/api/user/rewards`
Get user's rewards history.

**Response:**
```json
{
  "rewards": [
    {
      "id": "reward_id",
      "title": "Ride Completed",
      "description": "Completed a ride as a driver",
      "points": 10,
      "dateEarned": "2026-01-05T10:30:00.000Z",
      "status": "Active"
    }
  ]
}
```

### GET `/api/user/profile`
Get user's profile information including status and location.

**Response:**
```json
{
  "profile": {
    "uid": "user_id",
    "status": "driving",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "destination": {
      "displayName": "San Francisco Airport",
      "latitude": 37.6213,
      "longitude": -122.3790
    },
    "walletPoints": 150
  }
}
```

## Driver Endpoints

All driver endpoints require authentication.

### POST `/api/driver/session`
Start a driving session with a destination.

**Request:**
```json
{
  "destination": {
    "displayName": "San Francisco Airport",
    "latitude": 37.6213,
    "longitude": -122.3790
  }
}
```

### DELETE `/api/driver/session`
End the current driving session.

**Response:**
```json
{
  "message": "Driving session ended."
}
```

### GET `/api/driver/ride-requests`
Get relevant ride requests near the driver's route (within 5km).

**Response:**
```json
{
  "rideRequests": [
    {
      "id": "request_id",
      "passengerId": "passenger_user_id",
      "pickup": {
        "location": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      },
      "destination": {
        "displayName": "Downtown SF",
        "location": {
          "latitude": 37.7833,
          "longitude": -122.4167
        }
      },
      "status": "waiting"
    }
  ]
}
```

### PUT `/api/driver/ride-requests/:id/accept`
Accept a ride request.

**Response:**
```json
{
  "message": "Ride request accepted."
}
```

### PUT `/api/driver/ride-requests/:id/complete`
Complete a ride and award points to both driver and passenger.

**Response:**
```json
{
  "message": "Ride completed successfully.",
  "pointsAwarded": 10
}
```

## Passenger Endpoints

All passenger endpoints require authentication.

### POST `/api/passenger/ride-request`
Create a new ride request.

**Request:**
```json
{
  "destination": {
    "displayName": "San Francisco Airport",
    "latitude": 37.6213,
    "longitude": -122.3790
  },
  "pickup": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

**Response:**
```json
{
  "message": "Ride request created."
}
```

### DELETE `/api/passenger/ride-request`
Cancel the current ride request.

**Response:**
```json
{
  "message": "Ride request cancelled."
}
```

### GET `/api/passenger/ride-request/status`
Check the status of the current ride request.

**Response:**
```json
{
  "rideRequest": {
    "id": "request_id",
    "status": "picked_up",
    "destination": {
      "displayName": "Downtown SF",
      "latitude": 37.7833,
      "longitude": -122.4167
    },
    "pickup": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "driverId": "driver_user_id"
  }
}
```

### GET `/api/passenger/drivers`
Get all available drivers currently active.

**Response:**
```json
{
  "drivers": [
    {
      "id": "driver_id",
      "status": "driving",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "destination": {
        "displayName": "San Francisco Airport",
        "location": {
          "latitude": 37.6213,
          "longitude": -122.3790
        }
      }
    }
  ]
}
```

## Proxy Endpoints

These endpoints proxy external services (OpenStreetMap, OSRM).

### GET `/api/proxy/search-places`
Search for places using OpenStreetMap Nominatim.

**Query Parameters:**
- `q`: Search query string

**Response:**
```json
{
  "places": [
    {
      "display_name": "San Francisco, California, USA",
      "lat": "37.7749295",
      "lon": "-122.4194155"
    }
  ]
}
```

### GET `/api/proxy/route`
Get driving route between two points using OSRM.

**Query Parameters:**
- `start`: Start coordinates (lon,lat format: `-122.4194,37.7749`)
- `end`: End coordinates (lon,lat format: `-122.3790,37.6213`)

**Response:**
```json
{
  "points": [
    [-122.4194, 37.7749],
    [-122.4180, 37.7740],
    [-122.3790, 37.6213]
  ]
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "message": "Error description here"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid or missing parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (valid token but insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
