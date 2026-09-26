import { Router } from "express";
import { products, ledger, formatProduct, warehouses, getWarehouseForLocation } from "./products.js";

const router = Router();

// In-memory Operations repository with multi-warehouse operations
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

export function enrichOperation(op) {
  const enrichedItems = (op.items || []).map((item) => {
    const product = products.find((p) => p.id === item.productId || p.sku === item.productId || p.sku === item.sku);
    return {
      productId: product ? product.id : item.productId,
      sku: product ? product.sku : (item.sku || "N/A"),
      name: product ? product.name : (item.name || "Item"),
      qtyExpected: Number(item.qtyExpected !== undefined ? item.qtyExpected : (item.qty || 0)),
      qtyDone: Number(item.qtyDone !== undefined ? item.qtyDone : 0),
      uom: product ? product.uom : "units"
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
    partner: op.partner || "Internal Logistics",
    sourceLocation: op.sourceLocation,
    destLocation: op.destLocation,
    sourceWarehouse: srcWh,
    destWarehouse: dstWh,
    isInterWarehouse,
    items: enrichedItems,
    variance: op.variance !== undefined ? op.variance : null,
    notes: op.notes || "",
    createdAt: op.createdAt,
    validatedAt: op.validatedAt
  };
}

// GET /api/operations: Filter by type, status, warehouse, search
router.get("/", (req, res) => {
  const { type, status, warehouse, q } = req.query;
  let results = operations;

  if (type && type !== "all") {
    results = results.filter((o) => o.type.toLowerCase() === type.toLowerCase());
  }

  if (status && status !== "all") {
    results = results.filter((o) => o.status.toLowerCase() === status.toLowerCase());
  }

  if (warehouse && warehouse !== "ALL") {
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

  return res.json({
    success: true,
    count: results.length,
    operations: results.map(enrichOperation)
  });
});

// GET /api/operations/:id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const op = operations.find((o) => o.id === id || o.reference === id);
  if (!op) {
    return res.status(404).json({ success: false, error: `Operation with ID or reference "${id}" not found.` });
  }
  return res.json({ success: true, operation: enrichOperation(op) });
});

// POST /api/operations/:id/validate: Execute stock updates atomically
router.post("/:id/validate", (req, res) => {
  try {
    const { id } = req.params;
    const op = operations.find((o) => o.id === id || o.reference === id);

    if (!op) {
      return res.status(404).json({
        success: false,
        error: `Operation with ID or Reference "${id}" not found.`
      });
    }

    if (op.status === "done") {
      return res.status(400).json({
        success: false,
        error: `Operation "${op.reference || op.id}" is already validated and completed.`
      });
    }

    const { type, sourceLocation, destLocation } = op;
    const opItems = op.items || [];
    const now = new Date().toISOString();

    const srcWh = getWarehouseForLocation(sourceLocation) || "WH-HYD-01";
    const dstWh = getWarehouseForLocation(destLocation) || (srcWh === "WH-HYD-01" ? "WH-BLR-02" : "WH-HYD-01");
    const isInterWarehouse = (type === "internal" && srcWh !== dstWh);

    // Delivery sufficiency check
    if (type === "delivery") {
      for (const item of opItems) {
        const product = products.find((p) => p.id === item.productId || p.sku === item.sku);
        if (!product) {
          return res.status(404).json({ success: false, error: `Product "${item.productId}" not found.` });
        }
        const needed = Number(item.qtyDone > 0 ? item.qtyDone : item.qtyExpected) || 0;
        const whStock = product.warehouses?.[srcWh]?.total ?? product.stock_on_hand;
        if (whStock < needed) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock available in ${srcWh} for "${product.name}" (${product.sku}). Available: ${whStock} ${product.uom}, Required: ${needed} ${product.uom}.`
          });
        }
      }
    }

    // Internal transfer sufficiency check
    if (type === "internal") {
      for (const item of opItems) {
        const product = products.find((p) => p.id === item.productId || p.sku === item.sku);
        if (!product) continue;
        const needed = Number(item.qtyDone > 0 ? item.qtyDone : item.qtyExpected) || 0;
        const srcLoc = sourceLocation || "WH1/Main Store";
        const availableInLoc = product.warehouses?.[srcWh]?.locations?.[srcLoc] ?? product.locations?.[srcLoc] ?? product.warehouses?.[srcWh]?.total ?? product.stock_on_hand;
        if (availableInLoc < needed) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock in source location "${srcLoc}" (${srcWh}) for "${product.name}". Available: ${availableInLoc} ${product.uom}, Required: ${needed} ${product.uom}.`
          });
        }
      }
    }

    const bodyOverride = req.body || {};

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

      if (type === "receipt") {
        const targetLoc = destLocation || "WH1/Main Store";
        const targetWh = getWarehouseForLocation(targetLoc) || "WH-HYD-01";
        
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
          type: "receipt",
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          fromLocation: "Vendor",
          toLocation: targetLoc,
          warehouse: targetWh,
          qty: qty,
          resultingBalance: product.stock_on_hand
        });

      } else if (type === "delivery") {
        const srcLoc = sourceLocation || "WH1/Main Store";
        const deliveryWh = getWarehouseForLocation(srcLoc) || "WH-HYD-01";

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
          type: "delivery",
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          fromLocation: srcLoc,
          toLocation: "Customer",
          warehouse: deliveryWh,
          qty: -qty,
          resultingBalance: product.stock_on_hand
        });

      } else if (type === "internal") {
        const srcLoc = sourceLocation || "WH1/Main Store";
        const dstLoc = destLocation || "WH1/Production Floor";

        // Deduct from source warehouse
        product.warehouses[srcWh].locations[srcLoc] = Math.max(0, (product.warehouses[srcWh].locations[srcLoc] || 0) - qty);
        product.warehouses[srcWh].total = Math.max(0, (product.warehouses[srcWh].total || 0) - qty);

        // Add to destination warehouse
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
          type: "internal",
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

      } else if (type === "adjustment") {
        const targetLoc = destLocation || "WH1/Main Store";
        const adjWh = getWarehouseForLocation(targetLoc) || "WH-HYD-01";
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
          type: "adjustment",
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          fromLocation: "System Audit",
          toLocation: targetLoc,
          warehouse: adjWh,
          qty: variance,
          delta: variance,
          resultingBalance: product.stock_on_hand
        });
      }
    }

    op.status = "done";
    op.validatedAt = now;

    return res.json({
      success: true,
      message: `Operation ${op.reference || op.id} validated successfully.`,
      operation: enrichOperation(op),
      products: products.map(p => formatProduct(p)),
      ledger: ledger.slice(0, 50)
    });
  } catch (err) {
    console.error("Validate operation error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
