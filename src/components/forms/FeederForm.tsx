import React, { useState } from 'react'
import { Save, CheckCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ImageUpload } from '../ImageUpload'

interface FeederFormProps {
  onFeederAdded?: () => void
}

export const FeederForm: React.FC<FeederFormProps> = ({ onFeederAdded }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    station: '',
    feeder: '',
    voltage: '',
    meter_number: '',
    meter_type: '',
    reading: 0,
    reading_date: new Date().toISOString().split('T')[0]
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
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
      [name]: name === 'reading' ? parseFloat(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      let imageUrl = null

      // رفع الصورة إذا تم اختيارها
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `feeders/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meter-images')
          .upload(filePath, selectedImage)

        if (uploadError) {
          console.error('Image upload failed:', uploadError.message)
          // لا نوقف العملية، نكمل بدون صورة
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('meter-images')
            .getPublicUrl(filePath)
          imageUrl = publicUrl
          console.log('Image uploaded successfully:', imageUrl)
        }
      }

      const { error } = await supabase.from('feeders').insert([
        {
          ...formData,
          reading: parseFloat(formData.reading) || 0,
          app_user_id: user?.id,
          image_url: imageUrl
        }
      ])

      if (error) throw error

      addNotification('success', 'تم حفظ قراءة المغذي بنجاح! 🎉')
      setFormData({
        station: '',
        feeder: '',
        voltage: '',
        meter_number: '',
        meter_type: '',
        reading: 0,
        reading_date: new Date().toISOString().split('T')[0]
      })
      setSelectedImage(null)

      // تحديث البيانات في لوحة الأدمن
      if (onFeederAdded) {
        onFeederAdded()
      }
    } catch (error) {
      console.error('Error saving feeder:', error)
      addNotification('error', 'حدث خطأ في حفظ قراءة المغذي')
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
          إدخال قراءة مقياس مغذي
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              المحطة
            </label>
            <input
              type="text"
              name="station"
              value={formData.station}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل اسم المحطة"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              المغذي
            </label>
            <input
              type="text"
              name="feeder"
              value={formData.feeder}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل اسم المغذي"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              الجهد
            </label>
            <select
              name="voltage"
              value={formData.voltage}
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
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              رقم المقياس
            </label>
            <input
              type="text"
              name="meter_number"
              value={formData.meter_number}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل رقم المقياس"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع المقياس
            </label>
            <select
              name="meter_type"
              value={formData.meter_type}
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
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              القراءة (كيلو واط ساعة)
            </label>
            <input
              type="number"
              name="reading"
              value={formData.reading}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="أدخل قراءة المقياس"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ القراءة
            </label>
            <input
              type="date"
              name="reading_date"
              value={formData.reading_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <ImageUpload
            onImageSelect={setSelectedImage}
            currentImage={selectedImage}
            label="صورة المقياس"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                حفظ قراءة المغذي
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}