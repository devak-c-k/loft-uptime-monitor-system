"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { statusService, StatusData, Service } from '@/services/statusService';

interface StatusContextType {
  statusData: StatusData | null;
  loading: boolean;
  error: string;
  endDate: Date;
  earliestDataDate: Date | null;
  latestDataDate: Date | null;
  selectedDay: {
    endpointId: string;
    endpointName: string;
    date: string;
  } | null;
  setSelectedDay: (day: { endpointId: string; endpointName: string; date: string } | null) => void;
  fetchStatus: (fetchEndDate?: Date) => Promise<void>;
  navigateNext: () => void;
  navigatePrevious: () => void;
  canNavigateNext: () => boolean;
  canNavigatePrevious: () => boolean;
  formatDateRange: () => string;
  handleDayClick: (endpointId: string, endpointName: string) => (date: string, hasData: boolean) => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

interface StatusProviderProps {
  children: ReactNode;
}

export function StatusProvider({ children }: StatusProviderProps) {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [earliestDataDate, setEarliestDataDate] = useState<Date | null>(null);
  const [latestDataDate, setLatestDataDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    endpointId: string;
    endpointName: string;
    date: string;
  } | null>(null);

  const fetchStatus = useCallback(async (fetchEndDate?: Date) => {
    try {
      setLoading(true);
      const dateToFetch = fetchEndDate || endDate;
      
      const data = await statusService.getStatus({
        endDate: dateToFetch,
        days: 90,
      });
      
      setStatusData(data);
      
      // Calculate earliest and latest data dates from all services
      if (data.services && data.services.length > 0) {
        const { earliest, latest } = statusService.calculateDataDateRange(data.services);
        setEarliestDataDate(earliest);
        setLatestDataDate(latest);
      }
      
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [endDate]);

  const canNavigateNext = () => {
    if (!statusData?.dateRange) return false;
    const today = new Date();
    const currentEnd = new Date(statusData.dateRange.end);
    
    return currentEnd < today && latestDataDate !== null && currentEnd < latestDataDate;
  };

  const canNavigatePrevious = () => {
    if (!statusData?.dateRange || !earliestDataDate) return false;
    const currentStart = new Date(statusData.dateRange.start);
    
    return currentStart > earliestDataDate;
  };

  const navigateNext = () => {
    if (!canNavigateNext()) return;
    
    const today = new Date();
    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() + 90);
    
    if (newEndDate > today) {
      setEndDate(today);
      fetchStatus(today);
    } else {
      setEndDate(newEndDate);
      fetchStatus(newEndDate);
    }
  };

  const navigatePrevious = () => {
    if (!canNavigatePrevious()) return;
    
    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() - 90);
    setEndDate(newEndDate);
    fetchStatus(newEndDate);
  };

  const formatDateRange = () => {
    if (!statusData?.dateRange) return "";
    return statusService.formatDateRange(statusData.dateRange.start, statusData.dateRange.end);
  };

  const handleDayClick = useCallback((endpointId: string, endpointName: string) => 
    (date: string, hasData: boolean) => {
      if (hasData) {
        setSelectedDay({ endpointId, endpointName, date });
      }
    }, []);

  // Initial fetch - only on mount
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <StatusContext.Provider
      value={{
        statusData,
        loading,
        error,
        endDate,
        earliestDataDate,
        latestDataDate,
        selectedDay,
        setSelectedDay,
        fetchStatus,
        navigateNext,
        navigatePrevious,
        canNavigateNext,
        canNavigatePrevious,
        formatDateRange,
        handleDayClick,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
}
