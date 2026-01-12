# RouteMate Backend

RouteMate backend is a Node.js/Express server that handles authentication, ride matching, and user management for the RouteMate carpooling application.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js           # Firebase Admin SDK initialization
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token verification
│   │   └── requestLogger.js      # HTTP request/response logging
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── logs.js               # Error logging endpoints
│   │   ├── user.js               # User profile endpoints (TODO)
│   │   ├── driver.js             # Driver session endpoints (TODO)
│   │   ├── passenger.js          # Passenger request endpoints (TODO)
│   │   ├── rides.js              # Ride matching endpoints (TODO)
│   │   └── proxy.js              # External API proxy endpoints (TODO)
│   ├── services/
│   │   ├── authService.js        # Authentication business logic
│   │   ├── errorLoggingService.js # Telegram error logging
│   │   ├── rideService.js        # Ride completion logic
│   │   └── proxyService.js       # External API calls (OSRM, Nominatim)
│   ├── utils/
│   │   ├── geoUtils.js           # Geolocation calculations
│   │   └── serverManager.js      # Server health & self-ping
│   └── index.js                  # App initialization
├── index.js                      # Legacy entry point (deprecated - use src/index.js)
├── firebaseAdmin.js              # Legacy Firebase config (deprecated - use src/config/firebase.js)
├── package.json
├── .env.example                  # Environment variables template
├── openapi.yaml                  # OpenAPI 3.0 specification
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

**Required variables:**
- `GOOGLE_APPLICATION_CREDENTIALS` - Base64 encoded Firebase service account key
- `JWT_SECRET_KEY` - Secret key for JWT token generation
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (get from @BotFather)
- `TELEGRAM_CHAT_ID` - Chat ID for error logs (create a group, add bot, get ID)

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Generate service account key at: Project Settings → Service Accounts → Generate new private key
3. Base64 encode the key: `cat key.json | base64` (macOS/Linux) or use online tools
4. Add to `.env` as `GOOGLE_APPLICATION_CREDENTIALS`

### 4. Telegram Bot Setup

1. Create a bot with @BotFather on Telegram
2. Save the bot token
3. Create a private group or channel
4. Add the bot to the group/channel with message permissions
5. Use the group/channel ID as `TELEGRAM_CHAT_ID`

### 5. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Documentation

Full API documentation is available in `openapi.yaml` (OpenAPI 3.0 format).

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Login with phone number
- `POST /api/auth/firebase` - Authenticate with Firebase token
- `POST /api/auth/phone-email` - Authenticate with phone.email JWT

#### Error Logging
- `POST /api/logs/error` - Submit error log from client app (sent to Telegram)
- `GET /api/logs/error` - Retrieve error logs from Firestore

#### User Management
- `GET /api/user/profile` - Get user profile
- `GET /api/user/wallet` - Get wallet balance
- `GET /api/user/rewards` - Get earned rewards
- `PUT /api/user/location` - Update user location

#### Driver
- `POST /api/driver/session` - Start driving session
- `DELETE /api/driver/session` - End driving session
- `PUT /api/driver/update-location` - Update location during session
- `GET /api/driver/nearby-requests` - Get compatible passenger requests

#### Passenger
- `POST /api/passenger/request-ride` - Request a ride
- `GET /api/passenger/nearby-drivers` - Find nearby drivers
- `GET /api/passenger/request-status` - Check request status
- `DELETE /api/passenger/cancel-request` - Cancel ride request

#### Rides
- `POST /api/rides/match` - Match driver with passenger
- `PUT /api/rides/{rideId}/status` - Update ride status

#### Proxy
- `GET /api/proxy/search-places` - Search places (Nominatim)
- `GET /api/proxy/route` - Get route between two points (OSRM)

## Architecture

### Middleware
- **authMiddleware.js** - Verifies JWT tokens on protected routes
- **requestLogger.js** - Logs all requests and responses with timing

### Services
- **authService.js** - Handles user authentication, token generation, profile creation
- **errorLoggingService.js** - Sends error logs to Telegram chat via bot API
- **rideService.js** - Handles ride completion, point awards, stats updates
- **proxyService.js** - Makes external API calls to OSRM and Nominatim

### Utilities
- **geoUtils.js** - Distance calculation (Haversine), bearing, route compatibility checks
- **serverManager.js** - Self-ping mechanism to keep server awake on Render

## Error Logging to Telegram

When a client sends an error log to `POST /api/logs/error`, it will be:

1. Formatted with all relevant details
2. Sent to the Telegram chat specified by `TELEGRAM_CHAT_ID`
3. Optionally stored in Firestore (if `STORE_ERROR_LOGS=true`)

**Example error log submission:**
```json
{
  "timestamp": "2024-01-12T10:30:00Z",
  "appVersion": "1.0.0",
  "userId": "user123",
  "errorType": "NullPointerException",
  "message": "Attempted to access null object",
  "stackTrace": "...",
  "context": {
    "screen": "RideDetail",
    "action": "bookRide"
  }
}
```

## Development Notes

### Code Organization
- Keep route handlers thin - move business logic to services
- Services should handle database operations and external API calls
- Utilities are pure functions without side effects
- Middleware should be modular and reusable

### Adding New Routes
1. Create service file in `src/services/` for business logic
2. Create route file in `src/routes/` using the service
3. Mount the router in `src/index.js`
4. Update OpenAPI spec in `openapi.yaml`

### Database Schema

**Collections:**
- `users` - User profiles with stats and rewards
- `rewards` - User rewards and points
- `user_locations` - Current user locations
- `driver_sessions` - Active driver sessions
- `ride_requests` - Passenger ride requests
- `active_rides` - Active rides between driver and passenger
- `error_logs` - Error logs from clients (optional)

## OpenAPI Specification

The `openapi.yaml` file contains the complete API specification in OpenAPI 3.0 format. This can be:
- Viewed in Swagger UI: https://editor.swagger.io (paste file contents)
- Generated into documentation: Use tools like Redoc or SwaggerUI
- Validated in CI/CD pipelines

## TODO

- [ ] Extract user routes to `src/routes/user.js`
- [ ] Extract driver routes to `src/routes/driver.js`
- [ ] Extract passenger routes to `src/routes/passenger.js`
- [ ] Extract rides routes to `src/routes/rides.js`
- [ ] Extract proxy routes to `src/routes/proxy.js`
- [ ] Add request validation middleware
- [ ] Add rate limiting
- [ ] Add comprehensive error handling
- [ ] Add unit and integration tests
- [ ] Add API key authentication option
- [ ] Add admin endpoints for monitoring

## Troubleshooting

### "Telegram configuration missing" error
- Make sure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set in `.env`
- Verify bot has been added to the chat with message permissions

### Firebase authentication fails
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is properly base64 encoded
- Check Firebase project settings and permissions

### Server not staying awake on Render
- Self-ping is configured to run every 10 minutes
- Check that `SERVER_URL` in `.env` is correct and server is responding to `/health`

## License

ISC
