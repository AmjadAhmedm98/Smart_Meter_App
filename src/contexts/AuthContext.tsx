import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase, AppUser } from '../lib/supabase'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<any>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // التحقق من وجود جلسة محفوظة
    const savedUser = localStorage.getItem('app_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch (error) {
        localStorage.removeItem('app_user')
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (username: string, password: string) => {
    try {
      console.log('Attempting login for:', username)
      
      // استدعاء edge function للمصادقة مع معالجة أفضل للأخطاء
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username, password }
      })

      console.log('Login response:', { data, error })

      if (error) {
        console.error('Edge function error:', error)
        return { error }
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.username)
        setUser(data.user)
        localStorage.setItem('app_user', JSON.stringify(data.user))
        return { error: null }
      } else {
        console.error('No user data received')
        return { error: { message: 'بيانات الاعتماد غير صحيحة' } }
      }
    } catch (error) {
      console.error('Login catch error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    // تسجيل الخروج من Supabase
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('app_user')
    return { error: null }
  }

  const isAdmin = user?.role === 'ADMIN'

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}