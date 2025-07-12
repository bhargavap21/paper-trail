"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UploadRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new reader page
    router.replace("/reader")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to Reader...</p>
    </div>
  )
}