// backend/controllers/authController.js
// Handles user registration (creating the Firestore profile after Firebase Auth signup)
// Firebase Auth handles the actual login — the browser SDK does that directly.
// The backend only needs to: create profiles, verify tokens, and return user data.

const { auth, db } = require("../config/firebase");
const { validationResult } = require("express-validator");

// POST /api/auth/register
// Called after the user signs up via Firebase Auth on the frontend.
// Creates their Firestore profile with name and role.
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { uid, name, role } = req.body;

  // Validate role — only these three are allowed
  const allowedRoles = ["farmer", "buyer", "supplier"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role. Choose: farmer, buyer, or supplier." });
  }

  try {
    // Check the user actually exists in Firebase Auth (prevents fake UIDs)
    const firebaseUser = await auth.getUser(uid);

    // Check they don't already have a profile
    const existing = await db.collection("users").doc(uid).get();
    if (existing.exists) {
      return res.status(409).json({ error: "Profile already exists." });
    }

    // Create Firestore profile
    const userProfile = {
      uid,
      name,
      email: firebaseUser.email,
      role,
      createdAt: new Date().toISOString(),
      region: null,        // farmer can set this later
      profileComplete: false,
    };

    await db.collection("users").doc(uid).set(userProfile);

    // Set custom claim so the frontend can read role from the token
    await auth.setCustomUserClaims(uid, { role });

    res.status(201).json({
      message: "Profile created successfully.",
      user: { uid, name, email: firebaseUser.email, role },
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({ error: "Firebase Auth user not found. Sign up first." });
    }
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
}

// GET /api/auth/me
// Returns the current user's profile (used on page load to restore session)
async function getMe(req, res) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch profile." });
  }
}

// PATCH /api/auth/profile
// Update name or region
async function updateProfile(req, res) {
  const { name, region } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (region) updates.region = region;
  updates.profileComplete = true;

  try {
    await db.collection("users").doc(req.user.uid).update(updates);
    res.json({ message: "Profile updated.", updates });
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
}

module.exports = { register, getMe, updateProfile };
