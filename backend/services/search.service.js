const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../utils/usersUtils");
const { escapeRegex } = require("../utils/regexUtils");

const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Delivery = require("../models/deliveryModel");
const Invoice = require("../models/invoiceModel");
const User = require("../models/userModel");

/*
 * Cross-resource search.
 *
 * One query, several collections, so a user can find a thing without knowing
 * which page it lives on. Every branch is scoped to what the caller is
 * allowed to see - the same ownership rules the individual list endpoints
 * enforce - so search can never become a way around them.
 */

const MIN_QUERY_LENGTH = 2;
const PER_TYPE_LIMIT = 5;

const asId = (value) =>
  value && typeof value === "object" ? value._id ?? value : value;

/* Matches a short id suffix, so "a1b2c3" finds the order shown as #a1b2c3. */
const buildIdSuffixFilter = (term) => {
  if (!/^[a-f0-9]{4,24}$/i.test(term)) {
    return null;
  }

  return { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${term}$`, options: "i" } } };
};

const searchProducts = async ({ term, actor }) => {
  const pattern = new RegExp(escapeRegex(term), "i");

  const filter = { $or: [{ name: pattern }, { sku: pattern }] };

  // suppliers see only their own; vendors only what is actually orderable
  if (actor.role === USER_ROLES.SUPPLIER) {
    filter.supplierId = actor.userId;
  } else if (actor.role === USER_ROLES.VENDOR) {
    filter.status = "Approved";
    filter.visibility = "Public";
  }

  const products = await Product.find(filter)
    .select("name sku unitPrice status visibility")
    .limit(PER_TYPE_LIMIT)
    .lean();

  return products.map((product) => ({
    type: "product",
    id: product._id.toString(),
    title: product.name,
    subtitle: product.sku,
    meta: `$${Number(product.unitPrice ?? 0).toFixed(2)}`,
    badge: product.status,
  }));
};

const searchOrders = async ({ term, actor }) => {
  const idFilter = buildIdSuffixFilter(term);

  const scope = {};

  if (actor.role === USER_ROLES.VENDOR) {
    scope.orderedByUserId = actor.userId;
  } else if (actor.role === USER_ROLES.SUPPLIER) {
    scope.supplierId = actor.userId;
  }

  const pattern = new RegExp(escapeRegex(term), "i");

  // an order has no name of its own, so match its id or the goods on it
  const matchers = [{ "items.productNameAtOrder": pattern }, { "items.skuAtOrder": pattern }];

  if (idFilter) {
    matchers.push(idFilter);
  }

  const orders = await Order.find({ ...scope, $or: matchers })
    .select("status calculatedTotal requestedPickupDate items createdAt")
    .sort({ createdAt: -1 })
    .limit(PER_TYPE_LIMIT)
    .lean();

  return orders.map((order) => ({
    type: "order",
    id: order._id.toString(),
    title: `Order ${order._id.toString().slice(-6)}`,
    subtitle: (order.items ?? [])
      .map((item) => item.productNameAtOrder)
      .filter(Boolean)
      .join(", "),
    meta: `$${Number(order.calculatedTotal ?? 0).toFixed(2)}`,
    badge: order.status,
  }));
};

const searchDeliveries = async ({ term, actor }) => {
  const pattern = new RegExp(escapeRegex(term), "i");

  const scope = {};

  if (actor.role === USER_ROLES.VENDOR) {
    scope.orderedByUserId = actor.userId;
  } else if (actor.role === USER_ROLES.SUPPLIER) {
    scope.supplierId = actor.userId;
  }

  const deliveries = await Delivery.find({
    ...scope,
    $or: [{ trackingNumber: pattern }, { locationUpdate: pattern }],
  })
    .select("trackingNumber status estimatedArrivalAt orderId")
    .sort({ createdAt: -1 })
    .limit(PER_TYPE_LIMIT)
    .lean();

  return deliveries.map((delivery) => ({
    type: "delivery",
    id: delivery._id.toString(),
    title: delivery.trackingNumber,
    subtitle: `Order ${String(asId(delivery.orderId) ?? "").slice(-6)}`,
    meta: delivery.estimatedArrivalAt
      ? `ETA ${new Date(delivery.estimatedArrivalAt).toLocaleDateString("en-GB")}`
      : "",
    badge: delivery.status,
  }));
};

const searchInvoices = async ({ term, actor }) => {
  const pattern = new RegExp(escapeRegex(term), "i");

  const scope = {};

  if (actor.role === USER_ROLES.VENDOR) {
    scope.orderedByUserId = actor.userId;
  } else if (actor.role === USER_ROLES.SUPPLIER) {
    scope.supplierId = actor.userId;
  }

  const invoices = await Invoice.find({ ...scope, invoiceNumber: pattern })
    .select("invoiceNumber amount status orderId")
    .sort({ createdAt: -1 })
    .limit(PER_TYPE_LIMIT)
    .lean();

  return invoices.map((invoice) => ({
    type: "invoice",
    id: invoice._id.toString(),
    title: invoice.invoiceNumber,
    subtitle: `Order ${String(asId(invoice.orderId) ?? "").slice(-6)}`,
    meta: `$${Number(invoice.amount ?? 0).toFixed(2)}`,
    badge: invoice.status,
  }));
};

/* Managers only - nobody else has any business enumerating accounts. */
const searchUsers = async ({ term, actor }) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    return [];
  }

  const pattern = new RegExp(escapeRegex(term), "i");

  const users = await User.find({
    $or: [{ username: pattern }, { email: pattern }],
  })
    .select("username email role")
    .limit(PER_TYPE_LIMIT)
    .lean();

  return users.map((user) => ({
    type: "user",
    id: user._id.toString(),
    title: user.username,
    subtitle: user.email,
    meta: "",
    badge: user.role,
  }));
};

const search = async ({ term, actor }) => {
  const normalized = typeof term === "string" ? term.trim() : "";

  if (normalized.length < MIN_QUERY_LENGTH) {
    throw new AppError(
      `Enter at least ${MIN_QUERY_LENGTH} characters to search`,
      400,
      "SEARCH_QUERY_TOO_SHORT",
    );
  }

  /*
   * Run every branch concurrently. A branch that fails returns nothing rather
   * than taking the whole search down with it - partial results beat an
   * error page.
   */
  const [products, orders, deliveries, invoices, users] = await Promise.all([
    searchProducts({ term: normalized, actor }).catch(() => []),
    searchOrders({ term: normalized, actor }).catch(() => []),
    searchDeliveries({ term: normalized, actor }).catch(() => []),
    searchInvoices({ term: normalized, actor }).catch(() => []),
    searchUsers({ term: normalized, actor }).catch(() => []),
  ]);

  const groups = [
    { type: "order", label: "Orders", results: orders },
    { type: "product", label: "Products", results: products },
    { type: "delivery", label: "Deliveries", results: deliveries },
    { type: "invoice", label: "Invoices", results: invoices },
    { type: "user", label: "Users", results: users },
  ].filter((group) => group.results.length > 0);

  return {
    query: normalized,
    total: groups.reduce((sum, group) => sum + group.results.length, 0),
    groups,
  };
};

module.exports = { search };
