const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const PRODUCT_VISIBILITIES = ["Public", "Hidden"];

const validateObjectId = (
  /** @type {any} */ value,
  /** @type {string} */ fieldName,
) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400, "INVALID_OBJECT_ID");
  }
};

const validateName = (/** @type {string} */ name) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(
      "Product name is required",
      400,
      "PRODUCT_NAME_REQUIRED",
    );
  }

  const normalizedName = name.trim();

  if (normalizedName.length > 150) {
    throw new AppError(
      "Product name cannot exceed 150 characters",
      400,
      "INVALID_PRODUCT_NAME",
    );
  }

  return normalizedName;
};

const validateDescription = (/** @type {string | undefined} */ description) => {
  if (description === undefined) {
    return "";
  }

  if (typeof description !== "string") {
    throw new AppError(
      "Product description must be a string",
      400,
      "INVALID_PRODUCT_DESCRIPTION",
    );
  }

  const normalizedDescription = description.trim();

  if (normalizedDescription.length > 2000) {
    throw new AppError(
      "Product description cannot exceed 2000 characters",
      400,
      "INVALID_PRODUCT_DESCRIPTION",
    );
  }

  return normalizedDescription;
};

const validateSku = (/** @type {string} */ sku) => {
  if (typeof sku !== "string" || !sku.trim()) {
    throw new AppError("Product SKU is required", 400, "PRODUCT_SKU_REQUIRED");
  }

  return sku.trim().toUpperCase();
};

const validateUnitPrice = (/** @type {number} */ unitPrice) => {
  const numericPrice = Number(unitPrice);

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new AppError(
      "Unit price must be a non-negative number",
      400,
      "INVALID_UNIT_PRICE",
    );
  }

  return numericPrice;
};

const validateVisibility = (/** @type {string} */ visibility) => {
  if (!PRODUCT_VISIBILITIES.includes(visibility)) {
    throw new AppError(
      "Product visibility must be Public or Hidden",
      400,
      "INVALID_PRODUCT_VISIBILITY",
    );
  }

  return visibility;
};

const validateImageUrl = (
  /** @type {string | undefined | null} */ imageUrl,
) => {
  if (imageUrl === undefined || imageUrl === null || imageUrl === "") {
    return null;
  }

  if (typeof imageUrl !== "string") {
    throw new AppError("Image URL must be a string", 400, "INVALID_IMAGE_URL");
  }

  try {
    const parsedUrl = new URL(imageUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error();
    }

    return parsedUrl.toString();
  } catch {
    throw new AppError(
      "Image URL must be a valid HTTP or HTTPS URL",
      400,
      "INVALID_IMAGE_URL",
    );
  }
};


module.exports = {
  validateObjectId,
  validateName,
  validateDescription,
  validateSku,
  validateUnitPrice,
  validateVisibility,
  validateImageUrl,
};
