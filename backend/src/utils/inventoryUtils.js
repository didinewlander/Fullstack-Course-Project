const calculateEOQ = ({ annualDemand, orderCost, holdingCost }) => {
  if (!annualDemand || !orderCost || !holdingCost || holdingCost <= 0) {
    throw new Error('annualDemand, orderCost and holdingCost must be positive numbers');
  }

  return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
};

module.exports = {
  calculateEOQ,
};
