import client, { unwrap, unwrapList } from "./client";

// /api/v1/inventory
//
// Stock is a separate collection from products: one Inventory document per
// productId, holding currentStock / reservedStock / minimumStockLevel.

/** Supplier: own inventory rows. */
export async function listMyInventory(params = {}) {
  return unwrapList(await client.get("/inventory/mine", { params }));
}

/** Manager: every inventory row. */
export async function listAllInventory(params = {}) {
  return unwrapList(await client.get("/inventory/admin", { params }));
}

export async function getInventoryByProduct(productId) {
  return unwrap(await client.get(`/inventory/${productId}`));
}

export async function getInventoryById(inventoryId) {
  return unwrap(await client.get(`/inventory/by-id/${inventoryId}`));
}

/** Manager: how many inventory rows exist. */
export async function getInventoryCount() {
  return unwrap(await client.get("/inventory/count"));
}

/** Start tracking stock for a product that has none yet. */
export async function createInventoryForProduct(productId, inventoryInput) {
  return unwrap(
    await client.post(`/inventory/products/${productId}`, inventoryInput),
  );
}

/** Add units. { quantity } */
export async function restockInventory(inventoryId, quantity) {
  return unwrap(
    await client.patch(`/inventory/${inventoryId}/restock`, { quantity }),
  );
}

export async function updateMinimumStockLevel(inventoryId, minimumStockLevel) {
  return unwrap(
    await client.patch(`/inventory/${inventoryId}/minimum-stock`, {
      minimumStockLevel,
    }),
  );
}

/** Manager only: correct the physical count after a stocktake. */
export async function adjustCurrentStock(inventoryId, currentStock) {
  return unwrap(
    await client.patch(`/inventory/${inventoryId}/adjust`, { currentStock }),
  );
}

/**
 * Manager only: set the reorder point from an EOQ calculation rather than by
 * hand. This is the restock model the course brief is built around.
 */
export async function calculateEoqMinimumStock(inventoryId, eoqInput) {
  return unwrap(
    await client.patch(
      `/inventory/${inventoryId}/minimum-stock/eoq`,
      eoqInput,
    ),
  );
}

/** Available = physically held minus what approved orders have reserved. */
export function getAvailableStock(inventory) {
  if (!inventory) {
    return 0;
  }

  return (inventory.currentStock ?? 0) - (inventory.reservedStock ?? 0);
}

export function isBelowMinimum(inventory) {
  if (!inventory) {
    return false;
  }

  return getAvailableStock(inventory) < (inventory.minimumStockLevel ?? 0);
}
