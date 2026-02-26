// src/features/dashboard/StrengthCharts.jsx
import React from "react";
import PropTypes from "prop-types";
import Chart from "react-apexcharts";

/**
 * StrengthCharts Component
 * Displays startup strength metrics with two advanced charts:
 * 1. Radial gauge showing overall attraction score (0-100)
 * 2. Radar chart showing breakdown of scoring components
 * 
 * @component
 * @param {number} attractionScore - Overall score (0-100)
 * @param {Object} scoreBreakdown - Breakdown scores
 * @param {number} scoreBreakdown.traction - Traction score (0-100)
 * @param {number} scoreBreakdown.team - Team score (0-100)
 * @param {number} scoreBreakdown.growth - Growth score (0-100)
 * @param {number} scoreBreakdown.completeness - Completeness score (0-100)
 * @returns {JSX.Element} Side-by-side responsive charts
 */
const StrengthCharts = ({
  attractionScore = 0,
  scoreBreakdown = {
    traction: 0,
    team: 0,
    growth: 0,
    completeness: 0,
  },
}) => {
  // ===== RADIAL GAUGE CHART =====
  const radialGaugeOptions = {
    chart: {
      type: "radialBar",
      sparkline: {
        enabled: false,
      },
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: "70%",
          background: "#fff",
          image: undefined,
          imageOffsetX: 0,
          imageOffsetY: 0,
          position: "front",
        },
        track: {
          background: "#f0f0f0",
          strokeWidth: "97%",
          margin: 5,
          dropShadow: {
            enabled: false,
          },
        },
        dataLabels: {
          name: {
            offsetY: -10,
            color: "#718096",
            fontSize: "14px",
            fontWeight: "600",
          },
          value: {
            offsetY: 5,
            color: "#1a202c",
            fontSize: "48px",
            fontWeight: "900",
            show: true,
          },
        },
      },
    },
    colors: ["#3182ce"],
    stroke: {
      lineCap: "round",
    },
    labels: ["Attraction Score"],
    states: {
      hover: {
        filter: {
          type: "none",
          value: 0,
        },
      },
      active: {
        filter: {
          type: "none",
          value: 0,
        },
      },
    },
  };

  const radialGaugeSeries = [attractionScore];

  // ===== RADAR CHART =====
  const radarChartOptions = {
    chart: {
      type: "radar",
      sparkline: {
        enabled: false,
      },
      toolbar: {
        show: true,
      },
    },
    colors: ["#10b981"],
    plotOptions: {
      radar: {
        size: 140,
        polygons: {
          strokeColors: "#e2e8f0",
          fill: {
            colors: ["#f7fafc", "#ffffff"],
          },
        },
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["#10b981"],
      dashArray: 0,
    },
    fill: {
      type: "solid",
      opacity: 0.25,
    },
    markers: {
      size: 4,
      colors: ["#10b981"],
      strokeColors: "#ffffff",
      strokeWidth: 2,
    },
    xaxis: {
      categories: ["Traction", "Team", "Growth", "Completeness"],
      labels: {
        style: {
          colors: ["#718096", "#718096", "#718096", "#718096"],
          fontSize: "12px",
          fontWeight: "500",
        },
      },
    },
    yaxis: {
      tickAmount: 4,
      labels: {
        style: {
          colors: "#a0aec0",
          fontSize: "11px",
        },
        offsetX: 0,
        offsetY: 0,
      },
    },
    dataLabels: {
      enabled: true,
      background: {
        enabled: true,
        borderRadius: 2,
        padding: 4,
        opacity: 0.8,
        borderWidth: 0,
      },
      fontSize: "12px",
      fontWeight: "600",
      style: {
        colors: ["#1a202c"],
      },
    },
    legend: {
      position: "bottom",
      fontSize: "12px",
      fontWeight: "600",
      labels: {
        colors: "#4a5568",
      },
    },
  };

  const radarChartSeries = [
    {
      name: "Score",
      data: [
        scoreBreakdown.traction || 0,
        scoreBreakdown.team || 0,
        scoreBreakdown.growth || 0,
        scoreBreakdown.completeness || 0,
      ],
    },
  ];

  // ===== CONTAINER STYLES =====
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "2rem",
    marginBottom: "2rem",
  };

  const chartCardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "2rem",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
  };

  const chartTitleStyle = {
    fontSize: "1rem",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "1.5rem",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      {/* Radial Gauge Chart */}
      <div style={chartCardStyle}>
        <h3 style={chartTitleStyle}>Overall Attraction Score</h3>
        <Chart
          options={radialGaugeOptions}
          series={radialGaugeSeries}
          type="radialBar"
          height={300}
        />
        <div
          style={{
            textAlign: "center",
            marginTop: "1rem",
            fontSize: "0.875rem",
            color: "#718096",
          }}
        >
          <p>Scale: 0 (Needs Improvement) → 100 (Excellent)</p>
        </div>
      </div>

      {/* Radar Chart */}
      <div style={chartCardStyle}>
        <h3 style={chartTitleStyle}>Score Breakdown</h3>
        <Chart
          options={radarChartOptions}
          series={radarChartSeries}
          type="radar"
          height={300}
        />
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "#f7fafc",
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: "#4a5568",
            lineHeight: "1.6",
          }}
        >
          <p style={{ marginBottom: "0.5rem", fontWeight: "600" }}>Legend:</p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>
              <strong>Traction</strong> - Revenue and users metrics
            </li>
            <li>
              <strong>Team</strong> - Experience and expertise
            </li>
            <li>
              <strong>Growth</strong> - Month-over-month expansion
            </li>
            <li>
              <strong>Completeness</strong> - Profile field completion
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

StrengthCharts.propTypes = {
  attractionScore: PropTypes.number,
  scoreBreakdown: PropTypes.shape({
    traction: PropTypes.number,
    team: PropTypes.number,
    growth: PropTypes.number,
    completeness: PropTypes.number,
  }),
};

StrengthCharts.defaultProps = {
  attractionScore: 0,
  scoreBreakdown: {
    traction: 0,
    team: 0,
    growth: 0,
    completeness: 0,
  },
};

export default StrengthCharts;
