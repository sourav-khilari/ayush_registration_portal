import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthAPI } from '../api'

export default function UserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState("")

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
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100">
      <nav className="bg-white/90 backdrop-blur shadow">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-gray-900">AYUSH</div>
          <Link to="/" className="text-ayush-600">Home</Link>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">User Profile</h1>
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 grid md:grid-cols-2 gap-6 border border-ayush-100">
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
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-gray-900">{value || '-'}</div>
    </div>
  )
}


