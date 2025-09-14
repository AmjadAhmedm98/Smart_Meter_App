import React, { useState, useEffect } from 'react'
import { Users, Plus, Trash2, User, Lock, UserCheck, AlertCircle, CheckCircle, Eye, Edit3, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Pagination } from './Pagination'
import { useAuth } from '../contexts/AuthContext'

interface AppUser {
  id: string
  username: string
  role: 'ADMIN' | 'EMPLOYEE' | 'METER_READER' | 'GENERAL_READER'
  full_name?: string
  department?: string
  position?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    department: '',
    position: '',
    role: 'METER_READER' as 'ADMIN' | 'EMPLOYEE' | 'METER_READER' | 'GENERAL_READER',
    is_active: true
  })
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    department: '',
    position: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE' | 'METER_READER' | 'GENERAL_READER',
    is_active: true
  })
  const [formLoading, setFormLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from app_users table...')
      // جلب المستخدمين مباشرة من قاعدة البيانات
      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, username, role, full_name, department, position, is_active, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        addNotification('error', 'خطأ في جلب المستخدمين: ' + usersError.message)
        return
      }

      console.log('Users fetched successfully:', usersData?.length || 0)
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      addNotification('error', 'خطأ في جلب المستخدمين: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // التحقق من صحة البيانات
      if (!formData.username || !formData.password) {
        throw new Error('اسم المستخدم وكلمة المرور مطلوبان')
      }

      // إنشاء المستخدم عبر Edge Function
      // التحقق من عدم وجود اليوزرنيم مسبقاً
      const { data: existingUser } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', formData.username)
        .limit(1)

      if (existingUser && existingUser.length > 0) {
        throw new Error('اسم المستخدم موجود مسبقاً')
      }

      // إنشاء المستخدم مباشرة في قاعدة البيانات
      const { data: newUser, error: insertError } = await supabase
        .from('app_users')
        .insert([{
          username: formData.username,
          password_hash: formData.password, // في الإنتاج يجب تشفير كلمة المرور
          role: formData.role,
          full_name: formData.full_name || null,
          department: formData.department || null,
          position: formData.position || null
        }])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('اسم المستخدم موجود مسبقاً')
        }
        throw new Error(insertError.message)
      }

      addNotification('success', 'تم إنشاء المستخدم بنجاح! 🎉')
      setFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'EMPLOYEE' })
      setShowAddForm(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error creating user:', error)
      addNotification('error', 
        error.message === 'اسم المستخدم موجود مسبقاً' 
          ? 'هذا اسم المستخدم مسجل مسبقاً ❌' 
          : 'خطأ في إنشاء المستخدم: ' + error.message
      )
    } finally {
      setFormLoading(false)
    }
  }

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم: ${username}؟`)) return

    try {
      // منع حذف الأدمن الرئيسي
      if (username === 'admin') {
        throw new Error('لا يمكن حذف المدير الرئيسي')
      }

      // حذف المستخدم عبر Edge Function
      // حذف المستخدم مباشرة من قاعدة البيانات
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId)

      if (error) {
        throw new Error(error.message)
      }

      addNotification('success', 'تم حذف المستخدم بنجاح! 🗑️')
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      addNotification('error', 'خطأ في حذف المستخدم: ' + error.message)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'is_active' ? value === 'true' : value 
    }))
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }))
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ 
      ...prev, 
      [name]: name === 'is_active' ? value === 'true' : value 
    }))
  }

  const handleEdit = (user: AppUser) => {
    setEditingUser(user)
    setFormData({ 
      username: user.username, 
      password: '',
      full_name: user.full_name || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role
    })
    setEditFormData({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role,
      is_active: user.is_active
    })
    setShowEditForm(true)
  }

  const handleView = (user: AppUser) => {
    setViewingUser(user)
    setShowViewModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    
    setFormLoading(true)

    try {
      const updateData: any = {
        username: editFormData.username,
        full_name: editFormData.full_name || null,
        department: editFormData.department || null,
        position: editFormData.position || null,
        role: editFormData.role,
        is_active: editFormData.is_active
      }

      // إضافة كلمة المرور إذا كان المستخدم يريد تغييرها
      if (editFormData.password.trim() !== '') {
        updateData.password = editFormData.password
      }

      // تحديث المستخدم عبر Edge Function
      // تحديث المستخدم مباشرة في قاعدة البيانات
      const { error } = await supabase
        .from('app_users')
        .update(updateData)
        .eq('id', editingUser.id)

      if (error) {
        throw new Error(error.message)
      }

      addNotification('success', 'تم تحديث بيانات المستخدم بنجاح! ✏️')
      setShowEditForm(false)
      setEditingUser(null)
      setFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'METER_READER', is_active: true })
      setEditFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'METER_READER', is_active: true })
      fetchUsers()
    } catch (error: any) {
      addNotification('error', 'خطأ في تحديث المستخدم: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const closeModals = () => {
    setShowAddForm(false)
    setShowEditForm(false)
    setShowViewModal(false)
    setEditingUser(null)
    setViewingUser(null)
    setFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'METER_READER', is_active: true })
    setEditFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'METER_READER', is_active: true })
  }

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = users.slice(startIndex, endIndex)

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

      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-3" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            إدارة المستخدمين ({users.length})
          </h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-green-700 transition-all duration-200 text-xs sm:text-sm"
        >
          <Plus className="w-3 h-3 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
          <span className="hidden sm:inline">إضافة موظف جديد</span>
          <span className="sm:hidden">إضافة موظف</span>
        </button>
      </div>

      {/* كاردات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {[
          {
            id: 'total',
            title: 'إجمالي الموظفين',
            description: 'جميع الموظفين المسجلين',
            icon: Users,
            color: 'bg-blue-500',
            hoverColor: 'hover:bg-blue-600',
            count: users.length,
            textColor: 'text-gray-900 dark:text-white'
          },
          {
            id: 'active',
            title: 'الموظفين النشطين',
            description: 'الموظفين المفعلين',
            icon: UserCheck,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
            count: users.length,
            textColor: 'text-green-600 dark:text-green-400'
          },
          {
            id: 'recent',
            title: 'المضافين حديثاً',
            description: 'خلال آخر 30 يوم',
            icon: Plus,
            color: 'bg-purple-500',
            hoverColor: 'hover:bg-purple-600',
            count: users.filter(user => {
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              return new Date(user.created_at) > thirtyDaysAgo
            }).length,
            textColor: 'text-purple-600 dark:text-purple-400'
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

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            إضافة موظف جديد
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="أدخل اسم المستخدم (أرقام وحروف فقط)"
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
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="أدخل كلمة المرور"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الدور
              </label>
              <select
                value={formData.role}
                onChange={handleFormChange}
                name="role"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="METER_READER">قارئ مقاييس</option>
                <option value="GENERAL_READER">قارئ عام</option>
                <option value="EMPLOYEE">موظف</option>
                <option value="ADMIN">مدير</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الاسم الكامل
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="أدخل الاسم الكامل للموظف"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  القسم
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="مثال: قسم المقاييس"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المنصب
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="مثال: فني مقاييس"
                />
              </div>
            </div>

            <div className="flex space-x-reverse space-x-4">
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {formLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5 ml-2" />
                    إنشاء الموظف
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ username: '', password: '', full_name: '', department: '', position: '', role: 'METER_READER', is_active: true })
                }}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            قائمة الموظفين ({users.length})
          </h3>
        </div>
        
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا يوجد موظفين مسجلين حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    اسم المستخدم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الدور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الاسم الكامل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    القسم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    المنصب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center ml-3">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        user.role === 'METER_READER' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        user.role === 'GENERAL_READER' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {user.role === 'ADMIN' ? 'مدير' : 
                         user.role === 'METER_READER' ? 'قارئ مقاييس' :
                         user.role === 'GENERAL_READER' ? 'قارئ عام' : 'موظف'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.position || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.is_active ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(user.created_at).toLocaleDateString('ar-SA', { 
                        calendar: 'gregory',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-reverse space-x-2">
                        <button
                          onClick={() => handleView(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
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
            
            <Pagination
              currentPage={currentPage}
              totalItems={users.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage)
                setCurrentPage(1)
              }}
              itemName="مستخدم"
            />
          </div>
        )}
      </div>

      {/* نموذج التعديل */}
      {showEditForm && editingUser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تعديل المستخدم
              </h3>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    name="username"
                    value={editFormData.username}
                    onChange={handleEditChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    pattern="[a-zA-Z0-9]+"
                    minLength={3}
                    maxLength={20}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  أرقام وحروف فقط (3-20 حرف)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الدور
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="EMPLOYEE">موظف</option>
                  <option value="METER_READER">قارئ مقاييس</option>
                  <option value="GENERAL_READER">قارئ عام</option>
                  <option value="ADMIN">مدير</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  حالة التفعيل
                </label>
                <select
                  name="is_active"
                  value={editFormData.is_active.toString()}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="true">مفعل</option>
                  <option value="false">معطل</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  المستخدمون المعطلون لا يمكنهم تسجيل الدخول
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={editFormData.full_name}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القسم
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={editFormData.department}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="مثال: قسم المقاييس"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المنصب
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={editFormData.position}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="مثال: فني مقاييس"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كلمة المرور الجديدة (اختياري)
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="اتركه فارغاً إذا لم ترد تغيير كلمة المرور"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    اتركه فارغاً للاحتفاظ بكلمة المرور الحالية
                  </p>
                </div>
              </div>

              <div className="flex space-x-reverse space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                >
                  {formLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5 ml-2" />
                      تحديث البيانات
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة العرض */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تفاصيل المستخدم
              </h3>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  اسم المستخدم
                </label>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <User className="w-4 h-4 text-gray-500 ml-2" />
                  <span className="text-gray-900 dark:text-white">{viewingUser.username}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الدور
                </label>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewingUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    viewingUser.role === 'METER_READER' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    viewingUser.role === 'GENERAL_READER' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {viewingUser.role === 'ADMIN' ? 'مدير' : 
                     viewingUser.role === 'METER_READER' ? 'قارئ مقاييس' :
                     viewingUser.role === 'GENERAL_READER' ? 'قارئ عام' : 'موظف'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الاسم الكامل
                </label>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-900 dark:text-white">{viewingUser.full_name || '-'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    القسم
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-900 dark:text-white">{viewingUser.department || '-'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    المنصب
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-900 dark:text-white">{viewingUser.position || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  حالة التفعيل
                </label>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewingUser.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {viewingUser.is_active ? 'مفعل' : 'معطل'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  تاريخ الإنشاء
                </label>
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    {new Date(viewingUser.created_at).toLocaleDateString('ar-SA', {
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
                onClick={closeModals}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}