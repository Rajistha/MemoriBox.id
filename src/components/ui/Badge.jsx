'use client';

import React from 'react';

export function Badge({
  children,
  variant = 'default', // 'success' | 'warning' | 'danger' | 'info' | 'yellow' | 'neutral'
  size = 'md', // 'sm' | 'md'
  className = '',
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }[size] || 'px-2.5 py-1 text-xs';

  const variantClasses = {
    success: 'bg-green-50 text-success border border-green-200',
    warning: 'bg-orange-50 text-warning border border-orange-200',
    danger: 'bg-red-50 text-danger border border-red-200',
    info: 'bg-blue-50 text-info border border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    neutral: 'bg-gray-100 text-ink-700 border border-gray-200',
    default: 'bg-yellow-50 text-ink-900 border border-line',
  }[variant] || 'bg-yellow-50 text-ink-900 border border-line';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
