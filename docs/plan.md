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
1. Submit credentials to Backend (`/api/auth/login`)
2. Backend compares password with `PasswordHash`
3. If user doesn't exist, return "Invalid Credentials" error
4. Create and return session token
5. Allow multiple active sessions per account (e.g., Expo Go + production APK) by storing multiple session tokens per user
6. Frontend fetches current user data (`/api/user/me`) to check KYC status
7. If not KYC verified, redirect to KYC verification page
8. If KYC verified, redirect to main app

### OTP Login / Signup (Unified Flow - When pressing "Login with OTP" or "Sign Up")
Both buttons open the same phone.email verification flow. The system automatically handles whether it's a login or signup based on whether the user exists.

1. Open phone.email view
2. User completes phone verification (OTP sent and verified by phone.email)
3. Collect JWT token from phone.email upon completion
4. Send token to backend for verification
5. Backend verifies JWT with phone.email API
6. **Backend checks if user exists:**
   - **If user exists:** Create session and return success → User logged in
   - **If user doesn't exist:** Return `userExists: false` flag → Frontend shows password entry screen
7. **If new user (userExists: false):**
   - Frontend shows password entry page
   - User creates password
   - Frontend sends JWT + password to signup endpoint
   - Backend verifies JWT again, creates user with hashed password
   - Backend initializes user wallet with 0 balance
   - Create session and return success → User logged in
8. **After successful login (existing or new user):**
   - Frontend fetches current user data (`/api/user/me`) to check KYC status
   - If not KYC verified, show Didit KYC verification page
   - User can skip KYC and complete later (see KYC Requirements section below)
   - When user starts verification, backend creates Didit session (`/api/kyc/create-session`) and stores `sessionId` against user immediately
   - Frontend redirects user to Didit WebView and then exits after submission
   - Backend waits for asynchronous Didit webhook (`/api/kyc/webhook`) to mark final result
   - On approval, backend extracts profile fields and marks user as `IsKycVerified: true`
9. **Logout behavior:** Logging out from one device removes only that device's session token; other active sessions remain logged in

---

## 3. KYC Requirements & Enforcement

### When KYC is MANDATORY 🔒
* **Switching to Driver Mode:** Alert shown → "KYC Verification Required" → User must verify before becoming driver.
* **Withdrawing Funds:** Alert shown → "KYC Verification Required" → User must verify before payout.
* Both show "Verify Now" button redirecting to KYC screen.

### When KYC is RECOMMENDED 💡
* **Requesting Rides (Passenger):** Alert shown → "KYC Verification Recommended" → User can "Verify Later" or "Verify Now".
* **After Login:** KYC screen shown but user can "Skip for Now" and complete later from account settings.
* Unverified users see "🔒 Verify Identity Now" button in account section.

### KYC Flow (Didit Integration)
1. User clicks "Start Verification" or "Verify Now"
2. Backend creates Didit session and stores `KycData.sessionId` + `KycStatus: session_created`
3. Didit WebView opens with KYC form
4. User submits: Government ID (Aadhaar/Passport/Driver's License) + Selfie + Personal info
5. Didit processes verification asynchronously (can be under review for minutes/hours)
6. Didit webhook calls backend endpoint `/api/kyc/webhook` with final status
7. Backend updates `KycStatus`, `KycData.status`, and `IsKycVerified`
8. User sees "Under Review" until webhook updates to approved/rejected

---

## 4. App UI (after session available) & State Management

### Idle Mode (Default State)
1. Full-screen map (custom markers visible - other users in idle/active states)
2. Mandatory location access permission (blocks interaction until granted)
3. Blue glowing dot for user's live location
4. Log live location to Firestore via backend at set intervals
5. A navigation menu at the bottom with 3 icons (home, history/previous/rides, user/profile/account)
6. **Destination search input** at the top of the page with:
   - Built-in autocomplete for destination suggestions (using Nominatim/OpenStreetMap API)
   - Ability to select a place from the map by tapping
7. Focus/zoom/scroll back to my location marker on map button just below the input at the right side of the screen
8. **No route is shown in idle mode** - only live location tracking

### Mode Selection (After Destination Selected)
9. Once a destination is chosen (from autocomplete suggestions or map selection):
   - The destination is saved temporarily (not yet in Firestore)
   - Two buttons appear: **"Start Driving"** and **"Find a Ride"** (or similar)
   - User selects their mode choice (driver or passenger)
   - If user selects **driver** and has no saved vehicle type, app prompts to select one (`Sedan`, `SUV`, `Hatchback`, `Bike`, `Auto`, `Van`, `Other`) before activating driving mode
   - This selection triggers transition to **Active State**

### Active State (Driving or Riding Mode)
10. After mode selection, app enters "Active" mode:
    - `user.state` updated to 'driving' or 'riding' in Firestore
    - `user.Destination` updated in Firestore
    - **Route is displayed** from current location to destination (using OSRM - Open Source Routing Machine API)
    - Top input transforms into a **destination name display area**
    - A **Cross (X) button** appears on the right side of the destination area to exit to idle mode
    - In **driving mode**: user becomes discoverable to passengers looking for rides
    - In **riding mode**: user can discover drivers whose routes align with their destination
    - A visible **Panic Button** is available to both driver and passenger in active mode for immediate emergency access

### Exit/Idle State
11. Pressing the **X button** returns to idle mode:
    - Resets `user.state` to 'idle' in Firestore
    - Clears destination in Firestore
    - Removes route from map
    - Restores destination search input UI

### Emergency / Panic Behavior
12. Panic mode behavior (India-first rollout):
   - Panic button initiates phone dialer call to India's emergency response number: `112`
   - Feature is available to both passenger and driver while in active mode
   - Entering panic mode must **not** pause/stop live location updates
   - Live location continues to be pushed to backend/Firestore during panic mode

---

## 5. Discovery & Interaction Logic (Home Section)

### Intelligent Discovery (Filtering)
* **Passenger Discovery:** Only shows drivers whose current route (from `LastLocation` to `Destination`) passes through the passenger's pickup and destination points.
* **Driver Discovery:** Only shows passengers who have an active, non-completed connection.
* **API Matching:** Marker data is fetched from a dedicated backend endpoint that calculates route overlaps/direction and must be refreshed frequently to reflect movement.

### Passenger View
* **Interaction:** Clicking a filtered driver marker opens a **slide-in bottom box** showing driver details along with a "Request Ride" button (the button only works if user has sufficient balance for the fare; otherwise show "Insufficient balance" and a button to account section where they can top up).
* **Interaction:** Clicking outside the slide-in box/popup closes it.
* Driver marker details must show the driver's configured `VehicleType` before passenger requests the ride.

### Driver Detail Exploration (Before Request)
* When a driver marker is selected, passenger sees:
  - Driver name and rating (calculated from completed ride reviews).
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
  - Passenger sees expected vehicle type captured at request time.
  - Passenger must confirm whether arriving vehicle matches expected vehicle (match/mismatch) before OTP handoff.
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

## 6. Ride Connection & Auto-Expiry
1. Driver receives request in `user/riderequests`.
2. **Auto-Cancel:** Requests not accepted within 10 minutes are automatically marked `rejected` or deleted by backend.
3. Driver accepts; connection record created and passenger request pane switches to accepted state showing OTP and driver arrival tracking.
4. **Constraints:** Driver can have multiple connections; Passenger limited to one active request or ride at a time.
5. Connected passengers are hidden from other map users and unavailable for additional requests.
6. **OTP Handshake:**
   - Passenger shown OTP on screen after request acceptance.
   - Driver cannot verify OTP until passenger confirms vehicle matches expected type.
   - Driver enters OTP in Connection Manager to confirm pickup.
7. **Completion:** Connection cleared when destination reached and both apps receive ride completion confirmation.
8. **Payment:** 
   - Fare amount is deducted from passenger's internal wallet balance and added to driver's balance.
   - All payment processing happens on backend with balance validation.
   - Balance cannot go negative - request is blocked if insufficient funds.
   - Backend records transaction in payment history.
9. **Driver Rating (Post-Ride):**
   - After completion, passenger is prompted to rate the driver from 1 to 5 stars.
   - Each ride can be rated only once by the passenger who took the ride.
   - Backend stores per-ride rating and updates driver's aggregate rating/count.

---

## 7. History Section
* Show only completed rides made by user.
* **For passenger:** Show driver name, fare, ride time, start, destination.
* **For driver:** Show fare, ride time, start, destination.

---

## 8. Account/User Section
* Show user name, phone, KYC verified badge.
* Allow driver to set/update vehicle type in profile (`Sedan`, `SUV`, `Hatchback`, `Bike`, `Auto`, `Van`, `Other`).
* Show driver rating summary (`average / 5` and total ratings count) for self-view.
* Show wallet balance prominently.
* **Top Up Balance Button:** ~~Opens Razorpay payment gateway for adding funds.~~ **TEMPORARILY DISABLED** - Requires Play Store link for Razorpay compliance.
* **Payout/Withdraw Button:** ~~Allows drivers to withdraw their earnings.~~ **TEMPORARILY DISABLED** - Requires Play Store link for Razorpay compliance.
* Display recent transaction history (top-ups and payouts).

**Note:** Deposit and withdrawal features are disabled until app is published on Play Store. Razorpay regulations require a valid app store link for payment gateway integration. Users can still use existing wallet balance for rides, but cannot add funds or withdraw.

---

## 9. Payment System Architecture

### Internal Wallet System
* Each user has a `WalletBalance` field in Firestore (type: number, default: 0).
* All funds are held in company bank account.
* User balances are virtual accounting entries tracked in database.
* **Critical Rule:** Balance can NEVER go negative. All deductions must be validated before processing.

### Top-Up Flow (Razorpay Integration) - **TEMPORARILY DISABLED**
**Status:** Disabled until Play Store publication. Razorpay requires valid app store link for compliance.
1. User clicks "Top Up" button in Account section.
2. User enters amount to add (minimum ₹100, maximum ₹10,000 per transaction).
3. Backend creates Razorpay order via API.
4. Frontend opens Razorpay checkout with order details.
5. User completes payment via Razorpay (UPI/Card/NetBanking).
6. Razorpay webhook notifies backend of payment success/failure.
7. Backend verifies webhook signature and payment status.
8. On success: Backend atomically adds amount to user's `WalletBalance`.
9. Backend creates transaction record in `Transactions` collection.
10. User sees updated balance immediately.

### Payout/Withdrawal Flow (Backend-Only Processing) - **TEMPORARILY DISABLED**
**Status:** Disabled until Play Store publication. Razorpay requires valid app store link for compliance.
1. Driver clicks "Withdraw" button in Account section.
2. Backend checks if user has `UpiId` stored.
3. If no UPI ID:
   - Show input form to collect UPI ID (e.g., user@paytm).
   - Validate UPI ID format on backend.
   - Store UPI ID in user document.
4. If UPI ID exists:
   - Show confirmation dialog: "Withdraw to [UPI ID]? [Change UPI ID] [Confirm]"
   - Option to update UPI ID if needed.
5. Driver enters withdrawal amount.
6. Backend validates:
   - Amount > 0
   - Amount <= current balance
   - UPI ID format is valid
   - Balance - amount >= 0 (prevent negative balance)
7. Backend performs UPI ID validation check (using Razorpay UPI validation API or similar service).
8. Show final confirmation with UPI ID, amount, and warning about incorrect UPI ID.
9. On confirmation:
   - Backend initiates payout via Razorpay Payouts API to user's UPI ID.
   - Backend atomically deducts amount from user's `WalletBalance` ONLY after payout is initiated.
   - If payout fails, revert the deduction immediately.
10. Backend creates transaction record in `Transactions` collection.
11. User sees updated balance and payout status (Pending/Success/Failed).

### Ride Payment Processing (Backend-Only) - **ACTIVE**
**Status:** This feature remains active. Users can use existing wallet balance for rides.

1. When ride is completed, backend calculates fare.
2. Backend atomically:
   - Checks passenger balance >= fare
   - If insufficient, marks ride as "Payment Failed" and notifies passenger
   - If sufficient: Deducts fare from passenger's `WalletBalance`
   - Adds fare to driver's `WalletBalance`
   - Creates transaction records for both users
3. Both users see updated balances immediately.
4. All operations use Firestore transactions to ensure atomicity.

**Note:** Users must have sufficient pre-loaded balance to request rides. Top-up functionality will be enabled after Play Store publication.

### Balance Validation Rules (Backend Enforced)
* **CRITICAL:** Before any deduction, backend MUST check: `currentBalance - amount >= 0`
* Use Firestore transactions to prevent race conditions.
* If validation fails, reject the operation and return error to user.
* Log all validation failures for monitoring.
* Never allow negative balance under any circumstance.

---

## 10. Technical Architecture
* **Backend:** Vercel API routing.
* **Matching Engine:** API endpoint to filter markers based on route similarity and direction.
* **Database:** Firestore (All operations via backend).
* **Firestore Wrappers:** All DB calls use `addDocument`, `updateDocument`, `getDocument`, and `getDocumentById`.
* **Payment Gateway:** Razorpay for top-ups and payouts (currently disabled pending Play Store publication).
* **Payment Processing:** All payment logic runs on backend only, never on frontend.
* Use polling to backend for all operations like live updates, try to bring together all polling to backend in a single place in codebase.

---

## 11. Data Models

### User Collection
* `Id`: string
* `Name`: string
* `Mobile`: string
* `PasswordHash`: string
* `Session`: { `token`: string }
* `WalletBalance`: number (default: 0, cannot be negative)
* `UpiId`: string (optional, stored when user requests first payout)
* `VehicleType`: 'Sedan' | 'SUV' | 'Hatchback' | 'Bike' | 'Auto' | 'Van' | 'Other' (required to enter driving mode)
* `state`: 'driving' | 'riding' | 'idle'
* `LastLocation`: { `lat`: number, `lng`: number }
* `Destination`: { `lat`: number, `lng`: number }
* `KycStatus`: 'not_started' | 'session_created' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'failed'
* `KycData`: {
  `sessionId`: string,
  `status`: KycStatus,
  `createdAt?`: ISO datetime,
  `submittedAt?`: ISO datetime,
  `updatedAt?`: ISO datetime,
  `reviewedAt?`: ISO datetime,
  `verifiedAt?`: ISO datetime,
  `age?`: number,
  `gender?`: string,
  `portraitImage?`: string,
  `address?`: string
}
* `IsKycVerified`: boolean
* `DriverRatingAverage`: number (default: 0)
* `DriverRatingCount`: number (default: 0)

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
* `RequestedVehicleType`: string (captured from driver profile at request time)
* `PassengerVehicleConfirmation`: 'pending' | 'confirmed' | 'mismatch'
* `PassengerVehicleConfirmedAt`: Timestamp (optional)
* `State`: 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed'
* `PaymentStatus`: 'pending' | 'success' | 'failed'
* `DriverRating`: number (1-5, optional, set by passenger after completion)
* `DriverRatedAt`: Timestamp (optional)
* `CreatedAt`: Timestamp

### Transactions Collection
* `Id`: string
* `UserId`: string
* `Type`: 'topup' | 'payout' | 'ride_payment' | 'ride_earning'
* `Amount`: number
* `BalanceBefore`: number
* `BalanceAfter`: number
* `Status`: 'pending' | 'success' | 'failed'
* `RazorpayOrderId`: string (for topups)
* `RazorpayPaymentId`: string (for topups)
* `RazorpayPayoutId`: string (for payouts)
* `UpiId`: string (for payouts)
* `RideConnectionId`: string (for ride payments)
* `Description`: string
* `CreatedAt`: Timestamp
* `UpdatedAt`: Timestamp

---

## 12. Environment Variables (Backend Only)
* `FIREBASE_SERVICE_ACCOUNT_ENCODED`
* `EXPO_PUBLIC_PHONE_EMAIL_CLIENT_ID`
* `PHONE_EMAIL_API_KEY`
* `DIDIT_API_KEY` (Backend - for API verification and session creation)
* `DIDIT_WORKFLOW_ID` (Backend - workflow ID for verification)
* `DIDIT_CALLBACK_URL` (optional - redirect URL after Didit flow; defaults to production callback)
* `DIDIT_WEBHOOK_SECRET` (optional but recommended - verify Didit webhook signature)
* `PASSWORD_HASHING_SEED`
* `RAZORPAY_KEY_ID` (optional - disabled until Play Store publication)
* `RAZORPAY_KEY_SECRET` (optional - disabled until Play Store publication)
* `RAZORPAY_WEBHOOK_SECRET` (optional - disabled until Play Store publication)

**Note on Maps & Location Services:**
- **Map Display:** Uses Google Maps (Android) and Apple Maps (iOS) via React Native Maps - no API key required
- **Place Search/Geocoding:** Uses Nominatim (OpenStreetMap) API - free, no API key required
- **Routing/Directions:** Uses OSRM (Open Source Routing Machine) API - free, no API key required
- **No Google API billing required** - all location services use free alternatives
