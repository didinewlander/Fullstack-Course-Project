import DashboardLayout from "../../../components/DashboardLayout";
import { useAuth } from "../../../context/useAuth";
import { GUIDE_BY_ROLE } from "../../../constants/roleGuides";
import "./RoleGuide.css";

/*
 * The "How this works" page, shared by all three roles.
 *
 * One component rather than three near-identical pages: the content differs,
 * the layout does not, and the routes are already role-gated in App.jsx. Same
 * reasoning as DeliveriesPage and InvoicesPage.
 *
 * The content lives in constants/roleGuides.js so this file stays about
 * rendering, and so a domain rule is corrected in exactly one place.
 */
function RoleGuide() {
  const { user } = useAuth();

  const guide = GUIDE_BY_ROLE[user?.role];

  /*
   * Only reachable if a role exists on the server that has no guide written
   * for it. Better than crashing on a missing key.
   */
  if (!guide) {
    return (
      <DashboardLayout heading="How this works">
        <p className="notice">
          There is no guide for this account type yet.
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout heading={guide.title}>
      <p className="guide-intro">{guide.intro}</p>

      <section className="guide-section" aria-labelledby="guide-flow">
        <h3 id="guide-flow">Step by step</h3>

        <ol className="guide-flow">
          {guide.flow.map((step, index) => (
            <li key={step.title} className="guide-step">
              <span className="guide-step-number" aria-hidden="true">
                {index + 1}
              </span>

              <div className="guide-step-body">
                <h4>
                  {step.title}
                  {step.waitsOn && (
                    <span className="guide-waits">
                      waits on {step.waitsOn}
                    </span>
                  )}
                </h4>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/*
        The part people actually get stuck on: which things simply will not
        move until somebody else acts.
      */}
      <section className="guide-section" aria-labelledby="guide-handoffs">
        <h3 id="guide-handoffs">What needs someone else</h3>

        <p className="guide-section-hint">
          These do not happen on your screen. If one of them is overdue, the
          person named is who to chase.
        </p>

        <ul className="guide-handoffs">
          {guide.handoffs.map((handoff) => (
            <li key={handoff.action}>
              <span className="guide-handoff-action">{handoff.action}</span>
              <span className="guide-handoff-who">{handoff.who}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="guide-section" aria-labelledby="guide-gotchas">
        <h3 id="guide-gotchas">Worth knowing</h3>

        <ul className="guide-gotchas">
          {guide.gotchas.map((gotcha) => (
            <li key={gotcha}>{gotcha}</li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}

export default RoleGuide;
