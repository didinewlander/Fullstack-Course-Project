import client, { unwrap, unwrapList } from "./client";

// /api/v1/users - manager only, every route.
//
// This is how Supplier and Logistics Manager accounts come into existence:
// public registration always creates a Vendor and ignores any role in the
// body, so a manager has to create the others here.

export async function listUsers(params = {}) {
  return unwrapList(await client.get("/users", { params }));
}

export async function getUser(userId) {
  return unwrap(await client.get(`/users/${userId}`));
}

/** { username, email, password, role } - role IS honoured on this route. */
export async function createUser(userInput) {
  return unwrap(await client.post("/users", userInput));
}

export async function updateUser(userId, changes) {
  return unwrap(await client.patch(`/users/${userId}`, changes));
}

export async function deleteUser(userId) {
  return unwrap(await client.delete(`/users/${userId}`));
}
