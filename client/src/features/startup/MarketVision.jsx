import React from "react";

const formatText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const MarketVision = ({
  marketSizeDescription,
  futurePlan,
  nextMilestone,
}) => {
  const marketText = formatText(marketSizeDescription);
  const futureText = formatText(futurePlan);
  const milestoneText = formatText(nextMilestone);

  const hasAnyData = Boolean(marketText || futureText || milestoneText);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Market &amp; Vision</h2>

      {!hasAnyData ? (
        <p className="mt-4 text-sm text-slate-500">No market data available</p>
      ) : (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="text-sm font-medium text-slate-600">Market Size</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">
              {marketText || "No market data available"}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-600">Future Plan</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">
              {futureText || "No market data available"}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-800">Next Milestone</h3>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">
              {milestoneText || "No market data available"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default MarketVision;
