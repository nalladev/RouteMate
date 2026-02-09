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
9. Initialize user wallet with 0 balance

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
* **Interaction:** Clicking a filtered driver marker opens a **slide-in bottom box** showing driver details along with a "Request Ride" button (the button only works if user has sufficient balance for the fare; otherwise show "Insufficient balance" and a button to account section where they can top up).
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
8. **Payment:** 
   - Fare amount is deducted from passenger's internal wallet balance and added to driver's balance.
   - All payment processing happens on backend with balance validation.
   - Balance cannot go negative - request is blocked if insufficient funds.
   - Backend records transaction in payment history.

---

## 6. History Section
* Show only completed rides made by user.
* **For passenger:** Show driver name, fare, ride time, start, destination.
* **For driver:** Show fare, ride time, start, destination.

---

## 7. Account/User Section
* Show user name, phone, KYC verified badge.
* Show wallet balance prominently.
* **Top Up Balance Button:** ~~Opens Razorpay payment gateway for adding funds.~~ **TEMPORARILY DISABLED** - Requires Play Store link for Razorpay compliance.
* **Payout/Withdraw Button:** ~~Allows drivers to withdraw their earnings.~~ **TEMPORARILY DISABLED** - Requires Play Store link for Razorpay compliance.
* Display recent transaction history (top-ups and payouts).

**Note:** Deposit and withdrawal features are disabled until app is published on Play Store. Razorpay regulations require a valid app store link for payment gateway integration. Users can still use existing wallet balance for rides, but cannot add funds or withdraw.

---

## 8. Payment System Architecture

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

## 9. Technical Architecture
* **Backend:** Vercel API routing.
* **Matching Engine:** API endpoint to filter markers based on route similarity and direction.
* **Database:** Firestore (All operations via backend).
* **Firestore Wrappers:** All DB calls use `addDocument`, `updateDocument`, `getDocument`, and `getDocumentById`.
* **Payment Gateway:** Razorpay for top-ups and payouts (currently disabled pending Play Store publication).
* **Payment Processing:** All payment logic runs on backend only, never on frontend.
* Use polling to backend for all operations like live updates, try to bring together all polling to backend in a single place in codebase.

---

## 10. Data Models

### User Collection
* `Id`: string
* `Name`: string
* `Mobile`: string
* `PasswordHash`: string
* `Session`: { `token`: string }
* `WalletBalance`: number (default: 0, cannot be negative)
* `UpiId`: string (optional, stored when user requests first payout)
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
* `PaymentStatus`: 'pending' | 'success' | 'failed'
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

## 11. Environment Variables (Backend Only)
* `FIREBASE_SERVICE_ACCOUNT_ENCODED`
* `PHONE_EMAIL_API_KEY`
* `DIDIT_API_KEY`
* `PASSWORD_HASHING_SEED`
* `GOOGLE_MAPS_API_KEY`
* `RAZORPAY_KEY_ID` (optional - disabled until Play Store publication)
* `RAZORPAY_KEY_SECRET` (optional - disabled until Play Store publication)
* `RAZORPAY_WEBHOOK_SECRET` (optional - disabled until Play Store publication)
