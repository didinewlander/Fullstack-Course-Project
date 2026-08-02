const INVOICE_STATUSES = Object.freeze({
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
});

const INVOICE_STATUS_VALUES = Object.freeze(
  Object.values(INVOICE_STATUSES),
);

module.exports = {
  INVOICE_STATUSES,
  INVOICE_STATUS_VALUES,
};