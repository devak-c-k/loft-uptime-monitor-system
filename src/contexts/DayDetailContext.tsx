"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { dayDetailService, DayDetailData } from '@/services/dayDetailService';

interface DayDetailContextType {
  data: DayDetailData | null;
  loading: boolean;
  error: string | null;
  selectedDay: {
    endpointId: string;
    endpointName: string;
    date: string;
  } | null;
  fetchDayDetail: (endpointId: string, date: string) => Promise<void>;
  setSelectedDay: (day: { endpointId: string; endpointName: string; date: string } | null) => void;
  clearData: () => void;
}

const DayDetailContext = createContext<DayDetailContextType | undefined>(undefined);

interface DayDetailProviderProps {
  children: ReactNode;
}

export function DayDetailProvider({ children }: DayDetailProviderProps) {
  const [data, setData] = useState<DayDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    endpointId: string;
    endpointName: string;
    date: string;
  } | null>(null);

  const fetchDayDetail = useCallback(async (endpointId: string, date: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dayDetailService.getDayDetail(endpointId, date);
      setData(result);
    } catch (err: any) {
      // Ignore abort errors
      if (err.code !== 'ERR_CANCELED') {
        setError(err.response?.data?.error || err.message || 'Failed to fetch day details');
        console.error("Failed to fetch day detail:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return (
    <DayDetailContext.Provider
      value={{
        data,
        loading,
        error,
        selectedDay,
        fetchDayDetail,
        setSelectedDay,
        clearData,
      }}
    >
      {children}
    </DayDetailContext.Provider>
  );
}

export function useDayDetail() {
  const context = useContext(DayDetailContext);
  if (context === undefined) {
    throw new Error('useDayDetail must be used within a DayDetailProvider');
  }
  return context;
}
