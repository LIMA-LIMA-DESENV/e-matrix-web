'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      router.push(user?.mustChangePassword ? '/alterar-senha' : '/dashboard')
      return
    }

    router.push('/login')
  }, [isAuthenticated, router, user?.mustChangePassword])

  return null
}
