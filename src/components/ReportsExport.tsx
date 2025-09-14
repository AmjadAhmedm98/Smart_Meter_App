import React, { useState } from 'react'
import { Download, Table, CheckCircle, Calendar, FileText, Users, Zap, BarChart3, TrendingUp, Filter, AlertCircle, X, Gauge, ClipboardList } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Record, Subscriber, Feeder, Meter, Task } from '../lib/supabase'

interface ReportsExportProps {
  records: Record[]
  subscribers: Subscriber[]
  feeders: Feeder[]
  meters: Meter[]
  tasks: Task[]
}

export const ReportsExport: React.FC<ReportsExportProps> = ({ records, subscribers, feeders, meters, tasks }) => {
  const [selectedReport, setSelectedReport] = useState<'records' | 'subscribers' | 'feeders' | 'meters' | 'tasks' | 'summary'>('summary')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showNotification, setShowNotification] = useState(false)
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

  // تصفية البيانات حسب التاريخ
  const filterByDate = (data: any[], dateField: string = 'created_at') => {
    if (!dateFrom && !dateTo) return data
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      const fromDate = dateFrom ? new Date(dateFrom) : new Date('1900-01-01')
      const toDate = dateTo ? new Date(dateTo) : new Date('2100-12-31')
      
      return itemDate >= fromDate && itemDate <= toDate
    })
  }

  const exportReport = () => {
    const wb = XLSX.utils.book_new()
    let fileName = ''
    const dateStr = new Date().toISOString().split('T')[0]
    const periodStr = dateFrom && dateTo ? `_من_${dateFrom}_إلى_${dateTo}` : dateFrom ? `_من_${dateFrom}` : dateTo ? `_إلى_${dateTo}` : ''

    // تصفية البيانات حسب التاريخ
    const filteredRecords = filterByDate(records)
    const filteredSubscribers = filterByDate(subscribers)
    const filteredFeeders = filterByDate(feeders)
    const filteredMeters = filterByDate(meters)
    const filteredTasks = filterByDate(tasks)

    if (selectedReport === 'records') {
      // تقرير محاضر الاستلام
      const recordsData = filteredRecords.map(record => ({
        'السجل': record.registry,
        'النوع': record.type,
        'نوع السجل': record.record_type,
        'المنطقة': record.area,
        'عدد المشتركين': record.subscribers_count,
        'تاريخ الإنشاء': new Date(record.created_at).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }))
      
      // إضافة الإجماليات
      const totalRecords = filteredRecords.length
      const totalSubscribers = filteredRecords.reduce((sum, record) => sum + record.subscribers_count, 0)
      const regularRecords = filteredRecords.filter(r => r.record_type === 'نظامي').length
      const redRecords = filteredRecords.filter(r => r.record_type === 'حمراء').length
      
      recordsData.push(
        { 'السجل': '', 'النوع': '', 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': '📊 الإجماليات والإحصائيات', 'النوع': '', 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': 'إجمالي عدد السجلات', 'النوع': totalRecords, 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': 'إجمالي عدد المشتركين', 'النوع': totalSubscribers, 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': 'السجلات النظامية', 'النوع': regularRecords, 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': 'السجلات الحمراء', 'النوع': redRecords, 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' },
        { 'السجل': 'متوسط المشتركين لكل سجل', 'النوع': totalRecords > 0 ? Math.round(totalSubscribers / totalRecords) : 0, 'نوع السجل': '', 'المنطقة': '', 'عدد المشتركين': '', 'تاريخ الإنشاء': '' }
      )
      
      const ws = XLSX.utils.json_to_sheet(recordsData)
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير محاضر الاستلام')
      fileName = `تقرير_محاضر_الاستلام${periodStr}_${dateStr}.xlsx`
      
    } else if (selectedReport === 'subscribers') {
      // تقرير مقاييس المشتركين
      const subscribersData = filteredSubscribers.map(subscriber => ({
        'رقم الحساب': subscriber.account_number,
        'اسم المشترك': subscriber.subscriber_name,
        'صنف الاشتراك': subscriber.subscription_class,
        'رقم المقياس': subscriber.meter_number,
        'القراءة (ك.و.س)': subscriber.reading,
        'تاريخ القراءة': new Date(subscriber.reading_date).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        'تاريخ الإدخال': new Date(subscriber.created_at).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }))
      
      // إضافة الإحصائيات
      const totalSubscribers = filteredSubscribers.length
      const totalReading = filteredSubscribers.reduce((sum, s) => sum + s.reading, 0)
      const avgReading = totalSubscribers > 0 ? (totalReading / totalSubscribers).toFixed(2) : 0
      
      // تفصيل أصناف الاشتراكات
      const subscriptionBreakdown = filteredSubscribers.reduce((acc, subscriber) => {
        const type = subscriber.subscription_class
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const subscriptionTypes = Object.keys(subscriptionBreakdown)
      
      subscribersData.push(
        { 'رقم الحساب': '', 'اسم المشترك': '', 'صنف الاشتراك': '', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': '📊 الإجماليات والإحصائيات', 'اسم المشترك': '', 'صنف الاشتراك': '', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': 'إجمالي عدد المشتركين', 'اسم المشترك': totalSubscribers, 'صنف الاشتراك': '', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': 'إجمالي القراءات', 'اسم المشترك': totalReading.toFixed(2), 'صنف الاشتراك': 'ك.و.س', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': 'متوسط القراءة', 'اسم المشترك': avgReading, 'صنف الاشتراك': 'ك.و.س', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': '', 'اسم المشترك': '', 'صنف الاشتراك': '', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'رقم الحساب': '🏷️ تفصيل أصناف الاشتراكات', 'اسم المشترك': '', 'صنف الاشتراك': '', 'رقم المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' }
      )
      
      // إضافة تفصيل كل صنف
      Object.entries(subscriptionBreakdown)
        .sort(([,a], [,b]) => b - a) // ترتيب حسب العدد (الأكثر أولاً)
        .forEach(([type, count]) => {
          const percentage = totalSubscribers > 0 ? ((count / totalSubscribers) * 100).toFixed(1) : '0'
          subscribersData.push({
            'رقم الحساب': type,
            'اسم المشترك': count,
            'صنف الاشتراك': `${percentage}%`,
            'رقم المقياس': `من إجمالي ${totalSubscribers}`,
            'القراءة (ك.و.س)': '',
            'تاريخ القراءة': '',
            'تاريخ الإدخال': ''
          })
        })
      
      // إضافة إجمالي الأصناف
      subscribersData.push({
        'رقم الحساب': 'إجمالي الأصناف',
        'اسم المشترك': subscriptionTypes.length,
        'صنف الاشتراك': '100%',
        'رقم المقياس': 'جميع الأصناف',
        'القراءة (ك.و.س)': '',
        'تاريخ القراءة': '',
        'تاريخ الإدخال': ''
      })
      
      const ws = XLSX.utils.json_to_sheet(subscribersData)
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير مقاييس المشتركين')
      fileName = `تقرير_مقاييس_المشتركين${periodStr}_${dateStr}.xlsx`
      
    } else if (selectedReport === 'feeders') {
      // تقرير مقاييس المغذيات
      const feedersData = filteredFeeders.map(feeder => ({
        'المحطة': feeder.station,
        'المغذي': feeder.feeder,
        'الجهد': feeder.voltage,
        'رقم المقياس': feeder.meter_number,
        'نوع المقياس': feeder.meter_type,
        'القراءة (ك.و.س)': feeder.reading,
        'تاريخ القراءة': new Date(feeder.reading_date).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        'تاريخ الإدخال': new Date(feeder.created_at).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }))
      
      // إضافة الإحصائيات
      const totalFeeders = filteredFeeders.length
      const totalReading = filteredFeeders.reduce((sum, f) => sum + f.reading, 0)
      const avgReading = totalFeeders > 0 ? (totalReading / totalFeeders).toFixed(2) : 0
      const stations = [...new Set(filteredFeeders.map(f => f.station))]
      const voltageTypes = [...new Set(filteredFeeders.map(f => f.voltage))]
      
      // تفصيل المحطات
      const stationBreakdown = filteredFeeders.reduce((acc, feeder) => {
        const station = feeder.station
        acc[station] = (acc[station] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // تفصيل أنواع الجهد
      const voltageBreakdown = filteredFeeders.reduce((acc, feeder) => {
        const voltage = feeder.voltage
        acc[voltage] = (acc[voltage] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      feedersData.push(
        { 'المحطة': '', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': '📊 الإجماليات والإحصائيات', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': 'إجمالي عدد المغذيات', 'المغذي': totalFeeders, 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': 'إجمالي القراءات', 'المغذي': totalReading.toFixed(2), 'الجهد': 'ك.و.س', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': 'متوسط القراءة', 'المغذي': avgReading, 'الجهد': 'ك.و.س', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': '', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': '🏭 تفصيل المحطات', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' }
      )
      
      // إضافة تفصيل كل محطة
      Object.entries(stationBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([station, count]) => {
          const percentage = totalFeeders > 0 ? ((count / totalFeeders) * 100).toFixed(1) : '0'
          feedersData.push({
            'المحطة': station,
            'المغذي': count,
            'الجهد': `${percentage}%`,
            'رقم المقياس': `من إجمالي ${totalFeeders}`,
            'نوع المقياس': '',
            'القراءة (ك.و.س)': '',
            'تاريخ القراءة': '',
            'تاريخ الإدخال': ''
          })
        })
      
      feedersData.push(
        { 'المحطة': '', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' },
        { 'المحطة': '⚡ تفصيل أنواع الجهد', 'المغذي': '', 'الجهد': '', 'رقم المقياس': '', 'نوع المقياس': '', 'القراءة (ك.و.س)': '', 'تاريخ القراءة': '', 'تاريخ الإدخال': '' }
      )
      
      // إضافة تفصيل كل نوع جهد
      Object.entries(voltageBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([voltage, count]) => {
          const percentage = totalFeeders > 0 ? ((count / totalFeeders) * 100).toFixed(1) : '0'
          feedersData.push({
            'المحطة': voltage,
            'المغذي': count,
            'الجهد': `${percentage}%`,
            'رقم المقياس': `من إجمالي ${totalFeeders}`,
            'نوع المقياس': '',
            'القراءة (ك.و.س)': '',
            'تاريخ القراءة': '',
            'تاريخ الإدخال': ''
          })
        })
      
      const ws = XLSX.utils.json_to_sheet(feedersData)
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير مقاييس المغذيات')
      fileName = `تقرير_مقاييس_المغذيات${periodStr}_${dateStr}.xlsx`
      
    } else if (selectedReport === 'meters') {
      // تقرير جدول المقاييس
      const metersData = filteredMeters.map(meter => ({
        'رقم الحساب': meter.account_number,
        'اسم المشترك': meter.subscriber_name,
        'رقم المقياس': meter.meter_number,
        'العنوان': meter.address,
        'المغذي': meter.feeder,
        'تاريخ الإضافة': new Date(meter.created_at).toLocaleDateString('ar-SA', { 
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }))
      
      // إضافة الإحصائيات
      const totalMeters = filteredMeters.length
      const feederBreakdown = filteredMeters.reduce((acc, meter) => {
        const feeder = meter.feeder
        acc[feeder] = (acc[feeder] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      metersData.push(
        { 'رقم الحساب': '', 'اسم المشترك': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'تاريخ الإضافة': '' },
        { 'رقم الحساب': '📊 الإجماليات والإحصائيات', 'اسم المشترك': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'تاريخ الإضافة': '' },
        { 'رقم الحساب': 'إجمالي عدد المقاييس', 'اسم المشترك': totalMeters, 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'تاريخ الإضافة': '' },
        { 'رقم الحساب': '', 'اسم المشترك': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'تاريخ الإضافة': '' },
        { 'رقم الحساب': '🏭 تفصيل المغذيات', 'اسم المشترك': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'تاريخ الإضافة': '' }
      )
      
      Object.entries(feederBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([feeder, count]) => {
          const percentage = totalMeters > 0 ? ((count / totalMeters) * 100).toFixed(1) : '0'
          metersData.push({
            'رقم الحساب': feeder,
            'اسم المشترك': count,
            'رقم المقياس': `${percentage}%`,
            'العنوان': `من إجمالي ${totalMeters}`,
            'المغذي': '',
            'تاريخ الإضافة': ''
          })
        })
      
      const ws = XLSX.utils.json_to_sheet(metersData)
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير جدول المقاييس')
      fileName = `تقرير_جدول_المقاييس${periodStr}_${dateStr}.xlsx`
      
    } else if (selectedReport === 'tasks') {
      // تقرير المهام
      const tasksData = filteredTasks.map(task => ({
        'اسم المشترك': task.meter?.subscriber_name || '',
        'رقم الحساب': task.meter?.account_number || '',
        'رقم المقياس': task.meter?.meter_number || '',
        'العنوان': task.meter?.address || '',
        'المغذي': task.meter?.feeder || '',
        'الموظف المسؤول': task.assigned_user?.full_name || 'غير محدد',
        'تاريخ المهمة': new Date(task.task_date).toLocaleDateString('ar-SA', { calendar: 'gregory' }),
        'الحالة': task.status,
        'القراءة': task.meter_reading || '',
        'تاريخ الإنجاز': task.completed_at ? new Date(task.completed_at).toLocaleDateString('ar-SA', { calendar: 'gregory' }) : '',
        'الموقع': task.location_lat && task.location_lng ? 'متوفر' : 'غير متوفر',
        'تاريخ الإنشاء': new Date(task.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })
      }))
      
      // إضافة الإحصائيات
      const totalTasks = filteredTasks.length
      const completedTasks = filteredTasks.filter(t => t.status === 'منجز').length
      const pendingTasks = filteredTasks.filter(t => t.status === 'قيد التنفيذ').length
      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0'
      
      tasksData.push(
        { 'اسم المشترك': '', 'رقم الحساب': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'الموظف المسؤول': '', 'تاريخ المهمة': '', 'الحالة': '', 'القراءة': '', 'تاريخ الإنجاز': '', 'الموقع': '', 'تاريخ الإنشاء': '' },
        { 'اسم المشترك': '📊 الإجماليات والإحصائيات', 'رقم الحساب': '', 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'الموظف المسؤول': '', 'تاريخ المهمة': '', 'الحالة': '', 'القراءة': '', 'تاريخ الإنجاز': '', 'الموقع': '', 'تاريخ الإنشاء': '' },
        { 'اسم المشترك': 'إجمالي المهام', 'رقم الحساب': totalTasks, 'رقم المقياس': '', 'العنوان': '', 'المغذي': '', 'الموظف المسؤول': '', 'تاريخ المهمة': '', 'الحالة': '', 'القراءة': '', 'تاريخ الإنجاز': '', 'الموقع': '', 'تاريخ الإنشاء': '' },
        { 'اسم المشترك': 'المهام المنجزة', 'رقم الحساب': completedTasks, 'رقم المقياس': `${completionRate}%`, 'العنوان': '', 'المغذي': '', 'الموظف المسؤول': '', 'تاريخ المهمة': '', 'الحالة': '', 'القراءة': '', 'تاريخ الإنجاز': '', 'الموقع': '', 'تاريخ الإنشاء': '' },
        { 'اسم المشترك': 'المهام قيد التنفيذ', 'رقم الحساب': pendingTasks, 'رقم المقياس': `${(100 - parseFloat(completionRate)).toFixed(1)}%`, 'العنوان': '', 'المغذي': '', 'الموظف المسؤول': '', 'تاريخ المهمة': '', 'الحالة': '', 'القراءة': '', 'تاريخ الإنجاز': '', 'الموقع': '', 'تاريخ الإنشاء': '' }
      )
      
      const ws = XLSX.utils.json_to_sheet(tasksData)
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير المهام')
      fileName = `تقرير_المهام${periodStr}_${dateStr}.xlsx`
      
    } else if (selectedReport === 'summary') {
      // التقرير الشامل
      
      // ملخص عام
      const summaryData = [
        { 'البيان': '📋 ملخص عام للنظام', 'العدد': '', 'النسبة': '', 'ملاحظات': '' },
        { 'البيان': '', 'العدد': '', 'النسبة': '', 'ملاحظات': '' },
        { 'البيان': 'إجمالي محاضر الاستلام', 'العدد': filteredRecords.length, 'النسبة': '100%', 'ملاحظات': 'جميع المحاضر' },
        { 'البيان': 'إجمالي مقاييس المشتركين', 'العدد': filteredSubscribers.length, 'النسبة': '100%', 'ملاحظات': 'جميع المقاييس' },
        { 'البيان': 'إجمالي مقاييس المغذيات', 'العدد': filteredFeeders.length, 'النسبة': '100%', 'ملاحظات': 'جميع المغذيات' },
        { 'البيان': 'إجمالي جدول المقاييس', 'العدد': filteredMeters.length, 'النسبة': '100%', 'ملاحظات': 'جميع المقاييس المسجلة' },
        { 'البيان': 'إجمالي المهام', 'العدد': filteredTasks.length, 'النسبة': '100%', 'ملاحظات': 'جميع المهام' },
        { 'البيان': '', 'العدد': '', 'النسبة': '', 'ملاحظات': '' },
        { 'البيان': '📊 تفصيل محاضر الاستلام', 'العدد': '', 'النسبة': '', 'ملاحظات': '' },
        { 'البيان': 'السجلات النظامية', 'العدد': filteredRecords.filter(r => r.record_type === 'نظامي').length, 'النسبة': filteredRecords.length > 0 ? `${Math.round((filteredRecords.filter(r => r.record_type === 'نظامي').length / filteredRecords.length) * 100)}%` : '0%', 'ملاحظات': 'سجلات عادية' },
        { 'البيان': 'السجلات الحمراء', 'العدد': filteredRecords.filter(r => r.record_type === 'حمراء').length, 'النسبة': filteredRecords.length > 0 ? `${Math.round((filteredRecords.filter(r => r.record_type === 'حمراء').length / filteredRecords.length) * 100)}%` : '0%', 'ملاحظات': 'سجلات طارئة' },
        { 'البيان': 'إجمالي المشتركين في المحاضر', 'العدد': filteredRecords.reduce((sum, r) => sum + r.subscribers_count, 0), 'النسبة': '', 'ملاحظات': 'من جميع المحاضر' },
        { 'البيان': '', 'العدد': '', 'النسبة': '', 'ملاحظات': '' },
        { 'البيان': '🏷️ تفصيل أصناف المشتركين', 'العدد': '', 'النسبة': '', 'ملاحظات': '' }
      ]
      
      // إضافة تفصيل أصناف الاشتراكات للملخص
      if (filteredSubscribers.length > 0) {
        const subscriptionBreakdown = filteredSubscribers.reduce((acc, subscriber) => {
          const type = subscriber.subscription_class
          acc[type] = (acc[type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        Object.entries(subscriptionBreakdown)
          .sort(([,a], [,b]) => b - a)
          .forEach(([type, count]) => {
            const percentage = filteredSubscribers.length > 0 ? ((count / filteredSubscribers.length) * 100).toFixed(1) : '0'
            summaryData.push({
              'البيان': type,
              'العدد': count,
              'النسبة': `${percentage}%`,
              'ملاحظات': 'مشترك'
            })
          })
      }
      
      const ws1 = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, ws1, 'الملخص التنفيذي')
      
      // إضافة تفاصيل كل نوع إذا كان هناك بيانات
      if (filteredRecords.length > 0) {
        const recordsData = filteredRecords.map(record => ({
          'السجل': record.registry,
          'النوع': record.type,
          'نوع السجل': record.record_type,
          'المنطقة': record.area,
          'عدد المشتركين': record.subscribers_count,
          'تاريخ الإنشاء': new Date(record.created_at).toLocaleDateString('ar-SA')
        }))
        const ws2 = XLSX.utils.json_to_sheet(recordsData)
        XLSX.utils.book_append_sheet(wb, ws2, 'محاضر الاستلام')
      }
      
      if (filteredSubscribers.length > 0) {
        const subscribersData = filteredSubscribers.map(subscriber => ({
          'رقم الحساب': subscriber.account_number,
          'اسم المشترك': subscriber.subscriber_name,
          'صنف الاشتراك': subscriber.subscription_class,
          'القراءة': subscriber.reading,
          'تاريخ القراءة': new Date(subscriber.reading_date).toLocaleDateString('ar-SA')
        }))
        const ws3 = XLSX.utils.json_to_sheet(subscribersData)
        XLSX.utils.book_append_sheet(wb, ws3, 'مقاييس المشتركين')
      }
      
      if (filteredFeeders.length > 0) {
        const feedersData = filteredFeeders.map(feeder => ({
          'المحطة': feeder.station,
          'المغذي': feeder.feeder,
          'الجهد': feeder.voltage,
          'القراءة': feeder.reading,
          'تاريخ القراءة': new Date(feeder.reading_date).toLocaleDateString('ar-SA')
        }))
        const ws4 = XLSX.utils.json_to_sheet(feedersData)
        XLSX.utils.book_append_sheet(wb, ws4, 'مقاييس المغذيات')
      }
      
      if (filteredMeters.length > 0) {
        const metersData = filteredMeters.map(meter => ({
          'رقم الحساب': meter.account_number,
          'اسم المشترك': meter.subscriber_name,
          'رقم المقياس': meter.meter_number,
          'العنوان': meter.address,
          'المغذي': meter.feeder
        }))
        const ws5 = XLSX.utils.json_to_sheet(metersData)
        XLSX.utils.book_append_sheet(wb, ws5, 'جدول المقاييس')
      }
      
      if (filteredTasks.length > 0) {
        const tasksData = filteredTasks.map(task => ({
          'المشترك': task.meter?.subscriber_name,
          'الموظف': task.assigned_user?.full_name || 'غير محدد',
          'تاريخ المهمة': new Date(task.task_date).toLocaleDateString('ar-SA'),
          'الحالة': task.status,
          'القراءة': task.meter_reading || ''
        }))
        const ws6 = XLSX.utils.json_to_sheet(tasksData)
        XLSX.utils.book_append_sheet(wb, ws6, 'المهام')
      }
      
      fileName = `التقرير_الشامل${periodStr}_${dateStr}.xlsx`
    }

    XLSX.writeFile(wb, fileName)
    
    addNotification('success', 'تم تصدير التقرير بنجاح! 📊')
  }

  const reportTypes = [
    {
      id: 'summary',
      title: 'التقرير الشامل',
      description: 'تقرير متكامل يشمل جميع البيانات مع الإحصائيات',
      icon: BarChart3,
      color: 'from-blue-500 to-purple-500',
      count: records.length + subscribers.length + feeders.length + meters.length + tasks.length
    },
    {
      id: 'records',
      title: 'تقرير محاضر الاستلام',
      description: 'تقرير مفصل لجميع محاضر الاستلام والتسليم',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      count: records.length
    },
    {
      id: 'subscribers',
      title: 'تقرير مقاييس المشتركين',
      description: 'تقرير شامل لجميع قراءات مقاييس المشتركين',
      icon: Users,
      color: 'from-green-500 to-green-600',
      count: subscribers.length
    },
    {
      id: 'feeders',
      title: 'تقرير مقاييس المغذيات',
      description: 'تقرير مفصل لجميع قراءات مقاييس المغذيات',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      count: feeders.length
    },
    {
      id: 'meters',
      title: 'تقرير جدول المقاييس',
      description: 'تقرير شامل لجميع المقاييس المسجلة في النظام',
      icon: Gauge,
      color: 'from-indigo-500 to-indigo-600',
      count: meters.length
    },
    {
      id: 'tasks',
      title: 'تقرير المهام',
      description: 'تقرير مفصل لجميع المهام الموزعة والمنجزة',
      icon: ClipboardList,
      color: 'from-teal-500 to-teal-600',
      count: tasks.length
    }
  ]

  // حساب البيانات المفلترة للعرض
  const getFilteredCount = (type: string) => {
    switch (type) {
      case 'records':
        return filterByDate(records).length
      case 'subscribers':
        return filterByDate(subscribers).length
      case 'feeders':
        return filterByDate(feeders).length
      case 'meters':
        return filterByDate(meters).length
      case 'tasks':
        return filterByDate(tasks).length
      case 'summary':
        return filterByDate(records).length + filterByDate(subscribers).length + filterByDate(feeders).length + filterByDate(meters).length + filterByDate(tasks).length
      default:
        return 0
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
          📊 نظام التقارير المتكامل
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          اختر نوع التقرير وحدد المدة الزمنية للحصول على تقرير مفصل
        </p>
      </div>

      {/* تحديد المدة الزمنية */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 ml-3" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            تحديد المدة الزمنية
          </h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        {(dateFrom || dateTo) && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                المرشح النشط: 
                {dateFrom && ` من ${new Date(dateFrom).toLocaleDateString('ar-SA', { calendar: 'gregory' })}`}
                {dateTo && ` إلى ${new Date(dateTo).toLocaleDateString('ar-SA', { calendar: 'gregory' })}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* اختيار نوع التقرير */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400 ml-3" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            اختر نوع التقرير
          </h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const IconComponent = report.icon
            const filteredCount = getFilteredCount(report.id)
            
            return (
              <label
                key={report.id}
                className={`relative cursor-pointer group transition-all duration-300 ${
                  selectedReport === report.id ? 'transform scale-105' : 'hover:scale-102'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={report.id}
                  checked={selectedReport === report.id}
                  onChange={(e) => setSelectedReport(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 ${
                  selectedReport === report.id
                    ? 'ring-2 ring-blue-500 ring-opacity-50'
                    : ''
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${report.color} rounded-lg flex items-center justify-center transition-colors`}>
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {filteredCount}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {report.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    {report.description}
                  </p>
                  
                  {selectedReport === report.id && (
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


      {/* زر تصدير التقرير */}
      <div className="text-center">
        <button
          onClick={exportReport}
          disabled={getFilteredCount(selectedReport) === 0}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-green-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Download className="w-6 h-6 ml-3" />
          تصدير التقرير
          {getFilteredCount(selectedReport) > 0 && (
            <span className="mr-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-sm">
              {getFilteredCount(selectedReport)} سجل
            </span>
          )}
        </button>
        
        {getFilteredCount(selectedReport) === 0 && (
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            لا توجد بيانات في المدة المحددة
          </p>
        )}
      </div>
    </div>
  )
}