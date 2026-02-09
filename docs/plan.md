# App Plan: RouteMate

## 1. Login Page UI
1. Mobile input
2. Password input
3. Login button
4. Choose OTP based login (opens phone.email view)
5. Option to create account/signup

---

## 2. Authentication Flows

### Password Login (Pressing Login Button)
1. Submit credentials to Backend
2. Backend compares password with `PasswordHash`
3. Create and return session token

### OTP Login (When pressing OTP login)
1. Open phone.email view
2. Collect custom token upon completion
3. Send token to backend
4. Verify via phone.email API and create session

### Create Account / Signup (When pressing signup)
1. Complete phone.email login
2. Verify token on backend; create user and session
3. Show password entry page
4. Backend hashes (one-way) password and stores it in Firestore under the user
5. Show Didit KYC verification page
6. On completion, send data to server
7. Extract `name` to common field and store full payload in `KycData`
8. Mark user as `IsKycVerified: true`
9. Create Solana wallet, Store Public Key and Encrypted Private Key

---

## 3. App UI (after session available) & State Management
1. Full-screen map (custom markers + route drawing)
2. Mandatory location access permission (blocks interaction until granted)
3. Blue glowing dot for user's live location
4. Log live location to Firestore via backend at set intervals
5. A navigation menu at the bottom with 3 icons (home, history/previous/rides, user/profile/account)
6. Toggle Driver / Passenger just above the nav bar
7. Destination search input with results list overlay at the top of the page
8. Focus/zoom/scroll back to my location marker on map button just below the input at the right side of the screen
9. **Active State:** Once destination is chosen, app enters "Active" mode:
   - Polyline route is drawn.
   - `user.state` updated to 'driving' or 'riding'.
   - `user.Destination` updated in Firestore.
   - UI shows a **Cross (X) button** at top right or listens for **Back** press to exit.
10. **Exit/Idle State:** Pressing X or Back resets `user.state` to 'idle' and clears destination in Firestore.

---

## 4. Discovery & Interaction Logic (Home Section)

### Intelligent Discovery (Filtering)
* **Passenger Discovery:** Only shows drivers whose current route (from `LastLocation` to `Destination`) passes through the passenger's pickup and destination points.
* **Driver Discovery:** Only shows passengers who have an active, non-completed connection.
* **API Matching:** Marker data is fetched from a dedicated backend endpoint that calculates route overlaps/direction and must be refreshed frequently to reflect movement.

### Passenger View
* **Interaction:** Clicking a filtered driver marker opens a **slide-in bottom box** showing driver details along with a "Request Ride" button (the button only works if there is a balance of $10 worth of SOL in wallet; otherwise show "not enough funds" and a button to account section where wallet address is shown for people to top up their balance).
* **Interaction:** Clicking outside the slide-in box/popup closes it.

### Driver Detail Exploration (Before Request)
* When a driver marker is selected, passenger sees:
  - Driver name and rating.
  - Vehicle details.
  - Estimated pickup ETA.
  - Estimated drop ETA.
  - Fare estimate.
  - Route alignment indicator.
* Passenger can browse different drivers by selecting other markers on the map.
* No ride request is created during exploration.
* Only one request can exist at a time; if a request is active, new requests are disabled.

### Ride Request & Active Request Pane Behavior
* After pressing **Request Ride**, the pane transitions into a **Request Active state**.
* Passenger sees:
  - Driver details for the requested driver.
  - Request status indicator: *Waiting for driver response*.
  - Countdown timer showing auto-expiry (10-minute timeout).
* Passenger is given two options:
  - **Cancel Request** — immediately withdraws request and removes it from driver notifications.
  - **Minimize Request Pane** — collapses the pane into a small floating status bar so the passenger can continue exploring drivers on the map.
* While minimized:
  - Active request status remains visible.
  - Passenger may tap the minimized bar to reopen the request pane.
  - Passenger may explore other drivers, but cannot send another request until the active one is cancelled or expires.
* If request **times out after 10 minutes**, passenger sees:
  - Request expired notification.
  - Pane resets to browsing state.
  - Option to request another driver.
* If driver **rejects** request:
  - Passenger receives rejection notification.
  - Pane returns to browsing state.
* If driver **accepts** request:
  - Pane automatically switches to **Connection Established view**.
  - Driver live location and ETA to pickup become visible.
  - Passenger is shown the **OTP code** required for ride connection.
  - Cancel option remains available until pickup confirmation.

### Driver View
* **New Request Alert:** When a connection request arrives, show a **blocking popup** displaying the **Passenger's Pickup Location**, Destination, Fare, and estimated pickup distance/time.
* **Interaction:** Driver must select **Accept** or **Reject**; no option to close without action.
* Popup includes a visible **request expiry countdown** (10-minute auto-timeout).
* Accept button shows loading state while backend confirms connection creation.
* Reject action immediately updates passenger UI with rejection state.
* If request auto-expires before driver action, popup closes and request is marked expired.
* **Connection Manager:** A bottom menu (expand/minimize) to manage all current active connections and enter Passenger OTPs.
* Connection Manager shows per passenger:
  - Pickup location
  - Destination
  - Ride status (En route, Waiting pickup, In ride)
  - Navigation shortcut
  - OTP entry field
* When request is accepted:
  - Navigation automatically updates to passenger pickup.
  - Passenger live location tracking is shown.
* After OTP verification:
  - Ride status switches to active ride.
  - Navigation switches to destination route.

---

## 5. Ride Connection & Auto-Expiry
1. Driver receives request in `user/riderequests`.
2. **Auto-Cancel:** Requests not accepted within 10 minutes are automatically marked `rejected` or deleted by backend.
3. Driver accepts; connection record created and passenger request pane switches to accepted state showing OTP and driver arrival tracking.
4. **Constraints:** Driver can have multiple connections; Passenger limited to one active request or ride at a time.
5. Connected passengers are hidden from other map users and unavailable for additional requests.
6. **OTP Handshake:**
   - Passenger shown OTP on screen after request acceptance.
   - Driver enters OTP in Connection Manager to confirm pickup.
7. **Completion:** Connection cleared when destination reached and both apps receive ride completion confirmation.
8. **Payment:** Automatic transfer from passenger wallet to driver wallet via Solana, with payment processing and success confirmation states visible to both users.

---

## 6. History Section
* Show only completed rides made by user.
* **For passenger:** Show driver name, fare, ride time, start, destination.
* **For driver:** Show fare, ride time, start, destination.

---

## 7. Account/User Section
* Show user name, phone, KYC verified badge.
* Show wallet balance, address with copy button (show a text below saying "send SOL to this address" for using the app).

---

## 8. Technical Architecture
* **Backend:** Vercel API routing.
* **Matching Engine:** API endpoint to filter markers based on route similarity and direction.
* **Database:** Firestore (All operations via backend).
* **Firestore Wrappers:** All DB calls use `addDocument`, `updateDocument`, `getDocument`, and `getDocumentById`.
* Use polling to backend for all operations like live updates, try to bring together all polling to backend in a single place in codebase.

---

## 9. Data Models

### User Collection
* `Id`: string
* `Name`: string
* `Mobile`: string
* `PasswordHash`: string
* `Session`: { `token`: string }
* `Wallet`: { `address`: string, `EncryptedKey`: string }
* `state`: 'driving' | 'riding' | 'idle'
* `LastLocation`: { `lat`: number, `lng`: number }
* `Destination`: { `lat`: number, `lng`: number }
* `KycData`: any
* `IsKycVerified`: boolean

### RideConnections Collection
* `Id`: string
* `PassengerId`: string
* `DriverId`: string
* `PickupLocation`: { `lat`: number, `lng`: number }
* `Destination`: { `lat`: number, `lng`: number }
* `Distance`: number
* `Fare`: number
* `RideTotalTime`: number
* `OtpCode`: string
* `State`: 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed'
* `CreatedAt`: Timestamp

---

## 10. Environment Variables (Backend Only)
* `FIREBASE_SERVICE_ACCOUNT_ENCODED`
* `DIDIT_`
* `PHONE_EMAIL_`
* `WALLET_ENCRYPTION_KEY`
* `PASSWORD_HASHING_SEED`


## 11. API Endpoints

All endpoints are served via backend API routes.
All requests require a valid session token unless explicitly stated.

---

### Authentication APIs

#### POST `/api/auth/login`
* **Description:** Password-based login.
* **Params:**
  * `mobile`: string
  * `password`: string
* **Returns:**
  * `token`: string
  * `user`: User

---

#### POST `/api/auth/otp-login`
* **Description:** Login via phone/email OTP token.
* **Params:**
  * `otpToken`: string
* **Returns:**
  * `token`: string
  * `user`: User

---

#### POST `/api/auth/signup`
* **Description:** Creates new user after OTP verification.
* **Params:**
  * `otpToken`: string
  * `password`: string
* **Returns:**
  * `token`: string
  * `user`: User

---

#### POST `/api/auth/logout`
* **Description:** Invalidates user session.
* **Params:** none
* **Returns:**
  * `{ success: boolean }`

---

### User State & Profile APIs

#### GET `/api/user/me`
* **Description:** Fetch logged-in user profile.
* **Params:** none
* **Returns:**
  * `user`: User

---

#### POST `/api/user/state`
* **Description:** Update user activity state.
* **Params:**
  * `state`: `'driving' | 'riding' | 'idle'`
  * `destination`: `{ lat: number, lng: number } | null`
* **Returns:**
  * `{ success: boolean }`

---

#### POST `/api/user/location`
* **Description:** Update live user location.
* **Params:**
  * `lat`: number
  * `lng`: number
* **Returns:**
  * `{ success: boolean }`

---

### Discovery & Matching APIs

#### GET `/api/match/markers`
* **Description:** Returns filtered nearby drivers or passengers based on role and route overlap.
* **Params:**
  * `role`: `'driver' | 'passenger'`
  * `lat`: number
  * `lng`: number
* **Returns:**
  * `markers`: Array<{
      userId: string,
      name: string,
      rating?: number,
      vehicle?: string,
      lastLocation: { lat: number, lng: number },
      destination: { lat: number, lng: number }
    }>

---

### Ride Request APIs

#### POST `/api/rides/request`
* **Description:** Passenger requests ride from driver.
* **Params:**
  * `driverId`: string
  * `pickupLocation`: { lat: number, lng: number }
  * `destination`: { lat: number, lng: number }
* **Returns:**
  * `requestId`: string
  * `expiresAt`: Timestamp

---

#### POST `/api/rides/request/cancel`
* **Description:** Cancel pending ride request.
* **Params:**
  * `requestId`: string
* **Returns:**
  * `{ success: boolean }`

---

#### GET `/api/rides/requests`
* **Description:** Driver fetches pending ride requests.
* **Params:** none
* **Returns:**
  * `requests`: Array<RideConnection>

---

### Connection Management APIs

#### POST `/api/rides/request/respond`
* **Description:** Driver accepts or rejects request.
* **Params:**
  * `requestId`: string
  * `action`: `'accepted' | 'rejected'`
* **Returns:**
  * `connection`: RideConnection

---

#### POST `/api/rides/connection/verify-otp`
* **Description:** Driver verifies passenger OTP at pickup.
* **Params:**
  * `connectionId`: string
  * `otp`: string
* **Returns:**
  * `{ success: boolean }`

---

#### POST `/api/rides/connection/complete`
* **Description:** Marks ride as completed and triggers payment.
* **Params:**
  * `connectionId`: string
* **Returns:**
  * `{ success: boolean, paymentTx?: string }`

---

#### GET `/api/rides/connections`
* **Description:** Returns active ride connections.
* **Params:** none
* **Returns:**
  * `connections`: Array<RideConnection>

---

### History APIs

#### GET `/api/rides/history`
* **Description:** Returns completed rides for user.
* **Params:** none
* **Returns:**
  * `rides`: Array<RideConnection>

---

### Wallet APIs

#### GET `/api/wallet/balance`
* **Description:** Fetch wallet balance.
* **Params:** none
* **Returns:**
  * `{ balance: number, address: string }`

---

### Shared Return Types

#### User
```

{
Id: string,
Name: string,
Mobile: string,
state: 'driving' | 'riding' | 'idle',
LastLocation?: { lat: number, lng: number },
Destination?: { lat: number, lng: number },
Wallet: { address: string },
IsKycVerified: boolean
}

```

#### RideConnection
```

{
Id: string,
PassengerId: string,
DriverId: string,
PickupLocation: { lat: number, lng: number },
Destination: { lat: number, lng: number },
Distance: number,
Fare: number,
RideTotalTime?: number,
OtpCode?: string,
State: 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed',
CreatedAt: Timestamp
}
