import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import productRoutes, { products, ledger, warehouses, getWarehouseForLocation } from "./routes/products.js";
import operationRoutes, { operations } from "./routes/operations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Serve static assets from public/
app.use(express.static(path.join(__dirname, "public")));

// Helper to inject environment variables into HTML template
function renderLoginTemplate() {
  const loginPath = path.join(__dirname, "public", "login.html");
  const fallbackPath = path.join(__dirname, "public", "index.html");
  const targetFile = fs.existsSync(loginPath) ? loginPath : fallbackPath;

  return fs
    .readFileSync(targetFile, "utf8")
    .replace(/{{GOOGLE_CLIENT_ID}}/g, process.env.GOOGLE_CLIENT_ID || "");
}

app.get("/login", (req, res) => {
  res.send(renderLoginTemplate());
});

app.get("/", (req, res) => {
  res.send(renderLoginTemplate());
});

app.get(["/dashboard", "/app"], (req, res) => {
  const dashboardPath = path.join(__dirname, "public", "dashboard.html");
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.redirect("/login");
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/operations", operationRoutes);

// GET /api/warehouses: Returns operational warehouse summaries
app.get("/api/warehouses", (req, res) => {
  const summary = warehouses.map(wh => {
    const skusWithStock = products.filter(p => {
      const whData = p.warehouses && p.warehouses[wh.id];
      return whData && whData.total > 0;
    }).length;
    const totalUnits = products.reduce((sum, p) => {
      const whData = p.warehouses && p.warehouses[wh.id];
      return sum + (whData ? (whData.total || 0) : 0);
    }, 0);
    return {
      ...wh,
      totalSKUs: products.length,
      activeSKUs: skusWithStock,
      totalUnits
    };
  });
  return res.json({ success: true, warehouses: summary });
});

// GET /api/inventory/kpis: Warehouse filtered or aggregated KPIs
app.get("/api/inventory/kpis", (req, res) => {
  const wh = req.query.warehouse || "ALL";

  if (wh === "WH-HYD-01" || wh === "WH-BLR-02") {
    const totalProducts = products.length;
    const totalUnits = products.reduce((sum, p) => {
      const whData = p.warehouses && p.warehouses[wh];
      return sum + (whData ? (whData.total || 0) : 0);
    }, 0);

    const outOfStockCount = products.filter((p) => {
      const whData = p.warehouses && p.warehouses[wh];
      return !whData || whData.total === 0;
    }).length;

    const lowStockCount = products.filter((p) => {
      const whData = p.warehouses && p.warehouses[wh];
      const qty = whData ? whData.total : 0;
      return qty > 0 && qty <= (p.minThreshold || p.reorder_threshold);
    }).length;

    const pendingReceipts = operations.filter((o) =>
      o.type === "receipt" && o.status !== "done" && o.status !== "canceled" &&
      getWarehouseForLocation(o.destLocation) === wh
    ).length;

    const pendingDeliveries = operations.filter((o) =>
      o.type === "delivery" && o.status !== "done" && o.status !== "canceled" &&
      getWarehouseForLocation(o.sourceLocation) === wh
    ).length;

    const scheduledTransfers = operations.filter((o) =>
      o.type === "internal" && o.status !== "done" && o.status !== "canceled" &&
      (getWarehouseForLocation(o.sourceLocation) === wh || getWarehouseForLocation(o.destLocation) === wh)
    ).length;

    return res.json({
      success: true,
      warehouse: wh,
      totalProducts,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers
    });
  }

  // Aggregated across all warehouses
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + (p.stock_on_hand || 0), 0);
  const lowStockCount = products.filter((p) => p.stock_on_hand <= (p.minThreshold || p.reorder_threshold) && p.stock_on_hand > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_on_hand === 0).length;
  const pendingReceipts = operations.filter((o) => o.type === "receipt" && o.status !== "done" && o.status !== "canceled").length;
  const pendingDeliveries = operations.filter((o) => o.type === "delivery" && o.status !== "done" && o.status !== "canceled").length;
  const scheduledTransfers = operations.filter((o) => o.type === "internal" && o.status !== "done" && o.status !== "canceled").length;

  return res.json({
    success: true,
    warehouse: "ALL",
    totalProducts,
    totalUnits,
    lowStockCount,
    outOfStockCount,
    pendingReceipts,
    pendingDeliveries,
    scheduledTransfers
  });
});

app.get("/api/ledger", (req, res) => {
  return res.json({
    success: true,
    count: ledger.length,
    ledger
  });
});

const PORT = parseInt(process.env.PORT || "5000", 10);
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`StockSense Backend Service running on port ${PORT}`);
  });
}

export default app;
