import React from 'react'
import { X, Calendar, User, Hash, FileText, Users as UsersIcon, Zap } from 'lucide-react'
import { Record, Subscriber, Feeder } from '../lib/supabase'

interface ViewModalProps {
  isOpen: boolean
  onClose: () => void
  data: Record | Subscriber | Feeder | null
  type: 'record' | 'subscriber' | 'feeder'
}

export const ViewModal: React.FC<ViewModalProps> = ({ isOpen, onClose, data, type }) => {
  if (!isOpen || !data) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderRecordDetails = (record: Record) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            السجل
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Hash className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">{record.registry}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            النوع
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FileText className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">{record.type}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            نوع السجل
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              record.record_type === 'حمراء' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {record.record_type}
            </span>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          المنطقة
        </label>
        <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-900 dark:text-white">{record.area}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          عدد المشتركين
        </label>
        <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <UsersIcon className="w-4 h-4 text-gray-500 ml-2" />
          <span className="text-gray-900 dark:text-white">{record.subscribers_count}</span>
        </div>
      </div>
    </div>
  )

  const renderSubscriberDetails = (subscriber: Subscriber) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            رقم الحساب
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Hash className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">{subscriber.account_number}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            اسم المشترك
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <User className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">{subscriber.subscriber_name}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            صنف الاشتراك
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{subscriber.subscription_class}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            رقم المقياس
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{subscriber.meter_number}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            القراءة (كيلو واط ساعة)
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white font-mono">{subscriber.reading}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            تاريخ القراءة
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">
              {new Date(subscriber.reading_date).toLocaleDateString('ar-SA', { 
                calendar: 'islamic',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderFeederDetails = (feeder: Feeder) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            المحطة
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Zap className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-900 dark:text-white">{feeder.station}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            المغذي
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{feeder.feeder}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            الجهد
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{feeder.voltage}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            رقم المقياس
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{feeder.meter_number}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            نوع المقياس
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white">{feeder.meter_type}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            القراءة (كيلو واط ساعة)
          </label>
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-900 dark:text-white font-mono">{feeder.reading}</span>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          تاريخ القراءة
        </label>
        <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-500 ml-2" />
          <span className="text-gray-900 dark:text-white">
            {new Date(feeder.reading_date).toLocaleDateString('ar-SA', { 
              calendar: 'gregory',
             year: 'numeric',
             month: 'long',
             day: 'numeric'
           })}
          </span>
        </div>
      </div>
    </div>
  )

  const getTitle = () => {
    switch (type) {
      case 'record':
        return `تفاصيل السجل - ${(data as Record).registry}`
      case 'subscriber':
        return `تفاصيل المشترك - ${(data as Subscriber).subscriber_name}`
      case 'feeder':
        return `تفاصيل المغذي - ${(data as Feeder).feeder}`
      default:
        return 'تفاصيل السجل'
    }
  }

  return (
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
        <div className="p-6">
          {type === 'record' && renderRecordDetails(data as Record)}
          {type === 'subscriber' && renderSubscriberDetails(data as Subscriber)}
          {type === 'feeder' && renderFeederDetails(data as Feeder)}

          {/* Creation Date */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              تاريخ الإنشاء
            </label>
            <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-500 ml-2" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {formatDate(data.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}