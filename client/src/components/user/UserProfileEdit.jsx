import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthAPI } from '../../api'

export default function UserProfileEdit() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    organization: '',
    investment_sector: '',
    designation: '',
    department: '',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const p = await AuthAPI.profile()
        if (!mounted) return
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
    if (!form.name?.trim() || !form.email?.trim()) {
      setError('Name and Email are required')
      return
    }
    setSaving(true)
    try {
      await AuthAPI.updateProfile(form)
      navigate('/user/dashboard')
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">AYUSH</div>
            <Link to="/user/dashboard" className="text-ayush-600">Back to Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-transparent dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Profile</h1>
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleSave} className="grid gap-4">
            <Field label="Name">
              <Input value={form.name} onChange={(v)=>setForm({...form, name:v})} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(v)=>setForm({...form, email:v})} required disabled />
            </Field>
            <Field label="Phone">
              <Input value={form.phone_number} onChange={(v)=>setForm({...form, phone_number:v})} />
            </Field>
            <Field label="Organization">
              <Input value={form.organization} onChange={(v)=>setForm({...form, organization:v})} />
            </Field>
            <Field label="Investment Sector">
              <Input value={form.investment_sector} onChange={(v)=>setForm({...form, investment_sector:v})} />
            </Field>
            <Field label="Designation">
              <Input value={form.designation} onChange={(v)=>setForm({...form, designation:v})} />
            </Field>
            <Field label="Department">
              <Input value={form.department} onChange={(v)=>setForm({...form, department:v})} />
            </Field>
            <Field label="Avatar URL">
              <Input value={form.avatar_url} onChange={(v)=>setForm({...form, avatar_url:v})} />
            </Field>

            <button disabled={saving} className="mt-2 w-full bg-ayush-600 hover:bg-ayush-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60 shadow">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', required = false, disabled = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className={`w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ayush-500 ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
    />
  )
}

