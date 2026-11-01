'use client';

import React from 'react';

export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`bg-yellow-100/70 animate-pulse ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-line p-5 flex flex-col gap-3 shadow-card">
      <Skeleton className="w-1/3 h-4" />
      <Skeleton className="w-2/3 h-8" />
      <Skeleton className="w-full h-12" />
    </div>
  );
}

export default Skeleton;
