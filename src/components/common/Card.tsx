import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm transition-all duration-200 ${
        hoverEffect
          ? 'hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
