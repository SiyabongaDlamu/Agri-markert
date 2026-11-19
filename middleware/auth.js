// backend/middleware/auth.js
// Protects routes by verifying the Firebase ID token sent from the browser.
// The browser SDK signs the user in and receives an ID token.
// Every protected API request must include: Authorization: Bearer <idToken>
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided. Please sign in." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);
    console.log("✅ Token verified for:", decoded.uid); // ← ADD THIS LINE
    
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    console.log("📄 Profile exists:", userDoc.exists); // ← ADD THIS LINE

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    req.user = { uid: decoded.uid, ...userDoc.data() };
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token. Please sign in again." });
  }
}
const { auth, db } = require("../config/firebase");

// Verify token and attach user to req.user
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided. Please sign in." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // Firebase Admin verifies the token cryptographically
    const decoded = await auth.verifyIdToken(idToken);

    // Fetch the full user profile from Firestore (includes role)
    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    req.user = { uid: decoded.uid, ...userDoc.data() };
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token. Please sign in again." });
  }
}

// Only allow farmers through
function requireFarmer(req, res, next) {
  if (req.user?.role !== "farmer") {
    return res.status(403).json({ error: "Access denied. Farmers only." });
  }
  next();
}

// Only allow buyers through
function requireBuyer(req, res, next) {
  if (req.user?.role !== "buyer") {
    return res.status(403).json({ error: "Access denied. Buyers only." });
  }
  next();
}

// Allow farmers OR buyers (e.g. viewing products)
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}

module.exports = { verifyToken, requireFarmer, requireBuyer, requireAuth };
