import { apiRequest } from '../../api/base'
import axios from 'axios'

/**
 * Fetch startup dashboard data
 * GET /api/dashboard/:startupId?role=startup
 * @param {string} startupId - Startup ID
 * @returns {Promise<object>} Dashboard data
 */
export async function getStartupDashboard(startupId) {
  try {
    const [dashboardResponse, startup] = await Promise.all([
      apiRequest(`/dashboard/${startupId}?role=startup_owner`, { method: 'GET' }),
      apiRequest(`/startups/${startupId}`, { method: 'GET' }),
    ])

    const dashboardData = dashboardResponse?.data || dashboardResponse || {}

    const mergedProfile = {
      ...(dashboardData?.profile || {}),
      startupName: startup?.name || '',
      sector: startup?.startup_type || '',
    }

    return {
      success: true,
      data: {
        ...(dashboardData || {}),
        startup,
        profile: mergedProfile,
      },
    }
  } catch (err) {
    const message = err?.message || 'Failed to fetch startup dashboard'
    throw new Error(message)
  }
}

/**
 * Save startup profile
 * POST /api/startup/:startupId/profile
 * PUT  /api/startups/:startupId
 * @param {string} startupId - Startup ID
 * @param {object} data - Profile data to save
 * @returns {Promise<object>} Updated startup data
 */
export async function saveStartupProfile(startupId, data) {
  try {
    const startupName = data?.startupName ?? data?.name ?? ''
    const oneLinePitch = data?.oneLinePitch ?? data?.pitch ?? ''
    const sector = data?.sector ?? ''
    const stage = data?.stage ?? ''
    const fundingAsk =
      data?.fundingAsk === '' || data?.fundingAsk === null || data?.fundingAsk === undefined
        ? 0
        : Number(data.fundingAsk)
    const equityOfferedPercent =
      data?.equityOfferedPercent === '' || data?.equityOfferedPercent === null || data?.equityOfferedPercent === undefined
        ? 0
        : Number(data.equityOfferedPercent)
    const marketSizeDescription = data?.marketSizeDescription ?? ''
    const futurePlan = data?.futurePlan ?? ''
    const nextMilestone = data?.nextMilestone ?? ''
    const team = Array.isArray(data?.team)
      ? data.team.map((member) => ({
          name: member?.name || '',
          role: member?.role || '',
          yearsExperience:
            member?.yearsExperience === '' || member?.yearsExperience === null || member?.yearsExperience === undefined
              ? 0
              : Number(member.yearsExperience),
          isMedicalExpert: Boolean(member?.isMedicalExpert),
        }))
      : []

    if (!startupName.trim()) {
      throw new Error('Startup name is required')
    }

    const profilePayload = {
      oneLinePitch,
      stage,
      fundingAsk,
      equityOfferedPercent,
      marketSizeDescription,
      futurePlan,
      nextMilestone,
      team,
    }

    const startupPayload = {
      name: startupName,
      startup_type: sector,
    }

    const [profileResponse, startupResponse] = await Promise.all([
      apiRequest(`/startup/${startupId}/profile`, {
        method: 'POST',
        body: JSON.stringify(profilePayload),
      }),
      apiRequest(`/startups/${startupId}`, {
        method: 'PUT',
        body: JSON.stringify(startupPayload),
      }),
    ])

    return {
      success: true,
      message: profileResponse?.message || 'Profile saved successfully',
      profile: profileResponse?.profile,
      startup: startupResponse?.startup,
    }
  } catch (err) {
    const message = err?.message || 'Failed to save startup profile'
    throw new Error(message)
  }
}

/**
 * Save startup metrics
 * POST /api/startup/:startupId/metrics
 * @param {string} startupId - Startup ID
 * @param {object} data - Metrics payload
 * @returns {Promise<object>} Saved metrics response
 */
export async function saveStartupMetrics(startupId, data) {
  try {
    const token = localStorage.getItem('token')
    const baseURL = import.meta.env.VITE_API_BASE || '/api'

    const response = await axios.post(`/startup/${startupId}/metrics`, data, {
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return response.data
  } catch (err) {
    const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to save startup metrics'
    throw new Error(message)
  }
}

export default {
  getStartupDashboard,
  saveStartupProfile,
  saveStartupMetrics,
}
