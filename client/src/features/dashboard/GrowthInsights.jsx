import React from "react";
import PropTypes from "prop-types";

const GrowthInsights = ({ insights }) => {
  const hasInsights = Array.isArray(insights) && insights.length > 0;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
        marginBottom: "2rem",
      }}
    >
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "700",
          color: "#111827",
          marginBottom: "1rem",
        }}
      >
        AI Growth Insights
      </h2>

      {hasInsights ? (
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#374151" }}>
          {insights.map((text, index) => (
            <li key={index} style={{ marginBottom: "0.5rem", lineHeight: 1.6 }}>
              <span style={{ marginRight: "0.5rem" }}>•</span>
              {text}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#6b7280", margin: 0 }}>Not enough data yet.</p>
      )}
    </div>
  );
};

GrowthInsights.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.string),
};

GrowthInsights.defaultProps = {
  insights: [],
};

export default GrowthInsights;
