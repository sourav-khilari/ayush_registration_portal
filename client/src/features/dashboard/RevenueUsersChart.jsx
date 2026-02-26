// src/features/dashboard/RevenueUsersChart.jsx
import React from "react";
import PropTypes from "prop-types";
import Chart from "react-apexcharts";

/**
 * RevenueUsersChart Component
 * Displays a dual-axis chart with revenue trends (area chart) and user growth (line chart).
 * Uses ApexCharts for interactive visualizations with zoom, pan, and download features.
 * 
 * @component
 * @param {Array<{x: string, y: number}>} revenueSeries - Monthly revenue data points
 * @param {Array<{x: string, y: number}>} usersSeries - Monthly user data points
 * @returns {JSX.Element} Responsive dual-axis chart component
 */
const RevenueUsersChart = ({ revenueSeries = [], usersSeries = [] }) => {
  // Prepare data for ApexCharts
  const chartSeries = [
    {
      name: "Revenue (₹)",
      data: revenueSeries.map((item) => ({
        x: item.x,
        y: item.y,
      })),
      type: "area",
    },
    {
      name: "Users",
      data: usersSeries.map((item) => ({
        x: item.x,
        y: item.y,
      })),
      type: "line",
    },
  ];

  const chartOptions = {
    chart: {
      type: "line",
      stacked: false,
      zoom: {
        enabled: true,
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
    },
    colors: ["#3182ce", "#10b981"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: [3, 2],
    },
    fill: {
      type: ["gradient", "solid"],
      gradient: {
        type: "vertical",
        shadeIntensity: 0.3,
        inverseColors: false,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    title: {
      text: "Revenue & Users Trend",
      align: "left",
      style: {
        fontSize: "18px",
        fontWeight: "700",
        color: "#1a202c",
      },
    },
    xaxis: {
      type: "category",
      categories: revenueSeries.map((item) => item.x),
      labels: {
        style: {
          colors: "#718096",
          fontSize: "12px",
        },
      },
      axisBorder: {
        color: "#e2e8f0",
      },
      axisTicks: {
        color: "#e2e8f0",
      },
    },
    yaxis: [
      {
        axisTicks: {
          show: true,
        },
        axisBorder: {
          show: true,
          color: "#3182ce",
        },
        labels: {
          style: {
            colors: "#3182ce",
            fontSize: "12px",
          },
          formatter: (value) => {
            if (value >= 1000000) return `₹${(value / 1000000).toFixed(0)}M`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
            return `₹${value}`;
          },
        },
        title: {
          text: "Revenue (₹)",
          style: {
            color: "#3182ce",
            fontSize: "14px",
            fontWeight: "600",
          },
        },
      },
      {
        opposite: true,
        axisTicks: {
          show: true,
        },
        axisBorder: {
          show: true,
          color: "#10b981",
        },
        labels: {
          style: {
            colors: "#10b981",
            fontSize: "12px",
          },
          formatter: (value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return `${value}`;
          },
        },
        title: {
          text: "Users",
          style: {
            color: "#10b981",
            fontSize: "14px",
            fontWeight: "600",
          },
        },
      },
    ],
    tooltip: {
      enabled: true,
      theme: "light",
      x: {
        format: "MMM yyyy",
      },
      y: {
        formatter: [
          (value) => {
            if (value >= 1000000) return `₹${(value / 1000000).toFixed(2)}M`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
            return `₹${value.toLocaleString()}`;
          },
          (value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return `${value}`;
          },
        ],
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      offsetY: -10,
      markers: {
        shape: "circle",
      },
      itemMargin: {
        horizontal: 12,
        vertical: 8,
      },
      labels: {
        colors: "#4a5568",
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
      position: "back",
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 350,
          },
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 300,
          },
          xaxis: {
            labels: {
              fontSize: "10px",
            },
          },
        },
      },
    ],
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        marginBottom: "2rem",
      }}
    >
      {revenueSeries.length === 0 || usersSeries.length === 0 ? (
        <div
          style={{
            height: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#a0aec0",
            fontSize: "1rem",
          }}
        >
          No data available to display chart
        </div>
      ) : (
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="line"
          height={400}
        />
      )}
    </div>
  );
};

RevenueUsersChart.propTypes = {
  revenueSeries: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.string.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  usersSeries: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.string.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
};

RevenueUsersChart.defaultProps = {
  revenueSeries: [],
  usersSeries: [],
};

export default RevenueUsersChart;
