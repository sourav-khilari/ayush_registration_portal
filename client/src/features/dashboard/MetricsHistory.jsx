// src/features/dashboard/MetricsHistory.jsx
/**
 * MetricsHistory Component
 * Displays a table of historical metrics (revenue, users) grouped by month.
 * 
 * Props:
 * - revenueSeries (array): Array of revenue data points { x: month, y: revenue }
 * - usersSeries (array): Array of users data points { x: month, y: users }
 * 
 * Features:
 * - Simple table display
 * - Displays Month, Revenue, Users columns
 * - Formatted numbers (comma-separated, currency symbols)
 * - Responsive design
 * - No data fetching (display only)
 */

import React from "react";
import PropTypes from "prop-types";
import styles from "./MetricsHistory.module.css";

const MetricsHistory = ({ revenueSeries = [], usersSeries = [] }) => {
  // Combine revenue and users data by month
  const mergeMetrics = () => {
    const metricsMap = {};

    // Add revenue data
    revenueSeries.forEach((item) => {
      metricsMap[item.x] = { month: item.x, revenue: item.y, users: 0 };
    });

    // Add/merge users data
    usersSeries.forEach((item) => {
      if (metricsMap[item.x]) {
        metricsMap[item.x].users = item.y;
      } else {
        metricsMap[item.x] = { month: item.x, revenue: 0, users: item.y };
      }
    });

    // Convert to array and sort by month (most recent first)
    return Object.values(metricsMap).reverse();
  };

  const metrics = mergeMetrics();

  if (!metrics || metrics.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Metrics History</h3>
        <p className={styles.emptyText}>No metrics data available</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Metrics History</h3>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerCell}>Month</th>
              <th className={styles.headerCell}>Revenue (₹)</th>
              <th className={styles.headerCell}>Users</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr key={index} className={styles.dataRow}>
                <td className={styles.dataCell}>{metric.month}</td>
                <td className={styles.dataCell}>
                  {metric.revenue.toLocaleString("en-IN")}
                </td>
                <td className={styles.dataCell}>
                  {metric.users.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

MetricsHistory.propTypes = {
  revenueSeries: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.string,
      y: PropTypes.number,
    })
  ),
  usersSeries: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.string,
      y: PropTypes.number,
    })
  ),
};

MetricsHistory.defaultProps = {
  revenueSeries: [],
  usersSeries: [],
};

export default MetricsHistory;
