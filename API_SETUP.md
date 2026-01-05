# API Configuration Setup

## Setting the Backend URL

Before deploying or running the app, you need to configure the backend API URL.

### Step 1: Open the Configuration File

Navigate to and open:
```
lib/config/api_config.dart
```

### Step 2: Set the API Base URL

Update the `apiBaseUrl` constant with your backend URL:

```dart
class ApiConfig {
  // Set this to your deployed backend URL
  static const String apiBaseUrl = 'https://your-backend-domain.com/api';
  
  // ... rest of the file
}
```

### Examples

**Local Development:**
```dart
static const String apiBaseUrl = 'http://localhost:3000/api';
```

**Production (example):**
```dart
static const String apiBaseUrl = 'https://routemate-backend.onrender.com/api';
```

**Staging:**
```dart
static const String apiBaseUrl = 'https://staging.routemate.com/api';
```

### Important Notes

1. **No Trailing Slash**: The URL should NOT end with a `/`
2. **Include `/api`**: The path should end with `/api` as that's the base route for all endpoints
3. **Protocol Required**: Always include `http://` or `https://`
4. **Empty by Default**: The default value is empty to prevent accidental API calls to an unconfigured server

### Verification

When the app starts, if the URL is not configured, you'll see an error:
```
API base URL is not configured. Please set ApiConfig.apiBaseUrl in lib/config/api_config.dart
```

### Backend Deployment

The backend server is located in:
```
backend/
  ├── index.js          # Main server file
  ├── firebaseAdmin.js  # Firebase configuration
  └── package.json      # Dependencies
```

To run the backend:
```bash
cd backend
npm install
npm start
```

The server will start on port 3000 by default.

### Environment Variables

The backend requires the following environment variables:
- `JWT_SECRET_KEY`: Secret key for JWT token signing
- Firebase Admin SDK credentials (configured in `firebaseAdmin.js`)

Create a `.env` file in the `backend/` directory:
```env
JWT_SECRET_KEY=your-secret-key-here
```
