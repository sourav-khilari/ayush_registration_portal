import React, { useState } from 'react'
import axios from 'axios'

const getErrorMessage = (error) => {
  const backendError = error?.response?.data?.error
  if (typeof backendError === 'string') return backendError
  if (backendError?.message) return backendError.message

  const backendMessage = error?.response?.data?.message
  if (typeof backendMessage === 'string') return backendMessage

  if (typeof error?.message === 'string') return error.message
  return 'Upload failed'
}

export default function MediaUpload({ startupId, onUploadSuccess }) {
  const [imageFile, setImageFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [imageNote, setImageNote] = useState('')
  const [videoNote, setVideoNote] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState([])

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setImageFile(file)
    setError('')
  }

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0] || null
    setVideoFile(file)
    setError('')
  }

  const uploadFile = async (file, note, setLoading) => {
    if (!file) return

    try {
      setLoading(true)
      setError('')

      console.info('[MediaUpload] Upload started', {
        startupId,
        fileName: file?.name,
        fileSize: file?.size,
        mimeType: file?.type,
      })

      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const baseURL = import.meta.env.VITE_API_BASE || '/api'

      const response = await axios.post('/upload/media', formData, {
        baseURL,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const fileUrl = response?.data?.fileUrl
      const fileType = response?.data?.fileType

      console.info('[MediaUpload] Upload success', {
        startupId,
        fileUrl,
        fileType,
        note,
      })

      if (fileUrl && typeof onUploadSuccess === 'function') {
        onUploadSuccess(fileUrl, fileType, note)
      }

      if (fileUrl) {
        setUploadedMedia((prev) => [
          {
            fileUrl,
            fileType,
            note: note?.trim() || '',
            fileName: file?.name || '',
          },
          ...prev,
        ])
      }

      return true
    } catch (err) {
      console.error('[MediaUpload] Upload failed', {
        startupId,
        fileName: file?.name,
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      })
      setError(getErrorMessage(err))
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async () => {
    const success = await uploadFile(imageFile, imageNote, setImageLoading)
    if (success) {
      setImageFile(null)
      setImageNote('')
    }
  }

  const handleVideoUpload = async () => {
    const success = await uploadFile(videoFile, videoNote, setVideoLoading)
    if (success) {
      setVideoFile(null)
      setVideoNote('')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" data-startup-id={startupId || ''}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <h5 className="text-sm font-semibold text-gray-800">Upload Image</h5>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700"
            disabled={imageLoading || videoLoading}
          />
          <textarea
            value={imageNote}
            onChange={(event) => setImageNote(event.target.value)}
            placeholder="Optional note for this image"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ayush-600 outline-none"
            disabled={imageLoading || videoLoading}
          />
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={!imageFile || imageLoading || videoLoading}
            className="px-4 py-2 bg-ayush-600 text-white rounded-lg font-medium hover:bg-ayush-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {imageLoading ? 'Uploading Image...' : 'Upload Image'}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <h5 className="text-sm font-semibold text-gray-800">Upload Video</h5>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoChange}
            className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700"
            disabled={imageLoading || videoLoading}
          />
          <textarea
            value={videoNote}
            onChange={(event) => setVideoNote(event.target.value)}
            placeholder="Optional note for this video"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-ayush-600 outline-none"
            disabled={imageLoading || videoLoading}
          />
          <button
            type="button"
            onClick={handleVideoUpload}
            disabled={!videoFile || imageLoading || videoLoading}
            className="px-4 py-2 bg-ayush-600 text-white rounded-lg font-medium hover:bg-ayush-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {videoLoading ? 'Uploading Video...' : 'Upload Video'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {uploadedMedia.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-semibold text-gray-800 mb-3">Uploaded Media</h5>
          <div className="space-y-3">
            {uploadedMedia.slice(0, 4).map((item, index) => (
              <div key={`${item.fileUrl}-${index}`} className="rounded-md border border-gray-200 p-3">
                {item.fileType === 'image' ? (
                  <img
                    src={item.fileUrl}
                    alt={item.fileName || `Uploaded image ${index + 1}`}
                    className="w-full max-h-40 object-cover rounded-md border border-gray-200"
                  />
                ) : (
                  <video controls src={item.fileUrl} className="w-full rounded-md border border-gray-200 bg-black" />
                )}
                <p className="mt-2 text-xs text-gray-600 break-all">{item.fileUrl}</p>
                {item.note && <p className="mt-1 text-xs text-gray-700">Note: {item.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
