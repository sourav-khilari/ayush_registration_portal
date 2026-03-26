import React from 'react'

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return `${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}%`
}

export default function UnitEconomics({ unitEconomics }) {
  const arpu = formatCurrency(unitEconomics?.arpu)
  const revenuePerPayingCustomer = formatCurrency(unitEconomics?.revenuePerPayingCustomer)
  const conversionRate = formatPercent(unitEconomics?.conversionRate)

  const cards = [
    {
      title: 'ARPU',
      value: arpu,
      subtitle: 'Average revenue per user',
    },
    {
      title: 'Revenue / Paying Customer',
      value: revenuePerPayingCustomer,
      subtitle: 'Revenue efficiency',
    },
    {
      title: 'Conversion Rate',
      value: conversionRate,
      subtitle: 'Paying users ratio',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Unit Economics</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-medium text-gray-600">{card.title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
