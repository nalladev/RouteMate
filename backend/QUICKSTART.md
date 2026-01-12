# Quick Start Guide - RouteMate Backend

## 🚀 Getting Started in 5 Minutes

### Step 1: Copy Environment File
```bash
cd backend
cp .env.example .env
```

### Step 2: Configure Environment Variables

Open `.env` and fill in:

**Firebase Setup:**
1. Go to https://console.firebase.google.com
2. Select your project → Settings → Service Accounts
3. Click "Generate New Private Key"
4. Open the JSON file and run:
   ```bash
   cat ~/Downloads/serviceAccountKey.json | base64
   ```
5. Paste the output into `.env` for `GOOGLE_APPLICATION_CREDENTIALS`

**Telegram Bot Setup:**
1. Open Telegram and find @BotFather
2. Send `/newbot` and follow instructions
3. Copy the bot token into `.env` for `TELEGRAM_BOT_TOKEN`
4. Create a new group/channel
5. Add the bot to the group with message permissions
6. Send a message, then check bot logs to find the chat ID
7. Put the chat ID in `.env` for `TELEGRAM_CHAT_ID`

**JWT Secret:**
```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output to `JWT_SECRET_KEY` in `.env`

### Step 3: Install & Run
```bash
npm install
npm run dev
```

Server runs at: http://localhost:3000

## 📡 Testing the Error Logging

Once the server is running, test error logging:

```bash
curl -X POST http://localhost:3000/api/logs/error \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-12T10:30:00Z",
    "appVersion": "1.0.0",
    "userId": "test_user",
    "errorType": "TestError",
    "message": "This is a test error log",
    "stackTrace": "at main() line 42",
    "context": {
      "screen": "HomeScreen",
      "action": "loadData"
    }
  }'
```

You should receive:
- HTTP 202 response (accepted)
- Telegram message in your configured chat

## 📚 API Documentation

View the complete API:
1. Go to https://editor.swagger.io
2. Click "File" → "Import URL"
3. Paste: `https://yourserver.com/openapi.yaml` (local: paste file contents)

Or open `openapi.yaml` in any text editor to read the spec.

## 📁 Project Structure

```
src/
├── config/
│   └── firebase.js              # Firebase configuration
├── middleware/
│   ├── authMiddleware.js        # JWT verification
│   └── requestLogger.js         # Request logging
├── routes/
│   ├── auth.js                  # Login endpoints
│   ├── logs.js                  # Error logging
│   └── ...                      # Other routes
├── services/
│   ├── authService.js           # Auth logic
│   ├── errorLoggingService.js   # Telegram integration
│   ├── rideService.js           # Ride logic
│   └── proxyService.js          # External APIs
├── utils/
│   ├── geoUtils.js              # Location calculations
│   └── serverManager.js         # Server management
└── index.js                     # Main app
```

## 🔑 Key Endpoints

### Authentication
```bash
POST /api/auth/login
POST /api/auth/firebase
POST /api/auth/phone-email
```

### Error Logging (NEW!)
```bash
POST /api/logs/error      # Submit error from client
GET /api/logs/error       # Get error history
```

### Other
```bash
GET /api/health                  # Server status
GET /api/user/profile
GET /api/user/wallet
POST /api/driver/session
...and many more (see openapi.yaml)
```

## 🧪 Testing Authentication

1. **Login with phone:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

2. **Use the returned token:**
```bash
curl -X GET http://localhost:3000/api/user/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 📖 Documentation Files

- **BACKEND_STRUCTURE.md** - Complete architecture overview
- **REFACTORING_SUMMARY.md** - What changed and why
- **openapi.yaml** - Complete API specification
- **.env.example** - All environment variables explained

## 🐛 Debugging

### Check logs
```bash
# Terminal shows all requests/responses
# Watch for [REQUEST RECEIVED] and [RESPONSE SENT] lines
```

### Check Telegram connection
- Make sure bot is in the group/channel
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are correct
- Check error logs in terminal: "✅ Error log sent to Telegram"

### Check Firebase connection
- Verify service account key is properly base64 encoded
- Check Firebase project is active
- Ensure Firestore database exists

## 🚀 Deployment

### On Render (or similar)
1. Set environment variables in dashboard
2. Connect GitHub repo
3. Set build command: `npm install`
4. Set start command: `npm start`

### Environment Variables Needed:
```
GOOGLE_APPLICATION_CREDENTIALS
JWT_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
PORT
SERVER_URL
```

## 📝 Adding New Features

### To add a new route:
1. Create service in `src/services/`
2. Create route file in `src/routes/`
3. Mount in `src/index.js`
4. Update `openapi.yaml`

### Example:
```javascript
// src/services/myService.js
const doSomething = async () => { /* logic */ };
module.exports = { doSomething };

// src/routes/my.js
const express = require('express');
const myService = require('../services/myService');
const router = express.Router();

router.post('/do', async (req, res) => {
  try {
    const result = await myService.doSomething();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// src/index.js - add this line:
app.use('/api/my', require('./routes/my'));
```

## ✨ Features

- ✅ Modular architecture
- ✅ JWT authentication
- ✅ Error logging to Telegram
- ✅ Geolocation calculations
- ✅ Request/response logging
- ✅ Firestore integration
- ✅ OpenAPI documentation
- ✅ Server self-ping (keep alive on Render)

## 📞 Support

Check these files for more info:
- `BACKEND_STRUCTURE.md` - Full architecture
- `REFACTORING_SUMMARY.md` - Refactoring details
- `openapi.yaml` - API reference

---

**Last Updated:** 2024-01-12
**Backend Version:** 1.0.0 (Modular)
