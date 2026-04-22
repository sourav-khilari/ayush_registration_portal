import React, { useMemo } from "react";

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "verified", label: "Verified" },
  { key: "decision", label: "Approved / Rejected" },
];

function formatDate(dateValue) {
  if (!dateValue) return "Pending";
  return new Date(dateValue).toLocaleDateString();
}

function getRequiredCategories(requirements = []) {
  return requirements
    .filter((req) => req.required !== false)
    .map((req) => req.doc_category);
}

function buildTracker(application, requirements) {
  const requiredCategories = getRequiredCategories(requirements);
  const docs = Array.isArray(application?.documents) ? application.documents : [];
  const docsByCategory = new Map(
    docs.map((doc) => [doc.doc_category_declared, doc])
  );

  const missingRequired = requiredCategories.filter(
    (category) => !docsByCategory.get(category)
  );
  const rejectedRequired = requiredCategories.filter(
    (category) => docsByCategory.get(category)?.verified_status === "rejected"
  );
  const pendingRequired = requiredCategories.filter((category) => {
    const status = docsByCategory.get(category)?.verified_status;
    return docsByCategory.get(category) && status !== "verified" && status !== "rejected";
  });

  const allRequiredVerified =
    requiredCategories.length > 0 &&
    requiredCategories.every(
      (category) => docsByCategory.get(category)?.verified_status === "verified"
    );

  const submitted = Boolean(application?.submitted_at);
  const finalDecision =
    application?.status === "approved" || application?.status === "rejected";

  const verifiedAtCandidates = requiredCategories
    .map((category) => docsByCategory.get(category)?.verified_at)
    .filter(Boolean)
    .map((v) => new Date(v).getTime());

  const verifiedAt =
    allRequiredVerified && verifiedAtCandidates.length
      ? new Date(Math.max(...verifiedAtCandidates))
      : null;

  const submittedAt = application?.submitted_at ? new Date(application.submitted_at) : null;
  const decisionAt = application?.decision_at ? new Date(application.decision_at) : null;

  const status = application?.status;
  let etaText = "ETA will appear after submission.";
  if (status === "approved" || status === "rejected") {
    etaText = "Decision completed.";
  } else if (submittedAt) {
    const etaDays = allRequiredVerified ? 7 : 21;
    const etaDate = new Date(submittedAt);
    etaDate.setDate(etaDate.getDate() + etaDays);
    etaText = `Estimated completion by ${etaDate.toLocaleDateString()} (${etaDays} day window).`;
  }

  const pendingActions = [];
  if (!submitted) {
    pendingActions.push("Submit your application to start the review cycle.");
  }
  if (missingRequired.length) {
    pendingActions.push(
      `Upload missing required documents: ${missingRequired
        .map((x) => x.replaceAll("_", " "))
        .join(", ")}.`
    );
  }
  if (rejectedRequired.length) {
    pendingActions.push(
      `Replace rejected documents: ${rejectedRequired
        .map((x) => x.replaceAll("_", " "))
        .join(", ")}.`
    );
  }
  if (pendingRequired.length) {
    pendingActions.push("Wait for document verification to finish.");
  }
  if (submitted && allRequiredVerified && !finalDecision) {
    pendingActions.push("Await final decision from AYUSH officials.");
  }
  if (finalDecision) {
    pendingActions.push(
      application?.status === "approved"
        ? "Your application is approved."
        : "Your application is rejected. Review comments and resubmit if allowed."
    );
  }

  const timeline = [
    {
      key: "submitted",
      done: submitted,
      date: submittedAt,
    },
    {
      key: "verified",
      done: allRequiredVerified,
      date: verifiedAt,
    },
    {
      key: "decision",
      done: finalDecision,
      date: decisionAt,
      result: finalDecision ? application?.status : null,
    },
  ];

  return { timeline, pendingActions, etaText };
}

export default function ApplicationTracker({ application, requirements }) {
  const tracker = useMemo(
    () => buildTracker(application, requirements),
    [application, requirements]
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Application Tracker</h2>
        <span className="text-sm text-gray-600">{tracker.etaText}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {STEPS.map((step, idx) => {
          const state = tracker.timeline[idx];
          const activeClass = state?.done
            ? "bg-green-50 border-green-200"
            : "bg-gray-50 border-gray-200";
          return (
            <div key={step.key} className={`border rounded-lg p-4 ${activeClass}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{step.label}</p>
              <p className="mt-1 font-semibold text-gray-900">
                {state?.done ? "Completed" : "Pending"}
              </p>
              <p className="text-sm text-gray-600 mt-1">{formatDate(state?.date)}</p>
              {state?.key === "decision" && state?.result && (
                <p
                  className={`text-xs mt-2 font-semibold ${
                    state.result === "approved" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {state.result.toUpperCase()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-semibold text-gray-900 mb-2">Pending Actions</p>
        <ul className="space-y-1 text-sm text-gray-700">
          {tracker.pendingActions.map((item, index) => (
            <li key={`${item}-${index}`}>- {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
