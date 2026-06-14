import React from 'react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={[
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {icon && (
      <span className="text-5xl mb-4 select-none" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
    )}
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-700 text-white text-sm font-medium hover:bg-violet-800 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
