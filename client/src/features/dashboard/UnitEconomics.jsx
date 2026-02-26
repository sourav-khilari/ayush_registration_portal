import React from "react";
import PropTypes from "prop-types";

const formatNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString("en-IN") : "0";
};

const formatPercent = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? `${num.toFixed(2)}%` : "0.00%";
};

const UnitEconomics = ({ unitEconomics }) => {
  const data = unitEconomics || {};

  const cards = [
    {
      title: "ARPU",
      value: `₹${formatNumber(data.arpu)}`,
      helper: "Average revenue per user",
    },
    {
      title: "Revenue per Paying Customer",
      value: `₹${formatNumber(data.revenuePerPayingCustomer)}`,
      helper: "Revenue efficiency",
    },
    {
      title: "Conversion Rate",
      value: formatPercent(data.conversionRate),
      helper: "Paying / Users ratio",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontWeight: "700",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            {card.title}
          </p>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "#111827",
              marginBottom: "0.35rem",
            }}
          >
            {card.value}
          </div>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
            {card.helper}
          </p>
        </div>
      ))}
    </div>
  );
};

UnitEconomics.propTypes = {
  unitEconomics: PropTypes.shape({
    arpu: PropTypes.number,
    revenuePerPayingCustomer: PropTypes.number,
    conversionRate: PropTypes.number,
  }),
};

UnitEconomics.defaultProps = {
  unitEconomics: {
    arpu: 0,
    revenuePerPayingCustomer: 0,
    conversionRate: 0,
  },
};

export default UnitEconomics;
