import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import CompleteProfile from './components/CompleteProfile'
import StartupApplication from './components/StartupApplication'
import Login from './components/Login'
import Signup from './components/Signup'
import PrivateRoute from './components/PrivateRoute'
import { AuthProvider } from './context/AuthContext'
import UserProfile from './components/UserProfile'
import UserDashboard from './components/UserDashboard'
import UserProfileEdit from './components/UserProfileEdit'
import UserProfileView from './components/UserProfileView'
import SubmittedApplication from './components/SubmittedApplication'
import StartupOwnerProfile from './components/StartupOwnerProfile'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/StartupOwner/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/StartupOwner/complete-profile" element={<PrivateRoute><CompleteProfile /></PrivateRoute>} />
          <Route path="/StartupOwner/startup-application" element={<PrivateRoute><StartupApplication /></PrivateRoute>} />
          <Route path="/user/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          <Route path="/user/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/user/profile/view" element={<PrivateRoute><UserProfileView /></PrivateRoute>} />
            <Route path="/StartupOwner/application/submitted" element={<PrivateRoute><SubmittedApplication /></PrivateRoute>} />
            <Route path="/StartupOwner/profile" element={<PrivateRoute><StartupOwnerProfile /></PrivateRoute>} />
          <Route path="/user/profile/edit" element={<PrivateRoute><UserProfileEdit /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
