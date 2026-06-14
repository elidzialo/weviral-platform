import React from 'react';

type BadgeVariant = 'green' | 'amber' | 'red' | 'purple' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-violet-100 text-violet-800',
  gray: 'bg-gray-100 text-gray-700',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  className = '',
  children,
}) => (
  <span
    className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

/**
 * Map a status string to a Badge variant and label.
 * Returns a ready-to-render <Badge> element.
 */
export function statusBadge(status: string): React.ReactElement {
  const normalised = status.toLowerCase().trim();

  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    // success / active
    active: { variant: 'green', label: 'Active' },
    approved: { variant: 'green', label: 'Approved' },
    completed: { variant: 'green', label: 'Completed' },
    paid: { variant: 'green', label: 'Paid' },
    live: { variant: 'green', label: 'Live' },

    // warning / pending
    pending: { variant: 'amber', label: 'Pending' },
    'in review': { variant: 'amber', label: 'In Review' },
    in_review: { variant: 'amber', label: 'In Review' },
    draft: { variant: 'amber', label: 'Draft' },
    processing: { variant: 'amber', label: 'Processing' },

    // error / rejected
    rejected: { variant: 'red', label: 'Rejected' },
    failed: { variant: 'red', label: 'Failed' },
    cancelled: { variant: 'red', label: 'Cancelled' },
    canceled: { variant: 'red', label: 'Cancelled' },
    banned: { variant: 'red', label: 'Banned' },
    suspended: { variant: 'red', label: 'Suspended' },

    // info / purple
    invited: { variant: 'purple', label: 'Invited' },
    scheduled: { variant: 'purple', label: 'Scheduled' },
    submitted: { variant: 'purple', label: 'Submitted' },
  };

  const config = map[normalised] ?? { variant: 'gray' as BadgeVariant, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default Badge;
