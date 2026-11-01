'use client';

import React from 'react';

export function Input({
  label,
  error,
  helper,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-ink-700 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-ink-500 pointer-events-none">
            <Icon className="text-lg" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full h-11 px-3.5 ${
            Icon ? 'pl-10' : ''
          } rounded-xl border border-line bg-surface text-ink-900 text-base placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-150 disabled:bg-yellow-50/50 disabled:cursor-not-allowed ${
            error ? 'border-danger focus:ring-danger' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-xs text-danger font-medium">{error}</span>
      ) : helper ? (
        <span className="text-xs text-ink-500">{helper}</span>
      ) : null}
    </div>
  );
}

export default Input;
