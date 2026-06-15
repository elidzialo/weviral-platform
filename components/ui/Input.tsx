import React from 'react'

const baseInput =
  'w-full rounded-xl border border-[#ECECE8] bg-white px-4 py-2.5 text-[15px] text-[#0B0B0C] ' +
  'placeholder-[#C4C4C0] transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/25 focus:border-[#6E5BFF] ' +
  'disabled:bg-[#F6F6F3] disabled:text-[#8C8C88] disabled:cursor-not-allowed'

const errorInput = 'border-red-400 focus:ring-red-500 focus:border-red-500'

const labelClass = 'text-[13px] font-semibold text-[#0B0B0C] mb-1.5'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  className?: string
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...rest }) => {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={inputId} className={labelClass}>{label}</label>}
      <input id={inputId} className={[baseInput, error ? errorInput : ''].filter(Boolean).join(' ')} {...rest} />
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  className?: string
  children: React.ReactNode
}

export const Select: React.FC<SelectProps> = ({ label, error, className = '', id, children, ...rest }) => {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={selectId} className={labelClass}>{label}</label>}
      <select
        id={selectId}
        className={[
          baseInput,
          'appearance-none cursor-pointer pr-8',
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%238C8C88' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem]",
          error ? errorInput : '',
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  className?: string
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', id, ...rest }) => {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={textareaId} className={labelClass}>{label}</label>}
      <textarea
        id={textareaId}
        rows={4}
        className={[baseInput, 'resize-y min-h-[80px]', error ? errorInput : ''].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  )
}

export default Input
