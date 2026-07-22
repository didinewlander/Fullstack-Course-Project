// this file just decides which dashboard page belongs to which role
// we keep it in one place so we don't repeat this logic in Login and Register

export function getDashboardPathByRole(role) {
  if (role === "manager") return "/dashboard/manager";
  if (role === "vendor") return "/dashboard/vendor";
  if (role === "supplier") return "/dashboard/supplier";

  // fallback, just in case role is missing or unknown
  return "/login";
}
