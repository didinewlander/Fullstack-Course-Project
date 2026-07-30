import { DELIVERY_STEPS, getStepIndex } from "../constants/deliverySteps";
import "./DeliveryTimeline.css";

// The delivery lifecycle drawn in full, so it is obvious where a shipment is
// and what happens next - rather than a single status word with no context.
// The steps themselves live in constants/deliverySteps.js.
function DeliveryTimeline({ status, compact }) {
  const currentIndex = getStepIndex(status);

  return (
    <ol className={`timeline${compact ? " timeline-compact" : ""}`}>
      {DELIVERY_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";

        return (
          <li key={step.status} className={`timeline-step timeline-${state}`}>
            <span className="timeline-marker" aria-hidden="true">
              {state === "done" ? "✓" : index + 1}
            </span>
            <span className="timeline-body">
              <span className="timeline-label">{step.label}</span>
              {!compact && <span className="timeline-hint">{step.hint}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default DeliveryTimeline;
