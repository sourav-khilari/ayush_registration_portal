import React from 'react'

export default function GrowthInsights({ insights = [], insightsSource }) {
  const hasInsights = Array.isArray(insights) && insights.length > 0
  const sourceLabel = insightsSource === 'ai' ? 'AI' : 'Fallback'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Growth Insights</h3>
        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
          Source: {sourceLabel}
        </span>
      </div>

      {hasInsights ? (
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          {insights.map((insight, index) => (
            <li key={`${insight}-${index}`}>{insight}</li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No insights available</p>
      )}
    </div>
  )
}
