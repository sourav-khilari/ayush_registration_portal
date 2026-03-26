import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { FaLeaf, FaArrowRight, FaExclamationTriangle } from 'react-icons/fa'
import ProfileForm from './ProfileForm'
import MetricsForm from './MetricsForm'
import MetricsHistory from './MetricsHistory'
import KPIPreview from './KPIPreview'
import RevenueUsersChart from './RevenueUsersChart'
import UnitEconomics from './UnitEconomics'
import GrowthInsights from './GrowthInsights'
import TeamSection from './TeamSection'
import MarketVision from './MarketVision'
import FundingSection from './FundingSection'
import ProfilePreview from './ProfilePreview'
import { getStartupDashboard } from './startupApi'
import { StartupAPI } from '../../api'

/**
 * StartupPage - Main page for startup users
 * Fetches startup profile data from backend
 * Shows ProfileForm (input) and Preview (output) sections
 */

export default function StartupPage() {
  const { startupId: routeStartupId } = useParams()

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [startupId, setStartupId] = useState(routeStartupId || null)

  // Resolve startupId dynamically (route param first, then user's first startup)
  useEffect(() => {
    let mounted = true

    const resolveStartupId = async () => {
      if (routeStartupId) {
        setStartupId(routeStartupId)
        return
      }

      try {
        const res = await StartupAPI.mine()
        const firstStartup = Array.isArray(res?.startups) ? res.startups[0] : null
        const resolvedId = firstStartup?._id || null

        if (!mounted) return

        if (!resolvedId) {
          setError('No startup found for this account.')
          setLoading(false)
          return
        }

        setStartupId(resolvedId)
      } catch (err) {
        if (!mounted) return
        setError(err?.message || 'Failed to resolve startup ID')
        setLoading(false)
      }
    }

    resolveStartupId()

    return () => {
      mounted = false
    }
  }, [routeStartupId])

  const fetchStartupProfile = useCallback(async (id = startupId) => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const response = await getStartupDashboard(id)

      if (response?.success) {
        setDashboardData(response.data)
      } else {
        setDashboardData(response)
      }
    } catch (err) {
      console.error("Error fetching startup profile:", err)
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load startup profile"
      )
    } finally {
      setLoading(false)
    }
  }, [startupId])

  // Fetch startup profile once startupId is available
  useEffect(() => {
    if (!startupId) return
    fetchStartupProfile(startupId)
  }, [startupId, fetchStartupProfile])

  // Handle save success - refetch dashboard data
  const handleSaveSuccess = () => {
    fetchStartupProfile(startupId)
  }

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ayush-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Loading startup profile...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <FaExclamationTriangle className="text-red-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchStartupProfile}
            className="px-6 py-3 bg-ayush-600 text-white rounded-lg font-semibold hover:bg-ayush-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100 py-12 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FaLeaf className="text-ayush-600 text-3xl" />
          <h1 className="text-4xl font-bold text-gray-900">Startup Dashboard</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage and preview your startup profile
        </p>
      </div>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Section 1: Profile Form (Input) */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-ayush-600 rounded"></div>
            <h2 className="text-2xl font-bold text-gray-900">
              Startup Profile Form
            </h2>
          </div>
          
          {/* ProfileForm Component */}
          {dashboardData ? (
            <div className="space-y-6">
              <ProfileForm
                startupId={startupId}
                initialData={dashboardData?.profile}
                onSaveSuccess={handleSaveSuccess}
              />

              <MetricsForm
                startupId={startupId}
                onSaveSuccess={handleSaveSuccess}
              />
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No profile data available
            </div>
          )}
        </div>

        {/* Divider with Arrow */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-4">
            <div className="h-px w-8 bg-gray-300"></div>
            <FaArrowRight className="text-ayush-600 text-2xl" />
            <div className="h-px w-8 bg-gray-300"></div>
          </div>
        </div>

        {/* Section 2: Live Preview (Output) */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-green-600 rounded"></div>
            <h2 className="text-2xl font-bold text-gray-900">
              Live Preview
            </h2>
          </div>

          {/* ProfilePreview Component */}
          <ProfilePreview profile={dashboardData?.profile} />

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Monthly Performance Data</h3>
              <MetricsHistory
                revenueSeries={dashboardData?.series?.revenueSeries}
                usersSeries={dashboardData?.series?.usersSeries}
              />
            </div>

            <KPIPreview kpis={dashboardData?.kpis} />

            {dashboardData?.series && (
              <div className="mt-6">
                <RevenueUsersChart
                  revenueSeries={dashboardData?.series?.revenueSeries}
                  usersSeries={dashboardData?.series?.usersSeries}
                />
              </div>
            )}

            {dashboardData?.unitEconomics && (
              <div className="mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Unit Economics</h3>
                <UnitEconomics unitEconomics={dashboardData?.unitEconomics} />
              </div>
            )}

            <div className="mt-6">
              <GrowthInsights
                insights={dashboardData?.insights}
                insightsSource={dashboardData?.insightsSource}
              />
            </div>

            <div className="mt-6">
              <TeamSection team={dashboardData?.profile?.team} />
            </div>

            <div className="mt-6">
              <MarketVision
                marketSizeDescription={dashboardData?.profile?.marketSizeDescription}
                futurePlan={dashboardData?.profile?.futurePlan}
                nextMilestone={dashboardData?.profile?.nextMilestone}
              />
            </div>

            <div className="mt-6">
              <FundingSection
                fundingAsk={dashboardData?.profile?.fundingAsk}
                equityOfferedPercent={dashboardData?.profile?.equityOfferedPercent}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex justify-end gap-4 mt-12 pb-8">
          <button className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button className="px-6 py-3 bg-ayush-600 text-white rounded-lg font-semibold hover:bg-ayush-700 transition-colors flex items-center gap-2">
            Save Changes
            <FaArrowRight className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
