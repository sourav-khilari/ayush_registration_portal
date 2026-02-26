// src/features/dashboard/ProfileForm.jsx
/**
 * ProfileForm Component
 * Form for editing startup profile information including pitch, stage, funding, and team details.
 * 
 * Props:
 * - startupId (string): The startup ID for the profile
 * - existingProfile (object): Existing profile data to populate form fields
 * - onSave (function): Callback after successful save
 * 
 * Features:
 * - Profile fields: pitch, stage, funding ask, equity offered, market size
 * - Dynamic team member management (add/remove)
 * - Validation before submit
 * - Loading and error states
 * - Clean, minimal UI with responsive design
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import styles from "./ProfileForm.module.css";

const ProfileForm = ({ startupId, existingProfile = {}, onSave }) => {
  // Form state
  const [formData, setFormData] = useState({
    oneLinePitch: existingProfile.oneLinePitch || "",
    stage: existingProfile.stage || "Idea",
    fundingAsk: existingProfile.fundingAsk || 0,
    equityOfferedPercent: existingProfile.equityOfferedPercent || 0,
    marketSizeDescription: existingProfile.marketSizeDescription || "",
  });

  const [team, setTeam] = useState(existingProfile.team || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Percent") || name.includes("Ask") ? parseFloat(value) || 0 : value,
    }));
    setError(null);
  };

  // Handle team member changes
  const handleTeamChange = (index, field, value) => {
    const updatedTeam = [...team];
    updatedTeam[index] = {
      ...updatedTeam[index],
      [field]: field === "isMedicalExpert" ? value : value,
    };
    setTeam(updatedTeam);
  };

  // Add new team member
  const addTeamMember = () => {
    setTeam([
      ...team,
      {
        name: "",
        role: "",
        yearsExperience: 0,
        isMedicalExpert: false,
      },
    ]);
  };

  // Remove team member
  const removeTeamMember = (index) => {
    setTeam(team.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.oneLinePitch.trim()) {
      setError("Please enter a pitch");
      return false;
    }
    if (formData.oneLinePitch.length > 200) {
      setError("Pitch must be 200 characters or less");
      return false;
    }
    if (formData.fundingAsk < 0) {
      setError("Funding ask cannot be negative");
      return false;
    }
    if (formData.equityOfferedPercent < 0 || formData.equityOfferedPercent > 100) {
      setError("Equity percentage must be between 0 and 100");
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

      const profileData = {
        ...formData,
        team,
      };

      const response = await axios.post(
        `/api/startup/${startupId}/profile`,
        profileData
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        if (onSave) {
          onSave(response.data.data);
        }
      } else {
        setError(response.data.error || "Failed to save profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(
        err.response?.data?.error || "Error saving profile. Please try again."
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
            ✓ Profile saved successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile Information</h3>

          {/* One Line Pitch */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              One Line Pitch
              <span className={styles.required}>*</span>
            </label>
            <textarea
              name="oneLinePitch"
              value={formData.oneLinePitch}
              onChange={handleInputChange}
              placeholder="Describe your startup in one sentence"
              maxLength="200"
              rows="3"
              className={styles.textarea}
              required
            />
            <p className={styles.charCount}>
              {formData.oneLinePitch.length}/200 characters
            </p>
          </div>

          {/* Stage */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Stage
              <span className={styles.required}>*</span>
            </label>
            <select
              name="stage"
              value={formData.stage}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="Idea">Idea</option>
              <option value="Prototype">Prototype</option>
              <option value="Traction">Traction</option>
              <option value="Revenue">Revenue</option>
            </select>
          </div>

          {/* Funding Ask */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Funding Ask (₹)
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="fundingAsk"
              value={formData.fundingAsk}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="100000"
              className={styles.input}
              required
            />
          </div>

          {/* Equity Offered */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Equity Offered (%)
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="equityOfferedPercent"
              value={formData.equityOfferedPercent}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
              className={styles.input}
              required
            />
          </div>

          {/* Market Size Description */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Market Size Description</label>
            <textarea
              name="marketSizeDescription"
              value={formData.marketSizeDescription}
              onChange={handleInputChange}
              placeholder="Describe your target market and opportunity"
              rows="4"
              className={styles.textarea}
            />
          </div>
        </div>

        {/* Team Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Team Members</h3>
            <button
              type="button"
              onClick={addTeamMember}
              className={styles.addButton}
            >
              + Add Member
            </button>
          </div>

          {team.length === 0 ? (
            <p className={styles.emptyText}>No team members added yet</p>
          ) : (
            <div className={styles.teamList}>
              {team.map((member, index) => (
                <div key={index} className={styles.teamMember}>
                  <div className={styles.teamGrid}>
                    {/* Name */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Name</label>
                      <input
                        type="text"
                        value={member.name || ""}
                        onChange={(e) =>
                          handleTeamChange(index, "name", e.target.value)
                        }
                        placeholder="Team member name"
                        className={styles.input}
                      />
                    </div>

                    {/* Role */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Role</label>
                      <input
                        type="text"
                        value={member.role || ""}
                        onChange={(e) =>
                          handleTeamChange(index, "role", e.target.value)
                        }
                        placeholder="e.g., CEO, CTO"
                        className={styles.input}
                      />
                    </div>

                    {/* Years Experience */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Years Experience</label>
                      <input
                        type="number"
                        value={member.yearsExperience || 0}
                        onChange={(e) =>
                          handleTeamChange(
                            index,
                            "yearsExperience",
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        min="0"
                        className={styles.input}
                      />
                    </div>

                    {/* Medical Expert Checkbox */}
                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={member.isMedicalExpert || false}
                          onChange={(e) =>
                            handleTeamChange(
                              index,
                              "isMedicalExpert",
                              e.target.checked
                            )
                          }
                          className={styles.checkbox}
                        />
                        Medical Expert
                      </label>
                    </div>

                    {/* Remove Button */}
                    <div className={styles.removeButtonContainer}>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};

ProfileForm.propTypes = {
  startupId: PropTypes.string.isRequired,
  existingProfile: PropTypes.shape({
    oneLinePitch: PropTypes.string,
    stage: PropTypes.string,
    fundingAsk: PropTypes.number,
    equityOfferedPercent: PropTypes.number,
    marketSizeDescription: PropTypes.string,
    team: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        role: PropTypes.string,
        yearsExperience: PropTypes.number,
        isMedicalExpert: PropTypes.bool,
      })
    ),
  }),
  onSave: PropTypes.func,
};

ProfileForm.defaultProps = {
  existingProfile: {},
  onSave: null,
};

export default ProfileForm;
