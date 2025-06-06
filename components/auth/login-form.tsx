"use client"

import type React from "react"
import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Home, RefreshCw, AlertTriangle } from "lucide-react"
import { useFirebase } from "@/components/firebase-provider"

interface LoginFormProps {
  authError?: string | null
}

export function LoginForm({ authError }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(authError || null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { initialized, error: firebaseError, retry } = useFirebase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!initialized) {
      setError("Authentication system is not ready. Please wait or try refreshing.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Get user data to determine redirect
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.role === "sub_admin") {
          window.location.href = "/sub-admin"
          return
        }
      }

      toast({
        title: "Welcome Back!",
        description: "You have been signed in successfully.",
      })
    } catch (error: any) {
      const errorMessage =
        error.code === "auth/user-not-found"
          ? "No account found with this email address."
          : error.code === "auth/wrong-password"
            ? "Incorrect password. Please try again."
            : error.code === "auth/invalid-email"
              ? "Please enter a valid email address."
              : error.code === "auth/too-many-requests"
                ? "Too many failed attempts. Please try again later."
                : error.code === "auth/network-request-failed"
                  ? "Network error. Please check your connection."
                  : "Failed to sign in. Please check your credentials."

      setError(errorMessage)
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const goToSuperPage = () => {
    router.push("/super")
  }

  // Show Firebase initialization error
  if (firebaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Firebase Error
            </CardTitle>
            <CardDescription>Failed to initialize Firebase services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{firebaseError}</AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button onClick={retry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Initialization
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                Refresh Page
              </Button>
              <Button variant="outline" onClick={goToSuperPage} className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Super Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while Firebase initializes
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Initializing Firebase services...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>REV Ad Management System</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {(error || authError) && (
              <Alert variant="destructive">
                <AlertDescription>{error || authError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={goToSuperPage} disabled={loading}>
              <Home className="w-4 h-4 mr-2" />
              Go to Super Page
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
