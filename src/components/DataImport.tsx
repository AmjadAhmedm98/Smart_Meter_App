import React, { useState, useRef } from 'react'
import { Upload, FileText, Users, Zap, CheckCircle, AlertCircle, Download, UserPlus, X, Gauge } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DataImportProps {
  onImportComplete: () => void
  records: any[]
  subscribers: any[]
  feeders: any[]
  meters: any[]
}

export const DataImport: React.FC<DataImportProps> = ({ 
  onImportComplete, 
  records = [], 
  subscribers = [], 
  feeders = [], 
  meters = [] 
}) => {
  const { user } = useAuth()
  const [importType, setImportType] = useState<'records' | 'subscribers' | 'feeders' | 'users' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [error, setError] = useState('')
  const [importResults, setImportResults] = useState<{ success: number; errors: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const downloadTemplate = (type: 'records' | 'subscribers' | 'feeders' | 'users') => {
    const wb = XLSX.utils.book_new()
    let templateData: any[] = []
    let sheetName = ''

    switch (type) {
      case 'records':
        templateData = [{
          'السجل': 'مثال: REG001',
          'النوع': 'استلام',
          'المنطقة': 'منطقة الوسط',
          'عدد المشتركين': 100
        }]
        sheetName = 'محاضر الاستلام'
        break
      case 'subscribers':
        templateData = [{
          'رقم الحساب': '123456789',
          'اسم المشترك': 'أحمد محمد علي',
          'صنف الاشتراك': 'منزلي',
          'رقم المقياس': 'M001234',
          'القراءة': 1500.50,
          'تاريخ القراءة': '2024-01-15'
        }]
        sheetName = 'مقاييس المشتركين'
        break
      case 'feeders':
        templateData = [{
          'المحطة': 'محطة الوسط',
          'المغذي': 'مغذي رقم 1',
          'الجهد': '11 كيلو فولت',
          'رقم المقياس': 'F001234',
          'نوع المقياس': 'رقمي',
          'القراءة': 25000.75,
          'تاريخ القراءة': '2024-01-15'
        }]
        sheetName = 'مقاييس المغذيات'
        break
      case 'users':
        templateData = [{
          'البريد الإلكتروني': 'employee1@company.com',
          'كلمة المرور': 'password123',
          'الاسم الكامل': 'أحمد محمد علي',
          'القسم': 'قسم المقاييس',
          'المنصب': 'فني مقاييس'
        }]
        sheetName = 'المستخدمين'
        break
      case 'meters':
        templateData = [{
          'رقم الحساب': '123456789',
          'اسم المشترك': 'أحمد محمد علي',
          'رقم المقياس': 'M001234',
          'العنوان': 'شارع الجامعة - حي الوحدة',
          'المغذي': 'مغذي الوسط رقم 1'
        }]
        sheetName = 'جدول المقاييس'
        break
    }

    const ws = XLSX.utils.json_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    const fileName = `قالب_${sheetName.replace(/\s+/g, '_')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const processFile = async () => {
    if (!file || !importType || !user) return

    setLoading(true)
    setError('')
    setImportResults(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على بيانات صالحة')
      }

      let successCount = 0
      let errorCount = 0

      for (const row of jsonData) {
        try {
          let insertData: any = { user_id: user.id }

          switch (importType) {
            case 'records':
              insertData = {
                ...insertData,
                registry: (row as any)['السجل'] || '',
                type: (row as any)['النوع'] || '',
                area: (row as any)['المنطقة'] || '',
                subscribers_count: parseInt((row as any)['عدد المشتركين']) || 0
              }
              break
            case 'subscribers':
              insertData = {
                ...insertData,
                account_number: (row as any)['رقم الحساب'] || '',
                subscriber_name: (row as any)['اسم المشترك'] || '',
                subscription_class: (row as any)['صنف الاشتراك'] || '',
                meter_number: (row as any)['رقم المقياس'] || '',
                reading: parseFloat((row as any)['القراءة']) || 0,
                reading_date: (row as any)['تاريخ القراءة'] || new Date().toISOString().split('T')[0]
              }
              break
            case 'feeders':
              insertData = {
                ...insertData,
                station: (row as any)['المحطة'] || '',
                feeder: (row as any)['المغذي'] || '',
                voltage: (row as any)['الجهد'] || '',
                meter_number: (row as any)['رقم المقياس'] || '',
                meter_type: (row as any)['نوع المقياس'] || '',
                reading: parseFloat((row as any)['القراءة']) || 0,
                reading_date: (row as any)['تاريخ القراءة'] || new Date().toISOString().split('T')[0]
              }
              break
            case 'users':
              // استيراد المستخدمين يتطلب استخدام Admin API
              const email = (row as any)['البريد الإلكتروني'] || ''
              const password = (row as any)['كلمة المرور'] || ''
              const fullName = (row as any)['الاسم الكامل'] || ''
              const department = (row as any)['القسم'] || ''
              const position = (row as any)['المنصب'] || ''
              
              if (!email || !password) {
                throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان')
              }
              
              // استخدام Admin API لإنشاء المستخدم
              const { data: { session } } = await supabase.auth.getSession()
              if (!session) throw new Error('No session found')

              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email,
                  password
                })
              })

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create user')
              }
              
              // إنشاء ملف المستخدم إذا كانت هناك بيانات إضافية
              if (fullName || department || position) {
                const userData = await response.json()
                if (userData.user) {
                  await supabase.from('user_profiles').insert([{
                    user_id: userData.user.id,
                    full_name: fullName || null,
                    department: department || null,
                    position: position || null
                  }])
                }
              }
              
              successCount++
              continue // تخطي الإدراج في قاعدة البيانات العادية
          case 'meters':
            insertData = {
              ...insertData,
              account_number: (row as any)['رقم الحساب'] || '',
              subscriber_name: (row as any)['اسم المشترك'] || '',
              meter_number: (row as any)['رقم المقياس'] || '',
              address: (row as any)['العنوان'] || '',
              feeder: (row as any)['المغذي'] || ''
            }
            break
          }

          // للأنواع الأخرى (غير المستخدمين)
          if (importType !== 'users') {
            const { error } = await supabase.from(importType).insert([insertData])
            
            if (error) {
              console.error('Insert error:', error)
              errorCount++
            } else {
              successCount++
            }
          }
        } catch (rowError) {
          console.error('Row processing error:', rowError)
          errorCount++
        }
      }

      setImportResults({ success: successCount, errors: errorCount })
      
      if (successCount > 0) {
        const message = errorCount > 0 
          ? `تم استيراد ${successCount} سجل بنجاح، فشل في ${errorCount} سجل`
          : `تم استيراد ${successCount} سجل بنجاح! 📥`
        addNotification(errorCount > 0 ? 'error' : 'success', message)
        onImportComplete()
      }

      if (errorCount > 0) {
        setError(`تم استيراد ${successCount} سجل بنجاح، فشل في استيراد ${errorCount} سجل`)
      }

    } catch (err) {
      console.error('Import error:', err)
      setError('خطأ في معالجة الملف: ' + (err as Error).message)
      addNotification('error', 'خطأ في معالجة الملف: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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

      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          📥 نظام استيراد البيانات المتكامل
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          اختر نوع البيانات وارفع الملف للحصول على استيراد سريع ودقيق
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 ml-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* اختيار نوع البيانات */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-3" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            اختر نوع البيانات المراد استيرادها
          </h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { 
              id: 'records', 
              title: 'محاضر الاستلام والتسليم', 
              description: 'استيراد محاضر الاستلام والتسليم من ملفات Excel',
              icon: FileText, 
              color: 'from-blue-500 to-blue-600',
              hoverColor: 'from-blue-600 to-blue-700'
            },
            { 
              id: 'subscribers', 
              title: 'مقاييس المشتركين', 
              description: 'استيراد قراءات مقاييس المشتركين مع البيانات الشخصية',
              icon: Users, 
              color: 'from-green-500 to-green-600',
              hoverColor: 'from-green-600 to-green-700'
            },
            { 
              id: 'feeders', 
              title: 'مقاييس المغذيات', 
              description: 'استيراد قراءات مقاييس المغذيات والمحطات',
              icon: Zap, 
              color: 'from-purple-500 to-purple-600',
              hoverColor: 'from-purple-600 to-purple-700'
            },
            { 
              id: 'users', 
              title: 'المستخدمين والموظفين', 
              description: 'استيراد حسابات المستخدمين والموظفين بكميات كبيرة',
              icon: UserPlus, 
              color: 'from-orange-500 to-orange-600',
              hoverColor: 'from-orange-600 to-orange-700'
            },
            { 
              id: 'meters', 
              title: 'جدول المقاييس', 
              description: 'استيراد بيانات المقاييس الأساسية للنظام',
              icon: Gauge, 
              color: 'from-indigo-500 to-indigo-600',
              hoverColor: 'from-indigo-600 to-indigo-700'
            }
          ].map((option) => {
            const IconComponent = option.icon
            return (
              <label
                key={option.id}
                className={`relative cursor-pointer group transition-all duration-300 ${
                  importType === option.id
                    ? 'transform scale-105' : 'hover:scale-102'
                }`}
              >
                <input
                  type="radio"
                  name="importType"
                  value={option.id}
                  checked={importType === option.id}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 ${
                  importType === option.id
                    ? 'ring-2 ring-blue-500 ring-opacity-50'
                    : ''
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${option.color} rounded-lg flex items-center justify-center transition-colors`}>
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {option.id === 'records' ? records.length :
                         option.id === 'subscribers' ? subscribers.length :
                         option.id === 'feeders' ? feeders.length :
                         option.id === 'users' ? 0 :
                         option.id === 'meters' ? meters.length : 0}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    {option.description}
                  </p>
                  
                  {importType === option.id && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {importType && (
        <>
          {/* تحميل القالب */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-3" />
              <h4 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                تحميل قالب البيانات
              </h4>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-blue-700 dark:text-blue-300 mb-2">
                  احرص على استخدام القالب الصحيح لضمان نجاح عملية الاستيراد
                </p>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  📋 القالب يحتوي على الأعمدة المطلوبة والتنسيق الصحيح
                </div>
              </div>
              <div className="mr-4">
                <button
                  onClick={() => downloadTemplate(importType)}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5 ml-2" />
                  تحميل القالب
                </button>
              </div>
            </div>
          </div>

          {/* رفع الملف */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Upload className="w-6 h-6 text-green-600 dark:text-green-400 ml-3" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                رفع ملف البيانات
              </h3>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              
              {file ? (
                <div className="space-y-2">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    تم اختيار الملف: {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    حجم الملف: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    اسحب الملف هنا أو انقر لاختيار ملف
                  </p>
                  <p className="text-sm text-gray-500">
                    يدعم ملفات Excel (.xlsx) و CSV (.csv)
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium"
              >
                اختيار ملف
              </button>
            </div>
          </div>

          {/* زر الاستيراد */}
          {file && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🚀 جاهز للاستيراد
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">نوع البيانات</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {importType === 'records' ? 'محاضر الاستلام' : 
                     importType === 'subscribers' ? 'مقاييس المشتركين' : 
                     importType === 'feeders' ? 'مقاييس المغذيات' :
                     'المستخدمين والموظفين'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">اسم الملف</div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">
                    {file.name}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">حجم الملف</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={processFile}
                  disabled={loading}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-blue-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white ml-3"></div>
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 ml-3" />
                      بدء الاستيراد
                      <span className="mr-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                        {file.name.split('.').pop()?.toUpperCase()}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}