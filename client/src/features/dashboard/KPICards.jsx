// src/features/dashboard/KPICards.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * KPICards Component
 * Displays 4 key performance indicator cards with metrics and growth indicators.
 * 
 * @component
 * @param {number} currentRevenue - Current revenue in currency units
 * @param {number} currentUsers - Current number of active users
 * @param {number} momGrowthPercent - Month-over-month growth percentage
 * @param {number} payingCustomers - Number of paying customers
 * @returns {JSX.Element} Responsive grid of KPI cards
 */
const KPICards = ({
  currentRevenue = 0,
  currentUsers = 0,
  momGrowthPercent = 0,
  payingCustomers = 0,
}) => {
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
    cursor: "default",
  };

  const cardHoverStyle = {
    ...cardStyle,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
    borderColor: "#cbd5e0",
  };

  const [hoveredCard, setHoveredCard] = React.useState(null);

  const labelStyle = {
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#718096",
    marginBottom: "0.75rem",
    display: "block",
  };

  const valueStyle = {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "0.5rem",
    lineHeight: "1",
  };

  const growthStyle = {
    fontSize: "0.875rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const getGrowthColor = (value) => {
    if (value > 0) return "#10b981";
    if (value < 0) return "#ef4444";
    return "#6b7280";
  };

  const kpiCards = [
    {
      label: "Current Revenue",
      value: `₹${(currentRevenue || 0).toLocaleString("en-IN")}`,
      growth: null,
      icon: "📊",
    },
    {
      label: "Active Users",
      value: (currentUsers || 0).toLocaleString("en-IN"),
      growth: null,
      icon: "👥",
    },
    {
      label: "Month-over-Month Growth",
      value: `${momGrowthPercent.toFixed(2)}%`,
      growth: momGrowthPercent,
      icon: "📈",
    },
    {
      label: "Paying Customers",
      value: (payingCustomers || 0).toLocaleString("en-IN"),
      growth: null,
      icon: "💰",
    },
  ];

  const getGrowthIndicator = (growth) => {
    if (growth === null || growth === undefined) return null;

    const isPositive = growth > 0;
    const color = getGrowthColor(growth);
    const arrow = isPositive ? "↑" : growth < 0 ? "↓" : "→";

    return (
      <div style={{ ...growthStyle, color }}>
        <span>{arrow}</span>
        <span>{isPositive && "+"}{growth.toFixed(2)}%</span>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {kpiCards.map((card, index) => (
        <div
          key={index}
          style={hoveredCard === index ? cardHoverStyle : cardStyle}
          onMouseEnter={() => setHoveredCard(index)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <span style={labelStyle}>{card.label}</span>
            <span style={{ fontSize: "1.5rem" }}>{card.icon}</span>
          </div>
          <div style={valueStyle}>{card.value}</div>
          {card.growth !== null && getGrowthIndicator(card.growth)}
        </div>
      ))}
    </div>
  );
};

KPICards.propTypes = {
  currentRevenue: PropTypes.number,
  currentUsers: PropTypes.number,
  momGrowthPercent: PropTypes.number,
  payingCustomers: PropTypes.number,
};

KPICards.defaultProps = {
  currentRevenue: 0,
  currentUsers: 0,
  momGrowthPercent: 0,
  payingCustomers: 0,
};

export default KPICards;
