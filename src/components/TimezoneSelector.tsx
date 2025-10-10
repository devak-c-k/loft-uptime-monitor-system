"use client";

import { useTimezone } from '@/contexts/TimezoneContext';
import { TIMEZONES, SupportedTimezone } from '@/lib/timezone';

export default function TimezoneSelector() {
  const { timezone, setTimezone } = useTimezone();

  return (
    <div className="flex items-center gap-2">
      <svg 
        className="w-4 h-4 text-gray-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value as SupportedTimezone)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label} ({tz.offset})
          </option>
        ))}
      </select>
    </div>
  );
}
