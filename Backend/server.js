// backend/server.js
const { syncDatabase } = require('./Models/index');
const path = require('path');
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// MIDDLEWARE
// ============================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST", "PATCH","PUT" , "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, '..')));

// ============================
// ROUTES
// ============================

app.get("/health", (req, res) => {
  res.json({ status: "OK", project: "Agri-Market Hub", timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Home.html'));
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// ============================
// START SERVER
// ============================

const server = app.listen(PORT, async () => {
  await syncDatabase();
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Agri-Market Hub API running        ║
  ║   API:      http://localhost:${PORT}        ║
  ║   Frontend: http://localhost:${PORT}        ║
  ║   Health:   http://localhost:${PORT}/health ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;