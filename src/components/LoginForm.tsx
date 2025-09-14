import React, { useState } from 'react'
import { User, Lock, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Footer } from './Footer'

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // التحقق من صحة اليوزرنيم
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError('اسم المستخدم يجب أن يحتوي على أرقام وحروف فقط')
      setLoading(false)
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('اسم المستخدم يجب أن يكون بين 3 و 20 حرف')
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(username, password)
      if (error) {
        if (error.message === 'Invalid credentials') {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        } else if (error.message === 'Account is disabled') {
          setError('الحساب غير مفعل. يرجى التواصل مع المدير')
        } else if (error.message.includes('Edge Function') || error.message.includes('non-2xx')) {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        } else {
          setError(error.message || 'اسم المستخدم أو كلمة المرور غير صحيحة')
        }
      }
    } catch (err) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-blue-50 dark:bg-gray-900" dir="rtl">
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4 py-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-32 h-16 sm:w-40 sm:h-20 mb-4 flex items-center justify-center">
              <img 
                src="/Asset 1.svg" 
                alt="شعار الشركة" 
                className="w-32 h-16 sm:w-40 sm:h-20 object-contain"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              نظام إدارة المقاييس
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              قم بتسجيل الدخول لإدارة قراءة المقاييس
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 ml-3" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="أدخل اسم المستخدم"
                  pattern="[a-zA-Z0-9]+"
                  minLength={3}
                  maxLength={20}
                  title="اسم المستخدم يجب أن يحتوي على أرقام وحروف فقط (3-20 حرف)"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                أرقام وحروف فقط (3-20 حرف)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}