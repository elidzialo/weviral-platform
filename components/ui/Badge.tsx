import React from 'react'

type BadgeVariant = 'green' | 'amber' | 'red' | 'purple' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-[rgba(31,211,163,.12)]  text-[#0F7A5A]',
  amber:  'bg-[rgba(245,158,11,.12)]  text-[#92400E]',
  red:    'bg-[rgba(239,68,68,.1)]    text-[#991B1B]',
  purple: 'bg-[rgba(110,91,255,.1)]   text-[#6E5BFF]',
  gray:   'bg-[#F6F6F3]              text-[#8C8C88]',
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  className = '',
  children,
}) => (
  <span
    className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent',
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
)

export function statusBadge(status: string): React.ReactElement {
  const normalised = status.toLowerCase().trim()

  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    active:       { variant: 'green',  label: 'Active' },
    approved:     { variant: 'green',  label: 'Approved' },
    completed:    { variant: 'green',  label: 'Completed' },
    paid:         { variant: 'green',  label: 'Paid' },
    live:         { variant: 'green',  label: 'Live' },
    pending:      { variant: 'amber',  label: 'Pending' },
    'in review':  { variant: 'amber',  label: 'In Review' },
    in_review:    { variant: 'amber',  label: 'In Review' },
    draft:        { variant: 'amber',  label: 'Draft' },
    processing:   { variant: 'amber',  label: 'Processing' },
    rejected:     { variant: 'red',    label: 'Rejected' },
    failed:       { variant: 'red',    label: 'Failed' },
    cancelled:    { variant: 'red',    label: 'Cancelled' },
    canceled:     { variant: 'red',    label: 'Cancelled' },
    banned:       { variant: 'red',    label: 'Banned' },
    suspended:    { variant: 'red',    label: 'Suspended' },
    invited:      { variant: 'purple', label: 'Invited' },
    scheduled:    { variant: 'purple', label: 'Scheduled' },
    submitted:    { variant: 'purple', label: 'Submitted' },
  }

  const config = map[normalised] ?? { variant: 'gray' as BadgeVariant, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default Badge
