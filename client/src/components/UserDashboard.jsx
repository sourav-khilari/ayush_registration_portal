import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FaLeaf,
  FaUser,
  FaFileAlt,
  FaChartLine,
  FaCheckCircle,
  FaEdit,
  FaHome
} from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { AuthAPI } from '../api'

export default function UserDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showProfile, setShowProfile] = useState(true)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const p = await AuthAPI.profile()
        if (!mounted) return
        setProfile(p)
        setForm({
          name: p.name || '',
          email: p.email || '',
          phone_number: p.phone_number || '',
          organization: p.organization || '',
          investment_sector: p.investment_sector || '',
          designation: p.designation || '',
          department: p.department || '',
          avatar_url: p.avatar_url || '',
        })
      } catch (e) {
        setError(e.message || 'Failed to load profile')
      }
    })()
    return () => { mounted = false }
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.name?.trim() || !form.email?.trim()) {
      setError('Name and Email are required')
      return
    }
    setSaving(true)
    try {
      const updated = await AuthAPI.updateProfile(form)
      setSuccess('Profile updated successfully')
      setProfile((prev) => ({ ...prev, ...form }))
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

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
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center">
                <FaHome className="mr-2" />
                Home
              </Link>
              <div className="text-gray-700">
                {profile ? `Welcome, ${profile.name}` : 'Welcome'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              User Dashboard
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Manage your AYUSH profile and view your account details
            </p>
            <div className="bg-ayush-50 rounded-lg p-6 mb-6 inline-block">
              <div className="flex items-center justify-center">
                <FaUser className="text-4xl text-ayush-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-900">{profile.name}</h3>
                  <p className="text-gray-600">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <FaCheckCircle className="text-6xl text-green-500 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Profile</h3>
              <p className="text-gray-600 mb-6">
                View your profile information and account status
              </p>
              <Link 
                to="/user/profile/view"
                className="btn-primary w-full inline-block text-center"
              >
                View Profile
              </Link>
              {/* Profile details moved to /user/profile/view */}
            </div>
          </div>

          {/* Update Profile Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <FaEdit className="text-6xl text-ayush-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Update Profile</h3>
              <p className="text-gray-600 mb-6">
                Edit your personal and organizational details
              </p>
              <Link 
                to="/user/profile/edit"
                className="w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 bg-ayush-600 hover:bg-ayush-700 text-white inline-block text-center"
              >
                Edit Profile
              </Link>
              {/* Edit form moved to /user/profile/edit */}
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Account Status</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Profile Status</h4>
              <p className="text-gray-600">
                {(profile.name && profile.email) ? 'Completed' : 'Incomplete'}
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaFileAlt className="text-4xl text-blue-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Verification</h4>
              <p className="text-gray-600">{profile.role_verified ? 'Verified' : 'Pending'}</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaChartLine className="text-4xl text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Activity</h4>
              <p className="text-gray-600">{profile.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>

        {/* Detail panels moved into cards above */}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900">{value || '-'}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required = false, disabled = false }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}{required ? ' *' : ''}</label>
      <input
        type={type}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500 ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}


