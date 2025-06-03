import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyB49_SKqqkKYBgDy8ERNut4-t9Hg9cJNAM",
  authDomain: "revmediasoft.firebaseapp.com",
  projectId: "revmediasoft",
  storageBucket: "revmediasoft.firebasestorage.app",
  messagingSenderId: "739908975142",
  appId: "1:739908975142:web:6fbaf7f0b999f2eaca84e7",
  measurementId: "G-JL70KC58SZ",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null

// Helper function to set custom claims (this would typically be done server-side)
export const setUserRole = async (uid: string, role: string) => {
  // This is a placeholder - in production, you'd call a Cloud Function
  // that sets custom claims using the Admin SDK
  console.log(`Setting role ${role} for user ${uid}`)
}
