/*
 * Creates the first Logistics Manager account.
 *
 * This script exists because there is no other way to get one:
 * public registration always creates a Vendor (see auth.service.js),
 * and POST /api/v1/users is itself restricted to Logistics Managers.
 * Without this, the manager-only half of the API is unreachable.
 *
 * Usage:
 *   SEED_MANAGER_PASSWORD=... npm run seed:manager
 *
 * The script is idempotent - running it twice is safe.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/userModel");
const {
  USER_ROLES,
  validateEmail,
  validateUsername,
  validatePassword,
} = require("../utils/usersUtils");

const readManagerInput = () => {
  const username = process.env.SEED_MANAGER_USERNAME ?? "manager";
  const email = process.env.SEED_MANAGER_EMAIL ?? "manager@dohookin.local";
  const password = process.env.SEED_MANAGER_PASSWORD ?? "12345678";

  if (!password) {
    throw new Error(
      "SEED_MANAGER_PASSWORD is not set. Add it to backend/.env " +
        "(at least 8 characters) and run this script again.",
    );
  }

  /*
   * Reuse the same validators the API uses, so a seeded account can
   * never end up in a state the login endpoint would reject.
   */
  return {
    username: validateUsername(username),
    email: validateEmail(email),
    password: validatePassword(password),
  };
};

const hashPassword = async (/** @type {string} */ password) => {
  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10) {
    throw new Error("BCRYPT_ROUNDS must be an integer of at least 10");
  }

  return bcrypt.hash(password, bcryptRounds);
};

const seed = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  const manager = readManagerInput();

  await mongoose.connect(mongoUri);

  const existingUser = await User.findOne({
    $or: [{ email: manager.email }, { username: manager.username }],
  }).lean();

  if (existingUser) {
    if (existingUser.role === USER_ROLES.LOGISTICS_MANAGER) {
      console.log(
        `User "${existingUser.email}" is already a Logistics Manager. Nothing to do.`,
      );

      await mongoose.disconnect();

      return;
    }

    /*
     * A common case: someone already signed up through the register
     * form (which forces the Vendor role) with this email. Promote
     * that account instead of failing on the unique index.
     */
    await User.findByIdAndUpdate(existingUser._id, {
      $set: {
        role: USER_ROLES.LOGISTICS_MANAGER,
      },
    });

    console.log(
      `Promoted existing user "${existingUser.email}" from ` +
        `"${existingUser.role}" to "${USER_ROLES.LOGISTICS_MANAGER}". ` +
        "Their existing password was kept.",
    );

    await mongoose.disconnect();

    return;
  }

  const passwordHash = await hashPassword(manager.password);

  const createdUser = await User.create({
    username: manager.username,
    email: manager.email,
    password: passwordHash,
    role: USER_ROLES.LOGISTICS_MANAGER,
  });

  console.log(
    `Logistics Manager created: ${createdUser.email} (username: ${createdUser.username})`,
  );

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Failed to seed the Logistics Manager:", error.message);

  await mongoose.disconnect().catch(() => {});

  process.exit(1);
});
