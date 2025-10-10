"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedTimezone } from '@/lib/timezone';

interface TimezoneContextType {
  timezone: SupportedTimezone;
  setTimezone: (timezone: SupportedTimezone) => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred-timezone';

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<SupportedTimezone>('America/New_York');

  // Load timezone from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'America/New_York' || saved === 'Asia/Kolkata')) {
      setTimezoneState(saved as SupportedTimezone);
    }
  }, []);

  // Save timezone to localStorage when it changes
  const setTimezone = (newTimezone: SupportedTimezone) => {
    setTimezoneState(newTimezone);
    localStorage.setItem(STORAGE_KEY, newTimezone);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
