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
