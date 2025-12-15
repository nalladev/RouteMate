Hello! Your task is to create a Node.js backend for a Flutter ride-sharing application named "RouteMate". The Flutter application has already been built and relies on the specific API structure you will create.

This backend will serve as the central authority for authentication, user data, ride management, and will also act as a proxy for external services like mapping and routing. You will use **Express.js** for the server framework and the **Firebase Admin SDK** to interact with Firestore as the database.

**IMPORTANT:**
- The base URL for all API routes is `/api`.
- You must implement all the endpoints exactly as specified below.
- For this initial setup, the authentication will be a simplified, one-step process.
- The database structure in Firestore should be inferred from the API endpoint logic.

---

### **Step 1: Project Setup**

1.  Initialize a new Node.js project.
2.  Install the following dependencies:
    *   `express`: For the web server.
    *   `firebase-admin`: To communicate with Firebase services.
    *   `cors`: To enable Cross-Origin Resource Sharing.
    *   `body-parser`: To parse incoming request bodies.
    *   `jsonwebtoken`: To create and manage session tokens.

---

### **Step 2: Firebase Admin SDK Initialization**

1.  Create a file named `firebaseAdmin.js`.
2.  In this file, initialize the Firebase Admin SDK. You will need a service account key file from your Firebase project. The user will provide this file and set an environment variable `GOOGLE_APPLICATION_CREDENTIALS` pointing to it.
3.  Your code should initialize the app like this:
    ```javascript
    const admin = require('firebase-admin');

    admin.initializeApp({
        // The SDK will automatically find the credentials via the environment variable.
    });

    const db = admin.firestore();
    const auth = admin.auth();

    module.exports = { db, auth };
    ```

---

### **Step 3: Server Setup (index.js)**

Create the main `index.js` file. This file will:
1.  Import `express`, `cors`, `body-parser`.
2.  Set up the Express app and apply middleware.
3.  Define all the API routes as specified in the next section.
4.  Start the server on port 3000.

---

### **Step 4: API Endpoint Implementation**

You must create the following endpoints. Each endpoint should be wrapped in a `try...catch` block for error handling and return a JSON object with a `message` key on error.

#### **Authentication Routes**

-   **Endpoint:** `POST /api/auth/login`
-   **Request Body:** `{ "phone": "USER_PHONE_NUMBER" }`
-   **Logic:**
    1.  This is a **simplified login**. You do not need to implement a full OTP flow.
    2.  Use `firebase-admin` to either get an existing user by phone number or create a new one. `admin.auth().getUserByPhoneNumber()` or `admin.auth().createUser()`.
    3.  Create a custom JWT (using `jsonwebtoken`) for this user. The payload should contain the user's `uid`.
    4.  Return the token.
-   **Success Response (200):** `{ "token": "YOUR_JWT_TOKEN" }`

#### **User Data Routes**

*These routes will require a valid JWT passed as a Bearer token in the `Authorization` header. You should create a middleware to verify this token and attach the user's `uid` to the request object.*

-   **Endpoint:** `PUT /api/user/location`
-   **Request Body:** `{ "location": { "latitude": 12.34, "longitude": 56.78 } }`
-   **Logic:**
    1.  Get the `uid` from the verified JWT.
    2.  Update the user's location in the `users` collection in Firestore. Store the location as a `GeoPoint`.
-   **Success Response (200):** `{ "message": "Location updated successfully." }`

-   **Endpoint:** `GET /api/user/wallet`
-   **Logic:**
    1.  Get the `uid` from the JWT.
    2.  Fetch the user's document from the `users` collection and return the `walletPoints` field. If it doesn't exist, initialize it to `100` and return that.
-   **Success Response (200):** `{ "walletPoints": 100 }`

-   **Endpoint:** `GET /api/user/rewards`
-   **Logic:**
    1.  Get the `uid` from the JWT.
    2.  Fetch all documents from the `rewards` subcollection for that user (`users/{uid}/rewards`).
    3.  Return them as a list. Ensure `dateEarned` is an ISO 8601 string.
-   **Success Response (200):** `{ "rewards": [ ... ] }`

#### **Driver Routes**

-   **Endpoint:** `POST /api/driver/session`
-   **Request Body:** `{ "destination": { "displayName": "...", "latitude": 12.34, "longitude": 56.78 } }`
-   **Logic:**
    1.  Get the `uid` from the JWT.
    2.  Update the user's document in the `users` collection to set their `status` to `'driving'` and store their destination details.
-   **Success Response (200):** `{ "message": "Session started. You are now a driver." }`

-   **Endpoint:** `DELETE /api/driver/session`
-   **Logic:**
    1.  Get the `uid` from the JWT.
    2.  Update the user's document in the `users` collection to set their `status` to `'idle'` (or remove the status field).
-   **Success Response (200):** `{ "message": "Driving session ended." }`

-   **Endpoint:** `GET /api/driver/ride-requests`
-   **Logic:**
    1.  This is for a driver looking for passengers.
    2.  Fetch all ride requests from the `ride_requests` collection where `status` is `'waiting'`.
    3.  **Perform proximity matching on the server.** For this version, you can implement a simple filter: return only requests whose destination is "close" to the driver's destination. You can use a simple distance calculation.
-   **Success Response (200):** `{ "rideRequests": [ ... ] }`

-   **Endpoint:** `PUT /api/driver/ride-requests/:id/accept`
-   **URL Parameter:** `id` (the ID of the ride request document)
-   **Logic:**
    1.  Get the driver's `uid` from the JWT.
    2.  Update the specified ride request document in the `ride_requests` collection. Set its `status` to `'picked_up'` and assign `driverId` to the driver's `uid`.
-   **Success Response (200):** `{ "message": "Ride request accepted." }`

#### **Passenger Routes**

-   **Endpoint:** `POST /api/passenger/ride-request`
-   **Request Body:** `{ "destination": { ... }, "pickup": { ... } }`
-   **Logic:**
    1.  Get the passenger's `uid` from the JWT.
    2.  Create a new document in the `ride_requests` collection with passenger's ID, pickup location, destination details, and a `status` of `'waiting'`.
-   **Success Response (201):** `{ "message": "Ride request created." }`

-   **Endpoint:** `DELETE /api/passenger/ride-request`
-   **Logic:**
    1.  Get the passenger's `uid` from the JWT.
    2.  Delete the document from the `ride_requests` collection where the ID matches the passenger's `uid`.
-   **Success Response (200):** `{ "message": "Ride request cancelled." }`

-   **Endpoint:** `GET /api/passenger/drivers`
-   **Logic:**
    1.  This is for a passenger looking for drivers.
    2.  Fetch all users from the `users` collection where `status` is `'driving'`.
    3.  **Perform proximity matching on the server.** Similar to the driver's endpoint, filter drivers whose destination matches the passenger's intended direction.
-   **Success Response (200):** `{ "drivers": [ ... ] }`

#### **Proxy Routes**

-   **Endpoint:** `GET /api/proxy/search-places`
-   **Query Parameter:** `q` (e.g., `/api/proxy/search-places?q=Eiffel%20Tower`)
-   **Logic:**
    1.  Make a GET request to the Nominatim API: `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=5`.
    2.  **Crucially, you must set a valid `User-Agent` header** in your request to Nominatim, e.g., `'User-Agent': 'RouteMateBackend/1.0'`.
    3.  Forward the JSON response from Nominatim to the client.
-   **Success Response (200):** `{ "places": [ ... ] }` (The raw array from Nominatim)

-   **Endpoint:** `GET /api/proxy/route`
-   **Query Parameters:** `start` and `end` (e.g., `?start=-0.1,51.5&end=-0.2,51.6`)
-   **Logic:**
    1.  Make a GET request to the OSRM project's public API: `http://router.project-osrm.org/route/v1/driving/...`.
    2.  Extract the polyline from the response (`routes[0].geometry.coordinates`).
    3.  Return it to the client.
-   **Success Response (200):** `{ "points": [ [lng, lat], [lng, lat], ... ] }`

Good luck! Please provide the complete code for `index.js` and any other necessary files, ensuring all specified endpoints are implemented.