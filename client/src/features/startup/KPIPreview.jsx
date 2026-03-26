import React from 'react'

function formatNumber(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString('en-IN')
}

function formatCurrency(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return '₹0'
  return `₹${num.toLocaleString('en-IN')}`
}

function formatPercent(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return '0%'
  return `${num.toFixed(1)}%`
}

export default function KPIPreview({ kpis }) {
  if (!kpis) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">No metrics yet.</p>
      </div>
    )
  }

  const cards = [
    {
      label: 'Current Revenue',
      value: formatCurrency(kpis.currentRevenue),
    },
    {
      label: 'Current Users',
      value: formatNumber(kpis.currentUsers),
    },
    {
      label: 'MoM Growth %',
      value: formatPercent(kpis.momGrowthPercent ?? kpis.momGrowth),
    },
    {
      label: 'Paying Customers',
      value: formatNumber(kpis.payingCustomers),
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">KPI Preview</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
