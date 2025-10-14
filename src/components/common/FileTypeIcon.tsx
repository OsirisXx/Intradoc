import React from 'react'

interface FileTypeInfo {
  extension: string
  mimeType: string
  category: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other'
  icon: string
  color: string
  canPreview: boolean
  previewType: 'iframe' | 'image' | 'download' | 'url'
}

interface FileTypeIconProps {
  extension: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const getFileTypeInfo = (extension: string): FileTypeInfo => {
  const ext = extension.toLowerCase()
  
  const fileTypes: { [key: string]: FileTypeInfo } = {
    // Documents
    'pdf': { extension: 'pdf', mimeType: 'application/pdf', category: 'document', icon: '📄', color: '#dc2626', canPreview: true, previewType: 'iframe' },
    'doc': { extension: 'doc', mimeType: 'application/msword', category: 'document', icon: '📝', color: '#2563eb', canPreview: false, previewType: 'download' },
    'docx': { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', icon: '📝', color: '#2563eb', canPreview: false, previewType: 'download' },
    'xls': { extension: 'xls', mimeType: 'application/vnd.ms-excel', category: 'document', icon: '📊', color: '#059669', canPreview: false, previewType: 'download' },
    'xlsx': { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document', icon: '📊', color: '#059669', canPreview: false, previewType: 'download' },
    'ppt': { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', category: 'document', icon: '📽️', color: '#dc2626', canPreview: false, previewType: 'download' },
    'pptx': { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document', icon: '📽️', color: '#dc2626', canPreview: false, previewType: 'download' },
    'txt': { extension: 'txt', mimeType: 'text/plain', category: 'document', icon: '📄', color: '#6b7280', canPreview: true, previewType: 'iframe' },
    
    // Images
    'jpg': { extension: 'jpg', mimeType: 'image/jpeg', category: 'image', icon: '🖼️', color: '#7c3aed', canPreview: true, previewType: 'image' },
    'jpeg': { extension: 'jpeg', mimeType: 'image/jpeg', category: 'image', icon: '🖼️', color: '#7c3aed', canPreview: true, previewType: 'image' },
    'png': { extension: 'png', mimeType: 'image/png', category: 'image', icon: '🖼️', color: '#7c3aed', canPreview: true, previewType: 'image' },
    'gif': { extension: 'gif', mimeType: 'image/gif', category: 'image', icon: '🖼️', color: '#7c3aed', canPreview: true, previewType: 'image' },
    'svg': { extension: 'svg', mimeType: 'image/svg+xml', category: 'image', icon: '🖼️', color: '#7c3aed', canPreview: true, previewType: 'image' },
    
    // Archives
    'zip': { extension: 'zip', mimeType: 'application/zip', category: 'archive', icon: '🗜️', color: '#f59e0b', canPreview: false, previewType: 'download' },
    'rar': { extension: 'rar', mimeType: 'application/x-rar-compressed', category: 'archive', icon: '🗜️', color: '#f59e0b', canPreview: false, previewType: 'download' },
    '7z': { extension: '7z', mimeType: 'application/x-7z-compressed', category: 'archive', icon: '🗜️', color: '#f59e0b', canPreview: false, previewType: 'download' },
    
    // Videos
    'mp4': { extension: 'mp4', mimeType: 'video/mp4', category: 'video', icon: '🎥', color: '#ec4899', canPreview: false, previewType: 'download' },
    'avi': { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', icon: '🎥', color: '#ec4899', canPreview: false, previewType: 'download' },
    'mov': { extension: 'mov', mimeType: 'video/quicktime', category: 'video', icon: '🎥', color: '#ec4899', canPreview: false, previewType: 'download' },
    
    // Audio
    'mp3': { extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', icon: '🎵', color: '#10b981', canPreview: false, previewType: 'download' },
    'wav': { extension: 'wav', mimeType: 'audio/wav', category: 'audio', icon: '🎵', color: '#10b981', canPreview: false, previewType: 'download' },
  }
  
  // Special handling for URL submissions
  if (ext === 'url' || ext === 'link') {
    return {
      extension: 'url',
      mimeType: 'text/html',
      category: 'other',
      icon: '🔗',
      color: '#059669',
      canPreview: true,
      previewType: 'url'
    }
  }
  
  return fileTypes[ext] || { 
    extension: ext, 
    mimeType: 'application/octet-stream', 
    category: 'other', 
    icon: '📄', 
    color: '#6b7280', 
    canPreview: false, 
    previewType: 'download' 
  }
}

export function FileTypeIcon({ extension, size = 'md', showLabel = false, className = '' }: FileTypeIconProps) {
  const fileInfo = getFileTypeInfo(extension)
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  }
  
  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} ${className}`}>
      <span 
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-medium"
        style={{ backgroundColor: fileInfo.color }}
        title={`${fileInfo.extension.toUpperCase()} file`}
      >
        {fileInfo.icon}
      </span>
      {showLabel && (
        <span className="font-medium text-gray-700">
          {fileInfo.extension.toUpperCase()}
        </span>
      )}
    </div>
  )
}

export { getFileTypeInfo }
