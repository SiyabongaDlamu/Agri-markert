# Agri-Market Hub — Firebase + Node.js Setup Guide

## Project Structure

```
agri-market/
├── backend/
│   ├── config/
│   │   ├── firebase.js        ← Firebase Admin SDK (server-side)
│   │   └── email.js           ← Nodemailer for order emails
│   ├── controllers/
│   │   ├── authController.js  ← Register, profile
│   │   ├── productsController.js ← CRUD for farmer listings
│   │   └── ordersController.js   ← Buyer checkout
│   ├── middleware/
│   │   └── auth.js            ← Token verification, role guards
│   ├── routes/
│   │   └── index.js           ← All API routes
│   ├── tests/
│   │   └── products.test.js   ← Jest unit tests
│   ├── .env.example           ← Copy to .env and fill in
│   ├── package.json
│   └── server.js              ← Main entry point
│
└── frontend/
    └── js/
        └── firebase-client.js ← Client SDK (runs in browser)
```

---

## Step 1 — Create Your Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it `agri-market-hub`
3. Enable **Firestore Database** → Start in test mode
4. Enable **Authentication** → Sign-in method → Email/Password → Enable
5. Enable **Storage** (for product images later)

---

## Step 2 — Get Your Service Account Key (for Node.js backend)

1. Firebase Console → Project Settings (gear icon)
2. **Service Accounts** tab → **Generate new private key**
3. Download the JSON file — keep it safe, **never commit to GitHub**
4. Copy the values into your `.env` file

---

## Step 3 — Get Your Web Config (for the browser frontend)

1. Firebase Console → Project Settings → **General**
2. Scroll to "Your apps" → Add a web app (click `</>`)
3. Copy the `firebaseConfig` object
4. Paste it into `frontend/js/firebase-client.js` (replacing the placeholder values)

---

## Step 4 — Set Up Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Anyone can read active products; only farmers can write
    match /products/{productId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'farmer';
    }

    // Orders: buyers create, owners read their own
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null
        && (resource.data.buyerId == request.auth.uid
            || resource.data.items[0].farmerId == request.auth.uid);
    }

    // Messages: anyone can write, admin reads (via backend only)
    match /messages/{messageId} {
      allow create: if true;
      allow read: if false;
    }
  }
}
```

---

## Step 5 — Install and Run the Backend

```bash
cd backend

# Copy the environment template
cp .env.example .env
# Then open .env and fill in your Firebase and email credentials

# Install dependencies
npm install

# Start development server (auto-restarts on file changes)
npm run dev

# You should see:
# Agri-Market Hub API running
# http://localhost:3000
```

---

## Step 6 — Update Your HTML Pages

Add to the `<head>` of every HTML page before your closing `</head>`:

```html
<!-- Firebase Client SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="/js/firebase-client.js"></script>
```

---

## Step 7 — Update SignUP.html (replace localStorage auth)

Replace your `handleSignUp` and `handleSignIn` functions with:

```javascript
// SIGN UP
async function handleSignUp(e) {
  e.preventDefault();
  const name = signupName.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;
  const role = signupRoleInput.value;

  if (!role) { showMessage("Please select a role", "error"); return; }

  const result = await agriAuth.signUp(name, email, password, role);
  if (result.success) {
    showMessage("Account created! Signing in...", "success");
    // Auto sign in after registration
    const loginResult = await agriAuth.signIn(email, password);
    if (loginResult.success) {
      agriAuth.saveSession(loginResult.token, loginResult.user); // add this to firebase-client.js exports
      redirectToDashboard(loginResult.user.role);
    }
  } else {
    showMessage(result.error, "error");
  }
}

// SIGN IN
async function handleSignIn(e) {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const result = await agriAuth.signIn(email, password);
  if (result.success) {
    redirectToDashboard(result.user.role);
  } else {
    showMessage(result.error, "error");
  }
}
```

---

## Step 8 — Update farmer.html (replace localStorage products)

Replace `uploadProduct()` with:

```javascript
async function uploadProduct() {
  const name = document.getElementById("prodName").value.trim();
  const price = document.getElementById("prodPrice").value;
  const icon = document.getElementById("prodIcon").value.trim();
  const region = document.getElementById("prodRegion").value;
  const description = document.getElementById("prodDesc").value.trim();

  try {
    const data = await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify({ name, price, icon, region, description }),
    });
    showNotification(data.message, "success");
    loadMyProducts(); // refresh the table
  } catch (err) {
    showNotification(err.message, "error");
  }
}

async function loadMyProducts() {
  const data = await apiFetch("/api/products/my");
  renderProductsTable(data.products);
}
```

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | None | Server status |
| POST | /api/auth/register | None | Create profile after signup |
| GET | /api/auth/me | Any | Get current user |
| PATCH | /api/auth/profile | Any | Update name/region |
| GET | /api/products | None | Browse all products |
| GET | /api/products/my | Farmer | My listings |
| POST | /api/products | Farmer | Add product |
| PATCH | /api/products/:id | Farmer | Edit product |
| DELETE | /api/products/:id | Farmer | Remove product |
| POST | /api/orders | Buyer | Place order |
| GET | /api/orders/my | Buyer | Order history |
| GET | /api/orders/farmer | Farmer | Incoming orders |

---

## Run Tests

```bash
cd backend
npm test
```

---

## Common Errors

**"Cannot find module firebase-admin"** → Run `npm install` in the backend folder.

**"Error: Failed to determine service account"** → Check your `.env` has FIREBASE_PROJECT_ID, CLIENT_EMAIL, and PRIVATE_KEY filled in correctly.

**CORS error in browser** → Make sure FRONTEND_URL in `.env` matches the URL you open your HTML from (e.g. `http://localhost:5500` if using VS Code Live Server).

**"auth/operation-not-allowed"** → Enable Email/Password sign-in in Firebase Console → Authentication → Sign-in method.
