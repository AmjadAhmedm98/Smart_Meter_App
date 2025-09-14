import React, { useState, useEffect } from 'react'
import { BarChart3, FileText, Users, Zap, Plus, Eye, Trash2, Edit3, UserPlus, Download, Upload, ArrowRight, Image as ImageIcon, CheckCircle, AlertCircle, X, Gauge, ClipboardList, MapPin, Shield } from 'lucide-react'
import { Layout } from './Layout'
import { supabase, Record, Subscriber, Feeder, Meter, Task } from '../lib/supabase'
import { UserManagement } from './UserManagement'
import { RecordForm } from './forms/RecordForm'
import { SubscriberForm } from './forms/SubscriberForm'
import { FeederForm } from './forms/FeederForm'
import { MetersManagement } from './MetersManagement'
import { TasksManagement } from './TasksManagement'
import { TasksMap } from './TasksMap'
import { ReportsExport } from './ReportsExport'
import { DataImport } from './DataImport'
import { Pagination } from './Pagination'
import { ImageViewer } from './ImageViewer'
import { ViewModal } from './ViewModal'
import { EditModal } from './EditModal'

export const AdminDashboard: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [feeders, setFeeders] = useState<Feeder[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'subscribers' | 'feeders' | 'meters' | 'tasks' | 'map' | 'users' | 'add-record' | 'add-subscriber' | 'add-feeder' | 'reports' | 'import' | 'roles'>('overview')
  const [loading, setLoading] = useState(true)
  
  // Pagination states - منفصلة لكل تاب
  const [recordsPage, setRecordsPage] = useState(1)
  const [subscribersPage, setSubscribersPage] = useState(1)
  const [feedersPage, setFeedersPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [subscribersPerPage, setSubscribersPerPage] = useState(10)
  const [feedersPerPage, setFeedersPerPage] = useState(10)
  
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; data: any; type: 'record' | 'subscriber' | 'feeder' }>({
    isOpen: false,
    data: null,
    type: 'record'
  })
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any; type: 'record' | 'subscriber' | 'feeder' }>({
    isOpen: false,
    data: null,
    type: 'record'
  })
  const [imageViewer, setImageViewer] = useState<{ isOpen: boolean; imageUrl: string; title: string }>({
    isOpen: false,
    imageUrl: '',
    title: ''
  })
  const [loadingImage, setLoadingImage] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: any; table: string; itemName: string }>({
    isOpen: false,
    item: null,
    table: '',
    itemName: ''
  })

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
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      console.error('Supabase configuration missing. Please set up your .env file.')
      setLoading(false)
      return
    }

    try {
      const [recordsResult, subscribersResult, feedersResult, metersResult, tasksResult] = await Promise.all([
        supabase.from('records').select('*').order('created_at', { ascending: false }),
        supabase.from('subscribers').select('*').order('created_at', { ascending: false }),
        supabase.from('feeders').select('*').order('created_at', { ascending: false }),
        supabase.from('meters').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('id, meter_id, app_user_id, assigned_by, task_date, status, meter_reading, meter_image_url, location_lat, location_lng, completed_at, created_at, meter:meters(*)').order('created_at', { ascending: false })
      ])

      if (recordsResult.data) setRecords(recordsResult.data)
      if (subscribersResult.data) setSubscribers(subscribersResult.data)
      if (feedersResult.data) setFeeders(feedersResult.data)
      if (metersResult.data) setMeters(metersResult.data)
      if (tasksResult.data) setTasks(tasksResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (table: string, id: string) => {
    const tableNames = {
      'records': 'محضر الاستلام',
      'subscribers': 'مقياس المشترك',
      'feeders': 'مقياس المغذي'
    }
    
    const itemName = tableNames[table as keyof typeof tableNames] || 'السجل'
    
    let item = null
    if (table === 'records') {
      item = records.find(r => r.id === id)
    } else if (table === 'subscribers') {
      item = subscribers.find(s => s.id === id)
    } else if (table === 'feeders') {
      item = feeders.find(f => f.id === id)
    }
    
    setDeleteConfirm({
      isOpen: true,
      item,
      table,
      itemName
    })
  }

  const openImageViewer = async (imageUrl: string, title: string) => {
    setLoadingImage(true)
    try {
      const path = imageUrl.split('/').pop()
      const folder = imageUrl.includes('subscribers') ? 'subscribers' : 'feeders'
      const filePath = `${folder}/${path}`
      
      const { data, error } = await supabase.storage
        .from('meter-images')
        .createSignedUrl(filePath, 3600)
      
      if (error) {
        console.error('Error creating signed URL:', error)
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

  const handleTabChange = (newTab: any) => {
    setActiveTab(newTab)
  }

  // Pagination للمحاضر
  const getRecordsPaginated = () => {
    const startIndex = (recordsPage - 1) * recordsPerPage
    const endIndex = startIndex + recordsPerPage
    return records.slice(startIndex, endIndex)
  }

  const getRecordsTotalPages = () => {
    return Math.ceil(records.length / recordsPerPage)
  }

  // Pagination للمشتركين
  const getSubscribersPaginated = () => {
    const startIndex = (subscribersPage - 1) * subscribersPerPage
    const endIndex = startIndex + subscribersPerPage
    return subscribers.slice(startIndex, endIndex)
  }

  const getSubscribersTotalPages = () => {
    return Math.ceil(subscribers.length / subscribersPerPage)
  }

  // Pagination للمغذيات
  const getFeedersPaginated = () => {
    const startIndex = (feedersPage - 1) * feedersPerPage
    const endIndex = startIndex + feedersPerPage
    return feeders.slice(startIndex, endIndex)
  }

  const getFeedersTotalPages = () => {
    return Math.ceil(feeders.length / feedersPerPage)
  }

  // مكون Pagination منفصل
  const PaginationControls = ({ 
    currentPage, 
    setCurrentPage, 
    itemsPerPage, 
    setItemsPerPage, 
    totalItems, 
    dataType 
  }: { 
    currentPage: number
    setCurrentPage: (page: number) => void
    itemsPerPage: number
    setItemsPerPage: (items: number) => void
    totalItems: number
    dataType: string
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

    if (totalPages <= 1) return null

    return (
      <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-reverse space-x-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            عرض {startIndex + 1} إلى {endIndex} من {totalItems} {dataType}
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">عرض:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={totalItems}>الكل ({totalItems})</option>
            </select>
          </div>
        </div>
        
        <div className="flex space-x-reverse space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            السابق
          </button>
          
          <div className="flex space-x-reverse space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            التالي
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'records', label: 'محاضر الاستلام', icon: FileText },
    { id: 'subscribers', label: 'مقاييس المشتركين', icon: Users },
    { id: 'feeders', label: 'مقاييس المغذيات', icon: Zap },
    { id: 'meters', label: 'جدول المقاييس', icon: Gauge },
    { id: 'tasks', label: 'جدول المهام', icon: ClipboardList },
    { id: 'map', label: 'الخريطة', icon: MapPin },
    { id: 'users', label: 'إدارة المستخدمين', icon: UserPlus },
    { id: 'reports', label: 'تصدير التقارير', icon: Download },
    { id: 'import', label: 'استيراد البيانات', icon: Upload }
  ]

  if (loading) {
    return (
      <Layout title="لوحة تحكم المدير">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="لوحة تحكم المدير">
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

      <div className="space-y-8">
        {/* التنقل بين الأقسام */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-reverse space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex items-center py-2 sm:py-3 md:py-4 px-1 sm:px-2 md:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap min-w-0 flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1 sm:ml-2 flex-shrink-0" />
                  <span className="hidden md:inline text-sm md:text-base">{tab.label}</span>
                  <span className="hidden sm:inline md:hidden text-xs">{tab.label.length > 10 ? tab.label.split(' ')[0] : tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* المحتوى */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                📊 لوحة التحكم الرئيسية
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                نظرة شاملة على جميع البيانات والعمليات
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  id: 'records',
                  title: 'محاضر الاستلام',
                  description: 'إجمالي محاضر الاستلام والتسليم المسجلة وعدد المشتركين',
                  icon: FileText,
                  color: 'bg-blue-500',
                  hoverColor: 'hover:bg-blue-600',
                  count: records.length,
                  addAction: 'add-record',
                  addLabel: 'إضافة محضر'
                },
                {
                  id: 'subscribers',
                  title: 'مقاييس المشتركين',
                  description: 'إجمالي قراءات مقاييس المشتركين المسجلة',
                  icon: Users,
                  color: 'bg-green-500',
                  hoverColor: 'hover:bg-green-600',
                  count: subscribers.length,
                  addAction: 'add-subscriber',
                  addLabel: 'إضافة قراءة'
                },
                {
                  id: 'feeders',
                  title: 'مقاييس المغذيات',
                  description: 'إجمالي قراءات مقاييس المغذيات المسجلة',
                  icon: Zap,
                  color: 'bg-purple-500',
                  hoverColor: 'hover:bg-purple-600',
                  count: feeders.length,
                  addAction: 'add-feeder',
                  addLabel: 'إضافة قراءة'
                },
                {
                  id: 'meters',
                  title: 'جدول المقاييس',
                  description: 'إجمالي المقاييس المسجلة في النظام',
                  icon: Gauge,
                  color: 'bg-indigo-500',
                  hoverColor: 'hover:bg-indigo-600',
                  count: meters.length,
                  addAction: 'meters',
                  addLabel: 'إدارة المقاييس'
                },
                {
                  id: 'tasks',
                  title: 'المهام الموزعة',
                  description: 'إجمالي المهام الموزعة على الموظفين',
                  icon: ClipboardList,
                  color: 'bg-teal-500',
                  hoverColor: 'hover:bg-teal-600',
                  count: tasks.length,
                  addAction: 'tasks',
                  addLabel: 'إدارة المهام'
                },
                {
                  id: 'users',
                  title: 'الموظفين',
                  description: 'إجمالي عدد الموظفين المسجلين في النظام',
                  icon: UserPlus,
                  color: 'bg-orange-500',
                  hoverColor: 'hover:bg-orange-600',
                  count: 0,
                  addAction: 'users',
                  addLabel: 'إضافة موظف'
                }
              ].map((stat) => {
                const IconComponent = stat.icon
                return (
                  <div
                    key={stat.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          {stat.count}
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">
                      {stat.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-4">
                      {stat.description}
                    </p>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab(stat.id as any)}
                        className={`w-full flex items-center justify-center px-2 sm:px-3 py-2 ${stat.color} text-white rounded-lg font-medium ${stat.hoverColor} transition-colors text-xs sm:text-sm`}
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                        <span className="hidden sm:inline">عرض التفاصيل</span>
                        <span className="sm:hidden">عرض</span>
                      </button>
                      
                      {stat.addAction && (
                        <button
                          onClick={() => handleTabChange(stat.addAction as any)}
                          className="w-full flex items-center justify-center px-2 sm:px-3 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                          <span className="hidden sm:inline">{stat.addLabel}</span>
                          <span className="sm:hidden">إضافة</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">محاضر الاستلام والتسليم ({records.length})</h3>
                <button
                  onClick={() => handleTabChange('add-record')}
                  className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-green-700 transition-all duration-200 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  <span className="hidden xs:inline">إضافة محضر جديد</span>
                  <span className="xs:hidden">إضافة</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">السجل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">النوع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">نوع السجل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المنطقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">عدد المشتركين</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {getRecordsPaginated().map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.registry}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.record_type === 'حمراء' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {record.record_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.area}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.subscribers_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(record.created_at).toLocaleDateString('ar-SA', { 
                          calendar: 'gregory',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <button
                            onClick={() => {
                              setViewModal({ isOpen: true, data: record, type: 'record' })
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditModal({ isOpen: true, data: record, type: 'record' })
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem('records', record.id)}
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
              currentPage={recordsPage}
              totalItems={records.length}
              itemsPerPage={recordsPerPage}
              onPageChange={setRecordsPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setRecordsPerPage(newItemsPerPage)
                setRecordsPage(1)
              }}
              itemName="محضر"
            />
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">مقاييس المشتركين ({subscribers.length})</h3>
                <button
                  onClick={() => handleTabChange('add-subscriber')}
                  className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  <span className="hidden xs:inline">إضافة قراءة جديدة</span>
                  <span className="xs:hidden">إضافة</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم الحساب</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">اسم المشترك</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">فئة الاشتراك</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم المقياس</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">القراءة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ القراءة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {getSubscribersPaginated().map((subscriber) => (
                    <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{subscriber.account_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{subscriber.subscriber_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{subscriber.subscription_class}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{subscriber.meter_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{subscriber.reading}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(subscriber.reading_date).toLocaleDateString('ar-SA', { 
                          calendar: 'gregory',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <button
                            onClick={() => {
                              setViewModal({ isOpen: true, data: subscriber, type: 'subscriber' })
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditModal({ isOpen: true, data: subscriber, type: 'subscriber' })
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {subscriber.image_url && (
                            <button
                              onClick={() => openImageViewer(subscriber.image_url!, `صورة مقياس ${subscriber.subscriber_name}`)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded transition-colors"
                              title="عرض الصورة"
                              disabled={loadingImage}
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem('subscribers', subscriber.id)}
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
              currentPage={subscribersPage}
              totalItems={subscribers.length}
              itemsPerPage={subscribersPerPage}
              onPageChange={setSubscribersPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setSubscribersPerPage(newItemsPerPage)
                setSubscribersPage(1)
              }}
              itemName="مقياس"
            />
          </div>
        )}

        {activeTab === 'feeders' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">مقاييس المغذيات ({feeders.length})</h3>
                <button
                  onClick={() => handleTabChange('add-feeder')}
                  className="flex items-center px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                  <span className="hidden xs:inline">إضافة قراءة جديدة</span>
                  <span className="xs:hidden">إضافة</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المحطة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المغذي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الجهد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم المقياس</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">نوع المقياس</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">القراءة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ القراءة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {getFeedersPaginated().map((feeder) => (
                    <tr key={feeder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.station}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.feeder}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.voltage}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.meter_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.meter_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{feeder.reading}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(feeder.reading_date).toLocaleDateString('ar-SA', { 
                          calendar: 'gregory',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <button
                            onClick={() => {
                              setViewModal({ isOpen: true, data: feeder, type: 'feeder' })
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditModal({ isOpen: true, data: feeder, type: 'feeder' })
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {feeder.image_url && (
                            <button
                              onClick={() => openImageViewer(feeder.image_url!, `صورة مقياس ${feeder.station} - ${feeder.feeder}`)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded transition-colors"
                              title="عرض الصورة"
                              disabled={loadingImage}
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem('feeders', feeder.id)}
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
              currentPage={feedersPage}
              totalItems={feeders.length}
              itemsPerPage={feedersPerPage}
              onPageChange={setFeedersPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setFeedersPerPage(newItemsPerPage)
                setFeedersPage(1)
              }}
              itemName="مغذي"
            />
          </div>
        )}

        {activeTab === 'add-record' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('records')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لقائمة المحاضر
              </button>
            </div>
            <RecordForm onRecordAdded={() => {
              fetchData()
              setActiveTab('records')
            }} />
          </div>
        )}
        
        {activeTab === 'add-subscriber' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('subscribers')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لقائمة المشتركين
              </button>
            </div>
            <SubscriberForm onSubscriberAdded={() => {
              fetchData()
              setActiveTab('subscribers')
            }} />
          </div>
        )}
        
        {activeTab === 'add-feeder' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('feeders')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لقائمة المغذيات
              </button>
            </div>
            <FeederForm onFeederAdded={() => {
              fetchData()
              setActiveTab('feeders')
            }} />
          </div>
        )}

        {activeTab === 'meters' && <MetersManagement onDataChange={fetchData} />}
        {activeTab === 'tasks' && <TasksManagement onDataChange={fetchData} />}
        {activeTab === 'map' && <TasksMap tasks={tasks} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'reports' && (
          <ReportsExport 
            records={records}
            subscribers={subscribers}
            feeders={feeders}
            meters={meters}
            tasks={tasks}
          />
        )}
        {activeTab === 'import' && <DataImport onImportComplete={fetchData} records={records} subscribers={subscribers} feeders={feeders} meters={meters} />}

        {/* Modal للعرض */}
        <ViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, data: null, type: 'record' })}
          data={viewModal.data}
          type={viewModal.type}
        />

        {/* Modal للتعديل */}
        <EditModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, data: null, type: 'record' })}
          data={editModal.data}
          type={editModal.type}
          onSuccess={() => {
            fetchData()
            setEditModal({ isOpen: false, data: null, type: 'record' })
            addNotification('success', 'تم تحديث البيانات بنجاح! ✏️')
          }}
        />

        {/* عارض الصور */}
        <ImageViewer
          isOpen={imageViewer.isOpen}
          imageUrl={imageViewer.imageUrl}
          title={imageViewer.title}
          onClose={closeImageViewer}
        />

        {/* تأكيد الحذف */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center ml-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  تأكيد الحذف
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                هل أنت متأكد من حذف {deleteConfirm.itemName}؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              
              <div className="flex justify-end space-x-reverse space-x-3">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, item: null, table: '', itemName: '' })}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}