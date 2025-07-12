'use client'

import { useEffect } from 'react'

export default function AFrameScript() {
  useEffect(() => {
    // Only execute in browser environment
    if (typeof window !== 'undefined') {
      // Check if AFRAME is already defined or if we've already started loading it
      if (typeof window.AFRAME === 'undefined' && !window.aframeLoading) {
        // Set a flag to prevent multiple loading attempts
        window.aframeLoading = true
        
        // Create script element
        const script = document.createElement('script')
        script.src = 'https://aframe.io/releases/1.5.0/aframe.min.js'
        script.async = true
        script.onload = () => {
          console.log('A-Frame loaded successfully!')
          window.aframeLoading = false
          
          // Load A-Frame Force Graph component after A-Frame is loaded
          if (!window.aframeForceGraphLoaded) {
            window.aframeForceGraphLoaded = true
            const forceGraphScript = document.createElement('script')
            forceGraphScript.src = 'https://unpkg.com/aframe-forcegraph-component@3.2.3/dist/aframe-forcegraph-component.min.js'
            forceGraphScript.async = true
            document.head.appendChild(forceGraphScript)
          }
        }
        
        script.onerror = () => {
          console.error('Failed to load A-Frame')
          window.aframeLoading = false
        }
        
        // Append to document head
        document.head.appendChild(script)
      } else if (typeof window.AFRAME !== 'undefined') {
        // A-Frame is already loaded, just load the force graph component if needed
        if (!window.aframeForceGraphLoaded) {
          window.aframeForceGraphLoaded = true
          const forceGraphScript = document.createElement('script')
          forceGraphScript.src = 'https://unpkg.com/aframe-forcegraph-component@3.2.3/dist/aframe-forcegraph-component.min.js'
          forceGraphScript.async = true
          document.head.appendChild(forceGraphScript)
        }
      }
    }
  }, [])

  return null
}

// Add global type for AFRAME
declare global {
  interface Window {
    AFRAME: any
    aframeLoading: boolean
    aframeForceGraphLoaded: boolean
  }
} 