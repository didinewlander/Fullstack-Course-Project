import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { USER_ROLES } from "../constants/roles";
import * as searchApi from "../api/searchApi";
import "./GlobalSearch.css";

// Cross-resource search, so a user can find an order, product, delivery or
// invoice without first working out which page it lives on.
//
// Opens with Ctrl/Cmd-K or by clicking the field; arrows move, Enter opens,
// Escape closes.
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;

/*
 * Where each result type lives, per role. The same record is reached by
 * different paths depending on who is looking - a vendor's orders page is not
 * the supplier's - so both dimensions are needed.
 */
const ROUTES = {
  order: {
    [USER_ROLES.VENDOR]: "/dashboard/vendor/orders",
    [USER_ROLES.SUPPLIER]: "/dashboard/supplier/orders",
    [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/orders",
  },
  product: {
    [USER_ROLES.VENDOR]: "/dashboard/vendor",
    [USER_ROLES.SUPPLIER]: "/dashboard/supplier/products",
    [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/products",
  },
  delivery: {
    [USER_ROLES.VENDOR]: "/dashboard/vendor/deliveries",
    [USER_ROLES.SUPPLIER]: "/dashboard/supplier/deliveries",
    [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/deliveries",
  },
  invoice: {
    [USER_ROLES.VENDOR]: "/dashboard/vendor/invoices",
    [USER_ROLES.SUPPLIER]: "/dashboard/supplier/invoices",
    [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/invoices",
  },
  user: {
    [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/users",
  },
};

const TYPE_ICON = {
  order: "🧾",
  product: "📦",
  delivery: "🚚",
  invoice: "💳",
  user: "👤",
};

function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [data, setData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // flat list of results, so arrow keys can walk across group boundaries
  const flat = (data?.groups ?? []).flatMap((group) =>
    group.results.map((result) => ({ ...result, groupLabel: group.label })),
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setTerm("");
    setData(null);
    setError(null);
    setActiveIndex(0);
    abortRef.current?.abort();
  }, []);

  // Ctrl/Cmd-K from anywhere
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  /*
   * Debounced, and the previous request is aborted when a newer one starts -
   * otherwise a slow early response can land after a fast later one and show
   * results for a query the user has already moved past.
   */
  useEffect(() => {
    if (!isOpen) return undefined;

    const trimmed = term.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      // deferred so the effect body does no synchronous setState
      const clearTimer = setTimeout(() => {
        setData(null);
        setError(null);
        setIsSearching(false);
      }, 0);

      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setError(null);

      try {
        const result = await searchApi.search(trimmed, {
          signal: controller.signal,
        });

        setData(result);
        setActiveIndex(0);
      } catch (caught) {
        if (caught.code !== "ERR_CANCELED" && caught.name !== "CanceledError") {
          setError(caught);
          setData(null);
        }
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, isOpen]);

  function openResult(result) {
    const path = ROUTES[result.type]?.[user?.role];

    if (!path) return;

    close();
    navigate(`${path}?highlight=${result.id}`);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (!flat.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openResult(flat[activeIndex]);
    }
  }

  const trimmed = term.trim();

  return (
    <>
      <button
        type="button"
        className="search-trigger"
        onClick={() => setIsOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35"
          />
        </svg>
        <span>Search…</span>
        <kbd>Ctrl K</kbd>
      </button>

      {isOpen && (
        <div
          className="search-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="search-panel" role="dialog" aria-label="Search">
            <div className="search-input-row">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35"
                />
              </svg>

              <input
                ref={inputRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search orders, products, deliveries, invoices…"
                aria-label="Search"
              />

              <button type="button" className="search-close" onClick={close}>
                Esc
              </button>
            </div>

            <div className="search-results">
              {trimmed.length < MIN_QUERY_LENGTH ? (
                <p className="search-hint">
                  Type at least {MIN_QUERY_LENGTH} characters. You can search by
                  product name, SKU, tracking number, invoice number, or the
                  last few characters of an order id.
                </p>
              ) : isSearching && !data ? (
                <p className="search-hint">Searching…</p>
              ) : error ? (
                <p className="search-hint search-error">{error.message}</p>
              ) : !data || data.total === 0 ? (
                <p className="search-hint">
                  Nothing matched “{trimmed}”.
                </p>
              ) : (
                data.groups.map((group) => (
                  <section key={group.type} className="search-group">
                    <p className="search-group-label">{group.label}</p>

                    {group.results.map((result) => {
                      const index = flat.findIndex(
                        (item) => item.type === result.type && item.id === result.id,
                      );

                      return (
                        <button
                          key={`${result.type}:${result.id}`}
                          type="button"
                          className={`search-result${index === activeIndex ? " is-active" : ""}`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => openResult(result)}
                        >
                          <span className="search-result-icon" aria-hidden="true">
                            {TYPE_ICON[result.type] ?? "•"}
                          </span>

                          <span className="search-result-body">
                            <span className="search-result-title">
                              {result.title}
                            </span>
                            {result.subtitle && (
                              <span className="search-result-subtitle">
                                {result.subtitle}
                              </span>
                            )}
                          </span>

                          <span className="search-result-side">
                            {result.meta && (
                              <span className="search-result-meta">
                                {result.meta}
                              </span>
                            )}
                            {result.badge && (
                              <span className="badge">{result.badge}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                ))
              )}
            </div>

            {flat.length > 0 && (
              <div className="search-footer">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>esc close</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalSearch;
