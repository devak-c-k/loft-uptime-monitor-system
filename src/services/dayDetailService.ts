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
    hour: string;
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercent: number | null;
    avgResponseTime: number | null;
  }>;
  incidents?: Array<{
    time: string;
    error: string;
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
