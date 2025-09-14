import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void
  currentImage?: File | null
  label?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  currentImage, 
  label = "إرفاق صورة" 
}) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // ضغط إلى 500KB كحد أقصى
      maxWidthOrHeight: 1024, // أقصى عرض أو ارتفاع 1024px
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      quality: 0.8 // جودة 80%
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      return file // إرجاع الملف الأصلي في حالة فشل الضغط
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح')
      return
    }

    // التحقق من حجم الملف (10MB كحد أقصى قبل الضغط)
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 10MB')
      return
    }

    setLoading(true)

    try {
      // ضغط الصورة
      const compressedFile = await compressImage(file)
      
      // إنشاء معاينة
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

      // إرسال الملف المضغوط للمكون الأب
      onImageSelect(compressedFile)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('حدث خطأ في معالجة الصورة')
    } finally {
      setLoading(false)
    }
  }

  const removeImage = () => {
    setPreview(null)
    onImageSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} (اختياري)
      </label>
      
      {preview ? (
        <div className="relative">
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <img
              src={preview}
              alt="معاينة الصورة"
              className="max-w-full h-48 object-contain mx-auto rounded-lg"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            تم ضغط الصورة لتوفير المساحة
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          {loading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">جاري ضغط الصورة...</p>
            </div>
          ) : (
            <>
              <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                انقر لاختيار صورة أو اسحبها هنا
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يدعم: JPG, PNG, GIF (سيتم ضغطها تلقائياً)
              </p>
            </>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading}
          />
          
          {!loading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Upload className="w-4 h-4 ml-2" />
              اختيار صورة
            </button>
          )}
        </div>
      )}
    </div>
  )
}