import React from 'react'
import { FaLeaf } from 'react-icons/fa'

export default function ProfilePreview({ profile }) {
  if (!profile || !profile.startupName) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-center text-lg">No profile data yet.</p>
      </div>
    )
  }

  // Map sector to color badge
  const getSectorColor = (sector) => {
    const colors = {
      'Ayurveda': 'bg-emerald-100 text-emerald-800',
      'Yoga': 'bg-blue-100 text-blue-800',
      'Unani': 'bg-cyan-100 text-cyan-800',
      'Siddha': 'bg-purple-100 text-purple-800',
      'Homeopathy': 'bg-pink-100 text-pink-800'
    }
    return colors[sector] || 'bg-gray-100 text-gray-800'
  }

  // Map stage to tag style
  const getStageColor = (stage) => {
    const colors = {
      'Idea': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'Prototype': 'bg-orange-100 text-orange-800 border border-orange-300',
      'Traction': 'bg-green-100 text-green-800 border border-green-300',
      'Revenue': 'bg-indigo-100 text-indigo-800 border border-indigo-300'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800 border border-gray-300'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-gradient-to-br from-ayush-500 to-ayush-600 rounded-lg p-3 mt-1">
          <FaLeaf className="text-white text-2xl" />
        </div>
        <div className="flex-1">
          {/* Startup Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {profile.startupName}
          </h1>
          
          {/* One Line Pitch */}
          {profile.oneLinePitch && (
            <p className="text-lg text-gray-600 italic mb-4">
              {profile.oneLinePitch}
            </p>
          )}
        </div>
      </div>

      {/* Sector and Stage badges */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Sector Badge */}
        {profile.sector && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSectorColor(profile.sector)}`}>
            {profile.sector}
          </span>
        )}

        {/* Stage Tag */}
        {profile.stage && (
          <span className={`px-3 py-1 rounded-md text-sm font-semibold ${getStageColor(profile.stage)}`}>
            {profile.stage} Stage
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mt-6 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          ✓ Startup Profile Preview
        </p>
      </div>
    </div>
  )
}
