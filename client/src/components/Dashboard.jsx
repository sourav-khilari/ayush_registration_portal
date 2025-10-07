import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FaLeaf, 
  FaUser, 
  FaRocket, 
  FaChartLine, 
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaArrowRight,
  FaHome
} from 'react-icons/fa'

function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [profileComplete, setProfileComplete] = useState(false)

  useEffect(() => {
    if (user) {
      setUserProfile({ name: user.name, email: user.email, role: user.role })
      setProfileComplete(true)
    }
  }, [user])

  const handleCompleteProfile = () => {
    navigate('/StartupOwner/complete-profile')
  }

  const handleApplyForStartup = () => {
    navigate('/StartupOwner/startup-application')
  }

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
                {userProfile ? `Welcome, ${userProfile.name}` : 'Welcome'}
              </div>
            <button onClick={logout} className="text-sm text-red-600">Logout</button>
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
              Startup Owner Dashboard
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Manage your AYUSH startup registration and track your application progress
            </p>
            
            {userProfile && (
              <div className="bg-ayush-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center mb-4">
                  <FaUser className="text-4xl text-ayush-600 mr-4" />
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900">{userProfile.name}</h3>
                    <p className="text-gray-600">{userProfile.email}</p>
                    <p className="text-sm text-ayush-600 font-medium">{userProfile.role}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Complete Profile Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                {profileComplete ? (
                  <FaCheckCircle className="text-6xl text-green-500 mx-auto" />
                ) : (
                  <FaUser className="text-6xl text-ayush-600 mx-auto" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {profileComplete ? 'Profile Complete' : 'Complete Your Profile'}
              </h3>
              <p className="text-gray-600 mb-6">
                {profileComplete 
                  ? 'Your profile has been successfully completed and saved.'
                  : 'Complete your profile by providing your name, email, and role information.'
                }
              </p>
              {!profileComplete && (
                <button 
                  onClick={handleCompleteProfile}
                  className="btn-primary w-full"
                >
                  Complete Profile <FaArrowRight className="inline ml-2" />
                </button>
              )}
              {profileComplete && (
                <div className="flex items-center justify-center text-green-600">
                  <FaCheckCircle className="mr-2" />
                  <span className="font-semibold">Profile Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Apply for Startup Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <FaRocket className="text-6xl text-ayush-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Apply for Startup Registration
              </h3>
              <p className="text-gray-600 mb-6">
                Submit your startup application with all required information and documents.
              </p>
              <button 
                onClick={handleApplyForStartup}
                disabled={!profileComplete}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
                  profileComplete 
                    ? 'bg-ayush-600 hover:bg-ayush-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {profileComplete ? 'Apply for Startup' : 'Complete Profile First'}
                {profileComplete && <FaArrowRight className="inline ml-2" />}
              </button>
              {!profileComplete && (
                <p className="text-sm text-gray-500 mt-2">
                  Complete your profile first to access this feature
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Application Status</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaClock className="text-4xl text-yellow-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Profile Status</h4>
              <p className="text-gray-600">
                {profileComplete ? 'Completed' : 'Pending'}
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaFileAlt className="text-4xl text-blue-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Application Status</h4>
              <p className="text-gray-600">
                {profileComplete ? 'Ready to Apply' : 'Profile Required'}
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <FaChartLine className="text-4xl text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Progress</h4>
              <p className="text-gray-600">
                {profileComplete ? '50% Complete' : '25% Complete'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Link 
              to="/StartupOwner/complete-profile" 
              className="p-4 bg-ayush-50 hover:bg-ayush-100 rounded-lg text-center transition-colors"
            >
              <FaUser className="text-2xl text-ayush-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Update Profile</span>
            </Link>
            
            <Link 
              to="/StartupOwner/startup-application" 
              className={`p-4 rounded-lg text-center transition-colors ${
                profileComplete 
                  ? 'bg-ayush-50 hover:bg-ayush-100' 
                  : 'bg-gray-100 cursor-not-allowed'
              }`}
            >
              <FaRocket className="text-2xl text-ayush-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">New Application</span>
            </Link>
            
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
              <FaFileAlt className="text-2xl text-gray-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">View Documents</span>
            </button>
            
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
              <FaChartLine className="text-2xl text-gray-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Track Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

