import React, { useState, useEffect } from 'react'
import { X, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase, Record, Subscriber, Feeder } from '../lib/supabase'

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  data: Record | Subscriber | Feeder | null
  type: 'record' | 'subscriber' | 'feeder'
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSuccess, data, type }) => {
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  useEffect(() => {
    if (data) {
      setFormData({ ...data })
    }
  }, [data])

  if (!isOpen || !data) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: name === 'reading' || name === 'subscribers_count' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const tableName = type === 'record' ? 'records' : type === 'subscriber' ? 'subscribers' : 'feeders'
      
      // إزالة الحقول التي لا يجب تحديثها
      const { id, created_at, user_id, image_url, ...updateData } = formData
      
      // تحويل القراءات إلى أرقام قبل الحفظ
      if (updateData.reading !== undefined) {
        updateData.reading = parseFloat(updateData.reading) || 0
      }
      if (updateData.subscribers_count !== undefined) {
        updateData.subscribers_count = parseInt(updateData.subscribers_count) || 0
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', data.id)

      if (error) throw error

      addNotification('success', 'تم حفظ التعديلات بنجاح! ✏️')
      
      // تأخير إغلاق النافذة لإظهار الإشعار
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
      
    } catch (err: any) {
      setError('حدث خطأ في حفظ التعديلات: ' + err.message)
      addNotification('error', 'حدث خطأ في حفظ التعديلات: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderRecordForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          السجل
        </label>
        <input
          type="text"
          name="registry"
          value={formData.registry || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          النوع
        </label>
        <select
          name="type"
          value={formData.type || ''}
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          المنطقة
        </label>
        <input
          type="text"
          name="area"
          value={formData.area || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          عدد المشتركين
        </label>
        <input
          type="number"
          name="subscribers_count"
          value={formData.subscribers_count || 0}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>
    </div>
  )

  const renderSubscriberForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رقم الحساب
          </label>
          <input
            type="text"
            name="account_number"
            value={formData.account_number || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اسم المشترك
          </label>
          <input
            type="text"
            name="subscriber_name"
            value={formData.subscriber_name || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            صنف الاشتراك
          </label>
          <select
            name="subscription_class"
            value={formData.subscription_class || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">اختر صنف الاشتراك</option>
            <option value="منزلي">منزلي</option>
            <option value="تجاري">تجاري</option>
            <option value="صناعي">صناعي</option>
            <option value="حكومي">حكومي</option>
            <option value="زراعي">زراعي</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رقم المقياس
          </label>
          <input
            type="text"
            name="meter_number"
            value={formData.meter_number || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            القراءة (كيلو واط ساعة)
          </label>
          <input
            type="number"
            name="reading"
            value={formData.reading || 0}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            تاريخ القراءة
          </label>
          <input
            type="date"
            name="reading_date"
            value={formData.reading_date || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
    </div>
  )

  const renderFeederForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المحطة
          </label>
          <input
            type="text"
            name="station"
            value={formData.station || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المغذي
          </label>
          <input
            type="text"
            name="feeder"
            value={formData.feeder || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الجهد
          </label>
          <select
            name="voltage"
            value={formData.voltage || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">اختر الجهد</option>
            <option value="11 كيلو فولت">11 كيلو فولت</option>
            <option value="33 كيلو فولت">33 كيلو فولت</option>
            <option value="66 كيلو فولت">66 كيلو فولت</option>
            <option value="132 كيلو فولت">132 كيلو فولت</option>
            <option value="400 فولت">400 فولت</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            رقم المقياس
          </label>
          <input
            type="text"
            name="meter_number"
            value={formData.meter_number || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نوع المقياس
          </label>
          <select
            name="meter_type"
            value={formData.meter_type || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">اختر نوع المقياس</option>
            <option value="رقمي">رقمي</option>
            <option value="تناظري">تناظري</option>
            <option value="ذكي">ذكي</option>
            <option value="متعدد الوظائف">متعدد الوظائف</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            القراءة (كيلو واط ساعة)
          </label>
          <input
            type="number"
            name="reading"
            value={formData.reading || 0}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          تاريخ القراءة
        </label>
        <input
          type="date"
          name="reading_date"
          value={formData.reading_date || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>
    </div>
  )

  const getTitle = () => {
    switch (type) {
      case 'record':
        return 'تعديل محضر الاستلام'
      case 'subscriber':
        return 'تعديل بيانات المشترك'
      case 'feeder':
        return 'تعديل بيانات المغذي'
      default:
        return 'تعديل السجل'
    }
  }

  return (
    <>
      {/* منطقة الإشعارات - خارج النافذة المنبثقة */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
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

      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {getTitle()}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {type === 'record' && renderRecordForm()}
            {type === 'subscriber' && renderSubscriberForm()}
            {type === 'feeder' && renderFeederForm()}

            {/* Footer */}
            <div className="flex space-x-reverse space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 ml-2" />
                    حفظ التعديلات
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}