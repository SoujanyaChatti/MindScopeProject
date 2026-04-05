import { Brain } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center p-8'

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="relative">
          <Brain className={`${sizeClasses[size]} text-primary-600 animate-pulse mx-auto mb-4`} />
          <div className={`loading-spinner ${sizeClasses[size]} absolute top-0 left-1/2 transform -translate-x-1/2`} />
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}
