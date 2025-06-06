"use client"

import { type ReactNode, createContext, useContext, useEffect, useState } from "react"
import { isFirebaseReady } from "@/lib/firebase"

// Create a context to track Firebase initialization status
const FirebaseContext = createContext<{
  initialized: boolean
  error: string | null
  retry: () => void
}>({
  initialized: false,
  error: null,
  retry: () => {},
})

export const useFirebase = () => useContext(FirebaseContext)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const initializeFirebase = async () => {
    try {
      setError(null)

      // Wait a bit to ensure the DOM is ready
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check if Firebase is ready
      if (isFirebaseReady()) {
        console.log("Firebase is ready")
        setInitialized(true)
      } else {
        throw new Error("Firebase services not available")
      }
    } catch (error: any) {
      console.error("Firebase initialization error:", error)
      setError(error.message || "Failed to initialize Firebase")

      // Auto-retry up to 3 times
      if (retryCount < 3) {
        console.log(`Retrying Firebase initialization (attempt ${retryCount + 1}/3)`)
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1)
            initializeFirebase()
          },
          1000 * (retryCount + 1),
        ) // Exponential backoff
      }
    }
  }

  const retry = () => {
    setRetryCount(0)
    setInitialized(false)
    initializeFirebase()
  }

  useEffect(() => {
    initializeFirebase()
  }, [])

  return <FirebaseContext.Provider value={{ initialized, error, retry }}>{children}</FirebaseContext.Provider>
}
