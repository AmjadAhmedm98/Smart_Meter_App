import React, { useState, useEffect } from 'react'
import { ClipboardList, Plus, Users, Calendar, MapPin, Eye, Trash2, CheckCircle, AlertCircle, X, Clock, Target, Edit3, User, Gauge, Image as ImageIcon } from 'lucide-react'
import { supabase, Task, Meter } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Pagination } from './Pagination'

interface TasksManagementProps {
  onDataChange: () => void
}

interface User {
  id: string
  email: string
  full_name?: string
}

export const TasksManagement: React.FC<TasksManagementProps> = ({ onDataChange }) => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedMeters, setSelectedMeters] = useState<string[]>([])
  const [formData, setFormData] = useState({
    app_user_id: '',
    task_date: new Date().toISOString().split('T')[0]
  })
  const [formLoading, setFormLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'قيد التنفيذ' | 'منجز'>('all')
  const [filterUser, setFilterUser] = useState('')
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; data: Task | null }>({
    isOpen: false,
    data: null
  })
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: Task | null }>({
    isOpen: false,
    data: null
  })
  const [editFormData, setEditFormData] = useState({
    app_user_id: '',
    task_date: '',
    status: 'قيد التنفيذ' as 'قيد التنفيذ' | 'منجز'
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null
  })
  const [imageViewer, setImageViewer] = useState<{ isOpen: boolean; imageUrl: string; title: string }>({
    isOpen: false,
    imageUrl: '',
    title: ''
  })
  const [loadingImage, setLoadingImage] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        console.error('Supabase configuration missing. Please check your .env file.')
        addNotification('error', 'خطأ في إعدادات قاعدة البيانات')
        setLoading(false)
        return
      }

      const [tasksResult, metersResult, usersResult] = await Promise.all([
        supabase.from('tasks').select('id, meter_id, app_user_id, assigned_by, task_date, status, meter_reading, meter_image_url, location_lat, location_lng, completed_at, created_at, meter:meters(*)'),
        supabase.from('meters').select('*').order('subscriber_name'),
        // جلب المستخدمين من app_users مباشرة
        supabase.from('app_users').select('id, username, full_name, role, is_active').eq('is_active', true).order('full_name')
      ])

      if (tasksResult.data) setTasks(tasksResult.data)
      if (metersResult.data) setMeters(metersResult.data)
      
      // جلب المستخدمين من app_users
      if (usersResult.data) {
        // فلترة المستخدمين النشطين فقط
        const activeUsers = usersResult.data.filter((u: any) => u.is_active && u.username !== 'admin')
        setUsers(activeUsers)
      } else {
        console.warn('No users data received from app_users table')
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      addNotification('error', 'خطأ في جلب البيانات. تأكد من إعدادات قاعدة البيانات.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || selectedMeters.length === 0) return

    setFormLoading(true)
    try {
      const tasksToCreate = selectedMeters.map(meterId => ({
        meter_id: meterId,
        app_user_id: formData.app_user_id,
        assigned_by: user.id,
        task_date: formData.task_date,
        status: 'قيد التنفيذ' as const
      }))

      const { error } = await supabase.from('tasks').insert(tasksToCreate)
      if (error) throw error

      addNotification('success', 'تم إنشاء ' + tasksToCreate.length + ' مهمة بنجاح! 🎉')
      setFormData({
        app_user_id: '',
        task_date: new Date().toISOString().split('T')[0]
      })
      setSelectedMeters([])
      setShowAddForm(false)
      fetchData()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في إنشاء المهام: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    
    setDeleteConfirm({
      isOpen: true,
      task
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.task) return

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', deleteConfirm.task.id)
      if (error) throw error

      addNotification('success', 'تم حذف المهمة بنجاح! 🗑️')
      fetchData()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في حذف المهمة: ' + error.message)
    } finally {
      setDeleteConfirm({
        isOpen: false,
        task: null
      })
    }
  }

  const handleEdit = (task: Task) => {
    setEditFormData({
      app_user_id: task.app_user_id,
      task_date: task.task_date,
      status: task.status
    })
    setEditModal({ isOpen: true, data: task })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal.data) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update(editFormData)
        .eq('id', editModal.data.id)

      if (error) throw error

      addNotification('success', 'تم تحديث المهمة بنجاح! ✏️')
      setEditModal({ isOpen: false, data: null })
      fetchData()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في تحديث المهمة: ' + error.message)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  const openImageViewer = async (imageUrl: string, title: string) => {
    setLoadingImage(true)
    try {
      // إنشاء signed URL للـ bucket الخاص
      const path = imageUrl.split('/').pop()
      const filePath = `tasks/${path}`
      
      const { data, error } = await supabase.storage
        .from('meter-images')
        .createSignedUrl(filePath, 3600) // صالح لمدة ساعة
      
      if (error) {
        console.error('Error creating signed URL:', error)
        // استخدام الـ URL الأصلي كـ fallback
        setImageViewer({
          isOpen: true,
          imageUrl,
          title
        })
      } else {
        setImageViewer({
          isOpen: true,
          imageUrl: data.signedUrl,
          title
        })
      }
    } catch (error) {
      console.error('Error opening image viewer:', error)
      // fallback في حالة حدوث خطأ
      setImageViewer({
        isOpen: true,
        imageUrl,
        title
      })
    } finally {
      setLoadingImage(false)
    }
  }

  const closeImageViewer = () => {
    setImageViewer({
      isOpen: false,
      imageUrl: '',
      title: ''
    })
  }

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesUser = !filterUser || task.app_user_id === filterUser
    return matchesStatus && matchesUser
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterUser])

  const completedTasks = tasks.filter(t => t.status === 'منجز').length
  const pendingTasks = tasks.filter(t => t.status === 'قيد التنفيذ').length

  // فلترة المقاييس المتاحة (التي ليس لها مهام نشطة)
  const getAvailableMeters = () => {
    // الحصول على معرفات المقاييس التي لها مهام قيد التنفيذ
    const assignedMeterIds = tasks
      .filter(task => task.status === 'قيد التنفيذ')
      .map(task => task.meter_id)
    
    // إرجاع المقاييس التي ليس لها مهام نشطة
    return meters.filter(meter => !assignedMeterIds.includes(meter.id))
  }

  const availableMeters = getAvailableMeters()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center">
          <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400 ml-3" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            إدارة المهام ({tasks.length})
          </h2>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all duration-200 text-sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          إنشاء مهام جديدة
        </button>
      </div>

      {/* كاردات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {[
          {
            id: 'total',
            title: 'إجمالي المهام',
            description: 'جميع المهام في النظام',
            icon: ClipboardList,
            color: 'bg-blue-500',
            hoverColor: 'hover:bg-blue-600',
            count: tasks.length,
            textColor: 'text-gray-900 dark:text-white'
          },
          {
            id: 'pending',
            title: 'قيد التنفيذ',
            description: `${tasks.length > 0 ? Math.round((pendingTasks / tasks.length) * 100) : 0}% من الإجمالي`,
            icon: Clock,
            color: 'bg-orange-500',
            hoverColor: 'hover:bg-orange-600',
            count: pendingTasks,
            textColor: 'text-orange-600 dark:text-orange-400'
          },
          {
            id: 'completed',
            title: 'المهام المنجزة',
            description: `${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% من الإجمالي`,
            icon: Target,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
            count: completedTasks,
            textColor: 'text-green-600 dark:text-green-400'
          }
        ].map((stat) => {
          const IconComponent = stat.icon
          return (
            <div
              key={stat.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.color} rounded-lg flex items-center justify-center ${stat.hoverColor} transition-colors`}>
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className={`text-lg sm:text-xl font-bold ${stat.textColor}`}>
                    {stat.count}
                  </div>
                </div>
              </div>
              
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">
                {stat.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                {stat.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              فلترة حسب الحالة
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="قيد التنفيذ">قيد التنفيذ</option>
              <option value="منجز">منجز</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              فلترة حسب الموظف
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع الموظفين</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            إنشاء مهام جديدة
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الموظف المسؤول
                </label>
                <select
                  value={formData.app_user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, app_user_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">اختر الموظف</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاريخ المهمة
                </label>
                <input
                  type="date"
                  value={formData.task_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, task_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اختيار المقاييس ({selectedMeters.length} محدد من {availableMeters.length} متاح)
              </label>
              {availableMeters.length === 0 ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-8 bg-gray-50 dark:bg-gray-700 text-center">
                  <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    لا توجد مقاييس متاحة لإنشاء مهام جديدة
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    جميع المقاييس مُكلفة حالياً لموظفين آخرين
                  </p>
                </div>
              ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                {availableMeters.map(meter => (
                  <label key={meter.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMeters.includes(meter.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMeters(prev => [...prev, meter.id])
                        } else {
                          setSelectedMeters(prev => prev.filter(id => id !== meter.id))
                        }
                      }}
                      className="ml-3 text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {meter.subscriber_name} - {meter.account_number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {meter.address} | {meter.feeder}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              )}
              
              {meters.length > availableMeters.length && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    📋 يوجد {meters.length - availableMeters.length} مقياس مُكلف حالياً لموظفين آخرين
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-reverse space-x-4">
              <button
                type="submit"
                disabled={formLoading || selectedMeters.length === 0}
                className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {formLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-5 h-5 ml-2" />
                    إنشاء المهام ({selectedMeters.length})
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedMeters([])
                  setFormData({
                    app_user_id: '',
                    task_date: new Date().toISOString().split('T')[0]
                  })
                }}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            قائمة المهام ({filteredTasks.length})
          </h3>
        </div>
        
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد مهام</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المقياس</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الموظف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ المهمة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">القراءة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الموقع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الصورة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {paginatedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">{task.meter?.subscriber_name}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {task.meter?.account_number} | {task.meter?.meter_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {users.find(u => u.id === task.app_user_id)?.full_name || users.find(u => u.id === task.app_user_id)?.username || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(task.task_date).toLocaleDateString('ar-SA', { 
                          calendar: 'gregory',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'منجز' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.meter_reading || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.location_lat && task.location_lng ? (
                          <button
                            onClick={() => {
                              const url = `https://www.google.com/maps?q=${task.location_lat},${task.location_lng}`
                              window.open(url, '_blank')
                            }}
                            className="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors cursor-pointer"
                            title="فتح الموقع في خرائط جوجل"
                          >
                            <MapPin className="w-4 h-4 ml-1" />
                            <span className="text-xs">متوفر</span>
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.meter_image_url ? (
                          <button
                            onClick={() => openImageViewer(task.meter_image_url!, `صورة مقياس ${task.meter?.subscriber_name}`)}
                            className="flex items-center text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
                            title="عرض صورة المقياس"
                            disabled={loadingImage}
                          >
                            <ImageIcon className="w-4 h-4 ml-1" />
                            <span className="text-xs">متوفرة</span>
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <button
                            onClick={() => setViewModal({ isOpen: true, data: task })}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTasks.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage)
                setCurrentPage(1)
              }}
              itemName="مهمة"
            />
          </>
        )}
      </div>

      {/* View Modal */}
      {viewModal.isOpen && viewModal.data && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تفاصيل المهمة - {viewModal.data.meter?.subscriber_name}
              </h3>
              <button
                onClick={() => setViewModal({ isOpen: false, data: null })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* بيانات المقياس */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">بيانات المقياس</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">اسم المشترك:</span>
                    <span className="mr-2">{viewModal.data.meter?.subscriber_name}</span>
                  </div>
                  <div>
                    <span className="font-medium">رقم الحساب:</span>
                    <span className="mr-2">{viewModal.data.meter?.account_number}</span>
                  </div>
                  <div>
                    <span className="font-medium">رقم المقياس:</span>
                    <span className="mr-2">{viewModal.data.meter?.meter_number}</span>
                  </div>
                  <div>
                    <span className="font-medium">المغذي:</span>
                    <span className="mr-2">{viewModal.data.meter?.feeder}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-medium">العنوان:</span>
                  <span className="mr-2">{viewModal.data.meter?.address}</span>
                </div>
              </div>
              
              {/* بيانات المهمة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    الموظف المسؤول
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <User className="w-4 h-4 text-gray-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">
                      {users.find(u => u.id === viewModal.data?.app_user_id)?.full_name || users.find(u => u.id === viewModal.data?.app_user_id)?.username || 'غير محدد'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    تاريخ المهمة
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">
                      {new Date(viewModal.data.task_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    الحالة
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewModal.data.status === 'منجز' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {viewModal.data.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    القراءة
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Gauge className="w-4 h-4 text-gray-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">
                      {viewModal.data.meter_reading || 'لم يتم الإدخال بعد'}
                    </span>
                  </div>
                </div>
              </div>
              
              {viewModal.data.location_lat && viewModal.data.location_lng && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    الموقع الجغرافي
                  </label>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${viewModal.data.location_lat},${viewModal.data.location_lng}`
                      window.open(url, '_blank')
                    }}
                    className="w-full flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    title="فتح الموقع في خرائط جوجل"
                  >
                    <MapPin className="w-4 h-4 text-green-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">
                      {viewModal.data.location_lat.toFixed(6)}, {viewModal.data.location_lng.toFixed(6)}
                    </span>
                  </button>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  تاريخ الإنشاء
                </label>
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {new Date(viewModal.data.created_at).toLocaleDateString('ar-SA', {
                      calendar: 'gregory',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
              <button
                onClick={() => setViewModal({ isOpen: false, data: null })}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && editModal.data && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تعديل المهمة
              </h3>
              <button
                onClick={() => setEditModal({ isOpen: false, data: null })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الموظف المسؤول
                  </label>
                  <select
                    name="app_user_id"
                    value={editFormData.app_user_id}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">اختر الموظف</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    تاريخ المهمة
                  </label>
                  <input
                    type="date"
                    name="task_date"
                    value={editFormData.task_date}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحالة
                  </label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="منجز">منجز</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-reverse space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center"
                >
                  <Edit3 className="w-5 h-5 ml-2" />
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, data: null })}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && deleteConfirm.task && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center ml-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تأكيد حذف المهمة
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                هل أنت متأكد من حذف هذه المهمة؟
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  {deleteConfirm.task.meter?.subscriber_name || 'مهمة غير محددة'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الموظف: {users.find(u => u.id === deleteConfirm.task?.app_user_id)?.full_name || users.find(u => u.id === deleteConfirm.task?.app_user_id)?.username || 'غير محدد'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تاريخ المهمة: {new Date(deleteConfirm.task.task_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الحالة: {deleteConfirm.task.status}
                </p>
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            
            <div className="flex justify-end space-x-reverse space-x-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, task: null })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                حذف المهمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {imageViewer.isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl max-h-full overflow-hidden">
            {/* شريط العنوان والأدوات */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {imageViewer.title}
              </h3>
              
              <button
                onClick={closeImageViewer}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* منطقة عرض الصورة */}
            <div className="p-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-center">
                <img
                  src={imageViewer.imageUrl}
                  alt="صورة المقياس"
                  className="max-w-full h-auto transition-transform duration-200 ease-in-out"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPtmE2Kcg2YrZhdmD2YYg2LnYsdmCINin2YTYtdmI2LHYqTwvdGV4dD48L3N2Zz4='
                  }}
                />
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                انقر خارج الصورة للإغلاق
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}