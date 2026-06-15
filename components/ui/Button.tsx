'use client'

import React from 'react'

type ButtonVariant = 'primary' | 'green' | 'red' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
}

const variantBase: Record<ButtonVariant, string> = {
  primary: 'text-white border border-transparent',
  green:   'bg-[#1FD3A3] text-white hover:bg-[#19b88e] border border-transparent focus:ring-[#1FD3A3]',
  red:     'bg-red-600 text-white hover:bg-red-700 border border-transparent focus:ring-red-500',
  ghost:   'bg-transparent text-[#8C8C88] hover:bg-[#F6F6F3] border border-transparent focus:ring-[#ECECE8]',
  outline: 'bg-white text-[#6E5BFF] border border-[#6E5BFF] hover:bg-[rgba(110,91,255,.06)] focus:ring-[#6E5BFF]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
}

const Spinner: React.FC = () => (
  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button',
}) => {
  const isDisabled = disabled || loading

  const primaryStyle =
    variant === 'primary'
      ? {
          background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)',
          boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(98,92,255,.35)',
        }
      : undefined

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={primaryStyle}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variantBase[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export default Button
