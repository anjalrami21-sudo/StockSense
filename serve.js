import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const totpStore = new Map();

// =========================================================================
// 1. MULTI-WAREHOUSE & 100 INDUSTRIAL PRODUCT RECORDS REPOSITORY
// =========================================================================

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

// Read seed 100 products from products_seed.json
const seedPath = path.join(__dirname, 'products_seed.json');
let rawProducts = [];
try {
  rawProducts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
} catch (e) {
  console.error('Failed reading products_seed.json, using fallback', e);
}

export const products = rawProducts.map(p => ({
  ...p,
  get stock() { return this.stock_on_hand; },
  set stock(val) { this.stock_on_hand = val; },
  get minThreshold() { return this.reorder_threshold; },
  set minThreshold(val) { this.reorder_threshold = val; }
}));

export const operations = [
  {
    id: "REC-8841",
    reference: "REC-8841",
    type: "receipt",
    status: "ready",
    partner: "Apex Metals Ltd",
    sourceLocation: "Vendor",
    destLocation: "WH1/Main Store",
    items: [
      {
        productId: "PROD-RAW-101",
        sku: "RAW-101",
        name: "Precision Structural Steel Rods",
        qtyExpected: 50,
        qtyDone: 0
      }
    ],
    notes: "Central Hub delivery PO-8841 to Hyderabad",
    createdAt: "2026-09-26T07:00:00.000Z"
  },
  {
    id: "REC-8842",
    reference: "REC-8842",
    type: "receipt",
    status: "ready",
    partner: "Fastener Global Supply",
    sourceLocation: "Vendor",
    destLocation: "WH2/Inbound Dock",
    items: [
      {
        productId: "PROD-HDW-301",
        sku: "HDW-301",
        name: "Zinc-Plated Hex Head Bolts M8x40",
        qtyExpected: 150,
        qtyDone: 0
      }
    ],
    notes: "Bengaluru Depot inbound shipment PO-8842",
    createdAt: "2026-09-26T07:10:00.000Z"
  },
  {
    id: "DEL-9920",
    reference: "DEL-9920",
    type: "delivery",
    status: "waiting",
    partner: "Zenith Infrastructure Corp",
    sourceLocation: "WH1/Main Store",
    destLocation: "Customer",
    items: [
      {
        productId: "PROD-FNG-201",
        sku: "FNG-201",
        name: "Ergonomic Industrial Assembly Chairs",
        qtyExpected: 4,
        qtyDone: 0
      }
    ],
    notes: "Outbound customer delivery SO-9920 from Hyderabad",
    createdAt: "2026-09-26T07:15:00.000Z"
  },
  {
    id: "DEL-9921",
    reference: "DEL-9921",
    type: "delivery",
    status: "ready",
    partner: "Metro Electronics Bengaluru",
    sourceLocation: "WH2/Bulk Storage",
    destLocation: "Customer",
    items: [
      {
        productId: "PROD-PKG-401",
        sku: "PKG-401",
        name: "Heavy-Duty Corrugated Cartons 5-Ply",
        qtyExpected: 60,
        qtyDone: 0
      }
    ],
    notes: "Regional delivery dispatch from Bengaluru",
    createdAt: "2026-09-26T07:20:00.000Z"
  },
  {
    id: "TRF-4412",
    reference: "TRF-4412",
    type: "internal",
    status: "ready",
    partner: "Internal Logistics - WH1",
    sourceLocation: "WH1/Main Store",
    destLocation: "WH1/Production Floor",
    items: [
      {
        productId: "PROD-RAW-101",
        sku: "RAW-101",
        name: "Precision Structural Steel Rods",
        qtyExpected: 10,
        qtyDone: 0
      }
    ],
    notes: "Intra-Warehouse transfer to Assembly Line 2",
    createdAt: "2026-09-26T07:30:00.000Z"
  },
  {
    id: "TRF-5001",
    reference: "TRF-5001",
    type: "internal",
    status: "ready",
    partner: "Inter-Warehouse Transit Fleet",
    sourceLocation: "WH1/Main Store",
    destLocation: "WH2/Inbound Dock",
    items: [
      {
        productId: "PROD-RAW-101",
        sku: "RAW-101",
        name: "Precision Structural Steel Rods",
        qtyExpected: 25,
        qtyDone: 0
      }
    ],
    notes: "Inter-Warehouse Transfer: Hyderabad Hub -> Bengaluru Depot",
    createdAt: "2026-09-26T07:35:00.000Z"
  },
  {
    id: "TRF-5002",
    reference: "TRF-5002",
    type: "internal",
    status: "ready",
    partner: "Inter-Warehouse Transit Fleet",
    sourceLocation: "WH2/Bulk Storage",
    destLocation: "WH1/Rack A",
    items: [
      {
        productId: "PROD-HDW-301",
        sku: "HDW-301",
        name: "Zinc-Plated Hex Head Bolts M8x40",
        qtyExpected: 40,
        qtyDone: 0
      }
    ],
    notes: "Inter-Warehouse Transfer: Bengaluru Depot -> Hyderabad Hub",
    createdAt: "2026-09-26T07:40:00.000Z"
  },
  {
    id: "ADJ-1001",
    reference: "ADJ-1001",
    type: "adjustment",
    status: "done",
    partner: "Damaged Stock Audit",
    sourceLocation: "System Audit",
    destLocation: "WH1/Main Store",
    items: [
      {
        productId: "PROD-FNG-201",
        sku: "FNG-201",
        name: "Ergonomic Industrial Assembly Chairs",
        qtyExpected: 3,
        qtyDone: 3
      }
    ],
    variance: -3,
    notes: "WH1/Main Store, 3 units transit damaged",
    createdAt: "2026-09-26T07:45:00.000Z",
    validatedAt: "2026-09-26T07:45:00.000Z"
  }
];

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

export function calculateProductStatus(stock, minThreshold) {
  const s = Number(stock) || 0;
  const t = Number(minThreshold) || 0;
  if (s <= 0) return 'out_of_stock';
  if (s <= t) return 'low_stock';
  return 'in_stock';
}

export function formatProduct(p, selectedWh = 'ALL') {
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
    status: calculateProductStatus(statusStock, minThreshold),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

export function enrichOperation(op) {
  const enrichedItems = (op.items || []).map((item) => {
    const product = products.find((p) => p.id === item.productId || p.sku === item.productId || p.sku === item.sku);
    return {
      productId: product ? product.id : item.productId,
      sku: product ? product.sku : (item.sku || 'N/A'),
      name: product ? product.name : (item.name || 'Item'),
      qtyExpected: Number(item.qtyExpected !== undefined ? item.qtyExpected : (item.qty || 0)),
      qtyDone: Number(item.qtyDone !== undefined ? item.qtyDone : 0),
      uom: product ? product.uom : 'units'
    };
  });

  const srcWh = getWarehouseForLocation(op.sourceLocation);
  const dstWh = getWarehouseForLocation(op.destLocation);
  const isInterWarehouse = op.type === "internal" && srcWh && dstWh && srcWh !== dstWh;

  return {
    id: op.id,
    reference: op.reference || op.id,
    type: op.type,
    status: op.status,
    partner: op.partner || 'Internal Logistics',
    sourceLocation: op.sourceLocation,
    destLocation: op.destLocation,
    sourceWarehouse: srcWh,
    destWarehouse: dstWh,
    isInterWarehouse,
    items: enrichedItems,
    variance: op.variance !== undefined ? op.variance : null,
    notes: op.notes || '',
    createdAt: op.createdAt,
    validatedAt: op.validatedAt
  };
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let reqPath = urlObj.pathname;

  // -------------------------------------------------------------------------
  // 1. REST API: GET /api/inventory/kpis (Supports ?warehouse=WH-HYD-01|WH-BLR-02|ALL)
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/inventory/kpis') {
    const wh = urlObj.searchParams.get('warehouse') || 'ALL';

    if (wh === 'WH-HYD-01' || wh === 'WH-BLR-02') {
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
        o.type === 'receipt' && o.status !== 'done' && o.status !== 'canceled' &&
        getWarehouseForLocation(o.destLocation) === wh
      ).length;

      const pendingDeliveries = operations.filter((o) =>
        o.type === 'delivery' && o.status !== 'done' && o.status !== 'canceled' &&
        getWarehouseForLocation(o.sourceLocation) === wh
      ).length;

      const scheduledTransfers = operations.filter((o) =>
        o.type === 'internal' && o.status !== 'done' && o.status !== 'canceled' &&
        (getWarehouseForLocation(o.sourceLocation) === wh || getWarehouseForLocation(o.destLocation) === wh)
      ).length;

      return sendJson(res, 200, {
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

    // Aggregated
    const totalProducts = products.length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stock_on_hand || 0), 0);
    const lowStockCount = products.filter((p) => p.stock_on_hand <= (p.minThreshold || p.reorder_threshold) && p.stock_on_hand > 0).length;
    const outOfStockCount = products.filter((p) => p.stock_on_hand === 0).length;
    const pendingReceipts = operations.filter((o) => o.type === 'receipt' && o.status !== 'done' && o.status !== 'canceled').length;
    const pendingDeliveries = operations.filter((o) => o.type === 'delivery' && o.status !== 'done' && o.status !== 'canceled').length;
    const scheduledTransfers = operations.filter((o) => o.type === 'internal' && o.status !== 'done' && o.status !== 'canceled').length;

    return sendJson(res, 200, {
      success: true,
      warehouse: 'ALL',
      totalProducts,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers
    });
  }

  // -------------------------------------------------------------------------
  // GET /api/warehouses: Returns operational warehouse summaries
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/warehouses') {
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
    return sendJson(res, 200, { success: true, warehouses: summary });
  }

  // -------------------------------------------------------------------------
  // 2. REST API: GET /api/products
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/products') {
    const wh = urlObj.searchParams.get('warehouse') || 'ALL';
    const enriched = products.map(p => formatProduct(p, wh));
    return sendJson(res, 200, {
      success: true,
      warehouse: wh,
      count: enriched.length,
      products: enriched
    });
  }

  // -------------------------------------------------------------------------
  // REST API: GET /api/products/ledger
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/products/ledger') {
    return sendJson(res, 200, {
      success: true,
      count: ledger.length,
      ledger
    });
  }

  // -------------------------------------------------------------------------
  // REST API: GET /api/ledger
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/ledger') {
    return sendJson(res, 200, {
      success: true,
      count: ledger.length,
      ledger
    });
  }

  // -------------------------------------------------------------------------
  // REST API: GET /api/operations
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && reqPath === '/api/operations') {
    const type = urlObj.searchParams.get('type');
    const status = urlObj.searchParams.get('status');
    const warehouse = urlObj.searchParams.get('warehouse');
    const q = urlObj.searchParams.get('q');

    let results = operations;

    if (type && type !== 'all') {
      results = results.filter((o) => o.type.toLowerCase() === type.toLowerCase());
    }

    if (status && status !== 'all') {
      results = results.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }

    if (warehouse && warehouse !== 'ALL') {
      results = results.filter((o) => {
        const srcWh = getWarehouseForLocation(o.sourceLocation);
        const dstWh = getWarehouseForLocation(o.destLocation);
        return srcWh === warehouse || dstWh === warehouse;
      });
    }

    if (q) {
      const term = String(q).trim().toLowerCase();
      results = results.filter(
        (o) =>
          (o.reference && o.reference.toLowerCase().includes(term)) ||
          (o.partner && o.partner.toLowerCase().includes(term)) ||
          (o.sourceLocation && o.sourceLocation.toLowerCase().includes(term)) ||
          (o.destLocation && o.destLocation.toLowerCase().includes(term)) ||
          (o.items && o.items.some((i) => (i.name && i.name.toLowerCase().includes(term)) || (i.sku && i.sku.toLowerCase().includes(term))))
      );
    }

    return sendJson(res, 200, {
      success: true,
      count: results.length,
      operations: results.map(enrichOperation)
    });
  }

  // -------------------------------------------------------------------------
  // REST API: POST /api/operations/:id/validate (Atomic Validation Engine)
  // -------------------------------------------------------------------------
  if (req.method === 'POST' && reqPath.startsWith('/api/operations/') && reqPath.endsWith('/validate')) {
    try {
      const parts = reqPath.split('/');
      const id = parts[3];
      const op = operations.find((o) => o.id === id || o.reference === id);

      if (!op) {
        return sendJson(res, 404, {
          success: false,
          error: `Operation with ID or Reference "${id}" not found.`
        });
      }

      if (op.status === 'done') {
        return sendJson(res, 400, {
          success: false,
          error: `Operation "${op.reference || op.id}" is already validated and completed.`
        });
      }

      const { type, sourceLocation, destLocation } = op;
      const opItems = op.items || [];
      const now = new Date().toISOString();

      const srcWh = getWarehouseForLocation(sourceLocation) || 'WH-HYD-01';
      const dstWh = getWarehouseForLocation(destLocation) || (srcWh === 'WH-HYD-01' ? 'WH-BLR-02' : 'WH-HYD-01');
      const isInterWarehouse = (type === 'internal' && srcWh !== dstWh);

      if (type === 'delivery') {
        for (const item of opItems) {
          const product = products.find((p) => p.id === item.productId || p.sku === item.sku);
          if (!product) {
            return sendJson(res, 404, { success: false, error: `Product "${item.productId}" not found.` });
          }
          const needed = Number(item.qtyDone > 0 ? item.qtyDone : item.qtyExpected) || 0;
          const whStock = product.warehouses?.[srcWh]?.total ?? product.stock_on_hand;
          if (whStock < needed) {
            return sendJson(res, 400, {
              success: false,
              error: `Insufficient stock available in ${srcWh} for "${product.name}" (${product.sku}). Available: ${whStock} ${product.uom}, Required: ${needed} ${product.uom}.`
            });
          }
        }
      }

      if (type === 'internal') {
        for (const item of opItems) {
          const product = products.find((p) => p.id === item.productId || p.sku === item.sku);
          if (!product) continue;
          const needed = Number(item.qtyDone > 0 ? item.qtyDone : item.qtyExpected) || 0;
          const srcLoc = sourceLocation || 'WH1/Main Store';
          const availableInLoc = product.warehouses?.[srcWh]?.locations?.[srcLoc] ?? product.locations?.[srcLoc] ?? product.warehouses?.[srcWh]?.total ?? product.stock_on_hand;
          if (availableInLoc < needed) {
            return sendJson(res, 400, {
              success: false,
              error: `Insufficient stock in source location "${srcLoc}" (${srcWh}) for "${product.name}". Available: ${availableInLoc} ${product.uom}, Required: ${needed} ${product.uom}.`
            });
          }
        }
      }

      let bodyOverride = {};
      try {
        bodyOverride = await parseJsonBody(req);
      } catch (e) {
        bodyOverride = {};
      }

      for (const item of opItems) {
        const product = products.find((p) => p.id === item.productId || p.sku === item.sku);
        if (!product) continue;

        if (!product.warehouses) {
          product.warehouses = {
            "WH-HYD-01": { total: product.stock_on_hand, locations: { "WH1/Main Store": product.stock_on_hand } },
            "WH-BLR-02": { total: 0, locations: { "WH2/Inbound Dock": 0 } }
          };
        }
        if (!product.warehouses["WH-HYD-01"]) product.warehouses["WH-HYD-01"] = { total: 0, locations: {} };
        if (!product.warehouses["WH-BLR-02"]) product.warehouses["WH-BLR-02"] = { total: 0, locations: {} };
        if (!product.locations) product.locations = {};

        const qty = Number(item.qtyDone > 0 ? item.qtyDone : item.qtyExpected) || 0;

        if (type === 'receipt') {
          const targetLoc = destLocation || 'WH1/Main Store';
          const targetWh = getWarehouseForLocation(targetLoc) || 'WH-HYD-01';

          product.warehouses[targetWh].locations[targetLoc] = (product.warehouses[targetWh].locations[targetLoc] || 0) + qty;
          product.warehouses[targetWh].total = (product.warehouses[targetWh].total || 0) + qty;
          product.locations[targetLoc] = product.warehouses[targetWh].locations[targetLoc];
          product.stock_on_hand = (product.warehouses["WH-HYD-01"]?.total || 0) + (product.warehouses["WH-BLR-02"]?.total || 0);
          product.updatedAt = now;
          item.qtyDone = qty;

          ledger.unshift({
            id: `LED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            operationId: op.id,
            type: 'receipt',
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            fromLocation: 'Vendor',
            toLocation: targetLoc,
            warehouse: targetWh,
            qty: qty,
            resultingBalance: product.stock_on_hand
          });

        } else if (type === 'delivery') {
          const srcLoc = sourceLocation || 'WH1/Main Store';
          const deliveryWh = getWarehouseForLocation(srcLoc) || 'WH-HYD-01';

          product.warehouses[deliveryWh].locations[srcLoc] = Math.max(0, (product.warehouses[deliveryWh].locations[srcLoc] || 0) - qty);
          product.warehouses[deliveryWh].total = Math.max(0, (product.warehouses[deliveryWh].total || 0) - qty);
          product.locations[srcLoc] = product.warehouses[deliveryWh].locations[srcLoc];
          product.stock_on_hand = (product.warehouses["WH-HYD-01"]?.total || 0) + (product.warehouses["WH-BLR-02"]?.total || 0);
          product.updatedAt = now;
          item.qtyDone = qty;

          ledger.unshift({
            id: `LED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            operationId: op.id,
            type: 'delivery',
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            fromLocation: srcLoc,
            toLocation: 'Customer',
            warehouse: deliveryWh,
            qty: -qty,
            resultingBalance: product.stock_on_hand
          });

        } else if (type === 'internal') {
          const srcLoc = sourceLocation || 'WH1/Main Store';
          const dstLoc = destLocation || 'WH1/Production Floor';

          product.warehouses[srcWh].locations[srcLoc] = Math.max(0, (product.warehouses[srcWh].locations[srcLoc] || 0) - qty);
          product.warehouses[srcWh].total = Math.max(0, (product.warehouses[srcWh].total || 0) - qty);

          product.warehouses[dstWh].locations[dstLoc] = (product.warehouses[dstWh].locations[dstLoc] || 0) + qty;
          product.warehouses[dstWh].total = (product.warehouses[dstWh].total || 0) + qty;

          product.locations[srcLoc] = product.warehouses[srcWh].locations[srcLoc];
          product.locations[dstLoc] = product.warehouses[dstWh].locations[dstLoc];
          product.stock_on_hand = (product.warehouses["WH-HYD-01"]?.total || 0) + (product.warehouses["WH-BLR-02"]?.total || 0);
          product.updatedAt = now;
          item.qtyDone = qty;

          ledger.unshift({
            id: `LED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            operationId: op.id,
            type: 'internal',
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            fromLocation: srcLoc,
            toLocation: dstLoc,
            sourceWarehouse: srcWh,
            destWarehouse: dstWh,
            isInterWarehouse,
            qty: qty,
            resultingBalance: product.stock_on_hand
          });

        } else if (type === 'adjustment') {
          const targetLoc = destLocation || 'WH1/Main Store';
          const adjWh = getWarehouseForLocation(targetLoc) || 'WH-HYD-01';
          const recordedQty = product.warehouses[adjWh]?.locations?.[targetLoc] ?? product.stock_on_hand;
          const countedQty = bodyOverride.countedQty !== undefined 
            ? Number(bodyOverride.countedQty) 
            : (item.qtyExpected !== undefined ? Number(item.qtyExpected) : recordedQty);
          
          const variance = countedQty - recordedQty;
          product.warehouses[adjWh].locations[targetLoc] = countedQty;
          product.warehouses[adjWh].total = Object.values(product.warehouses[adjWh].locations).reduce((s, v) => s + (Number(v) || 0), 0);
          product.locations[targetLoc] = countedQty;
          product.stock_on_hand = (product.warehouses["WH-HYD-01"]?.total || 0) + (product.warehouses["WH-BLR-02"]?.total || 0);
          product.updatedAt = now;

          op.variance = variance;
          item.qtyDone = countedQty;

          ledger.unshift({
            id: `LED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            operationId: op.id,
            type: 'adjustment',
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            fromLocation: 'System Audit',
            toLocation: targetLoc,
            warehouse: adjWh,
            qty: variance,
            delta: variance,
            resultingBalance: product.stock_on_hand
          });
        }
      }

      op.status = 'done';
      op.validatedAt = now;

      return sendJson(res, 200, {
        success: true,
        message: `Operation ${op.reference || op.id} validated successfully.`,
        operation: enrichOperation(op),
        products: products.map(p => formatProduct(p)),
        ledger: ledger.slice(0, 50)
      });
    } catch (err) {
      console.error('Validate operation error:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // -------------------------------------------------------------------------
  // STATIC FILES SERVING
  // -------------------------------------------------------------------------
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/login') reqPath = '/login.html';
  if (reqPath === '/dashboard') reqPath = '/dashboard.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`StockSense Industrial Workstation live on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

const initialPort = parseInt(process.env.PORT || '3000', 10);
startServer(initialPort);
