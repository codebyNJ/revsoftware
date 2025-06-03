"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Home } from "lucide-react"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Add this after the successful signInWithEmailAndPassword call and before the toast
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
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
            <Button type="button" variant="outline" className="w-full" onClick={goToSuperPage}>
              <Home className="w-4 h-4 mr-2" />
              Go to Super Page
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
