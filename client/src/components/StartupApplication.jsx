import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StartupAPI, RequirementsAPI, DocumentAPI } from '../api'
import { 
  FaLeaf, 
  FaRocket, 
  FaBuilding, 
  FaFileAlt, 
  FaSave, 
  FaArrowLeft,
  FaCheckCircle,
  FaInfoCircle,
  FaUpload
} from 'react-icons/fa'

function StartupApplication() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    // Startup Information
    startup_name: '',
    founder_name: '',
    email: '',
    phone_number: '',
    startup_type: '',
    description: '',
    website: '',
    address: '',
    
    // Application Information
    sector: '',
    application_type: '',
    
    // Additional Information
    tags: [],
    business_plan: '',
    funding_requirements: '',
    team_size: '',
    expected_revenue: '',
    target_market: ''
  })
  
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [userProfile, setUserProfile] = useState(null)
  const [requirementsState, setRequirementsState] = useState({ loading: false, error: '', items: [] })
  const [documentsData, setDocumentsData] = useState({})
  const [documentsError, setDocumentsError] = useState('')

  useEffect(() => {
    if (user) {
      setUserProfile(user)
      setFormData(prev => ({
        ...prev,
        founder_name: user.name,
        email: user.email,
      }))
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const normalizeSector = (sector) => {
    if (!sector) return sector
    const map = { homoeopathy: 'homoeopathy' }
    return map[sector] || sector
  }

  useEffect(() => {
    const shouldFetch = formData.sector && formData.application_type
    if (!shouldFetch) {
      setRequirementsState(prev => ({ ...prev, items: [], error: '' }))
      return
    }
    let ignore = false
    setRequirementsState({ loading: true, error: '', items: [] })
    Promise.all([
      RequirementsAPI.get(normalizeSector(formData.sector), formData.application_type),
      RequirementsAPI.getCommon(normalizeSector(formData.sector), formData.application_type),
    ])
      .then(([sectorRes, commonRes]) => {
        if (ignore) return
        const sectorItems = Array.isArray(sectorRes?.requirements) ? sectorRes.requirements : []
        const commonItems = Array.isArray(commonRes?.requirements) ? commonRes.requirements : []
        // Merge common first, then sector-specific (sector can override by same doc_category if needed)
        const mergedMap = new Map()
        for (const it of [...commonItems, ...sectorItems]) {
          mergedMap.set(it.doc_category, it)
        }
        const merged = Array.from(mergedMap.values())
        setRequirementsState({ loading: false, error: '', items: merged })
        setDocumentsError('')
        const nextDocs = {}
        for (const req of merged) {
          const key = req.doc_category
          nextDocs[key] = {
            file: null,
            fields: (req.extract_fields || []).reduce((acc, f) => {
              acc[f.name] = ''
              return acc
            }, {})
          }
        }
        setDocumentsData(nextDocs)
      })
      .catch((err) => {
        if (ignore) return
        setRequirementsState({ loading: false, error: err.message || 'Failed to load requirements', items: [] })
        setDocumentsData({})
        setDocumentsError('')
      })
    return () => { ignore = true }
  }, [formData.sector, formData.application_type])

  const handleDocFileChange = (docCategory, file) => {
    setDocumentsData(prev => ({
      ...prev,
      [docCategory]: { ...(prev[docCategory] || { file: null, fields: {} }), file }
    }))
  }

  const handleDocFieldChange = (docCategory, fieldName, value) => {
    setDocumentsData(prev => ({
      ...prev,
      [docCategory]: {
        ...(prev[docCategory] || { file: null, fields: {} }),
        fields: { ...((prev[docCategory] && prev[docCategory].fields) || {}), [fieldName]: value }
      }
    }))
  }

  const labelize = (slug) => {
    if (!slug) return ''
    return slug
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
  }

  const validateRequiredDocumentsSelected = () => {
    const missing = (requirementsState.items || [])
      .filter(req => req.required !== false) // required by default
      .filter(req => !documentsData[req.doc_category]?.file)
      .map(req => labelize(req.doc_category))

    if (missing.length > 0) {
      setDocumentsError(`Please upload all required documents before submitting: ${missing.join(', ')}`)
      return false
    }
    setDocumentsError('')
    return true
  }

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    setFormData(prev => ({
      ...prev,
      tags
    }))
  }

  const validateStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!formData.startup_name.trim()) newErrors.startup_name = 'Startup name is required'
      if (!formData.founder_name.trim()) newErrors.founder_name = 'Founder name is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
      if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required'
      if (!formData.startup_type.trim()) newErrors.startup_type = 'Startup type is required'
      if (!formData.description.trim()) newErrors.description = 'Description is required'
    }
    
    if (step === 2) {
      if (!formData.sector) newErrors.sector = 'Sector is required'
      if (!formData.application_type) newErrors.application_type = 'Application type is required'
      if (!formData.address.trim()) newErrors.address = 'Address is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(currentStep)) {
      return
    }
    // Ensure required docs are selected before proceeding
    if (!validateRequiredDocumentsSelected()) {
      return
    }
    
    setIsSubmitting(true)
    try {
      // If a startup already exists for this user/email, treat as success to avoid duplicate key error
      try {
        const mine = await StartupAPI.mine()
        const hasExisting = Array.isArray(mine?.startups) && mine.startups.some(s => (s?.email || '').toLowerCase() === (formData.email || '').toLowerCase())
        if (hasExisting) {
          // still require documents to be uploaded before success
          // proceed directly to uploads
        }
      } catch (_) {
        // ignore pre-check errors, proceed to create
      }

      const payload = {
        name: formData.startup_name,
        founder_name: formData.founder_name,
        email: formData.email,
        phone_number: formData.phone_number,
        startup_type: formData.startup_type,
        description: formData.description,
        website: formData.website,
        address: formData.address,
        tags: formData.tags,
        // harmless extras if backend ignores
        sector: formData.sector,
        application_type: formData.application_type,
      }
      try {
        await StartupAPI.create(payload)
      } catch (createErr) {
        const msg = createErr?.message || ''
        if (!/E11000|duplicate key/i.test(msg)) {
          throw createErr
        }
        // duplicate -> continue to upload documents
      }

      // Upload all selected documents (required and any optional selected)
      const filesToUpload = []
      for (const req of requirementsState.items) {
        const doc = documentsData[req.doc_category]
        if (doc?.file) {
          filesToUpload.push({ category: req.doc_category, file: doc.file })
        }
      }
      for (const item of filesToUpload) {
        await DocumentAPI.upload(item.file, { doc_category_declared: item.category })
      }

      navigate('/StartupOwner/profile')
    } catch (error) {
      // Suppress alerts per requirement; still navigate to profile page
      console.error('Create startup failed', error)
      navigate('/StartupOwner/profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    navigate('/StartupOwner/dashboard')
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Startup Information</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="startup_name" className="block text-sm font-medium text-gray-700 mb-2">
            Startup Name *
          </label>
          <input
            type="text"
            id="startup_name"
            name="startup_name"
            value={formData.startup_name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.startup_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your startup name"
          />
          {errors.startup_name && <p className="mt-1 text-sm text-red-600">{errors.startup_name}</p>}
        </div>

        <div>
          <label htmlFor="founder_name" className="block text-sm font-medium text-gray-700 mb-2">
            Founder Name *
          </label>
          <input
            type="text"
            id="founder_name"
            name="founder_name"
            value={formData.founder_name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.founder_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter founder name"
          />
          {errors.founder_name && <p className="mt-1 text-sm text-red-600">{errors.founder_name}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter email address"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.phone_number ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter phone number"
          />
          {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="startup_type" className="block text-sm font-medium text-gray-700 mb-2">
          Startup Type *
        </label>
        <select
          id="startup_type"
          name="startup_type"
          value={formData.startup_type}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.startup_type ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select startup type</option>
          <option value="healthcare_tech">Healthcare Technology</option>
          <option value="wellness_services">Wellness Services</option>
          <option value="product_manufacturing">Product Manufacturing</option>
          <option value="consulting">Consulting</option>
          <option value="education_training">Education & Training</option>
          <option value="research_development">Research & Development</option>
        </select>
        {errors.startup_type && <p className="mt-1 text-sm text-red-600">{errors.startup_type}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Startup Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe your startup, its mission, and what makes it unique"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
          Website (Optional)
        </label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
          placeholder="https://yourstartup.com"
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Application Details</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">
            AYUSH Sector *
          </label>
          <select
            id="sector"
            name="sector"
            value={formData.sector}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.sector ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select AYUSH sector</option>
            <option value="ayurveda">Ayurveda</option>
            <option value="yoga">Yoga</option>
            <option value="unani">Unani</option>
            <option value="siddha">Siddha</option>
            <option value="homoeopathy">Homeopathy</option>
          </select>
          {errors.sector && <p className="mt-1 text-sm text-red-600">{errors.sector}</p>}
        </div>

        <div>
          <label htmlFor="application_type" className="block text-sm font-medium text-gray-700 mb-2">
            Application Type *
          </label>
          <select
            id="application_type"
            name="application_type"
            value={formData.application_type}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.application_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select application type</option>
            <option value="startup_registration">Startup Registration</option>
            <option value="manufacturing_own">Manufacturing (Own)</option>
            <option value="loan_license">Loan License</option>
            <option value="clinic">Clinic</option>
            <option value="training_center">Training Center</option>
          </select>
          {errors.application_type && <p className="mt-1 text-sm text-red-600">{errors.application_type}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Business Address *
        </label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter complete business address"
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
          Tags (Optional)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags.join(', ')}
          onChange={handleTagsChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
          placeholder="Enter tags separated by commas (e.g., healthcare, technology, wellness)"
        />
        <p className="mt-1 text-sm text-gray-500">Separate multiple tags with commas</p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h3>

      {!formData.sector || !formData.application_type ? (
        <p className="text-sm text-gray-600">Select AYUSH sector and application type to view required documents.</p>
      ) : requirementsState.loading ? (
        <p className="text-sm text-gray-600">Loading requirements...</p>
      ) : requirementsState.error ? (
        <p className="text-sm text-red-600">{requirementsState.error}</p>
      ) : requirementsState.items.length === 0 ? (
        <p className="text-sm text-gray-600">No requirements found.</p>
      ) : (
        <div className="space-y-6">
          {documentsError && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{documentsError}</div>
          )}
          {requirementsState.items.map((req) => (
            <div key={req.doc_category} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{labelize(req.doc_category)}</p>
                  {req.note && <p className="text-xs text-gray-600 mt-1">{req.note}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${req.required === false ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                  {req.required === false ? 'Optional' : 'Required'}
                </span>
              </div>

              {(req.extract_fields && req.extract_fields.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  {req.extract_fields.map((f) => (
                    <div key={f.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label || labelize(f.name)}</label>
                      <input
                        type="text"
                        value={documentsData[req.doc_category]?.fields?.[f.name] || ''}
                        onChange={(e) => handleDocFieldChange(req.doc_category, f.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                        placeholder={`Enter ${f.label || labelize(f.name)}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document</label>
                <input
                  type="file"
                  onChange={(e) => handleDocFileChange(req.doc_category, e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ayush-50 file:text-ayush-700 hover:file:bg-ayush-100"
                />
                {documentsData[req.doc_category]?.file && (
                  <p className="mt-1 text-xs text-gray-600">Selected: {documentsData[req.doc_category].file.name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
            </div>
            <button 
              onClick={handleBack}
              className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <FaRocket className="text-6xl text-ayush-600 mx-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Startup Application
            </h1>
            <p className="text-gray-600">
              Complete the form below to submit your AYUSH startup registration application.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of 3</span>
              <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-ayush-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8">
              <button
                type="button"
                onClick={currentStep === 1 ? handleBack : handlePrevious}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {currentStep === 1 ? 'Cancel' : 'Previous'}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-ayush-600 hover:bg-ayush-700 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Info Section */}
          <div className="mt-8 p-6 bg-ayush-50 rounded-lg">
            <div className="flex items-start">
              <FaInfoCircle className="text-ayush-600 text-xl mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Application Process</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your application will be reviewed by AYUSH officials</li>
                  <li>• You may be contacted for additional information or documents</li>
                  <li>• The review process typically takes 15-30 business days</li>
                  <li>• You can track your application status in the dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartupApplication

