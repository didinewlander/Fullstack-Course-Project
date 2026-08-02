// Role strings exactly as the backend stores and returns them.
//
// These MUST stay byte-identical to USER_ROLES in
// backend/utils/usersUtils.js - the API compares them with ===, and the
// user.role field on every /auth/me and /auth/login response uses these
// exact values. The frontend used to invent its own lowercase names
// ("manager", "vendor", "supplier"), which meant no real user ever
// matched a route.
export const USER_ROLES = Object.freeze({
  LOGISTICS_MANAGER: "Logistics Manager",
  SUPPLIER: "Supplier",
  VENDOR: "Vendor",
});

export const USER_ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

// Public registration always creates a Vendor (see the comment in
// backend/services/auth.service.js - it deliberately ignores req.body.role
// so nobody can sign themselves up as a manager). Managers and suppliers
// are created by a manager via POST /api/v1/users, or by the
// `npm run seed:manager` script for the very first one.
export const SELF_REGISTERABLE_ROLE = USER_ROLES.VENDOR;

export function isValidRole(role) {
  return USER_ROLE_VALUES.includes(role);
}
