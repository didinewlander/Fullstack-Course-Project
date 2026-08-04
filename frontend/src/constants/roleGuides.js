import { USER_ROLES } from "./roles";
import { CANCELLATION_PENALTY_RATE } from "./orderStatus";

/*
 * Content for the per-role "Tutorial" pages.
 *
 * Kept as data rather than JSX so the three guides cannot drift apart in
 * layout, and so this file stays the single place to correct a rule if the
 * domain changes.
 *
 * Every claim here is checked against the server, not against intent:
 *   - who may call what -> the authorizeRoles(...) gates in backend/routes/*
 *   - the delivery chain -> DELIVERY_STATUS_TRANSITIONS in
 *     backend/utils/deliveryUtils.js, mirrored in constants/deliverySteps.js
 *   - the cancellation penalty -> CANCELLATION_PENALTY_RATE in
 *     backend/utils/orderUtils.js
 *   - the additional-cost threshold -> delivery.service.js, which falls back
 *     to twice the order total when a manager has not set one
 *
 * `waitsOn` is the whole point of these pages: it names the role that has to
 * act before a step can finish. null means the step is entirely yours.
 */

const PENALTY_PERCENT = `${Math.round(CANCELLATION_PENALTY_RATE * 100)}%`;

const VENDOR_GUIDE = {
  title: "How ordering works",

  intro:
    "You buy stock through Do-Hook-In. You browse the catalog, place orders, " +
    "and follow them until they arrive and are billed. You never move goods " +
    "or set prices yourself — a supplier fulfils each order and the logistics " +
    "manager oversees the warehouse side.",

  flow: [
    {
      title: "Browse the catalog",
      waitsOn: null,
      body:
        "Catalog lists every product that a supplier has listed AND the " +
        "logistics manager has approved and made visible. If a product you " +
        "expect is missing, it is waiting on one of them — there is nothing " +
        "for you to do.",
    },
    {
      title: "Place an order",
      waitsOn: null,
      body:
        "New Order — pick products, set quantities, and request a pickup " +
        "date. The price is calculated for you and cannot be edited: the " +
        "goods subtotal, plus shipping, storage and customs, with VAT " +
        "applied on top of all of it. Open the cost breakdown to see each " +
        "component.",
    },
    {
      title: "Wait for the order to be approved",
      waitsOn: USER_ROLES.SUPPLIER,
      body:
        "A new order is created as Pending. The supplier — or the logistics " +
        "manager — has to approve it. Nothing is reserved and nothing ships " +
        "until they do.",
    },
    {
      title: "Answer a pickup-date proposal",
      waitsOn: null,
      body:
        "If the supplier cannot make your requested date, they propose a " +
        "different one instead of approving. The order stays Pending and no " +
        "stock is reserved until you accept or reject the proposal in My " +
        "Orders. This one is back on you — an unanswered proposal stalls the " +
        "order indefinitely.",
    },
    {
      title: "Track the delivery",
      waitsOn: USER_ROLES.SUPPLIER,
      body:
        "Once approved, your stock is reserved and the supplier books a " +
        "delivery. Deliveries shows the live timeline. You are a spectator " +
        "here: only the supplier and the manager can advance a delivery.",
    },
    {
      title: "Receive the invoice",
      waitsOn: USER_ROLES.LOGISTICS_MANAGER,
      body:
        "The supplier issues the invoice and the manager approves it. Your " +
        "order reads Billed only after that approval — an invoice that has " +
        "been issued but not yet approved still shows as Delivered.",
    },
  ],

  handoffs: [
    {
      action: "Your order moves from Pending to Approved",
      who: "Supplier, or Logistics Manager",
    },
    {
      action: "A pickup date you did not ask for is proposed",
      who: "Supplier — then it is back on you to accept or reject",
    },
    {
      action: "Goods actually move (In Transit → Arriving Soon)",
      who: "Supplier",
    },
    {
      action: "Goods are received and checked in at the warehouse",
      who: "Logistics Manager",
    },
    { action: "An invoice is issued for your order", who: "Supplier" },
    { action: "The order finally reads Billed", who: "Logistics Manager" },
    {
      action: "A new product appears in your catalog",
      who: "Supplier lists it, Logistics Manager approves and makes it visible",
    },
  ],

  gotchas: [
    `Cancelling is free while the order is still Pending. Once it has been approved, cancelling costs ${PENALTY_PERCENT} of the order total, because stock was reserved for you.`,
    "Once the goods have physically shipped you cannot cancel at all — the Cancel button disappears rather than failing.",
    "Signing up yourself always creates a Vendor account. Supplier and manager accounts can only be created by a logistics manager.",
  ],
};

const SUPPLIER_GUIDE = {
  title: "How fulfilment works",

  intro:
    "You supply the goods. You list products, keep stock levels accurate, " +
    "approve the orders vendors place against you, and move each delivery " +
    "until it reaches the warehouse. The logistics manager approves what you " +
    "list, receives what you ship, and signs off your invoices.",

  flow: [
    {
      title: "List a product",
      waitsOn: USER_ROLES.LOGISTICS_MANAGER,
      body:
        "My Products — create the product with a price and an image. It is " +
        "created as Pending and no vendor can see or order it until the " +
        "manager approves it and switches its visibility on. Both are needed: " +
        "an approved but hidden product still will not appear in a catalog.",
    },
    {
      title: "Set up inventory",
      waitsOn: null,
      body:
        "Inventory — record how many units you actually hold and a minimum " +
        "stock level. The EOQ calculator derives that minimum from your " +
        "demand and cost figures. Stock below the minimum is flagged to the " +
        "manager, so keeping this honest is what stops surprise stockouts.",
    },
    {
      title: "Approve incoming orders",
      waitsOn: null,
      body:
        "Incoming Orders lists orders placed against your products. " +
        "Approving one reserves the stock immediately, so you cannot approve " +
        "more than you physically hold — the server refuses rather than " +
        "letting you oversell.",
    },
    {
      title: "Or propose a different pickup date",
      waitsOn: USER_ROLES.VENDOR,
      body:
        "If you cannot make the requested date, propose an alternative " +
        "instead of approving. The order stays Pending and nothing is " +
        "reserved until the vendor accepts. If they reject it, the order is " +
        "still yours to approve on the original date.",
    },
    {
      title: "Book and move the delivery",
      waitsOn: null,
      body:
        "From an approved order, create the delivery, then advance it one " +
        "step at a time: Pending → In Progress → In Transit → Arriving Soon " +
        "→ Arrived At Warehouse. Steps cannot be skipped.",
    },
    {
      title: "Hand over at the warehouse",
      waitsOn: USER_ROLES.LOGISTICS_MANAGER,
      body:
        "Arrived At Warehouse is the last status you can set. Warehouse " +
        "Processing and Warehouse Completed belong to the manager — they are " +
        "the receiving side confirming what actually turned up, so the " +
        "buttons are not shown to you.",
    },
    {
      title: "Claim additional costs",
      waitsOn: USER_ROLES.LOGISTICS_MANAGER,
      body:
        "Unexpected costs on a delivery are added with a reason. Anything up " +
        "to the approval threshold is accepted automatically; above it, the " +
        "manager has to approve or reject the claim. Unless a manager has " +
        "set a different threshold, it defaults to twice the original order " +
        "total.",
    },
    {
      title: "Invoice the order",
      waitsOn: USER_ROLES.LOGISTICS_MANAGER,
      body:
        "Generate the invoice for a delivered order, or upload your own PDF, " +
        "then submit it. Submitting moves it to Pending Approval and it is " +
        "out of your hands — the manager approves it, which is what marks " +
        "the order Billed.",
    },
  ],

  handoffs: [
    {
      action: "A product you listed becomes orderable",
      who: "Logistics Manager approves it and makes it visible",
    },
    {
      action: "A pickup date you proposed takes effect",
      who: "Vendor accepts or rejects it",
    },
    {
      action: "A delivery moves past Arrived At Warehouse",
      who: "Logistics Manager",
    },
    {
      action: "An additional cost above the threshold is accepted",
      who: "Logistics Manager",
    },
    { action: "A submitted invoice is approved and paid out", who: "Logistics Manager" },
    { action: "An order exists for you to approve at all", who: "Vendor places it" },
  ],

  gotchas: [
    "Approving an order reserves stock; it does not remove it. The units only leave your inventory when the manager marks the delivery Warehouse Completed.",
    "If an approved order is cancelled before it ships, the reservation is released and your stock returns automatically.",
    "A delivery cannot skip steps. If you shipped without marking In Progress, set the intermediate status first — the server rejects a jump.",
  ],
};

const MANAGER_GUIDE = {
  title: "How oversight works",

  intro:
    "You run the warehouse side. Nothing reaches a vendor's catalog without " +
    "your approval, nothing is received without you confirming it, and no " +
    "invoice is paid without you signing it off. You can also do anything a " +
    "supplier can, which makes you the fallback when a supplier is " +
    "unresponsive.",

  flow: [
    {
      title: "Approve proposed products",
      waitsOn: null,
      body:
        "Products — suppliers submit products as Pending. Approve or reject " +
        "each one, then set its visibility. Both are required before a " +
        "vendor sees it: approval alone is not enough. A supplier waiting to " +
        "sell is blocked entirely on this screen.",
    },
    {
      title: "Approve orders",
      waitsOn: null,
      body:
        "Orders — approve anything a supplier has not picked up. Select " +
        "several and approve them in one go; the result reports exactly " +
        "which ones succeeded and which did not, so a single failure does " +
        "not silently sink the batch.",
    },
    {
      title: "Watch inventory",
      waitsOn: null,
      body:
        "Inventory shows every supplier's stock, what is reserved against " +
        "open orders, and what has fallen below its minimum level. Overview " +
        "gives you the same figures as totals. Below-minimum items are the " +
        "restock signal.",
    },
    {
      title: "Receive deliveries",
      waitsOn: null,
      body:
        "Deliveries — suppliers bring a delivery as far as Arrived At " +
        "Warehouse. The last two steps are yours alone: Warehouse Processing, " +
        "then Warehouse Completed. Completing is the consequential one — it " +
        "converts reserved stock into stock that has actually left, so do it " +
        "only once the goods are physically checked in.",
    },
    {
      title: "Rule on additional costs",
      waitsOn: null,
      body:
        "Suppliers claim unexpected delivery costs. Claims up to the " +
        "approval threshold are accepted automatically and simply appear on " +
        "the delivery; anything above it waits for you to approve or reject. " +
        "The threshold defaults to twice the original order total.",
    },
    {
      title: "Approve invoices",
      waitsOn: null,
      body:
        "Invoices — a submitted invoice sits at Pending Approval until you " +
        "approve it. Your approval is what marks the order Billed and closes " +
        "the lifecycle. Open the PDF from the same screen before signing off.",
    },
    {
      title: "Create supplier and manager accounts",
      waitsOn: null,
      body:
        "Users — public sign-up always creates a Vendor, deliberately, so " +
        "nobody can make themselves a manager. Every supplier and every " +
        "other manager has to be created here by you.",
    },
  ],

  handoffs: [
    {
      action: "There are products waiting for your approval",
      who: "Supplier submits them",
    },
    { action: "There are orders to approve", who: "Vendor places them" },
    {
      action: "A delivery reaches you at Arrived At Warehouse",
      who: "Supplier moves it through transport",
    },
    {
      action: "An additional-cost claim needs your ruling",
      who: "Supplier raises it above the threshold",
    },
    {
      action: "An invoice reaches Pending Approval",
      who: "Supplier generates and submits it",
    },
    {
      action: "A pickup-date dispute resolves",
      who: "Supplier proposes, Vendor accepts or rejects — you are not in this loop",
    },
  ],

  gotchas: [
    "Marking a delivery Warehouse Completed is not reversible from the UI. It commits reserved stock, so confirm the goods are actually checked in first.",
    "You hold every supplier permission as well as your own. If a supplier is unresponsive you can approve their orders and move their deliveries yourself.",
    "The additional-cost threshold and the notification rules are not editable in the UI yet — the threshold falls back to twice the order total, and rules are seeded with `npm run seed:notifications`.",
  ],
};

export const GUIDE_BY_ROLE = Object.freeze({
  [USER_ROLES.VENDOR]: VENDOR_GUIDE,
  [USER_ROLES.SUPPLIER]: SUPPLIER_GUIDE,
  [USER_ROLES.LOGISTICS_MANAGER]: MANAGER_GUIDE,
});
