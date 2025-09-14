import React, { useState, useEffect, useRef } from 'react'
import { MapPin, AlertCircle, RefreshCw, ClipboardList, CheckCircle, Clock } from 'lucide-react'
import { Task } from '../lib/supabase'

interface TasksMapProps {
  tasks: Task[]
}

export const TasksMap: React.FC<TasksMapProps> = ({ tasks }) => {
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  
  // حساب الإحصائيات
  const totalTasks = tasks.length
  const completedTasksCount = tasks.filter(task => task.status === 'منجز').length
  const pendingTasksCount = tasks.filter(task => task.status === 'قيد التنفيذ').length

  useEffect(() => {
    // فلترة المهام المنجزة التي لها موقع جغرافي
    const completed = tasks.filter(task => 
      task.status === 'منجز' && 
      task.location_lat && 
      task.location_lng
    )
    setCompletedTasks(completed)
    
    if (completed.length > 0) {
      initializeMap()
    } else {
      setLoading(false)
    }
  }, [tasks])

  const initializeMap = async () => {
    if (!mapRef.current) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setMapError('')

      // استخدام Leaflet بدلاً من Mapbox - أبسط وأسرع
      if (!window.L) {
        // تحميل Leaflet CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(cssLink)

        // تحميل Leaflet JS
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        
        script.onload = () => {
          console.log('Leaflet loaded successfully')
          createLeafletMap()
        }
        
        script.onerror = () => {
          setMapError('فشل في تحميل مكتبة الخرائط')
          setLoading(false)
        }
        
        document.head.appendChild(script)
      } else {
        createLeafletMap()
      }
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('خطأ في تهيئة الخريطة')
      setLoading(false)
    }
  }

  const createLeafletMap = () => {
    if (!mapRef.current || !window.L || !completedTasks.length) {
      setLoading(false)
      return
    }

    try {
      console.log('Creating Leaflet map with', completedTasks.length, 'tasks')

      // حساب المركز
      let centerLat = 33.3152 // بغداد
      let centerLng = 44.3661

      if (completedTasks.length > 0) {
        const avgLat = completedTasks.reduce((sum, task) => sum + (task.location_lat || 0), 0) / completedTasks.length
        const avgLng = completedTasks.reduce((sum, task) => sum + (task.location_lng || 0), 0) / completedTasks.length
        centerLat = avgLat
        centerLng = avgLng
      }

      // إنشاء الخريطة
      const map = window.L.map(mapRef.current).setView([centerLat, centerLng], 12)

      // إضافة طبقة الخريطة
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      // إضافة الدبابيس
      const group = window.L.featureGroup()

      completedTasks.forEach((task, index) => {
        if (!task.location_lat || !task.location_lng) return

        console.log(`Adding marker ${index + 1}:`, task.location_lat, task.location_lng)

        // إنشاء أيقونة مخصصة
        const customIcon = window.L.divIcon({
          html: `
            <div style="
              background: #dc2626;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              cursor: pointer;
            ">📍</div>
          `,
          className: 'custom-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })

        // محتوى popup
        const popupContent = `
          <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; min-width: 280px;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 12px; margin: -9px -12px 12px -12px; border-radius: 8px 8px 0 0;">
              <h3 style="margin: 0; font-weight: bold; font-size: 16px;">
                📍 ${task.meter?.subscriber_name || 'غير محدد'}
              </h3>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">رقم الحساب</div>
                <div style="font-weight: 600; color: #1f2937; font-size: 13px;">${task.meter?.account_number || '-'}</div>
              </div>
              <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">رقم المقياس</div>
                <div style="font-weight: 600; color: #1f2937; font-size: 13px;">${task.meter?.meter_number || '-'}</div>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <div style="background: #dbeafe; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #1e40af; margin-bottom: 2px;">القراءة</div>
                <div style="font-weight: 600; color: #1e40af; font-size: 13px;">${task.meter_reading || '-'} ك.و.س</div>
              </div>
              <div style="background: #dcfce7; padding: 8px; border-radius: 6px; text-align: center;">
                <div style="font-size: 11px; color: #059669; margin-bottom: 2px;">المغذي</div>
                <div style="font-weight: 600; color: #059669; font-size: 13px;">${task.meter?.feeder || '-'}</div>
              </div>
            </div>
            
            <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 12px; text-align: center;">
              <div style="font-size: 11px; color: #92400e; margin-bottom: 2px;">العنوان</div>
              <div style="font-weight: 600; color: #92400e; font-size: 12px; line-height: 1.3;">${task.meter?.address || '-'}</div>
            </div>
            
            <button 
              onclick="window.open('https://www.google.com/maps?q=${task.location_lat},${task.location_lng}&z=17', '_blank')"
              style="
                width: 100%;
                padding: 10px 16px;
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
              "
            >
              🗺️ فتح في خرائط جوجل
            </button>
        </div>
        `

        // إنشاء الدبوس
        const marker = window.L.marker([task.location_lat, task.location_lng], { 
          icon: customIcon 
        }).bindPopup(popupContent, {
          maxWidth: 320,
          className: 'custom-popup'
        })

        group.addLayer(marker)
        console.log(`Marker ${index + 1} added successfully`)
      })

      // إضافة جميع الدبابيس للخريطة
      group.addTo(map)

      // تعديل العرض ليشمل جميع الدبابيس
      if (completedTasks.length > 1) {
        map.fitBounds(group.getBounds(), { padding: [20, 20] })
      }

      mapInstanceRef.current = map
      setLoading(false)
      console.log('Map created successfully with', completedTasks.length, 'markers')

    } catch (error) {
      console.error('Error creating Leaflet map:', error)
      setMapError('خطأ في إنشاء الخريطة: ' + (error as Error).message)
      setLoading(false)
    }
  }

  const retryMap = () => {
    setMapError('')
    setLoading(true)
    
    // تنظيف الخريطة الحالية
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    
    // إعادة المحاولة
    setTimeout(() => {
      initializeMap()
    }, 500)
  }

  // تنظيف الموارد
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (completedTasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد مهام منجزة بمواقع مسجلة
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            عندما ينجز الموظفون مهامهم ويسجلون المواقع، ستظهر هنا على الخريطة
          </p>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            خطأ في تحميل الخريطة
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {mapError}
          </p>
          <button
            onClick={retryMap}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* كاردات الإحصائيات */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
          {[
            {
              id: 'total',
              title: 'إجمالي المهام',
              description: 'جميع المهام في النظام',
              icon: ClipboardList,
              color: 'bg-blue-500',
              hoverColor: 'hover:bg-blue-600',
              count: totalTasks,
              textColor: 'text-gray-900 dark:text-white'
            },
            {
              id: 'completed',
              title: 'المهام المنجزة',
              description: `${totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0}% من الإجمالي`,
              icon: CheckCircle,
              color: 'bg-green-500',
              hoverColor: 'hover:bg-green-600',
              count: completedTasksCount,
              textColor: 'text-green-600 dark:text-green-400'
            },
            {
              id: 'pending',
              title: 'قيد الإنجاز',
              description: `${totalTasks > 0 ? Math.round((pendingTasksCount / totalTasks) * 100) : 0}% من الإجمالي`,
              icon: Clock,
              color: 'bg-orange-500',
              hoverColor: 'hover:bg-orange-600',
              count: pendingTasksCount,
              textColor: 'text-orange-600 dark:text-orange-400'
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
      </div>
      
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2" />
            خريطة المهام المنجزة ({completedTasksCount})
          </h3>
          <button
            onClick={retryMap}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </button>
        </div>
      </div>
      
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">جاري تحميل الخريطة...</p>
            </div>
          </div>
        )}
        
        <div
          ref={mapRef}
          className="w-full h-[500px] md:h-[600px] lg:h-[700px] bg-gray-100 dark:bg-gray-700"
          style={{ minHeight: '500px' }}
        />
      </div>
      
      {/* معلومات إضافية */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 ml-1" />
            <span>عدد المواقع المعروضة: {completedTasks.length}</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            انقر على الدبوس لعرض التفاصيل
          </div>
        </div>
      </div>
    </div>
  )
}