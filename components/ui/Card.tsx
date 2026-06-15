import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

interface CardBadgeProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div
    className={['bg-white border border-[#ECECE8] rounded-2xl overflow-hidden', className]
      .filter(Boolean)
      .join(' ')}
    style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.04)' }}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children }) => (
  <div
    className={['flex items-center justify-between px-6 py-4 border-b border-[#ECECE8]', className]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<CardTitleProps> = ({ className = '', children }) => (
  <h3
    className={['text-[15px] font-semibold text-[#0B0B0C]', className]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </h3>
);

export const CardBody: React.FC<CardBodyProps> = ({ className = '', children }) => (
  <div className={['px-6 py-4', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const CardBadge: React.FC<CardBadgeProps> = ({ className = '', children }) => (
  <span
    className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

export default Card;
