import React, { useState } from 'react'
import { Save, CheckCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface RecordFormProps {
  onRecordAdded?: () => void
}

export const RecordForm: React.FC<RecordFormProps> = ({ onRecordAdded }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    registry: '',
    type: '',
    record_type: 'نظامي',
    area: '',
    subscribers_count: 0
  })
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])

  const addNotification = (type: 'success' | 'error', text: string) => {
    const id = Date.now().toString()
    const notification = { id, type, text, timestamp: Date.now() }
    setNotifications(prev => [...prev, notification])
    
    // إزالة الإشعار تلقائياً بعد 5 ثوانٍ
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'subscribers_count' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase.from('records').insert([
        {
          ...formData,
          app_user_id: user.id
        }
      ])

      if (error) throw error

      addNotification('success', 'تم حفظ محضر الاستلام بنجاح! 🎉')
      setFormData({
        registry: '',
        type: '',
        record_type: 'نظامي',
        area: '',
        subscribers_count: 0
      })

      // تحديث البيانات في لوحة الأدمن
      if (onRecordAdded) {
        onRecordAdded()
      }
    } catch (error) {
      console.error('Error saving record:', error)
      addNotification('error', 'حدث خطأ في حفظ محضر الاستلام')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* منطقة الإشعارات */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg backdrop-blur-sm border-l-4 animate-slide-in max-w-md ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 ml-2" />
              ) : (
                <AlertCircle className="w-5 h-5 ml-2" />
              )}
              <span className="font-medium">{notification.text}</span>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-6">
          إدخال محضر استلام وتسليم
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              السجل
            </label>
            <input
              type="text"
              name="registry"
              value={formData.registry}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل رقم السجل"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              النوع
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">اختر نوع المحضر</option>
              <option value="استلام">استلام</option>
              <option value="تسليم">تسليم</option>
              <option value="صيانة">صيانة</option>
              <option value="معاينة">معاينة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع السجل
            </label>
            <div className="flex space-x-reverse space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="record_type"
                  value="نظامي"
                  checked={formData.record_type === 'نظامي'}
                  onChange={handleChange}
                  className="ml-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">نظامي</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="record_type"
                  value="حمراء"
                  checked={formData.record_type === 'حمراء'}
                  onChange={handleChange}
                  className="ml-2 text-red-600 focus:ring-red-500"
                />
                <span className="text-gray-900 dark:text-white">حمراء</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              المنطقة
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل اسم المنطقة"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              عدد المشتركين
            </label>
            <input
              type="number"
              name="subscribers_count"
              value={formData.subscribers_count}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل عدد المشتركين"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                حفظ محضر الاستلام
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}