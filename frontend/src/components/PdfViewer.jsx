import { useEffect, useState } from "react";
import Modal from "./Modal";
import { saveBlobUrl } from "../api/invoicesApi";
import "./PdfViewer.css";

/**
 * Shows a generated PDF inline.
 *
 * An <iframe> pointed at a blob URL, deliberately:
 *   - <object> falls back silently and inconsistently, which is what left the
 *     viewer blank before;
 *   - the frame must NOT be sandboxed, because a sandboxed frame refuses
 *     blob: URLs outright. The content is ours, fetched moments ago.
 *
 * The blob URL is revoked on close so it does not leak for the session.
 */
function PdfViewer({ title, description, url, fileName, onClose }) {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => saveBlobUrl(url, fileName)}
          >
            Download
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="pdf-shell">
        <iframe
          className="pdf-frame"
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          title={title}
          onLoad={() => setHasLoaded(true)}
        />

        {!hasLoaded && (
          <p className="pdf-fallback">
            Loading the document… if nothing appears, your browser may not
            display PDFs inline.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default PdfViewer;
