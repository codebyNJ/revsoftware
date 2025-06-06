"use client"

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB49_SKqqkKYBgDy8ERNut4-t9Hg9cJNAM",
  authDomain: "revmediasoft.firebaseapp.com",
  projectId: "revmediasoft",
  storageBucket: "revmediasoft.firebasestorage.app",
  messagingSenderId: "739908975142",
  appId: "1:739908975142:web:6fbaf7f0b999f2eaca84e7",
  measurementId: "G-JL70KC58SZ",
}

// Global variables to store instances
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let firebaseAnalytics: any = null

// Initialize Firebase App (lazy)
function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    try {
      firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
      console.log("Firebase app initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase app:", error)
      throw error
    }
  }
  return firebaseApp
}

// Initialize Auth (lazy)
function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    try {
      const app = getFirebaseApp()
      firebaseAuth = getAuth(app)
      console.log("Firebase Auth initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Auth:", error)
      throw error
    }
  }
  return firebaseAuth
}

// Initialize Firestore (lazy)
function getFirebaseDb(): Firestore {
  if (!firebaseDb) {
    try {
      const app = getFirebaseApp()
      firebaseDb = getFirestore(app)
      console.log("Firebase Firestore initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Firestore:", error)
      throw error
    }
  }
  return firebaseDb
}

// Initialize Analytics (lazy, browser only)
async function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return null
  }

  if (!firebaseAnalytics) {
    try {
      const { getAnalytics } = await import("firebase/analytics")
      const app = getFirebaseApp()
      firebaseAnalytics = getAnalytics(app)
      console.log("Firebase Analytics initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Analytics:", error)
      // Don't throw for analytics as it's not critical
    }
  }
  return firebaseAnalytics
}

// Export the lazy getters
export const app = getFirebaseApp
export const auth = getFirebaseAuth()
export const db = getFirebaseDb()

// Export analytics as a function since it's async
export const analytics = getFirebaseAnalytics

// Helper function to set custom claims (this would typically be done server-side)
export const setUserRole = async (uid: string, role: string) => {
  // This is a placeholder - in production, you'd call a Cloud Function
  // that sets custom claims using the Admin SDK
  console.log(`Setting role ${role} for user ${uid}`)
}

// Export a function to check if Firebase is ready
export const isFirebaseReady = (): boolean => {
  try {
    getFirebaseApp()
    getFirebaseAuth()
    getFirebaseDb()
    return true
  } catch (error) {
    console.error("Firebase not ready:", error)
    return false
  }
}
