import React from 'react'

export default function MediaSection({ logoUrl, demoVideoUrl, galleryImages }) {
  const images = Array.isArray(galleryImages)
    ? galleryImages.filter((url) => typeof url === 'string' && url.trim())
    : []

  const mainImage = images[0] || (typeof logoUrl === 'string' ? logoUrl : '')
  const hasVideo = typeof demoVideoUrl === 'string' && demoVideoUrl.trim()
  const hasMedia = Boolean(mainImage || hasVideo || images.length)

  if (!hasMedia) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Media</h2>
        <p className="mt-3 text-sm text-gray-500">No media available</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Media</h2>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {mainImage && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Main Image</h3>
              <img
                src={mainImage}
                alt="Startup media"
                className="w-full h-64 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {hasVideo && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Video</h3>
              <video
                controls
                src={demoVideoUrl}
                playsInline
                preload="metadata"
                className="w-full rounded-lg border border-gray-200 bg-black"
              >
                <track kind="captions" />
              </video>
              <a
                href={demoVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-xs text-ayush-700 hover:underline"
              >
                Open video in new tab
              </a>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Gallery</h3>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-24 sm:h-28 object-cover rounded-md border border-gray-200"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No gallery images available</p>
          )}
        </div>
      </div>
    </section>
  )
}
