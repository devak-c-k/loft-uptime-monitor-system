import axios from 'axios';

export interface DayDetailData {
  hasData: boolean;
  message?: string;
  endpoint?: {
    name: string;
    url: string;
  };
  date?: string;
  dateFormatted?: string;
  summary?: {
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercent: string;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    firstCheck: string;
    lastCheck: string;
  };
  hourlyData?: Array<{
    hour: number; // UTC hour (0-23)
    hourISO: string; // Full UTC ISO timestamp
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercent: number | null;
    avgResponseTime: number | null;
  }>;
  incidents?: Array<{
    timestamp: string; // UTC ISO timestamp
    error: string;
    httpCode?: number | null;
    responseTime?: number | null;
    durationMs?: number | null;
    duration?: string | null;
  }>;
  timelineData?: Array<{
    time: string;
    status: string;
    responseTime: number | null;
  }>;
}

class DayDetailService {
  /**
   * Fetch detailed data for a specific day
   */
  async getDayDetail(endpointId: string, date: string): Promise<DayDetailData> {
    const response = await axios.get<DayDetailData>(
      `/api/day-detail?endpointId=${endpointId}&date=${date}`
    );
    return response.data;
  }
}

export const dayDetailService = new DayDetailService();
