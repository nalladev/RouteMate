# Architecture Diagram - RouteMate Backend

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATION                             │
│                    (Flutter/React/Web)                              │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                                  │
│                   src/index.js                                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ MIDDLEWARE LAYER                                           │   │
│  │ ┌──────────────────────────────────────────────────────┐  │   │
│  │ │ CORS + Body Parser                                  │  │   │
│  │ └──────────────────────────────────────────────────────┘  │   │
│  │ ┌──────────────────────────────────────────────────────┐  │   │
│  │ │ Request Logger (requestLogger.js)                   │  │   │
│  │ │ - Logs method, path, body                           │  │   │
│  │ │ - Logs response status, duration                    │  │   │
│  │ └──────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
│           │                                                        │
│           ├──────────────────────────────────────────────┐         │
│           │                                              │         │
│           ▼                                              ▼         │
│  ┌─────────────────────────────┐          ┌──────────────────────┐│
│  │ ROUTES LAYER                │          │ PROTECTED ROUTES     ││
│  │                             │          │ (Auth Required)      ││
│  │ /api/auth/*                 │          │                      ││
│  │   ├─ POST /login            │          │ authMiddleware.js    ││
│  │   ├─ POST /firebase         │          │ ↓ JWT Verification   ││
│  │   └─ POST /phone-email      │          │                      ││
│  │                             │          │ /api/user/*          ││
│  │ /api/logs/*                 │          │ /api/driver/*        ││
│  │   ├─ POST /error (NEW!)     │          │ /api/passenger/*     ││
│  │   └─ GET /error             │          │ /api/rides/*         ││
│  │                             │          └──────────────────────┘│
│  │ /api/proxy/*                │                                  │
│  │   ├─ GET /search-places     │                                  │
│  │   └─ GET /route             │                                  │
│  └─────────────────────────────┘                                  │
│           │                                                        │
│           ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ SERVICES LAYER                                             │   │
│  │ (Business Logic)                                           │   │
│  │                                                            │   │
│  │ authService.js           errorLoggingService.js (NEW!)    │   │
│  │ ├─ getUserOrCreateByPhone ├─ sendErrorToTelegram         │   │
│  │ ├─ createUserProfile      ├─ formatErrorMessage          │   │
│  │ └─ generateTokens         └─ sendTelegramMessage         │   │
│  │                                                            │   │
│  │ rideService.js           proxyService.js                 │   │
│  │ └─ completeRide          └─ getRouteCoordinates          │   │
│  │                                                            │   │
│  │ UTILS LAYER                                               │   │
│  │ geoUtils.js              serverManager.js                │   │
│  │ ├─ getDistance           ├─ startSelfPing                │   │
│  │ ├─ calculateBearing      └─ selfPing                     │   │
│  │ └─ isRouteCompatible                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│           │                                                        │
└───────────┼────────────────────────────────────────────────────────┘
            │
            │ Communicates with external services
            │
            ├──────────────────────────────┬──────────────────────┐
            │                              │                      │
            ▼                              ▼                      ▼
    ┌───────────────────┐      ┌──────────────────────┐  ┌─────────────────┐
    │ FIREBASE/FIRESTORE│      │ TELEGRAM BOT API     │  │ OSRM/NOMINATIM  │
    │                   │      │                      │  │                 │
    │ - Authentication  │      │ Error logs sent to   │  │ - Route finding │
    │ - Database        │      │ configured Telegram  │  │ - Place search  │
    │ - User storage    │      │ chat (NEW!)          │  │                 │
    └───────────────────┘      └──────────────────────┘  └─────────────────┘
```

---

## Data Flow for Error Logging

```
CLIENT APP ERROR
       │
       │ Error occurs
       │ (NullPointerException, NetworkError, etc.)
       │
       ▼
   CATCH BLOCK
       │
       │ Send error to backend
       │ POST /api/logs/error
       │
       ▼
   BACKEND RECEIVED
   (src/routes/logs.js)
       │
       │ Extract fields:
       │ - timestamp, appVersion, userId
       │ - errorType, message, stackTrace, context
       │
       ▼
   errorLoggingService.js
       │
       ├─ formatErrorMessage()
       │  │ Create HTML-formatted message
       │  │ Include all error details
       │  │ Escape special characters
       │  │
       │  └─ Example formatted output:
       │     ╔═══════════════════════════════╗
       │     ║ 🚨 ERROR LOG                  ║
       │     ║                               ║
       │     ║ Timestamp: 2024-01-12...      ║
       │     ║ App Version: 1.0.0            ║
       │     ║ User ID: user123              ║
       │     ║ Error Type: NullPointerException
       │     ║ Message: Attempted to access   ║
       │     ║ Stack Trace: at main()...      ║
       │     ║ Context: {screen: RideDetail} ║
       │     ╚═══════════════════════════════╝
       │
       ├─ sendTelegramMessage()
       │  │ Send via Telegram Bot API
       │  │ POST /bot{TOKEN}/sendMessage
       │  │
       │  ▼
       │ TELEGRAM API
       │  │ Authenticate with bot token
       │  │ Send to chat_id
       │  │
       │  ▼
       │ YOUR TELEGRAM CHAT
       │  │
       │  ▼
       │ ✅ ERROR MESSAGE APPEARS!
       │
       └─ Optional: Store in Firestore
          (if STORE_ERROR_LOGS=true)
          │
          ▼
       FIRESTORE
       error_logs collection
```

---

## Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                            │
│            (Each handles specific functionality)             │
└──────────────────────────────────────────────────────────────┘

authService.js
├─ Responsibilities:
│  ├─ User authentication (phone, Firebase, phone.email)
│  ├─ User profile creation
│  ├─ Token generation (JWT)
│  └─ User onboarding (welcome bonus)
│
├─ Exports:
│  ├─ getUserOrCreateByPhone(phone)
│  ├─ createUserProfile(uid, phone)
│  ├─ generateTokens(uid)
│  ├─ authenticateFirebaseToken(token, phoneNumber)
│  └─ authenticatePhoneEmailToken(jwtToken)
│
└─ Used by: src/routes/auth.js


errorLoggingService.js (NEW!)
├─ Responsibilities:
│  ├─ Format error messages for Telegram
│  ├─ Send to Telegram bot API
│  ├─ HTML escaping for safety
│  └─ Optional Firestore storage
│
├─ Exports:
│  ├─ sendErrorToTelegram(errorLog)
│  ├─ formatErrorMessage(errorLog)
│  ├─ sendTelegramMessage(message)
│  └─ escapeHtml(str)
│
└─ Used by: src/routes/logs.js


rideService.js
├─ Responsibilities:
│  ├─ Ride completion
│  ├─ Point awards
│  ├─ Stats updates
│  └─ Reward creation
│
├─ Exports:
│  └─ completeRide(rideId, ride)
│
└─ Used by: Ride routes


proxyService.js
├─ Responsibilities:
│  ├─ OSRM routing
│  ├─ Error handling
│  └─ Fallback logic
│
├─ Exports:
│  └─ getRouteCoordinates(start, end)
│
└─ Used by: Driver routes
```

---

## Database Schema

```
FIRESTORE DATABASE
│
├─ users/
│  └─ {uid}/
│     ├─ uid: string
│     ├─ phone: string
│     ├─ walletPoints: number
│     ├─ createdAt: timestamp
│     └─ stats:
│        ├─ totalRidesAsDriver: number
│        ├─ totalRidesAsPassenger: number
│        ├─ rating: number
│        └─ totalPointsEarned: number
│
├─ rewards/
│  └─ {docId}/
│     ├─ userId: string
│     ├─ type: string (bonus | driver_completion | passenger_completion)
│     ├─ amount: number
│     ├─ description: string
│     ├─ status: string (active | used | expired)
│     ├─ dateEarned: timestamp
│     └─ expiresAt: timestamp (optional)
│
├─ user_locations/
│  └─ {uid}/
│     ├─ userId: string
│     ├─ location: GeoPoint
│     ├─ heading: number
│     ├─ speed: number
│     ├─ isActive: boolean
│     └─ updatedAt: timestamp
│
├─ driver_sessions/
│  └─ {sessionId}/
│     ├─ driverId: string
│     ├─ startLocation: GeoPoint
│     ├─ destination: {...}
│     ├─ route: {...}
│     ├─ capacity: number
│     ├─ status: string (active | inactive | completed)
│     └─ timestamps: {...}
│
├─ ride_requests/
│  └─ {requestId}/
│     ├─ passengerId: string
│     ├─ pickup: {...}
│     ├─ destination: {...}
│     ├─ status: string (waiting | matched | picked_up | completed | cancelled)
│     ├─ estimatedDistance: number
│     └─ createdAt: timestamp
│
├─ active_rides/
│  └─ {rideId}/
│     ├─ driverId: string
│     ├─ passengerId: string
│     ├─ pickup: {...}
│     ├─ destination: {...}
│     ├─ status: string
│     ├─ fare: {...}
│     └─ timestamps: {...}
│
└─ error_logs/ (Optional)
   └─ {logId}/
      ├─ timestamp: string
      ├─ appVersion: string
      ├─ userId: string
      ├─ errorType: string
      ├─ message: string
      ├─ stackTrace: string
      ├─ context: object
      ├─ createdAt: timestamp
      └─ receivedAt: timestamp
```

---

## Environment & Configuration

```
.env FILE
│
├─ SERVER CONFIG
│  ├─ PORT=3000
│  └─ SERVER_URL=https://routemate-jpsc.onrender.com/health
│
├─ FIREBASE CONFIG
│  └─ GOOGLE_APPLICATION_CREDENTIALS=<base64_service_account_key>
│
├─ AUTH CONFIG
│  └─ JWT_SECRET_KEY=<random_secret_for_jwt_signing>
│
├─ TELEGRAM CONFIG (NEW!)
│  ├─ TELEGRAM_BOT_TOKEN=<token_from_botfather>
│  └─ TELEGRAM_CHAT_ID=<your_chat_or_group_id>
│
└─ LOGGING CONFIG
   └─ STORE_ERROR_LOGS=<true_or_false>

CONFIG INITIALIZATION
│
├─ src/index.js reads .env via require('dotenv').config()
│
├─ src/config/firebase.js initializes Firebase Admin SDK
│
└─ Services access env vars via process.env.*
```

---

## Deployment Architecture

```
LOCAL DEVELOPMENT
│
├─ npm run dev
├─ Runs: nodemon src/index.js
├─ Port: 3000
└─ Hot reload on file changes


PRODUCTION (Render / Heroku / etc)
│
├─ npm start
├─ Runs: node src/index.js
├─ Environment vars: Set in platform dashboard
├─ Auto-ping every 10 minutes (self-ping)
└─ Errors sent to Telegram in real-time
```

---

This architecture provides:
- ✅ **Modular design** - Easy to understand and modify
- ✅ **Separation of concerns** - Routes → Services → Utilities
- ✅ **Scalability** - Add new routes/services without affecting existing code
- ✅ **Maintainability** - Each file has single responsibility
- ✅ **Error tracking** - Real-time Telegram notifications
- ✅ **Documentation** - OpenAPI spec + detailed guides
