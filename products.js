import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Operational Warehouses Definition
export const warehouses = [
  {
    id: "WH-HYD-01",
    code: "WH-HYD-01",
    badge: "[WH1]",
    name: "Central Logistics Hub - Hyderabad",
    city: "Hyderabad",
    type: "Central Manufacturing & Fulfillment Hub",
    locations: [
      "WH1/Main Store",
      "WH1/Production Floor",
      "WH1/Rack A",
      "WH1/Rack B"
    ],
    assignedRacks: ["WH1/Rack A", "WH1/Rack B", "WH1/Main Store", "WH1/Production Floor"],
    dockWorkers: "18 Operators // 6 Forklifts",
    status: "OPERATIONAL // NORMAL"
  },
  {
    id: "WH-BLR-02",
    code: "WH-BLR-02",
    badge: "[WH2]",
    name: "Regional Distribution Depot - Bengaluru",
    city: "Bengaluru",
    type: "Regional Fast-Distribution Depot",
    locations: [
      "WH2/Inbound Dock",
      "WH2/Bulk Storage",
      "WH2/Rack Alpha",
      "WH2/Rack Beta"
    ],
    assignedRacks: ["WH2/Rack Alpha", "WH2/Rack Beta", "WH2/Inbound Dock", "WH2/Bulk Storage"],
    dockWorkers: "12 Operators // 4 Forklifts",
    status: "OPERATIONAL // NORMAL"
  }
];

export function getWarehouseForLocation(loc) {
  if (!loc) return null;
  const l = String(loc).trim();
  if (l.startsWith("WH1/") || l.includes("WH-HYD-01") || l.includes("Main Store") || l.includes("Production Floor") || l.includes("Rack A") || l.includes("Rack B") || l.includes("Bay A") || l.includes("Bay B") || l.includes("Bay C")) {
    return "WH-HYD-01";
  }
  if (l.startsWith("WH2/") || l.includes("WH-BLR-02") || l.includes("Inbound Dock") || l.includes("Bulk Storage") || l.includes("Rack Alpha") || l.includes("Rack Beta") || l.includes("Bay D") || l.includes("Bay E") || l.includes("Bay F")) {
    return "WH-BLR-02";
  }
  return null;
}

// Load the 100 industrial product seed items
const seedPath = path.join(__dirname, "../products_seed.json");
let rawProducts = [];
try {
  rawProducts = JSON.parse(fs.readFileSync(seedPath, "utf8"));
} catch (e) {
  console.error("Failed to read products_seed.json", e);
}

export const products = rawProducts.map(p => ({
  ...p,
  get stock() { return this.stock_on_hand; },
  set stock(val) { this.stock_on_hand = val; },
  get minThreshold() { return this.reorder_threshold; },
  set minThreshold(val) { this.reorder_threshold = val; }
}));

// Move ledger for stock movements
export const ledger = [
  {
    id: "LED-004",
    timestamp: "2026-09-26T08:00:00.000Z",
    operationId: "TRF-5001",
    type: "internal",
    productId: "PROD-RAW-101",
    sku: "RAW-101",
    productName: "Precision Structural Steel Rods",
    fromLocation: "WH1/Main Store",
    toLocation: "WH2/Inbound Dock",
    qty: 25,
    resultingBalance: products[0] ? products[0].stock_on_hand : 377
  },
  {
    id: "LED-003",
    timestamp: "2026-09-26T07:45:00.000Z",
    operationId: "ADJ-1001",
    type: "adjustment",
    productId: "PROD-FNG-201",
    sku: "FNG-201",
    productName: "Ergonomic Industrial Assembly Chairs",
    fromLocation: "System Audit",
    toLocation: "WH1/Main Store",
    qty: -3,
    resultingBalance: 12
  },
  {
    id: "LED-002",
    timestamp: "2026-09-26T06:05:00.000Z",
    operationId: "INIT-002",
    type: "receipt",
    productId: "PROD-FNG-201",
    sku: "FNG-201",
    productName: "Ergonomic Industrial Assembly Chairs",
    fromLocation: "Vendor",
    toLocation: "WH1/Main Store",
    qty: 15,
    resultingBalance: 15
  },
  {
    id: "LED-001",
    timestamp: "2026-09-26T06:00:00.000Z",
    operationId: "INIT-001",
    type: "receipt",
    productId: "PROD-RAW-101",
    sku: "RAW-101",
    productName: "Precision Structural Steel Rods",
    fromLocation: "Vendor",
    toLocation: "WH1/Main Store",
    qty: 100,
    resultingBalance: 100
  }
];
export const moveLedger = ledger;

export function calculateStatus(stock, threshold) {
  const s = Number(stock) || 0;
  const t = Number(threshold) || 0;
  if (s <= 0) return "out_of_stock";
  if (s <= t) return "low_stock";
  return "in_stock";
}

export function formatProduct(p, selectedWh = "ALL") {
  const whHydTotal = p.warehouses?.["WH-HYD-01"]?.total ?? (p.locations?.["WH1/Main Store"] ?? 0);
  const whBlrTotal = p.warehouses?.["WH-BLR-02"]?.total ?? (p.locations?.["WH2/Inbound Dock"] ?? 0);
  const totalStock = (p.stock_on_hand !== undefined ? p.stock_on_hand : (whHydTotal + whBlrTotal));
  const minThreshold = p.minThreshold || p.reorder_threshold || 20;

  const currentWhStock = selectedWh === "WH-HYD-01" ? whHydTotal : (selectedWh === "WH-BLR-02" ? whBlrTotal : totalStock);
  const statusStock = selectedWh === "ALL" ? totalStock : currentWhStock;

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    uom: p.uom,
    minThreshold: minThreshold,
    reorder_threshold: minThreshold,
    stock_on_hand: totalStock,
    stock: totalStock,
    currentWhStock: currentWhStock,
    warehouses: p.warehouses || {
      "WH-HYD-01": {
        total: whHydTotal,
        locations: {
          "WH1/Main Store": whHydTotal,
          "WH1/Production Floor": 0,
          "WH1/Rack A": 0,
          "WH1/Rack B": 0
        }
      },
      "WH-BLR-02": {
        total: whBlrTotal,
        locations: {
          "WH2/Inbound Dock": whBlrTotal,
          "WH2/Bulk Storage": 0,
          "WH2/Rack Alpha": 0,
          "WH2/Rack Beta": 0
        }
      }
    },
    locations: p.locations || {
      "WH1/Main Store": whHydTotal,
      "WH1/Production Floor": 0,
      "WH1/Rack A": 0,
      "WH1/Rack B": 0,
      "WH2/Inbound Dock": whBlrTotal,
      "WH2/Bulk Storage": 0,
      "WH2/Rack Alpha": 0,
      "WH2/Rack Beta": 0,
      "Main Store": whHydTotal,
      "Production Floor": 0,
      "Rack A": 0,
      "Rack B": 0
    },
    status: calculateStatus(statusStock, minThreshold),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

// GET /api/products: Return all products with optional warehouse filter
router.get("/", (req, res) => {
  const wh = req.query.warehouse || "ALL";
  const enriched = products.map(p => formatProduct(p, wh));
  return res.json({
    success: true,
    warehouse: wh,
    count: enriched.length,
    products: enriched
  });
});

// GET /api/products/ledger: Return move ledger history
router.get("/ledger", (req, res) => {
  return res.json({
    success: true,
    count: ledger.length,
    ledger
  });
});

export default router;
