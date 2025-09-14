import React from 'react'
import { Building2, Calendar, Copyright } from 'lucide-react'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0">
          {/* حقوق الطبع والنشر */}
          <div className="flex flex-wrap items-center justify-center space-x-reverse space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <img 
              src="/Asset 5@3x.png" 
              alt="شعار الشركة" 
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain ml-1 sm:ml-3 flex-shrink-0"
            />
            <Copyright className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">جميع الحقوق محفوظة</span>
            <span className="sm:hidden">©</span>
            <span className="font-semibold text-gray-900 dark:text-white text-center">
              شركة أبراج الأنوار للتجارة والمقاولات العامة
            </span>
            <div className="flex items-center space-x-reverse space-x-1 flex-shrink-0">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {currentYear}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}