import React, { useState } from 'react'
import { Users, Zap, Plus, ArrowRight, ClipboardCheck, BarChart3 } from 'lucide-react'
import { Layout } from './Layout'
import { SubscriberForm } from './forms/SubscriberForm'
import { FeederForm } from './forms/FeederForm'
import { MyTasks } from './MyTasks'
import { useAuth } from '../contexts/AuthContext'

type FormType = 'overview' | 'subscribers' | 'feeders' | 'tasks' | null

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeForm, setActiveForm] = useState<FormType>(null)
  
  const formOptions = [
    {
      id: 'overview' as FormType,
      title: 'النظرة العامة',
      description: 'عرض الإحصائيات العامة',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'from-blue-600 to-blue-700',
      show: user?.role === 'ADMIN'
    },
    {
      id: 'subscribers' as FormType,
      title: 'مقاييس المشتركين',
      description: 'إدخال قراءات مقاييس المشتركين',
      icon: Users,
      color: 'from-green-500 to-green-600',
      hoverColor: 'from-green-600 to-green-700',
      show: true
    },
    {
      id: 'feeders' as FormType,
      title: 'مقاييس المغذيات',
      description: 'إدخال قراءات مقاييس المغذيات',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'from-purple-600 to-purple-700',
      show: user?.role === 'ADMIN' || user?.role === 'GENERAL_READER'
    },
    {
      id: 'tasks' as FormType,
      title: 'مهامي',
      description: 'عرض وتنفيذ المهام الموكلة إليّ',
      icon: ClipboardCheck,
      color: 'from-teal-500 to-teal-600',
      hoverColor: 'from-teal-600 to-teal-700',
      show: true
    }
  ].filter(option => option.show)

  if (activeForm) {
    return (
      <Layout title={formOptions.find(opt => opt.id === activeForm)?.title || 'إدخال البيانات'}>
        <div className="mb-6">
          <button
            onClick={() => setActiveForm(null)}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للقائمة الرئيسية
          </button>
        </div>
        
        {activeForm === 'overview' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                📊 النظرة العامة
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                مرحباً {user?.full_name || user?.username}
              </p>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300">
                  دورك في النظام: <strong>{user?.role === 'ADMIN' ? 'مدير النظام' : user?.role === 'METER_READER' ? 'قارئ مقياس' : 'قارئ عام'}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
        {activeForm === 'subscribers' && <SubscriberForm />}
        {activeForm === 'feeders' && <FeederForm />}
        {activeForm === 'tasks' && <MyTasks />}
      </Layout>
    )
  }

  return (
    <Layout title="لوحة تحكم الموظف">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            اختر نوع البيانات المراد إدخالها
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
            انقر على إحدى الخيارات أدناه لبدء إدخال البيانات
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {formOptions.map((option) => {
            const IconComponent = option.icon
            return (
              <div
                key={option.id}
                onClick={() => setActiveForm(option.id)}
                className="group cursor-pointer transform hover:scale-105 transition-all duration-300 w-full"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 transition-all duration-300 h-full">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r ${option.color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:bg-gradient-to-r group-hover:${option.hoverColor} transition-all duration-300`}>
                    <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-4 sm:mb-6 text-xs sm:text-sm">
                    {option.description}
                  </p>
                  
                  <div className="flex justify-center">
                    <div className={`inline-flex items-center px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r ${option.color} text-white rounded-xl font-medium group-hover:bg-gradient-to-r group-hover:${option.hoverColor} transition-all duration-300 text-xs sm:text-sm`}>
                      {option.id === 'tasks' ? (
                        <>
                          <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                          عرض المهام
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                          إدخال بيانات
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-4 sm:p-6 text-center">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            ملاحظة مهمة
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            يرجى التأكد من صحة البيانات المدخلة قبل الحفظ. جميع الحقول مطلوبة ما لم يذكر خلاف ذلك.
          </p>
        </div>
      </div>
    </Layout>
  )
}