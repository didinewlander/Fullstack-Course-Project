const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../utils/usersUtils");
const reportsDal = require("../dal/reportsDal");
const calculatorDataDal = require("../dal/calculatorDataDal");

const formatCalculator = (data) => {
  const totalCost = data.storageCost + data.distributionCost;
  return {
    ...data,
    totalCost,
    costPerExpectedUnit:
      data.expectedDemand > 0 ? totalCost / data.expectedDemand : null,
  };
};

const getAnalytics = async ({ actor }) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) return reportsDal.getManagerAnalytics();
  if (actor.role === USER_ROLES.SUPPLIER) return reportsDal.getSupplierAnalytics(actor.userId);
  if (actor.role === USER_ROLES.VENDOR) return reportsDal.getVendorAnalytics(actor.userId);
  throw new AppError("Unsupported user role", 403, "FORBIDDEN");
};

const getCalculator = async ({ actor }) => {
  if (actor.role !== USER_ROLES.VENDOR) throw new AppError("Only vendors can access the calculator", 403, "FORBIDDEN");
  const data = (await calculatorDataDal.findByVendorId(actor.userId)) ?? {
    vendorId: actor.userId,
    storageCost: 0,
    distributionCost: 0,
    expectedDemand: 0,
  };
  return formatCalculator(data);
};

const updateCalculator = async ({ actor, calculatorInput }) => {
  if (actor.role !== USER_ROLES.VENDOR) throw new AppError("Only vendors can update the calculator", 403, "FORBIDDEN");
  const updateData = {};
  for (const field of ["storageCost", "distributionCost", "expectedDemand"]) {
    if (calculatorInput[field] === undefined) continue;
    const value = Number(calculatorInput[field]);
    if (!Number.isFinite(value) || value < 0) throw new AppError(`${field} must be a non-negative number`, 400, "INVALID_CALCULATOR_VALUE");
    updateData[field] = value;
  }
  if (!Object.keys(updateData).length) throw new AppError("No calculator values were provided", 400, "NO_UPDATE_FIELDS");
  return formatCalculator(
    await calculatorDataDal.upsertByVendorId({ vendorId: actor.userId, updateData }),
  );
};

module.exports = { getAnalytics, getCalculator, updateCalculator };