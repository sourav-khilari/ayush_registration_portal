import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StartupAPI } from '../api'

function SubmittedApplication() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startup, setStartup] = useState(null)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await StartupAPI.mine()
        const first = Array.isArray(res?.startups) ? res.startups[0] : null
        if (!mounted) return
        if (!first) {
          setError('No submitted application found')
        } else {
          setStartup(first)
          setForm({
            name: first.name || '',
            founder_name: first.founder_name || '',
            email: first.email || '',
            phone_number: first.phone_number || '',
            startup_type: first.startup_type || '',
            description: first.description || '',
            website: first.website || '',
            address: first.address || '',
            tags: (first.tags || []).join(', '),
          })
        }
      } catch (e) {
        setError(e.message || 'Failed to load application')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!startup) return
    try {
      const payload = {
        ...startup,
        name: form.name,
        founder_name: form.founder_name,
        email: form.email,
        phone_number: form.phone_number,
        startup_type: form.startup_type,
        description: form.description,
        website: form.website,
        address: form.address,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      await StartupAPI.update(startup._id, payload)
      setEdit(false)
      // reload
      const res = await StartupAPI.get(startup._id)
      setStartup(res)
    } catch (e) {
      setError(e.message || 'Update failed')
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading...</div>
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!startup) return <div className="p-6 text-sm text-gray-600">No application found.</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Submitted Application</h2>
        {!edit ? (
          <button onClick={() => setEdit(true)} className="btn-primary">Edit</button>
        ) : (
          <div className="space-x-2">
            <button onClick={() => setEdit(false)} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[
          { key: 'name', label: 'Startup Name' },
          { key: 'founder_name', label: 'Founder Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone_number', label: 'Phone Number' },
          { key: 'startup_type', label: 'Startup Type' },
          { key: 'website', label: 'Website' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm text-gray-700 mb-1">{f.label}</label>
            {edit ? (
              <input type="text" name={f.key} value={form[f.key] || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            ) : (
              <div className="text-gray-900">{startup[f.key] || '-'}</div>
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm text-gray-700 mb-1">Address</label>
          {edit ? (
            <textarea name="address" value={form.address || ''} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded" />
          ) : (
            <div className="text-gray-900 whitespace-pre-wrap">{startup.address || '-'}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Description</label>
          {edit ? (
            <textarea name="description" value={form.description || ''} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded" />
          ) : (
            <div className="text-gray-900 whitespace-pre-wrap">{startup.description || '-'}</div>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Tags</label>
          {edit ? (
            <input type="text" name="tags" value={form.tags || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
          ) : (
            <div className="text-gray-900">{(startup.tags || []).join(', ') || '-'}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubmittedApplication
