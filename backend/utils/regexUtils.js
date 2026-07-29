const escapeRegex = (/** @type {string} */ value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildSearchFilter = (/** @type {string | undefined} */ search) => {
  if (!search) {
    return {};
  }

  const escapedSearch = escapeRegex(search);

  return {
    $or: [
      {
        name: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        sku: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        description: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ],
  };
};

module.exports = { escapeRegex, buildSearchFilter };
