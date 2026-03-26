import React from 'react'

export default function TeamSection({ team = [] }) {
  const hasTeam = Array.isArray(team) && team.length > 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Team</h3>

      {!hasTeam ? (
        <p className="text-gray-500">No team information available</p>
      ) : (
        <div className="space-y-3">
          {team.map((member, index) => (
            <div
              key={`${member?.name || 'member'}-${index}`}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-gray-900 font-bold">
                    {member?.name || 'N/A'}
                  </p>
                  <p className="text-gray-700 text-sm mt-1">
                    {member?.role || 'Role not specified'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    Experience: {Number.isFinite(Number(member?.yearsExperience)) ? Number(member?.yearsExperience) : 0} years
                  </p>
                </div>

                {member?.isMedicalExpert ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    Medical Expert
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
