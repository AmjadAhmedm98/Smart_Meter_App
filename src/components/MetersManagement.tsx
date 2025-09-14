import React, { useState, useEffect } from 'react'
import { Gauge, Plus, Upload, Download, Eye, Trash2, Edit3, Search, Filter, CheckCircle, AlertCircle, X, User, Zap } from 'lucide-react'
import { supabase, Meter } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Pagination } from './Pagination'
import * as XLSX from 'xlsx'

interface MetersManagementProps {
  onDataChange: () => void
}

export const MetersManagement: React.FC<MetersManagementProps> = ({ onDataChange }) => {
  const { user } = useAuth()
  const [meters, setMeters] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFeeder, setFilterFeeder] = useState('')
  const [formData, setFormData] = useState({
    account_number: '',
    subscriber_name: '',
    meter_number: '',
    address: '',
    feeder: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; text: string; timestamp: number }>>([])
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; data: Meter | null }>({
    isOpen: false,
    data: null
  })
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: Meter | null }>({
    isOpen: false,
    data: null
  })
  const [editFormData, setEditFormData] = useState({
    account_number: '',
    subscriber_name: '',
    meter_number: '',
    address: '',
    feeder: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; meter: Meter | null }>({
    isOpen: false,
    meter: null
  })
  
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
    fetchMeters()
  }, [])

  const fetchMeters = async () => {
    try {
      const { data, error } = await supabase
        .from('meters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMeters(data || [])
    } catch (error) {
      addNotification('error', 'خطأ في جلب بيانات المقاييس')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setFormLoading(true)
    try {
      const { error } = await supabase.from('meters').insert([
        {
          ...formData,
          app_user_id: user.id
        }
      ])

      if (error) throw error

      addNotification('success', 'تم إضافة المقياس بنجاح! 🎉')
      setFormData({
        account_number: '',
        subscriber_name: '',
        meter_number: '',
        address: '',
        feeder: ''
      })
      setShowAddForm(false)
      fetchMeters()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في إضافة المقياس: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const deleteMeter = async (id: string) => {
    const meter = meters.find(m => m.id === id)
    if (!meter) return
    
    setDeleteConfirm({
      isOpen: true,
      meter
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.meter) return

    try {
      const { error } = await supabase.from('meters').delete().eq('id', deleteConfirm.meter.id)
      if (error) throw error

      addNotification('success', 'تم حذف المقياس بنجاح! 🗑️')
      fetchMeters()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في حذف المقياس: ' + error.message)
    } finally {
      setDeleteConfirm({
        isOpen: false,
        meter: null
      })
    }
  }

  const handleEdit = (meter: Meter) => {
    setEditFormData({
      account_number: meter.account_number,
      subscriber_name: meter.subscriber_name,
      meter_number: meter.meter_number,
      address: meter.address,
      feeder: meter.feeder
    })
    setEditModal({ isOpen: true, data: meter })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal.data) return

    try {
      const { error } = await supabase
        .from('meters')
        .update(editFormData)
        .eq('id', editModal.data.id)

      if (error) throw error

      addNotification('success', 'تم تحديث المقياس بنجاح! ✏️')
      setEditModal({ isOpen: false, data: null })
      fetchMeters()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في تحديث المقياس: ' + error.message)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  const downloadTemplate = () => {
    const templateData = [{
      'رقم الحساب': '123456789',
      'اسم المشترك': 'أحمد محمد علي',
      'رقم المقياس': 'M001234',
      'العنوان': 'شارع الجامعة - حي الوحدة',
      'المغذي': 'مغذي الوسط رقم 1'
    }]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws, 'قالب المقاييس')
    XLSX.writeFile(wb, 'قالب_المقاييس.xlsx')
  }

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const metersData = jsonData.map((row: any) => ({
        account_number: row['رقم الحساب'] || '',
        subscriber_name: row['اسم المشترك'] || '',
        meter_number: row['رقم المقياس'] || '',
        address: row['العنوان'] || '',
        feeder: row['المغذي'] || '',
        user_id: user.id
      }))

      const { error } = await supabase.from('meters').insert(metersData)
      if (error) throw error

      addNotification('success', `تم استيراد ${metersData.length} مقياس بنجاح! 📥`)
      fetchMeters()
      onDataChange()
    } catch (error: any) {
      addNotification('error', 'خطأ في استيراد البيانات: ' + error.message)
    }

    // Reset file input
    e.target.value = ''
  }

  const filteredMeters = meters.filter(meter => {
    const matchesSearch = 
      meter.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.subscriber_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.meter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meter.address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFeeder = !filterFeeder || meter.feeder.includes(filterFeeder)
    
    return matchesSearch && matchesFeeder
  })

  const uniqueFeeders = [...new Set(meters.map(m => m.feeder))].sort()

  // Pagination calculations
  const totalPages = Math.ceil(filteredMeters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMeters = filteredMeters.slice(startIndex, endIndex)

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterFeeder])

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center">
          <Gauge className="w-6 h-6 text-indigo-600 dark:text-indigo-400 ml-3" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            إدارة المقاييس ({meters.length})
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4 ml-2" />
            تحميل القالب
          </button>
          
          <label className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4 ml-2" />
            استيراد Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importFromExcel}
              className="hidden"
            />
          </label>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-sm"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مقياس
          </button>
        </div>
      </div>

      {/* كاردات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {[
          {
            id: 'total',
            title: 'إجمالي المقاييس',
            description: 'جميع المقاييس المسجلة',
            icon: Gauge,
            color: 'bg-indigo-500',
            hoverColor: 'hover:bg-indigo-600',
            count: meters.length,
            textColor: 'text-gray-900 dark:text-white'
          },
          {
            id: 'feeders',
            title: 'عدد المغذيات',
            description: 'المغذيات المختلفة',
            icon: Zap,
            color: 'bg-purple-500',
            hoverColor: 'hover:bg-purple-600',
            count: uniqueFeeders.length,
            textColor: 'text-purple-600 dark:text-purple-400'
          },
          {
            id: 'filtered',
            title: 'النتائج المعروضة',
            description: 'بعد التصفية',
            icon: Filter,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
            count: filteredMeters.length,
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

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث في المقاييس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="relative">
            <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <select
              value={filterFeeder}
              onChange={(e) => setFilterFeeder(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع المغذيات</option>
              {uniqueFeeders.map(feeder => (
                <option key={feeder} value={feeder}>{feeder}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            إضافة مقياس جديد
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رقم الحساب
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  value={formData.subscriber_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رقم المقياس
                </label>
                <input
                  type="text"
                  name="meter_number"
                  value={formData.meter_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  value={formData.feeder}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                العنوان
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex space-x-reverse space-x-4">
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {formLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Gauge className="w-5 h-5 ml-2" />
                    حفظ المقياس
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({
                    account_number: '',
                    subscriber_name: '',
                    meter_number: '',
                    address: '',
                    feeder: ''
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

      {/* Meters Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            قائمة المقاييس ({filteredMeters.length})
          </h3>
        </div>
        
        {filteredMeters.length === 0 ? (
          <div className="p-8 text-center">
            <Gauge className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterFeeder ? 'لا توجد مقاييس تطابق البحث' : 'لا توجد مقاييس مسجلة'}
            </p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم الحساب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">اسم المشترك</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">رقم المقياس</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">العنوان</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">المغذي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ الإضافة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {paginatedMeters.map((meter) => (
                  <tr key={meter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{meter.account_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{meter.subscriber_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{meter.meter_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">{meter.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{meter.feeder}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(meter.created_at).toLocaleDateString('ar-SA', { 
                        calendar: 'gregory',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-reverse space-x-2">
                        <button
                          onClick={() => setViewModal({ isOpen: true, data: meter })}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(meter)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMeter(meter.id)}
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
            totalItems={filteredMeters.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage)
              setCurrentPage(1)
            }}
            itemName="مقياس"
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
                تفاصيل المقياس - {viewModal.data.subscriber_name}
              </h3>
              <button
                onClick={() => setViewModal({ isOpen: false, data: null })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    رقم الحساب
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-900 dark:text-white">{viewModal.data.account_number}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    اسم المشترك
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <User className="w-4 h-4 text-gray-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">{viewModal.data.subscriber_name}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    رقم المقياس
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Gauge className="w-4 h-4 text-gray-500 ml-2" />
                    <span className="text-gray-900 dark:text-white">{viewModal.data.meter_number}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    المغذي
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-900 dark:text-white">{viewModal.data.feeder}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  العنوان
                </label>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-900 dark:text-white">{viewModal.data.address}</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  تاريخ الإضافة
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                تعديل المقياس
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم الحساب
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={editFormData.account_number}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      value={editFormData.subscriber_name}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم المقياس
                    </label>
                    <input
                      type="text"
                      name="meter_number"
                      value={editFormData.meter_number}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      value={editFormData.feeder}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    العنوان
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-reverse space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
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
      {deleteConfirm.isOpen && deleteConfirm.meter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center ml-3">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تأكيد حذف المقياس
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                هل أنت متأكد من حذف هذا المقياس؟
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  {deleteConfirm.meter.subscriber_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  رقم الحساب: {deleteConfirm.meter.account_number}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  رقم المقياس: {deleteConfirm.meter.meter_number}
                </p>
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            
            <div className="flex justify-end space-x-reverse space-x-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, meter: null })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                حذف المقياس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}