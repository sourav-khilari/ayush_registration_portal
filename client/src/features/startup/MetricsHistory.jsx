import React from 'react'

function formatCurrency(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return `₹${number.toLocaleString('en-IN')}`
}

export default function MetricsHistory({ revenueSeries = [], usersSeries = [] }) {
  const usersByMonth = new Map(
    usersSeries.map((item) => [item?.x, item?.y])
  )

  const rows = revenueSeries.map((item) => ({
    month: item?.x,
    revenue: item?.y,
    users: usersByMonth.get(item?.x) ?? '-',
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Metrics History</h3>

      {rows.length === 0 ? (
        <p className="text-gray-500">No metrics available yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  Month
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  Users
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100">
                    {row.month || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100">
                    {row.users}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
