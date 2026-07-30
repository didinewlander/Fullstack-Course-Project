import "./DataState.css";

/**
 * The loading / error / empty states every list page needs.
 *
 * Errors carry the server's own code and message (normalized by
 * api/client.js), so a 403 FORBIDDEN reads as what it is instead of a blank
 * screen - which is what made the old pages look broken.
 */
function DataState({ isLoading, error, isEmpty, emptyMessage, onRetry, children }) {
  if (isLoading) {
    return <p className="data-state data-state-loading">Loading…</p>;
  }

  if (error) {
    return (
      <div className="data-state data-state-error">
        <p className="data-state-error-message">{error.message}</p>
        {error.code && <p className="data-state-error-code">{error.code}</p>}
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <p className="data-state data-state-empty">
        {emptyMessage ?? "Nothing to show yet."}
      </p>
    );
  }

  return children;
}

/** Inline banner for a failed action, as opposed to a failed page load. */
export function ActionError({ error, onDismiss }) {
  if (!error) {
    return null;
  }

  return (
    <div className="action-error">
      <span>{error.message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export default DataState;
