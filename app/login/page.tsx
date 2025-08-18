"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Placeholder: add real auth later
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md bg-white shadow-elegant">
        <CardHeader>
          <CardTitle className="text-royal-700">Welcome back</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full bg-royal-500 hover:bg-royal-600" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Don&apos;t have an account? <Link href="/register" className="text-royal-600 hover:text-royal-700 font-medium">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 