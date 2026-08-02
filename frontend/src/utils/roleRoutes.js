// this file just decides which dashboard page belongs to which role
// we keep it in one place so we don't repeat this logic in Login and Register

import { USER_ROLES } from "../constants/roles";

// keyed by the role strings the SERVER sends. These used to be lowercase
// invented names ("manager"/"vendor"/"supplier"), so every real login fell
// through to the fallback and bounced the user back to /login.
const DASHBOARD_PATH_BY_ROLE = {
  [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager",
  [USER_ROLES.VENDOR]: "/dashboard/vendor",
  [USER_ROLES.SUPPLIER]: "/dashboard/supplier",
};

export function getDashboardPathByRole(role) {
  // fallback, just in case role is missing or unknown
  return DASHBOARD_PATH_BY_ROLE[role] ?? "/login";
}

/*
 * Whether this role actually has a dashboard to be sent to.
 *
 * Needed because the fallback above is "/login", and /login redirects any
 * logged-in user to getDashboardPathByRole(role) - so a user whose role does
 * not map would be redirected from /login to /login forever. Callers that
 * redirect AWAY from the login page check this first and render the form
 * instead of bouncing.
 */
export function hasDashboard(role) {
  return Boolean(DASHBOARD_PATH_BY_ROLE[role]);
}
