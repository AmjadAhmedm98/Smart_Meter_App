import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LoginForm } from './components/LoginForm'
import { EmployeeDashboard } from './components/EmployeeDashboard'
import { AdminDashboard } from './components/AdminDashboard'

const AppContent: React.FC = () => {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">نظام إدارة المقاييس</h2>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل النظام...</p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            إذا استمر التحميل، تأكد من إعدادات قاعدة البيانات
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App