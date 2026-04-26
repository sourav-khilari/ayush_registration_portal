import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { StartupAPI, DocumentAPI, ConversationAPI } from '../../api'
import FinancialMetricsSection from './FinancialMetricsSection'
import { 
  FaUser, 
  FaBuilding, 
  FaFileAlt, 
  FaEdit, 
  FaSave, 
  FaTimes,
  FaDownload,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaTag,
  FaArrowLeft,
  FaLeaf
} from 'react-icons/fa'

function StartupOwnerProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startups, setStartups] = useState([])
  const [selectedStartupId, setSelectedStartupId] = useState(null)
  const [startup, setStartup] = useState(null)
  const [documents, setDocuments] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [chatList, setChatList] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const startupIdFromQuery = params.get("startupId")
    const conversationIdFromQuery = params.get("conversationId")
    if (startupIdFromQuery) setSelectedStartupId(startupIdFromQuery)
    if (conversationIdFromQuery) setSelectedConversationId(conversationIdFromQuery)
  }, [location.search])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const startupRes = await StartupAPI.mine()
      const list = Array.isArray(startupRes?.startups) ? startupRes.startups : []
      setStartups(list)

      const firstStartup = list[0] || null
      const idToUse = selectedStartupId || firstStartup?._id || null
      setSelectedStartupId(idToUse)

      if (idToUse) {
        const current = list.find((s) => String(s._id) === String(idToUse)) || firstStartup
        if (current) {
          setStartup(current)
          setFormData({
            name: current.name || '',
            founder_name: current.founder_name || '',
            email: current.email || '',
            phone_number: current.phone_number || '',
            startup_type: current.startup_type || '',
            description: current.description || '',
            website: current.website || '',
            address: current.address || '',
            tags: (current.tags || []).join(', ')
          })
          const docsRes = await DocumentAPI.list({ startup_id: current._id })
          setDocuments(Array.isArray(docsRes?.documents) ? docsRes.documents : [])
        }
      } else {
        setStartup(null)
        setDocuments([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadChats = async (startupId) => {
    if (!startupId) return
    try {
      setChatLoading(true)
      const res = await ConversationAPI.listForStartup(startupId)
      const items = Array.isArray(res?.items) ? res.items : []
      setChatList(items)
      // auto-select first investor conversation
      if (!selectedConversationId && items.length) {
        setSelectedConversationId(items[0]._id)
      }
    } catch (e) {
      // keep chat optional; don't block profile
      console.error('Failed to load chats', e)
    } finally {
      setChatLoading(false)
    }
  }

  const getDocumentUrl = (doc) => {
    if (!doc?.fileUrl) return null
    const apiBase = import.meta.env.VITE_API_BASE || ''
    const uploadBase = apiBase.replace(/\/api\/?$/, '') || window.location.origin
    return `${uploadBase}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`
  }

  const getCertificateUrl = () => {
    const certPath = startup?.certificate_url
    if (!certPath) return null
    const s = String(certPath)
    if (s.startsWith("http://") || s.startsWith("https://")) return s
    const apiBase = import.meta.env.VITE_API_BASE || ""
    const base = apiBase.replace(/\/api\/?$/, "") || window.location.origin
    return `${base}${s.startsWith("/") ? "" : "/"}${s}`
  }

  // Poll documents while any OCR is processing
  useEffect(() => {
    if (!startup || !documents || documents.length === 0) return
    const hasProcessing = documents.some(d => d.ocr_status === 'processing' || d.ocr_status === 'pending')
    if (!hasProcessing) return
    const id = setInterval(async () => {
      try {
        const updated = await DocumentAPI.list({ startup_id: startup._id })
        setDocuments(Array.isArray(updated?.documents) ? updated.documents : [])
      } catch {
        void 0
      }
    }, 4000)
    return () => clearInterval(id)
  }, [startup, documents])

  // Load investor chats for selected startup
  useEffect(() => {
    if (!startup?._id) return
    loadChats(startup._id)
    // No auto-refresh here (manual refresh only) to avoid polling every 5 seconds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startup?._id])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!startup) return
    
    try {
      const payload = {
        ...startup,
        name: formData.name,
        founder_name: formData.founder_name,
        email: formData.email,
        phone_number: formData.phone_number,
        startup_type: formData.startup_type,
        description: formData.description,
        website: formData.website,
        address: formData.address,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      
      await StartupAPI.update(startup._id, payload)
      setEditMode(false)
      await loadData() // Reload data
    } catch (err) {
      setError(err.message || 'Update failed')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FaCheckCircle className="text-green-500" />
      case 'pending': return <FaClock className="text-yellow-500" />
      case 'under_review': return <FaClock className="text-blue-500" />
      case 'rejected': return <FaExclamationTriangle className="text-red-500" />
      default: return <FaClock className="text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'under_review': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const startupStatus = String(startup?.status || "").toLowerCase()
  const hasBlockingStartup = ['pending', 'approved', 'under_review'].includes(startupStatus)
  const canSubmitNewApplication = !hasBlockingStartup

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <FaBuilding className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No startup application found</p>
          <button onClick={() => navigate('/StartupOwner/startup-application')} className="btn-primary">
            Create Application
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">AYUSH</span>
            </div>
            <button 
              onClick={() => navigate('/StartupOwner/dashboard')}
              className="text-gray-700 dark:text-gray-200 hover:text-ayush-600 transition-colors flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Header */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Startup Owner Profile</h1>
                  <p className="text-gray-600 dark:text-gray-300">Manage your startups and documents</p>
                  {startups.length > 1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You have {startups.length} startups. Switch between them to see previous and new documents.
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(startup.status)}`}>
                    {getStatusIcon(startup.status)}
                    <span className="ml-2 capitalize">{startup.status.replace('_', ' ')}</span>
                  </span>
                  {startups.length > 1 && (
                    <select
                      value={selectedStartupId || startup._id}
                      onChange={async (e) => {
                        const id = e.target.value || null
                        setSelectedStartupId(id)
                        // reload docs for selected startup
                        try {
                          if (id) {
                            const current = startups.find((s) => String(s._id) === String(id))
                            if (current) {
                              setStartup(current)
                              setFormData({
                                name: current.name || '',
                                founder_name: current.founder_name || '',
                                email: current.email || '',
                                phone_number: current.phone_number || '',
                                startup_type: current.startup_type || '',
                                description: current.description || '',
                                website: current.website || '',
                                address: current.address || '',
                                tags: (current.tags || []).join(', ')
                              })
                              const docsRes = await DocumentAPI.list({ startup_id: current._id })
                              setDocuments(Array.isArray(docsRes?.documents) ? docsRes.documents : [])
                            }
                          }
                        } catch (e2) {
                          console.error("Failed to load documents for selected startup", e2)
                        }
                      }}
                      className="ml-4 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ayush-500"
                    >
                      {startups.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="btn-secondary">
                      <FaEdit className="mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <FaTimes className="mr-2" />
                        Cancel
                      </button>
                      <button onClick={handleSave} className="btn-primary">
                        <FaSave className="mr-2" />
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <FaUser className="mr-3 text-ayush-600" />
                Personal Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaBuilding className="mr-2" />
                    Startup Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    />
                  ) : (
                    <p className="text-gray-900">{startup.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaUser className="mr-2" />
                    Founder Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="founder_name"
                      value={formData.founder_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    />
                  ) : (
                    <p className="text-gray-900">{startup.founder_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaEnvelope className="mr-2" />
                    Email
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    />
                  ) : (
                    <p className="text-gray-900">{startup.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaPhone className="mr-2" />
                    Phone Number
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    />
                  ) : (
                    <p className="text-gray-900">{startup.phone_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Startup Type</label>
                  {editMode ? (
                    <select
                      name="startup_type"
                      value={formData.startup_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    >
                      <option value="healthcare_tech">Healthcare Technology</option>
                      <option value="wellness_services">Wellness Services</option>
                      <option value="product_manufacturing">Product Manufacturing</option>
                      <option value="consulting">Consulting</option>
                      <option value="education_training">Education & Training</option>
                      <option value="research_development">Research & Development</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{startup.startup_type?.replace('_', ' ')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FaGlobe className="mr-2" />
                    Website
                  </label>
                  {editMode ? (
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {startup.website ? (
                        <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-ayush-600 hover:underline">
                          {startup.website}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaMapMarkerAlt className="mr-2" />
                  Address
                </label>
                {editMode ? (
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{startup.address}</p>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {editMode ? (
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{startup.description}</p>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaTag className="mr-2" />
                  Tags
                </label>
                {editMode ? (
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="Enter tags separated by commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(startup.tags || []).map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-ayush-100 text-ayush-800 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Documents Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <FaFileAlt className="mr-3 text-ayush-600" />
                Submitted Documents
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FaFileAlt className="text-gray-400 text-4xl mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc, index) => {
                    const docUrl = getDocumentUrl(doc)
                    return (
                    <div key={doc._id || index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FaFileAlt className="text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{doc.document_name || doc.filename || `Document ${index + 1}`}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Uploaded: {new Date(doc.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.ocr_status === 'done' ? 'bg-green-100 text-green-800' :
                            doc.ocr_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            doc.ocr_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            OCR: {doc.ocr_status || 'pending'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.verified_status === 'verified' ? 'bg-green-100 text-green-800' :
                            doc.verified_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Verify: {doc.verified_status || 'pending'}
                          </span>
                          {docUrl && (
                            <>
                              <a href={docUrl} target="_blank" rel="noreferrer" className="p-2 text-ayush-600 hover:text-ayush-700 transition-colors" title="View">
                                <FaEye />
                              </a>
                              <a href={docUrl} download={(doc.document_name || doc.filename || 'document').split('/').pop()} className="p-2 text-ayush-600 hover:text-ayush-700 transition-colors" title="Download">
                                <FaDownload />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      {doc.rejection_reason && (
                        <p className="mt-2 text-sm text-red-600">{doc.rejection_reason}</p>
                      )}
                      {doc.ocr_text && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Extracted Text</p>
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{doc.ocr_text}</pre>
                        </div>
                      )}
                      {doc.extracted_fields && Object.keys(doc.extracted_fields || {}).length > 0 && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Extracted Fields</p>
                          <div className="grid md:grid-cols-2 gap-2">
                            {Object.entries(doc.extracted_fields).map(([k, v]) => (
                              <div key={k} className="text-sm">
                                <span className="text-gray-600 dark:text-gray-300 mr-2">{k}:</span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">{(v && typeof v === 'object' && v.value !== undefined) ? String(v.value) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Link to standalone Financial Dashboard */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Financial Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                View and manage detailed financial metrics for your startup in a dedicated dashboard.
              </p>
              <button
                onClick={() => navigate("/StartupOwner/profile/finacial-matrix")}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-ayush-600 text-white text-sm font-semibold hover:bg-ayush-700"
              >
                Open Financial Dashboard
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Status Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Application Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(startup.status)}`}>
                    {getStatusIcon(startup.status)}
                    <span className="ml-2 capitalize">{startup.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Submitted</span>
                  <span className="text-sm text-gray-900">
                    {new Date(startup.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {new Date(startup.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {startup.status_updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Gov. Decision Date</span>
                    <span className="text-sm text-gray-900">
                      {new Date(startup.status_updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {startup.status === "approved" && startup.certificate_url && (
                  <div className="pt-2">
                    <a
                      href={getCertificateUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                    >
                      <FaDownload className="mr-2" />
                      Download Certificate
                    </a>
                    {startup.certificate_id && (
                      <p className="mt-2 text-[11px] text-gray-500 text-center">
                        Certificate ID: {startup.certificate_id}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (!canSubmitNewApplication) return
                    navigate('/StartupOwner/startup-application')
                  }}
                  disabled={!canSubmitNewApplication}
                  className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                    canSubmitNewApplication
                      ? "text-gray-700 hover:bg-gray-50"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  {canSubmitNewApplication
                    ? "Submit New Application"
                    : "Submit New Application (Disabled)"}
                </button>
                {!canSubmitNewApplication && (
                  <p className="px-1 text-xs text-gray-500">
                    New application is enabled only after current startup is rejected.
                  </p>
                )}
                <button 
                  onClick={() => navigate('/StartupOwner/dashboard')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Chat with Investors */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Connect with Investors
              </h3>
              <button
                type="button"
                onClick={() => navigate("/messages")}
                className="w-full btn-secondary mb-3"
              >
                Go to Chat Dashboard
              </button>
              {!startup ? (
                <p className="text-sm text-gray-500">Select a startup to view chats.</p>
              ) : chatLoading ? (
                <p className="text-sm text-gray-500">Loading conversations…</p>
              ) : chatList.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No investor messages yet.
                </p>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Choose Investor
                  </label>
                  <select
                    value={selectedConversationId || ""}
                    onChange={(e) => setSelectedConversationId(e.target.value)}
                    className="w-full mb-3 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ayush-500"
                  >
                    {chatList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.investor?.name || c.investor?.email || "Investor"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?conversationId=${encodeURIComponent(selectedConversationId || "")}`)}
                    className="w-full btn-primary"
                    disabled={!selectedConversationId}
                  >
                    Open Full Chat Workspace
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartupOwnerProfile

