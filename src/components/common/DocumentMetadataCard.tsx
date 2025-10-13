import React, { useState } from 'react'

interface MetadataItem {
  label: string
  value: string | React.ReactNode
  type?: 'text' | 'badge' | 'link' | 'date' | 'hash'
  copyable?: boolean
}

interface MetadataSection {
  title: string
  icon: string
  items: MetadataItem[]
  collapsible?: boolean
}

interface DocumentMetadataCardProps {
  sections: MetadataSection[]
  className?: string
}

interface MetadataCardProps {
  section: MetadataSection
}

function MetadataCard({ section }: MetadataCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isCollapsible = section.collapsible !== false

  const renderValue = (item: MetadataItem) => {
    switch (item.type) {
      case 'badge':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {item.value}
          </span>
        )
      case 'link':
        return (
          <a 
            href={item.value as string} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {item.value}
          </a>
        )
      case 'date':
        return (
          <span className="text-gray-900">
            {new Date(item.value as string).toLocaleString()}
          </span>
        )
      case 'hash':
        return (
          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
            {item.value}
          </code>
        )
      default:
        return <span className="text-gray-900">{item.value}</span>
    }
  }

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
    // You could add a toast notification here
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div 
        className={`px-4 py-3 border-b border-gray-100 ${isCollapsible ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{section.icon}</span>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
          </div>
          {isCollapsible && (
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4">
          <div className="space-y-3">
            {section.items.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <dt className="text-sm font-medium text-gray-600 min-w-0 flex-shrink-0">
                  {item.label}:
                </dt>
                <dd className="text-sm text-gray-900 min-w-0 flex-1">
                  {renderValue(item)}
                  {item.copyable && typeof item.value === 'string' && (
                    <button
                      onClick={() => copyToClipboard(item.value as string)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DocumentMetadataCard({ sections, className = '' }: DocumentMetadataCardProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((section, index) => (
        <MetadataCard key={index} section={section} />
      ))}
    </div>
  )
}
