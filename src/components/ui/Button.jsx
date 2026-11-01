'use client';

import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'dark' | 'danger' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  pill = false,
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shrink-0 select-none';

  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs gap-1.5',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-13 px-6 text-base gap-2.5',
  }[size] || 'h-11 px-5 text-sm gap-2';

  const radiusClasses = pill ? 'rounded-full' : size === 'sm' ? 'rounded-lg' : 'rounded-xl';

  const variantClasses = {
    primary: 'bg-yellow-500 text-ink-900 hover:bg-yellow-600 shadow-sm',
    secondary: 'bg-white text-ink-900 border border-line hover:bg-yellow-50 shadow-sm',
    dark: 'bg-ink-900 text-white hover:bg-ink-700 shadow-sm',
    danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
    outline: 'bg-transparent text-white border-2 border-white/80 hover:bg-white/10',
    ghost: 'bg-transparent text-ink-700 hover:bg-yellow-50 hover:text-ink-900',
  }[variant] || 'bg-yellow-500 text-ink-900 hover:bg-yellow-600';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${radiusClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="text-lg shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
