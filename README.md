# StockSense // Industrial Warehouse Management with Firebase Authentication

StockSense has been fully integrated with **Firebase Authentication**, providing a client-side identity layer paired with an industrial warehouse inventory interface.

---

## ⚡ What Was Integrated

1. **Dual Real-World Auth Providers via Firebase**:
   - **Google Enterprise SSO**: Genuine `signInWithPopup(GoogleAuthProvider)` triggering Google's native account chooser. Real, signed-in Google credentials mint cryptographic Firebase ID tokens.
   - **Mobile SMS OTP**: Real phone verification powered by `signInWithPhoneNumber` and Google's invisible reCAPTCHA infrastructure. Sends genuine SMS OTPs to Indian (+91) and international numbers.
   - **Zero Fake Paths Required**: Firebase directly manages code generation, dispatch, rate limiting, and expiry.

2. **In-Browser Firebase Setup & Management**:
   - **Masthead Config Control**: Click the `[🔥 FIREBASE: LIVE]` button in the terminal masthead or the `[CONFIGURE]` link in the banner to open the industrial Firebase Configuration Modal.
   - **Instant Hot-Reload**: Paste your `firebaseConfig` JSON directly into the UI; it is persisted to browser `localStorage` and immediately activates live Firebase services without editing code.
   - **Safe Developer Simulation Fallback**: If you run the workstation before connecting a live Firebase project, the terminal activates Dev Simulation Mode with an on-screen SMS carrier HUD and test codes (`970010`) so workflows can be tested instantly.

3. **Complete Warehouse Floor Management Workstation**:
   - **Telemetry Masthead**: Real-time display of authenticated operator identity (Google Email or verified Phone Number) with live verification badges (`FIREBASE GOOGLE` or `FIREBASE SMS`).
   - **Barcode Scanner HUD**: Active reticle targeting, real-time SKU lookup, audio feedback chirps (Web Audio API), and physical rack location indicators (`RACK 14-C`).
   - **Shelf Matrix Visualizer**: Dynamic visual representation of warehouse physical bays, capacities, and stock levels.
   - **Manifest Variance Approvals**: Interactive staging queue for discrepancy checks, quantity variances, and one-click bulk approvals.
   - **Chronological Audit Ledger**: Immutable event stream of inventory movements with live search, bay filters, and CSV export.
   - **Industrial Theming**: Utilitarian Dark Steel (`#191815`) and Warm Paper (`#F2F0EA`) modes built for harsh warehouse lighting.

---

## 📁 Project Structure

```text
stocksense-firebase-auth/
├── public/
│   ├── index.html        # Terminal Sign-in page (Firebase Auth entry point)
│   ├── login.html        # Dedicated Terminal Sign-in page
│   └── dashboard.html    # Full Warehouse Inventory Management Workstation
└── README.md             # Architecture, setup guide, and workflow reference
```

---

## 🚀 Quick Start (Running Locally)

Since Firebase Authentication operates client-side, no backend server is required to test or run the application:

```bash
# 1. Navigate to the public folder
cd public

# 2. Start any local static server
npx serve .
# Or: npx http-server .
# Or: python -m http.server 3000
```

Open the displayed URL (e.g. `http://localhost:3000/`) in your browser.

---

## 🔑 Connecting Your Real Firebase Project

To run live SMS OTP and Google Sign-in:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. In the sidebar, navigate to **Build** &rarr; **Authentication** &rarr; **Get started**.
3. Under the **Sign-in method** tab:
   - Enable **Google** (select your project support email).
   - Enable **Phone**.
4. In **Authentication** &rarr; **Settings** &rarr; **Authorized domains**, ensure `localhost` is listed.
5. Go to **Project Settings** (gear icon) &rarr; **General** &rarr; scroll down to **Your apps** &rarr; click **Web (`</>`)** &rarr; Register app.
6. Copy the `firebaseConfig` object:
   ```javascript
   {
     "apiKey": "AIzaSy...",
     "authDomain": "your-project.firebaseapp.com",
     "projectId": "your-project",
     "storageBucket": "your-project.appspot.com",
     "messagingSenderId": "1234567890",
     "appId": "1:1234567890:web:abcdef123456"
   }
   ```
7. Open StockSense in your browser, click **`[🔥 FIREBASE: LIVE]`** (or **`[CONFIGURE]`**), paste your config JSON, and click **Save & Connect**.

---

## 🔐 Session Management & Sign Out

- Upon successful login (via Google or SMS OTP), the operator's cryptographic Firebase ID token and profile are stored in `localStorage` and `sessionStorage`.
- The workstation automatically validates and restores the session when navigating between pages.
- Clicking **`SIGN OUT`** in the top right masthead executes `firebase.auth().signOut()`, clears session tokens, and returns the terminal to the locked sign-in screen.
