import client, { unwrap } from "./client";

/**
 * GET /api/v1/search?q=...
 *
 * Returns { query, total, groups: [{ type, label, results: [...] }] }, where
 * each result is { type, id, title, subtitle, meta, badge }.
 *
 * Results are scoped server-side to what the caller may already see, so this
 * never surfaces anything the role's own pages would not.
 */
export async function search(term, options = {}) {
  return unwrap(
    await client.get("/search", {
      params: { q: term },
      signal: options.signal,
    }),
  );
}
