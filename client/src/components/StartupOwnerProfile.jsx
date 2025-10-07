import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StartupAPI, DocumentAPI } from '../api'
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
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startup, setStartup] = useState(null)
  const [documents, setDocuments] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [startupRes, docsRes] = await Promise.all([
        StartupAPI.mine(),
        DocumentAPI.requirements()
      ])
      
      const firstStartup = Array.isArray(startupRes?.startups) ? startupRes.startups[0] : null
      if (firstStartup) {
        setStartup(firstStartup)
        setFormData({
          name: firstStartup.name || '',
          founder_name: firstStartup.founder_name || '',
          email: firstStartup.email || '',
          phone_number: firstStartup.phone_number || '',
          startup_type: firstStartup.startup_type || '',
          description: firstStartup.description || '',
          website: firstStartup.website || '',
          address: firstStartup.address || '',
          tags: (firstStartup.tags || []).join(', ')
        })
      }
      
      setDocuments(Array.isArray(docsRes?.documents) ? docsRes.documents : [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
            </div>
            <button 
              onClick={() => navigate('/StartupOwner/dashboard')}
              className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center"
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{startup.name}</h1>
                  <p className="text-gray-600">Startup Owner Profile</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(startup.status)}`}>
                    {getStatusIcon(startup.status)}
                    <span className="ml-2 capitalize">{startup.status.replace('_', ' ')}</span>
                  </span>
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="btn-secondary">
                      <FaEdit className="mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
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
                  {documents.map((doc, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FaFileAlt className="text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.filename || `Document ${index + 1}`}</p>
                            <p className="text-sm text-gray-500">
                              Uploaded: {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status || 'Pending'}
                          </span>
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <FaEye />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <FaDownload />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Status Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
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
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/StartupOwner/startup-application')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Submit New Application
                </button>
                <button 
                  onClick={() => navigate('/StartupOwner/dashboard')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartupOwnerProfile
