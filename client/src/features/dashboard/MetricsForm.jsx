// src/features/dashboard/MetricsForm.jsx
/**
 * MetricsForm Component
 * Form for adding/updating monthly startup metrics (revenue, users, paying customers).
 * 
 * Props:
 * - startupId (string): The startup ID for the metrics
 * - onMetricSaved (function): Callback after successful save to refresh dashboard
 * 
 * Features:
 * - Month selection (YYYY-MM format)
 * - Metrics input: revenue, users, paying_customers
 * - Validation (no negative numbers)
 * - Loading and error states
 * - Form reset after successful save
 * - Clean, minimal UI
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import styles from "./MetricsForm.module.css";

const MetricsForm = ({ startupId, onMetricSaved }) => {
  // Form state
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    revenue: 0,
    users: 0,
    paying_customers: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "month" ? value : Math.max(0, parseInt(value) || 0),
    }));
    setError(null);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.month) {
      setError("Please select a month");
      return false;
    }
    if (formData.revenue < 0 || formData.users < 0 || formData.paying_customers < 0) {
      setError("Metrics cannot be negative");
      return false;
    }
    if (formData.revenue === 0 && formData.users === 0 && formData.paying_customers === 0) {
      setError("Please enter at least one metric");
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await axios.post(
        `/api/startup/${startupId}/metrics`,
        formData
      );

      if (response.data.success) {
        setSuccess(true);
        
        // Reset form to current month
        setFormData({
          month: new Date().toISOString().slice(0, 7),
          revenue: 0,
          users: 0,
          paying_customers: 0,
        });

        // Call callback to refresh dashboard
        if (onMetricSaved) {
          setTimeout(() => {
            onMetricSaved();
          }, 1000);
        }

        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.data.error || "Failed to save metrics");
      }
    } catch (err) {
      console.error("Error saving metrics:", err);
      setError(
        err.response?.data?.error || "Error saving metrics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Success Message */}
        {success && (
          <div className={styles.successBox}>
            ✓ Metrics saved successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div className={styles.formContent}>
          {/* Month */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Month
              <span className={styles.required}>*</span>
            </label>
            <input
              type="month"
              name="month"
              value={formData.month}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          {/* Revenue */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Revenue (₹)
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="revenue"
              value={formData.revenue}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1000"
              className={styles.input}
              required
            />
          </div>

          {/* Users */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Users
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="users"
              value={formData.users}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
              className={styles.input}
              required
            />
          </div>

          {/* Paying Customers */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Paying Customers
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="paying_customers"
              value={formData.paying_customers}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
              className={styles.input}
              required
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? "Saving..." : "Save Metrics"}
          </button>
        </div>
      </form>
    </div>
  );
};

MetricsForm.propTypes = {
  startupId: PropTypes.string.isRequired,
  onMetricSaved: PropTypes.func,
};

MetricsForm.defaultProps = {
  onMetricSaved: null,
};

export default MetricsForm;
