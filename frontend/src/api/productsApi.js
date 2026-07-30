import client, { unwrap, unwrapList } from "./client";

// /api/v1/products

/** Public catalog - Approved + Public products only. No auth required. */
export async function listPublicProducts(params = {}) {
  return unwrapList(await client.get("/products", { params }));
}

export async function getProduct(productId) {
  return unwrap(await client.get(`/products/${productId}`));
}

/** Supplier's own products, any status/visibility. */
export async function listMyProducts(params = {}) {
  return unwrapList(await client.get("/products/mine", { params }));
}

/** Manager: every product in the system. */
export async function listAllProducts(params = {}) {
  return unwrapList(await client.get("/products/admin", { params }));
}

/** Manager: products awaiting approval. */
export async function listPendingProducts(params = {}) {
  return unwrapList(await client.get("/products/pending", { params }));
}

/**
 * Create a product. Sent as multipart because the route runs the image
 * upload middleware; `image` is optional.
 *
 * POST /products/create is the multipart route (POST /products is the JSON
 * one), so this uses /create.
 */
export async function createProduct({ image, ...fields }) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, value);
    }
  }

  if (image) {
    form.append("image", image);
  }

  return unwrap(await client.post("/products/create", form));
}

export async function updateProduct(productId, changes) {
  return unwrap(await client.patch(`/products/${productId}`, changes));
}

export async function approveProduct(productId) {
  return unwrap(await client.patch(`/products/${productId}/approve`));
}

export async function rejectProduct(productId) {
  return unwrap(await client.patch(`/products/${productId}/reject`));
}

/** visibility: "Public" | "Hidden" */
export async function setProductVisibility(productId, visibility) {
  return unwrap(
    await client.patch(`/products/${productId}/visibility`, { visibility }),
  );
}
