import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole, hasDashboard } from "../utils/roleRoutes";
import "./NotFound.css";

// same inline-SVG approach as the auth pages - the project has no icon library
const glyph = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
};

function ArrowIcon() {
  return (
    <svg {...glyph} strokeWidth={1.9}>
      <path d="M4.5 12h14" />
      <path d="m12.8 6.2 5.8 5.8-5.8 5.8" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg {...glyph} strokeWidth={1.9}>
      <path d="M19.5 12h-14" />
      <path d="m11.2 6.2-5.8 5.8 5.8 5.8" />
    </svg>
  );
}

/**
 * Shown for any URL that matches no route.
 *
 * This used to be a silent <Navigate to="/login" />, which was actively
 * confusing: a signed in user who mistyped an address was dropped on the
 * login page and assumed their session had died.
 */
function NotFound() {
  const { user, isBootstrapped } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  /*
   * "Home" is not the same place for everyone: a signed in user belongs on
   * the dashboard for their role, everyone else on the login page.
   *
   * hasDashboard guards the lookup for the same reason Login does - an
   * unrecognised role resolves to "/login" anyway, so there is no separate
   * broken case to handle here.
   *
   * While the session is still being restored this points at /login rather
   * than waiting for the refresh call. Login already redirects a logged in
   * user on to their dashboard, so clicking early still ends up in the right
   * place, and the label stays put instead of flickering when bootstrap
   * finally settles.
   */
  const homePath =
    isBootstrapped && user && hasDashboard(user.role)
      ? getDashboardPathByRole(user.role)
      : "/login";

  /*
   * Only offer "Go back" when there is somewhere in the app to go back to.
   * A POP means this render came from a fresh page load or a browser
   * back/forward, i.e. most likely a pasted or reloaded URL - and then
   * navigate(-1) would either do nothing or walk the user out of the site
   * entirely. A PUSH means a link inside the app brought them here.
   */
  const cameFromInsideTheApp = navigationType !== "POP";

  return (
    <main className="notfound">
      <div className="notfound-card">
        <div className="notfound-brand">
          <span className="notfound-mark" aria-hidden="true">
            DH
          </span>
          <span>Do-Hook-In</span>
        </div>

        <p className="notfound-code">404</p>

        <h1>This page doesn&apos;t exist</h1>

        <p className="notfound-text">
          The address you opened does not match any page in the app. It was
          probably mistyped, or the link that brought you here is out of date.
        </p>

        <p className="notfound-path">
          <span className="notfound-path-label">Requested</span>
          {pathname}
        </p>

        <div className="notfound-actions">
          <Link to={homePath} className="btn notfound-home" replace>
            Take me home
            <ArrowIcon />
          </Link>

          {cameFromInsideTheApp && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              <BackIcon />
              Go back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default NotFound;
