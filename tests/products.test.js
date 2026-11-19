// backend/tests/products.test.js
// Run with: npm test
// Tests the products API routes without needing a real Firebase connection.
// Uses supertest to make HTTP requests to the Express app.

const request = require("supertest");
const app = require("../server");

// Mock Firebase Admin so tests don't hit the real database
jest.mock("../config/firebase", () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: "prod-001",
            data: () => ({
              name: "Organic Tomatoes",
              price: 35,
              region: "Gauteng",
              farmerId: "farmer-uid-123",
              farmerName: "John Farmer",
              active: true,
              icon: "🍅",
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: "new-prod-001" }),
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ farmerId: "farmer-uid-123", active: true }),
        }),
        update: jest.fn().mockResolvedValue({}),
      })),
    })),
  },
  auth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "farmer-uid-123" }),
  },
}));

// Mock the auth middleware to inject a test user
jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    req.user = { uid: "farmer-uid-123", name: "John Farmer", role: "farmer", email: "farmer@test.com" };
    next();
  },
  requireFarmer: (req, res, next) => next(),
  requireBuyer: (req, res, next) => next(),
  requireAuth: (req, res, next) => next(),
}));

describe("GET /api/products", () => {
  it("returns a list of products with status 200", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it("includes product fields: name, price, region", async () => {
    const res = await request(app).get("/api/products");
    const product = res.body.products[0];
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("price");
    expect(product).toHaveProperty("region");
  });
});

describe("POST /api/products", () => {
  it("creates a product with valid data", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer mock-token")
      .send({ name: "Fresh Spinach", price: 25, region: "Western Cape" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("product");
    expect(res.body.product.name).toBe("Fresh Spinach");
  });

  it("rejects a product with missing name", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer mock-token")
      .send({ price: 25 });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  it("rejects a product with zero price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer mock-token")
      .send({ name: "Carrots", price: 0 });

    expect(res.statusCode).toBe(400);
  });
});

describe("Health check", () => {
  it("returns OK status", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });
});
