# Backend Project Tree - Complete Overview

```
backend/
│
├── src/                                    # New modular source code
│   ├── config/
│   │   └── firebase.js                    # Firebase Admin SDK initialization
│   │       ├── Initialize admin app
│   │       ├── Firestore database
│   │       └── Firebase auth
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js              # JWT token verification
│   │   │   └── authenticateToken(req, res, next)
│   │   │
│   │   └── requestLogger.js               # HTTP request/response logging
│   │       └── requestLogger(req, res, next)
│   │
│   ├── routes/
│   │   ├── auth.js                        # Authentication endpoints
│   │   │   ├── POST /login
│   │   │   ├── POST /firebase
│   │   │   └── POST /phone-email
│   │   │
│   │   ├── logs.js                        # Error logging endpoints
│   │   │   ├── POST /error                # NEW: Submit error logs
│   │   │   └── GET /error                 # Retrieve error logs
│   │   │
│   │   ├── user.js                        # TODO: User profile routes
│   │   │   ├── GET /profile
│   │   │   ├── GET /wallet
│   │   │   ├── GET /rewards
│   │   │   └── PUT /location
│   │   │
│   │   ├── driver.js                      # TODO: Driver session routes
│   │   │   ├── POST /session
│   │   │   ├── DELETE /session
│   │   │   ├── PUT /update-location
│   │   │   └── GET /nearby-requests
│   │   │
│   │   ├── passenger.js                   # TODO: Passenger request routes
│   │   │   ├── POST /request-ride
│   │   │   ├── GET /nearby-drivers
│   │   │   ├── GET /request-status
│   │   │   └── DELETE /cancel-request
│   │   │
│   │   ├── rides.js                       # TODO: Ride management routes
│   │   │   ├── POST /match
│   │   │   └── PUT /{rideId}/status
│   │   │
│   │   └── proxy.js                       # TODO: External API proxy
│   │       ├── GET /search-places         # Nominatim
│   │       └── GET /route                 # OSRM
│   │
│   ├── services/
│   │   ├── authService.js                 # Authentication business logic
│   │   │   ├── getUserOrCreateByPhone()
│   │   │   ├── createUserProfile()
│   │   │   ├── generateTokens()
│   │   │   ├── authenticateFirebaseToken()
│   │   │   └── authenticatePhoneEmailToken()
│   │   │
│   │   ├── errorLoggingService.js         # NEW: Telegram error logging
│   │   │   ├── sendErrorToTelegram()      # Main function
│   │   │   ├── formatErrorMessage()       # Format with HTML
│   │   │   ├── sendTelegramMessage()      # Send via bot API
│   │   │   └── escapeHtml()               # Escape special chars
│   │   │
│   │   ├── rideService.js                 # Ride management logic
│   │   │   └── completeRide()             # Award points, update stats
│   │   │
│   │   └── proxyService.js                # External API integration
│   │       └── getRouteCoordinates()      # OSRM routing
│   │
│   ├── utils/
│   │   ├── geoUtils.js                    # Geolocation utilities
│   │   │   ├── getDistance()              # Haversine formula
│   │   │   ├── calculateBearing()         # Direction angle
│   │   │   └── isRouteCompatible()        # Route matching
│   │   │
│   │   └── serverManager.js               # Server health & management
│   │       ├── startSelfPing()            # Keep alive on Render
│   │       └── selfPing()                 # HTTP ping function
│   │
│   └── index.js                           # NEW: Main app entry point
│       ├── Middleware setup (CORS, bodyParser, logging)
│       ├── Route mounting
│       ├── Health endpoint
│       └── Server startup
│
├── index.js                               # Legacy entry point (deprecated)
├── firebaseAdmin.js                       # Legacy Firebase config (deprecated)
│
├── package.json                           # Node dependencies
│   └── Updated to use src/index.js as main entry point
│
├── .env                                   # Environment variables (local - not committed)
├── .env.example                           # NEW: Environment template
│   ├── PORT
│   ├── SERVER_URL
│   ├── GOOGLE_APPLICATION_CREDENTIALS
│   ├── JWT_SECRET_KEY
│   ├── TELEGRAM_BOT_TOKEN
│   ├── TELEGRAM_CHAT_ID
│   └── STORE_ERROR_LOGS
│
├── openapi.yaml                           # NEW: Complete API specification
│   ├── 3.0.0 OpenAPI format
│   ├── All endpoints documented
│   ├── Request/response schemas
│   ├── Authentication methods
│   └── Data models
│
├── QUICKSTART.md                          # NEW: 5-minute setup guide
│   ├── Environment setup
│   ├── Firebase configuration
│   ├── Telegram bot setup
│   └── Testing endpoints
│
├── BACKEND_STRUCTURE.md                   # NEW: Complete architecture docs
│   ├── Project structure
│   ├── Setup instructions
│   ├── API endpoints
│   ├── Architecture overview
│   ├── Development notes
│   └── Troubleshooting
│
└── REFACTORING_SUMMARY.md                 # NEW: What changed and why
    ├── Overview of refactoring
    ├── File breakdown
    ├── Key features
    ├── Migration guide
    ├── OpenAPI usage
    └── Benefits explanation
```

## File Descriptions

### Core Application
- **src/index.js** - Simplified main entry point with just middleware and route mounting
- **src/config/firebase.js** - Firebase Admin SDK initialization
- **package.json** - Updated to point to src/index.js

### Routes (API Endpoints)
- **src/routes/auth.js** - Phone, Firebase, and phone.email authentication
- **src/routes/logs.js** - Error logging endpoint (NEW) - sends to Telegram
- **src/routes/user.js** - TODO: User profile, wallet, rewards, location
- **src/routes/driver.js** - TODO: Driver sessions, requests, location updates
- **src/routes/passenger.js** - TODO: Ride requests, nearby drivers
- **src/routes/rides.js** - TODO: Ride matching and status updates
- **src/routes/proxy.js** - TODO: Nominatim and OSRM proxies

### Services (Business Logic)
- **src/services/authService.js** - User authentication, token generation, profile creation
- **src/services/errorLoggingService.js** - Telegram bot integration (NEW)
- **src/services/rideService.js** - Ride completion, points, stats updates
- **src/services/proxyService.js** - External API calls (OSRM routing)

### Middleware
- **src/middleware/authMiddleware.js** - JWT token verification for protected routes
- **src/middleware/requestLogger.js** - Logs all HTTP requests and responses with timing

### Utilities
- **src/utils/geoUtils.js** - Distance calculations, bearing, route compatibility checks
- **src/utils/serverManager.js** - Server health checks and self-ping mechanism

### Documentation & Configuration
- **.env.example** - Template for all environment variables
- **openapi.yaml** - Complete OpenAPI 3.0 specification with all endpoints
- **QUICKSTART.md** - Get started in 5 minutes
- **BACKEND_STRUCTURE.md** - Complete technical documentation
- **REFACTORING_SUMMARY.md** - Explanation of changes and benefits

## Size Reduction

### Before
- **index.js**: ~1260 lines (monolithic)
- **firebaseAdmin.js**: ~14 lines

### After
- **src/index.js**: ~70 lines (clean, only middleware and mounting)
- Modular files: Each focused on single responsibility
  - Services: 50-150 lines each
  - Routes: 30-100 lines each
  - Utils: 30-80 lines each
  - Middleware: 20-40 lines each

## Key Features Added

### 1. Error Logging to Telegram ✨
- Endpoint: `POST /api/logs/error`
- Format errors with app version, user ID, stack trace, context
- Send via Telegram bot API to configured chat
- Optional Firestore storage

### 2. OpenAPI Specification 📚
- Complete API documentation
- Request/response schemas
- Authentication examples
- Can be viewed in Swagger Editor
- Reference for adding new features

### 3. Modular Architecture 🏗️
- Separation of concerns
- Easy to test and maintain
- Reusable services
- Scalable structure

### 4. Environment Management 🔧
- Centralized .env configuration
- .env.example for reference
- All variables documented

### 5. Request Logging 📝
- Logs method, path, query, body
- Logs status, duration, response
- Helps with debugging

## Next Steps

1. **Extract remaining routes** to match architecture (user, driver, passenger, rides, proxy)
2. **Add request validation** (express-validator)
3. **Add tests** (Jest/Mocha)
4. **Add error handling middleware**
5. **Deploy to production**
6. **Monitor via Telegram error logs**

## Getting Started

1. Copy `.env.example` to `.env`
2. Fill in Firebase credentials and Telegram bot details
3. Run: `npm install && npm run dev`
4. Server starts at http://localhost:3000
5. Errors sent to Telegram automatically!

---

**Generated:** 2024-01-12
**Architecture:** Modular with separation of concerns
**Status:** ✅ Complete
