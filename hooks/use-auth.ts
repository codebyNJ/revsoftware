"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { User } from "@/lib/types"
import { useFirebase } from "@/components/firebase-provider"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const { initialized, error: firebaseError } = useFirebase()

  useEffect(() => {
    // Don't set up the listener until Firebase is initialized
    if (!initialized || firebaseError) {
      setLoading(true)
      return
    }

    console.log("Setting up auth state listener...")

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            console.log("Firebase user authenticated:", firebaseUser.uid)

            // Get the user's ID token to check custom claims
            const idTokenResult = await firebaseUser.getIdTokenResult(true)
            console.log("Token claims:", idTokenResult.claims)

            // First try to get user by document ID (should match UID)
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

            if (userDoc.exists()) {
              const userData = userDoc.data()
              console.log("User document found:", userData)

              setUser({
                id: firebaseUser.uid,
                email: userData.email || firebaseUser.email || "",
                name: userData.name || "User",
                role: userData.role || "sub_admin",
                createdAt: userData.createdAt?.toDate() || new Date(),
              })
              setAuthError(null)
            } else {
              // If not found, try to find by email (fallback for existing setup)
              console.log("User document not found by ID, searching by email")
              const userQuery = query(collection(db, "users"), where("email", "==", firebaseUser.email))
              const userSnapshot = await getDocs(userQuery)

              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data()
                console.log("User found by email:", userData)

                setUser({
                  id: firebaseUser.uid,
                  email: userData.email || firebaseUser.email || "",
                  name: userData.name || "User",
                  role: userData.role || "sub_admin",
                  createdAt: userData.createdAt?.toDate() || new Date(),
                })
                setAuthError(null)
              } else {
                console.error("User document not found in Firestore")
                setAuthError("User profile not found. Please contact an administrator.")
                setUser(null)
              }
            }
          } else {
            setUser(null)
            setAuthError(null)
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error)
          setAuthError("Error loading user profile. Please try again.")
          setUser(null)
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        console.error("Auth state change error:", error)
        setAuthError("Authentication error. Please refresh the page.")
        setLoading(false)
      },
    )

    return () => {
      console.log("Cleaning up auth state listener")
      unsubscribe()
    }
  }, [initialized, firebaseError])

  // If Firebase has an error, reflect that in the auth state
  useEffect(() => {
    if (firebaseError) {
      setAuthError(`Firebase initialization error: ${firebaseError}`)
      setLoading(false)
    }
  }, [firebaseError])

  return {
    user,
    loading: loading || !initialized,
    authError: authError || (firebaseError ? `Firebase error: ${firebaseError}` : null),
  }
}
