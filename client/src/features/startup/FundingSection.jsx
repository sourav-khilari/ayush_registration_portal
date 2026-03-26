import React from 'react'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatCurrency = (value) => {
  if (value === null || value <= 0) return null
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value) => {
  if (value === null || value <= 0) return null
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '')
}

export default function FundingSection({ fundingAsk, equityOfferedPercent }) {
  const fundingNumber = toNumber(fundingAsk)
  const equityNumber = toNumber(equityOfferedPercent)

  const formattedFunding = formatCurrency(fundingNumber)
  const formattedEquity = formatPercent(equityNumber)

  const hasFundingData = Boolean(formattedFunding && formattedEquity)

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-900">Investment Opportunity</h2>

      {hasFundingData ? (
        <p className="mt-3 text-sm leading-relaxed text-amber-900">
          Seeking <span className="font-semibold">₹{formattedFunding}</span> for{' '}
          <span className="font-semibold">{formattedEquity}% equity</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-800">Funding details not available</p>
      )}
    </section>
  )
}
