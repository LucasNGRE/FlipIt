'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface BannerProps {
  image: string // Changed to a single image instead of an array
  infoTitle?: string
  infoDescription?: string
  getStartedLink?: string
}

export default function StaticBanner({
  image,
  infoTitle = "Bienvenue sur FlipIt !",
  infoDescription = "Vends et achète du matériel de skate d'occasion, découvre les pépites de la communauté et partage les tiennes.",
  getStartedLink = "/get-started"
}: BannerProps = {
  image: '/placeholder.svg?height=400&width=800' // Default image
}) {
  const { data: session } = useSession(); // Get session data
  const router = useRouter(); // Get router to programmatically navigate

  const handlePostAdClick = () => {
    if (!session) {
      // If not logged in, redirect to login page
      router.push('/login?callbackUrl=/items/add-item');
    }
  };

  return (
    <div className="relative w-full h-[400px] overflow-hidden">
      <img
        src={image}
        alt="Banner image"
        className="w-full h-full object-cover" // Ensure the image fills the container
      />
      
      <div className="absolute top-0 left-0 w-full md:w-1/3 h-full bg-black bg-opacity-50 text-white p-6 flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-4">{infoTitle}</h2>
        <p className="mb-6">{infoDescription}</p>

        {!session && (
          <button
            onClick={handlePostAdClick}
            className="bg-white text-black w-56 font-bold py-2 px-4 rounded hover:bg-gray-200 transition-colors duration-300"
          >
            Dépose une annonce
          </button>
        )}
      </div>
    </div>
  )
}
