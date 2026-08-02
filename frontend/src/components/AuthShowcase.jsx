import "./AuthShowcase.css";

/*
 * The dark marketing panel that sits next to the sign-in form on wide screens.
 *
 * Kept out of Login.jsx so that page stays about the form, and so Register can
 * drop the same panel in later without copying markup. Every icon is an inline
 * SVG on purpose - no icon library is a dependency of this project.
 */

// shared attributes for every glyph below, so they all match in weight
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

function FactoryIcon() {
  return (
    <svg {...glyph}>
      <path d="M3 20h18" />
      <path d="M4.5 20V9.5l4.7 3V9.5l4.7 3V9.5l4.7 3V20" />
      <path d="M8.5 20v-3.5h3V20" />
    </svg>
  );
}

function WarehouseIcon() {
  return (
    <svg {...glyph}>
      <path d="M3.5 20V9.4L12 5l8.5 4.4V20" />
      <path d="M2.5 20h19" />
      <path d="M8.5 20v-6h7v6" />
      <path d="M8.5 17h7" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg {...glyph}>
      <path d="M3.7 9.4 5.2 4.6h13.6l1.5 4.8" />
      <path d="M3.7 9.4a2.8 2.8 0 0 0 5.4 1 2.8 2.8 0 0 0 5.4 0 2.8 2.8 0 0 0 5.4-1" />
      <path d="M5.2 12.2V20h13.6v-7.8" />
      <path d="M2.8 20h18.4" />
      <path d="M10 20v-4.4h4V20" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg {...glyph} strokeWidth={1.8}>
      <path d="M12 3.2 3.8 7.6v8.8L12 20.8l8.2-4.4V7.6L12 3.2Z" />
      <path d="M3.8 7.6 12 12l8.2-4.4" />
      <path d="M12 12v8.8" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg {...glyph}>
      <path d="M3 17.4 9.4 11l4 4L21 7.4" />
      <path d="M15.4 7.4H21v5.6" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg {...glyph}>
      <path d="M6 3h12v18l-3-1.6-3 1.6-3-1.6L6 21V3Z" />
      <path d="M9.2 8.2h5.6M9.2 12h5.6M9.2 15.8h3" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg {...glyph}>
      <path d="M12 21s6.8-5.4 6.8-11a6.8 6.8 0 1 0-13.6 0C5.2 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

// the three stops drawn on the shipment rail, left to right
const STOPS = [
  { Icon: FactoryIcon, name: "Supplier", sub: "Dispatched" },
  { Icon: WarehouseIcon, name: "Warehouse", sub: "Customs cleared" },
  { Icon: StoreIcon, name: "Vendor", sub: "ETA in 2 days" },
];

const FEATURES = [
  {
    Icon: TrendIcon,
    title: "Restocking that does the maths",
    text: "Reorder points and economic order quantities derived from your own consumption, not from a guess.",
  },
  {
    Icon: ReceiptIcon,
    title: "Landed cost, the moment you order",
    text: "Base price, shipping, storage, customs and VAT resolved while the order is still a draft.",
  },
  {
    Icon: RouteIcon,
    title: "A delivery you can actually watch",
    text: "Pending, Approved, In Transit, Arriving Soon, Delivered, Billed - with a notification at every hop.",
  },
];

const ROLES = ["Logistics Manager", "Vendor", "Supplier"];

function AuthShowcase() {
  return (
    <aside className="auth-showcase">
      {/* purely decorative layers - the drifting glow and the panning dot grid */}
      <span className="auth-showcase-grid" aria-hidden="true" />

      <div className="auth-showcase-content">
        <div className="auth-showcase-brand auth-rise">
          <span className="auth-showcase-mark" aria-hidden="true">
            DH
          </span>
          <span>
            <span className="auth-showcase-name">Do-Hook-In</span>
            <span className="auth-showcase-tag">Logistics workspace</span>
          </span>
        </div>

        <div className="auth-showcase-copy auth-rise">
          <p className="auth-showcase-eyebrow">
            <span className="auth-live-dot" aria-hidden="true" />
            Live across your supply chain
          </p>

          <h2 className="auth-showcase-title">
            Every order, from{" "}
            <span className="auth-showcase-accent">supplier to shelf</span>.
          </h2>

          <p className="auth-showcase-lead">
            One board for logistics managers, vendors and suppliers - inventory,
            orders, deliveries and invoices, priced and tracked end to end.
          </p>
        </div>

        {/* a miniature of the delivery tracker the app ships with */}
        <div className="track-card auth-rise" aria-hidden="true">
          <div className="track-card-head">
            <span className="track-id">ORD-2041</span>
            <span className="track-state">
              <span className="auth-live-dot" />
              In Transit
            </span>
          </div>

          <div className="track-rail">
            <span className="track-line">
              <span className="track-line-fill" />
            </span>

            <span className="track-parcel-track">
              <span className="track-parcel">
                <BoxIcon />
              </span>
            </span>

            {STOPS.map(({ Icon, name, sub }) => (
              <span className="track-stop" key={name}>
                <span className="track-node">
                  <Icon />
                </span>
                <span className="track-stop-name">{name}</span>
                <span className="track-stop-sub">{sub}</span>
              </span>
            ))}
          </div>

          <div className="track-meta">
            <span>
              <small>Units</small>
              <strong>1,240</strong>
            </span>
            <span>
              <small>Landed cost</small>
              <strong>38,912</strong>
            </span>
            <span>
              <small>On time</small>
              <strong>98.2%</strong>
            </span>
          </div>
        </div>

        <ul className="auth-showcase-features">
          {FEATURES.map(({ Icon, title, text }) => (
            <li className="auth-feature auth-rise" key={title}>
              <span className="auth-feature-icon" aria-hidden="true">
                <Icon />
              </span>
              <span>
                <span className="auth-feature-title">{title}</span>
                <span className="auth-feature-text">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="auth-showcase-roles auth-rise">
          {ROLES.map((role) => (
            <span className="auth-role-chip" key={role}>
              {role}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default AuthShowcase;
