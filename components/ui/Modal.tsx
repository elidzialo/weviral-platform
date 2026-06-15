'use client'

import React, { useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl flex flex-col max-h-[90vh]"
        style={{ border: '1px solid #ECECE8', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECE8] flex-shrink-0">
          {title ? (
            <h2 id="modal-title" className="text-[16px] font-bold text-[#0B0B0C]">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-[#8C8C88] hover:text-[#0B0B0C] hover:bg-[#F6F6F3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/30"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#ECECE8] flex-shrink-0 bg-[#F6F6F3] rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
