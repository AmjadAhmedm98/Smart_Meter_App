import React, { ReactNode } from 'react'
import { LogOut, Sun, Moon, User, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
  title: string
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, signOut, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showDropdown, setShowDropdown] = React.useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  // إغلاق الـ dropdown عند النقر خارجه
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('profile-dropdown')
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col" dir="rtl">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h1>
            </div>
            
            <div className="relative flex-shrink-0" id="profile-dropdown">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-reverse space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute left-0 mt-2 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 max-w-[calc(100vw-2rem)]">
                  {/* معلومات المستخدم */}
                  <div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-reverse space-x-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user?.full_name || user?.username}
                        </p>
                        {user?.full_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{user.username}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900 dark:to-purple-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700 flex-shrink-0">
                          <Settings className="w-3 h-3 ml-1 hidden sm:inline" />
                          مدير
                        </span>
                      )}
                    </div>
                  </div>

                  {/* خيارات الثيم */}
                  <div className="px-1 sm:px-2 py-1">
                    <button
                      onClick={() => {
                        toggleTheme()
                      }}
                      className="w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {theme === 'light' ? (
                        <>
                          <Moon className="w-4 h-4 ml-2 sm:ml-3" />
                          الوضع المظلم
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4 ml-2 sm:ml-3" />
                          الوضع المضيء
                        </>
                      )}
                    </button>
                  </div>

                  {/* خط فاصل */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  {/* تسجيل الخروج */}
                  <div className="px-1 sm:px-2 py-1">
                    <button
                      onClick={() => {
                        handleSignOut()
                        setShowDropdown(false)
                      }}
                      className="w-full flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4 ml-2 sm:ml-3" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {children}
      </main>

      {/* الفوتر */}
      <Footer />
    </div>
  )
}