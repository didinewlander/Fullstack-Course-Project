import { useEffect, useRef } from "react";
import "./Modal.css";

// In-app dialog, replacing window.prompt/confirm.
//
// Beyond looking like the rest of the app, a real dialog can do things the
// browser prompts cannot: validate before closing, show units and current
// values, take more than one field, and render a pending state while the
// request is in flight.
function Modal({ title, description, onClose, children, footer, wide }) {
  const panelRef = useRef(null);

  /*
   * Held in a ref so the effects below never depend on `onClose` itself.
   * Callers pass an inline arrow, which is a new function every render - and
   * a render happens on every keystroke. With `onClose` in the dependency
   * array the whole effect tore down and re-ran per character, stealing focus
   * back to the first focusable element (the close button) mid-typing.
   */
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // stop the page behind the dialog from scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Focus the first real input once, on open. Buttons are excluded on
  // purpose - landing on "Cancel" is never what someone wants.
  useEffect(() => {
    const firstField = panelRef.current?.querySelector(
      "input:not([type='file']), select, textarea",
    );

    firstField?.focus();
    firstField?.select?.();
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        // only a click on the backdrop itself closes it, not a drag that
        // happens to finish out here
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`modal-panel${wide ? " modal-panel-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * A modal wrapping a form, with Cancel/Confirm wired up.
 *
 * onSubmit may return a promise; while it is pending the confirm button
 * shows `pendingLabel` and both buttons are disabled, so a slow request
 * cannot be double-submitted.
 */
export function FormModal({
  title,
  description,
  onClose,
  onSubmit,
  children,
  confirmLabel = "Save",
  pendingLabel = "Saving…",
  isPending,
  isConfirmDisabled,
  destructive,
}) {
  return (
    <Modal
      title={title}
      description={description}
      onClose={isPending ? undefined : onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="modal-form"
            className={`btn${destructive ? " btn-danger" : ""}`}
            disabled={isPending || isConfirmDisabled}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <form
        id="modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {children}
      </form>
    </Modal>
  );
}

export default Modal;
