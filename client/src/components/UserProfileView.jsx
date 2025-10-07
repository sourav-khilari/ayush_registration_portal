import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthAPI } from '../api'

export default function UserProfileView() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const p = await AuthAPI.profile()
        if (!mounted) return
        setProfile(p)
      } catch (e) {
        setError(e.message || 'Failed to load profile')
      }
    })()
    return () => { mounted = false }
  }, [])

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold text-gray-900">AYUSH</div>
            <Link to="/user/dashboard" className="text-ayush-600">Back to Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Details</h1>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Field label="Name" value={profile.name} />
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone_number} />
            <Field label="Role" value={profile.role} />
            <Field label="Role Verified" value={String(profile.role_verified)} />
            <Field label="Organization" value={profile.organization} />
            <Field label="Investment Sector" value={profile.investment_sector} />
            <Field label="Designation" value={profile.designation} />
            <Field label="Department" value={profile.department} />
            <Field label="Active" value={String(profile.is_active)} />
            <Field label="Last Login" value={profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : ''} />
            <Field label="Avatar URL" value={profile.avatar_url} />
          </div>
        </div>
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


