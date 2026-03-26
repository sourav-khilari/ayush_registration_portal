import React, { useState, useEffect } from 'react'
import { FaSave, FaTimes } from 'react-icons/fa'
import { saveStartupProfile } from './startupApi'

/**
 * ProfileForm - Startup identity profile form
 * Accepts: startupId, initialData, onSaveSuccess
 * Fields: name, pitch, sector, stage
 */

export default function ProfileForm({ startupId, initialData, onSaveSuccess }) {
  // Form state
  const [formData, setFormData] = useState({
    startupName: '',
    oneLinePitch: '',
    sector: '',
    stage: '',
    fundingAsk: '',
    equityOfferedPercent: '',
    marketSizeDescription: '',
    futurePlan: '',
    nextMilestone: '',
    team: [],
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [touched, setTouched] = useState({})

  // Sector and stage options
  const sectorOptions = [
    'Ayurveda',
    'Yoga',
    'Unani',
    'Siddha',
    'Homeopathy',
  ]

  const stageOptions = [
    'Idea',
    'Prototype',
    'Traction',
    'Revenue',
  ]

  // Pre-fill form with initial data
  useEffect(() => {
    if (initialData) {
      setFormData({
        startupName: initialData.startupName || initialData.name || '',
        oneLinePitch: initialData.oneLinePitch || initialData.pitch || '',
        sector: initialData.sector || '',
        stage: initialData.stage || '',
        fundingAsk:
          initialData.fundingAsk === null || initialData.fundingAsk === undefined
            ? ''
            : String(initialData.fundingAsk),
        equityOfferedPercent:
          initialData.equityOfferedPercent === null || initialData.equityOfferedPercent === undefined
            ? ''
            : String(initialData.equityOfferedPercent),
        marketSizeDescription: initialData.marketSizeDescription || '',
        futurePlan: initialData.futurePlan || '',
        nextMilestone: initialData.nextMilestone || '',
        team: Array.isArray(initialData.team)
          ? initialData.team.map((member) => ({
              name: member?.name || '',
              role: member?.role || '',
              yearsExperience:
                member?.yearsExperience === null || member?.yearsExperience === undefined
                  ? ''
                  : String(member.yearsExperience),
              isMedicalExpert: Boolean(member?.isMedicalExpert),
            }))
          : [],
      })
    }
  }, [initialData])

  // Validation
  const validateForm = () => {
    const newTouched = {}
    const errors = []

    if (!formData.startupName?.trim()) {
      errors.push('Startup name is required')
      newTouched.startupName = true
    }

    if (!formData.oneLinePitch?.trim()) {
      errors.push('One-line pitch is required')
      newTouched.oneLinePitch = true
    }

    if (formData.oneLinePitch?.length > 200) {
      errors.push('Pitch must be 200 characters or less')
      newTouched.oneLinePitch = true
    }

    if (!formData.sector) {
      errors.push('Sector is required')
      newTouched.sector = true
    }

    if (!formData.stage) {
      errors.push('Stage is required')
      newTouched.stage = true
    }

    setTouched(newTouched)
    return errors
  }

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(false)
  }

  // Handle field blur for validation UI
  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const addTeamMember = () => {
    setFormData((prev) => ({
      ...prev,
      team: [
        ...prev.team,
        {
          name: '',
          role: '',
          yearsExperience: '',
          isMedicalExpert: false,
        },
      ],
    }))
  }

  const removeTeamMember = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      team: prev.team.filter((_, memberIndex) => memberIndex !== indexToRemove),
    }))
  }

  const updateTeamMember = (indexToUpdate, fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      team: prev.team.map((member, memberIndex) => {
        if (memberIndex !== indexToUpdate) return member
        return {
          ...member,
          [fieldName]: value,
        }
      }),
    }))
    setError(null)
    setSuccess(false)
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    try {
      setLoading(true)

      // Prepare payload
      const payload = {
        startupName: formData.startupName,
        oneLinePitch: formData.oneLinePitch,
        sector: formData.sector,
        stage: formData.stage,
        fundingAsk:
          formData.fundingAsk === '' || formData.fundingAsk === null
            ? 0
            : Number(formData.fundingAsk),
        equityOfferedPercent:
          formData.equityOfferedPercent === '' || formData.equityOfferedPercent === null
            ? 0
            : Number(formData.equityOfferedPercent),
        marketSizeDescription: formData.marketSizeDescription,
        futurePlan: formData.futurePlan,
        nextMilestone: formData.nextMilestone,
        team: formData.team.map((member) => ({
          name: member.name?.trim() || '',
          role: member.role?.trim() || '',
          yearsExperience:
            member.yearsExperience === '' || member.yearsExperience === null
              ? 0
              : Number(member.yearsExperience),
          isMedicalExpert: Boolean(member.isMedicalExpert),
        })),
      }

      // Call API
      await saveStartupProfile(startupId, payload)

      // Success
      setSuccess(true)
      setFormData({
        startupName: '',
        oneLinePitch: '',
        sector: '',
        stage: '',
        fundingAsk: '',
        equityOfferedPercent: '',
        marketSizeDescription: '',
        futurePlan: '',
        nextMilestone: '',
        team: [],
      })

      // Call callback
      if (onSaveSuccess) {
        onSaveSuccess()
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Startup Profile</h3>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <FaTimes className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">✓ Profile saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Startup Name */}
        <div>
          <label htmlFor="startupName" className="block text-sm font-medium text-gray-700 mb-2">
            Startup Name <span className="text-red-500">*</span>
          </label>
          <input
            id="startupName"
            type="text"
            name="startupName"
            value={formData.startupName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your startup name"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition ${
              touched.startupName && !formData.startupName
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {touched.startupName && !formData.startupName && (
            <p className="text-red-500 text-xs mt-1">Startup name is required</p>
          )}
        </div>

        {/* One-Line Pitch */}
        <div>
          <label htmlFor="oneLinePitch" className="block text-sm font-medium text-gray-700 mb-2">
            One-Line Pitch <span className="text-red-500">*</span>
            <span className="float-right text-xs text-gray-500">
              {formData.oneLinePitch.length}/200
            </span>
          </label>
          <textarea
            id="oneLinePitch"
            name="oneLinePitch"
            value={formData.oneLinePitch}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Describe your startup in one line (max 200 characters)"
            maxLength={200}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition resize-none ${
              touched.oneLinePitch && !formData.oneLinePitch
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {touched.oneLinePitch && !formData.oneLinePitch && (
            <p className="text-red-500 text-xs mt-1">Pitch is required</p>
          )}
        </div>

        {/* Sector Dropdown */}
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">
            Sector <span className="text-red-500">*</span>
          </label>
          <select
            id="sector"
            name="sector"
            value={formData.sector}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition ${
              touched.sector && !formData.sector
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          >
            <option value="">Select a sector</option>
            {sectorOptions.map(sector => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
          {touched.sector && !formData.sector && (
            <p className="text-red-500 text-xs mt-1">Sector is required</p>
          )}
        </div>

        {/* Stage Dropdown */}
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-2">
            Stage <span className="text-red-500">*</span>
          </label>
          <select
            id="stage"
            name="stage"
            value={formData.stage}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition ${
              touched.stage && !formData.stage
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          >
            <option value="">Select a stage</option>
            {stageOptions.map(stage => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          {touched.stage && !formData.stage && (
            <p className="text-red-500 text-xs mt-1">Stage is required</p>
          )}
        </div>

        {/* Funding Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fundingAsk" className="block text-sm font-medium text-gray-700 mb-2">
              Funding Required (₹)
            </label>
            <input
              id="fundingAsk"
              type="number"
              min="0"
              name="fundingAsk"
              value={formData.fundingAsk}
              onChange={handleChange}
              placeholder="e.g. 5000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="equityOfferedPercent" className="block text-sm font-medium text-gray-700 mb-2">
              Equity Offered (%)
            </label>
            <input
              id="equityOfferedPercent"
              type="number"
              min="0"
              step="0.01"
              name="equityOfferedPercent"
              value={formData.equityOfferedPercent}
              onChange={handleChange}
              placeholder="e.g. 10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition"
            />
          </div>
        </div>

        {/* Team Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Team Members</h4>
            <button
              type="button"
              onClick={addTeamMember}
              className="px-3 py-1.5 text-sm font-medium bg-ayush-50 text-ayush-700 border border-ayush-200 rounded-lg hover:bg-ayush-100 transition"
            >
              Add Member
            </button>
          </div>

          {formData.team.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-3">
              No team members added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {formData.team.map((member, memberIndex) => (
                <div key={`team-member-${memberIndex}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(event) =>
                          updateTeamMember(memberIndex, 'name', event.target.value)
                        }
                        placeholder="Team member name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <input
                        type="text"
                        value={member.role}
                        onChange={(event) =>
                          updateTeamMember(memberIndex, 'role', event.target.value)
                        }
                        placeholder="Role"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={member.yearsExperience}
                        onChange={(event) =>
                          updateTeamMember(memberIndex, 'yearsExperience', event.target.value)
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none"
                      />
                    </div>

                    <div className="flex items-center mt-6 md:mt-0">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={member.isMedicalExpert}
                          onChange={(event) =>
                            updateTeamMember(memberIndex, 'isMedicalExpert', event.target.checked)
                          }
                          className="rounded border-gray-300 text-ayush-600 focus:ring-ayush-500"
                        />
                        Medical Expert
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeTeamMember(memberIndex)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                    >
                      Remove Member
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Market & Vision */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-800">Market & Vision</h4>

          <div>
            <label htmlFor="marketSizeDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Market Size Description
            </label>
            <textarea
              id="marketSizeDescription"
              name="marketSizeDescription"
              value={formData.marketSizeDescription}
              onChange={handleChange}
              placeholder="Describe your target market size"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition resize-none"
            />
          </div>

          <div>
            <label htmlFor="futurePlan" className="block text-sm font-medium text-gray-700 mb-2">
              Future Plan
            </label>
            <textarea
              id="futurePlan"
              name="futurePlan"
              value={formData.futurePlan}
              onChange={handleChange}
              placeholder="What is your plan for next 6-12 months"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition resize-none"
            />
          </div>

          <div>
            <label htmlFor="nextMilestone" className="block text-sm font-medium text-gray-700 mb-2">
              Next Milestone
            </label>
            <input
              id="nextMilestone"
              type="text"
              name="nextMilestone"
              value={formData.nextMilestone}
              onChange={handleChange}
              placeholder="Next major milestone"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-600 outline-none transition"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                startupName: '',
                oneLinePitch: '',
                sector: '',
                stage: '',
                fundingAsk: '',
                equityOfferedPercent: '',
                marketSizeDescription: '',
                futurePlan: '',
                nextMilestone: '',
                team: [],
              })
              setTouched({})
            }}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FaTimes className="inline mr-2" />
            Clear
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-ayush-600 text-white rounded-lg font-medium hover:bg-ayush-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <FaSave className="text-sm" />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
