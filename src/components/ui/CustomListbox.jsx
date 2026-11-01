'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

export function CustomListbox({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`relative flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-bold text-ink-700 tracking-wide">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink-900 text-sm flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-150"
      >
        <span className={selectedOption ? 'font-medium' : 'text-ink-300'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FiChevronDown
          className={`text-ink-500 text-lg transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-line rounded-xl shadow-float z-50 max-h-60 overflow-y-auto py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-sm text-left flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-yellow-100 text-ink-900 font-bold'
                    : 'text-ink-700 hover:bg-yellow-50'
                }`}
                style={opt.style}
              >
                <span>{opt.label}</span>
                {isSelected && <FiCheck className="text-yellow-700 shrink-0 text-base" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomListbox;
