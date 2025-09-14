import React from 'react'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

interface ImageViewerProps {
  imageUrl: string
  isOpen: boolean
  onClose: () => void
  title?: string
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ 
  imageUrl, 
  isOpen, 
  onClose, 
  title = "عرض الصورة" 
}) => {
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      // إعادة تعيين القيم عند الإغلاق
      setZoom(1)
      setRotation(0)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl max-h-full overflow-hidden">
        {/* شريط العنوان والأدوات */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          
          <div className="flex items-center space-x-reverse space-x-2">
            {/* أدوات التحكم */}
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="دوران"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* منطقة عرض الصورة */}
        <div className="p-4 max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-center">
            <img
              src={imageUrl}
              alt="صورة المقياس"
              className="max-w-full h-auto transition-transform duration-200 ease-in-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
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
            استخدم عجلة الماوس للتكبير والتصغير • اسحب الصورة للتحريك
          </p>
        </div>
      </div>
    </div>
  )
}