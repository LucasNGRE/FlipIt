'use client'

interface BannerProps {
  image: string // Changed to a single image instead of an array
}

export default function StaticBanner({ image }: BannerProps = { image: '/placeholder.svg?height=400&width=800' }) {
  return (
    <div className="relative w-full h-[400px] overflow-hidden">
      <img
        src={image}
        alt="Banner image"
        className="w-full h-full object-cover object-center" // Ensure the image fills the container and is centered
      />
    </div>
  )
}
