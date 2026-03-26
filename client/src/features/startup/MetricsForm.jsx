import React, { useState } from 'react'
import { apiRequest } from '../../api/base'

export default function MetricsForm({ startupId, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    month: '',
    revenue: '',
    users: '',
    paying_customers: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validate = () => {
    const { month, revenue, users, paying_customers } = formData

    if (!startupId) {
      return 'Startup ID is required'
    }

    if (!month) {
      return 'Month is required'
    }

    if (revenue === '' || users === '' || paying_customers === '') {
      return 'All numeric fields are required'
    }

    const numericRevenue = Number(revenue)
    const numericUsers = Number(users)
    const numericPayingCustomers = Number(paying_customers)

    if (Number.isNaN(numericRevenue) || Number.isNaN(numericUsers) || Number.isNaN(numericPayingCustomers)) {
      return 'Revenue, users and paying customers must be valid numbers'
    }

    if (numericRevenue < 0 || numericUsers < 0 || numericPayingCustomers < 0) {
      return 'Negative values are not allowed'
    }

    return ''
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const resetForm = () => {
    setFormData({
      month: '',
      revenue: '',
      users: '',
      paying_customers: '',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    try {
      setLoading(true)

      await apiRequest(`/startup/${startupId}/metrics`, {
        method: 'POST',
        body: JSON.stringify({
          month: formData.month,
          revenue: Number(formData.revenue),
          users: Number(formData.users),
          paying_customers: Number(formData.paying_customers),
        }),
      })

      resetForm()
      setSuccess('Metrics saved successfully')

      if (onSaveSuccess) {
        onSaveSuccess()
      }
    } catch (requestError) {
      setError(requestError?.message || 'Failed to save metrics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Metrics Form</h3>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="month" className="mb-1 block text-sm font-medium text-gray-700">
            Month
          </label>
          <input
            id="month"
            name="month"
            type="month"
            value={formData.month}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ayush-600 focus:outline-none focus:ring-1 focus:ring-ayush-600"
          />
        </div>

        <div>
          <label htmlFor="revenue" className="mb-1 block text-sm font-medium text-gray-700">
            Revenue
          </label>
          <input
            id="revenue"
            name="revenue"
            type="number"
            min="0"
            step="any"
            value={formData.revenue}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ayush-600 focus:outline-none focus:ring-1 focus:ring-ayush-600"
          />
        </div>

        <div>
          <label htmlFor="users" className="mb-1 block text-sm font-medium text-gray-700">
            Users
          </label>
          <input
            id="users"
            name="users"
            type="number"
            min="0"
            step="1"
            value={formData.users}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ayush-600 focus:outline-none focus:ring-1 focus:ring-ayush-600"
          />
        </div>

        <div>
          <label htmlFor="paying_customers" className="mb-1 block text-sm font-medium text-gray-700">
            Paying Customers
          </label>
          <input
            id="paying_customers"
            name="paying_customers"
            type="number"
            min="0"
            step="1"
            value={formData.paying_customers}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ayush-600 focus:outline-none focus:ring-1 focus:ring-ayush-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md bg-ayush-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ayush-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Metrics'}
        </button>
      </form>
    </div>
  )
}
