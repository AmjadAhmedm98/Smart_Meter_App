import React, { useState, useEffect } from 'react'
import { ClipboardCheck, MapPin, Camera, Send, CheckCircle, AlertCircle, X, Clock, Target, Navigation } from 'lucide-react'
import { supabase, Task } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ImageUpload } from './ImageUpload'

export const MyTasks: React.FC = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    meter_reading: 0,
    location_lat: null as number | null,
    location_lng: null as number | null
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])
  const [gettingLocation, setGettingLocation] = useState(false)

  const addNotification = (type: 'success' | 'error', text: string) => {
    const id = Date.now().toString()
    const notification = { id, type, text, timestamp: Date.now() }
    setNotifications(prev => [...prev, notification])
    
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
    if (user) {
      fetchMyTasks()
    }
  }, [user])

  const fetchMyTasks = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, meter_id, app_user_id, assigned_by, task_date, status, meter_reading, meter_image_url, location_lat, location_lng, completed_at, created_at, meter:meters(*)')
        .eq('app_user_id', user.id)
        .order('task_date', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      addNotification('error', 'خطأ في جلب المهام')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = () => {
    setGettingLocation(true)
    
    if (!navigator.geolocation) {
      addNotification('error', 'الموقع الجغرافي غير مدعوم في هذا المتصفح')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude
        }))
        addNotification('success', 'تم الحصول على الموقع بنجاح! 📍')
        setGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        addNotification('error', 'فشل في الحصول على الموقع. تأكد من السماح بالوصول للموقع')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user) return

    if (!formData.location_lat || !formData.location_lng) {
      addNotification('error', 'يجب الحصول على الموقع الجغرافي أولاً')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = null

      // رفع الصورة إذا تم اختيارها
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop()
        const fileName = `task-${selectedTask.id}-${Date.now()}.${fileExt}`
        const filePath = `tasks/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meter-images')
          .upload(filePath, selectedImage)

        if (uploadError) {
          console.error('Image upload failed:', uploadError.message)
          addNotification('error', 'فشل في رفع الصورة')
          setSubmitting(false)
          return
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('meter-images')
            .getPublicUrl(filePath)
          imageUrl = publicUrl
        }
      }

      // تحديث المهمة
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'منجز',
          meter_reading: formData.meter_reading,
          meter_image_url: imageUrl,
          location_lat: formData.location_lat,
          location_lng: formData.location_lng,
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)

      if (error) throw error

      addNotification('success', 'تم إنجاز المهمة بنجاح! 🎉')
      setSelectedTask(null)
      setFormData({
        meter_reading: '',
        location_lat: null,
        location_lng: null
      })
      setSelectedImage(null)
      fetchMyTasks()
    } catch (error: any) {
      addNotification('error', 'خطأ في إرسال المهمة: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'قيد التنفيذ')
  const completedTasks = tasks.filter(t => t.status === 'منجز')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* Header & Stats */}
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
          مهامي اليومية
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 ml-2" />
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingTasks.length}</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">قيد التنفيذ</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400 ml-2" />
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</p>
                <p className="text-sm text-green-700 dark:text-green-300">منجزة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تنفيذ المهمة
              </h3>
              <button
                onClick={() => {
                  setSelectedTask(null)
                  setFormData({ meter_reading: 0, location_lat: null, location_lng: null })
                  setSelectedImage(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-6">
              {/* Meter Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">بيانات المقياس</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">اسم المشترك:</span> {selectedTask.meter?.subscriber_name}</p>
                  <p><span className="font-medium">رقم الحساب:</span> {selectedTask.meter?.account_number}</p>
                  <p><span className="font-medium">رقم المقياس:</span> {selectedTask.meter?.meter_number}</p>
                  <p><span className="font-medium">العنوان:</span> {selectedTask.meter?.address}</p>
                  <p><span className="font-medium">المغذي:</span> {selectedTask.meter?.feeder}</p>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الموقع الجغرافي
                </label>
                <div className="flex items-center space-x-reverse space-x-2">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {gettingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        جاري التحديد...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 ml-2" />
                        تحديد الموقع
                      </>
                    )}
                  </button>
                  
                  {formData.location_lat && formData.location_lng && (
                    <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                      <MapPin className="w-4 h-4 ml-1" />
                      تم تحديد الموقع
                    </div>
                  )}
                </div>
              </div>

              {/* Meter Reading */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  قراءة المقياس
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.meter_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, meter_reading: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="أدخل قراءة المقياس"
                  required
                />
              </div>

              {/* Image Upload */}
              <ImageUpload
                onImageSelect={setSelectedImage}
                currentImage={selectedImage}
                label="صورة المقياس"
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !formData.location_lat || !formData.location_lng}
                className="w-full bg-gradient-to-r from-teal-600 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-teal-700 hover:to-green-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 ml-2" />
                    إرسال المهمة
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 text-orange-500 ml-2" />
            المهام قيد التنفيذ ({pendingTasks.length})
          </h3>
          
          <div className="grid gap-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {task.meter?.subscriber_name}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                      <p>رقم الحساب: {task.meter?.account_number}</p>
                      <p>رقم المقياس: {task.meter?.meter_number}</p>
                      <p>العنوان: {task.meter?.address}</p>
                      <p>المغذي: {task.meter?.feeder}</p>
                      <p>تاريخ المهمة: {new Date(task.task_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all duration-200 text-sm font-medium"
                  >
                    تنفيذ المهمة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="w-5 h-5 text-green-500 ml-2" />
            المهام المنجزة ({completedTasks.length})
          </h3>
          
          <div className="grid gap-4">
            {completedTasks.map((task) => (
              <div key={task.id} className="border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {task.meter?.subscriber_name}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                      <p>القراءة: {task.meter_reading}</p>
                      <p>تاريخ الإنجاز: {task.completed_at ? new Date(task.completed_at).toLocaleDateString('ar-SA', { calendar: 'gregory' }) : '-'}</p>
                      {task.location_lat && task.location_lng && (
                        <button
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${task.location_lat},${task.location_lng}`
                            window.open(url, '_blank')
                          }}
                          className="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors cursor-pointer"
                          title="فتح الموقع في خرائط جوجل"
                        >
                          <MapPin className="w-4 h-4 ml-1" />
                          <span className="text-sm">تم تسجيل الموقع</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5 ml-1" />
                    <span className="text-sm font-medium">منجز</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Tasks */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد مهام
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            لم يتم تكليفك بأي مهام حتى الآن
          </p>
        </div>
      )}
    </div>
  )
}