import axios from 'axios';

export interface DailyData {
  date: string;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercent: number;
  errorMessage?: string | null;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  type: string;
  currentStatus: "UP" | "DOWN" | "UNKNOWN";
  uptime: string;
  averageResponseTime: number | null;
  lastChecked: string | null;
  dailyData: DailyData[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface StatusData {
  allOperational: boolean;
  services: Service[];
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export interface FetchStatusParams {
  endDate?: Date;
  days?: number;
}

class StatusService {
  /**
   * Fetch status data for all services
   */
  async getStatus(params: FetchStatusParams = {}): Promise<StatusData> {
    const { endDate = new Date(), days = 90 } = params;
    
    const queryParams = new URLSearchParams({
      endDate: endDate.toISOString(),
      days: days.toString(),
    });
    
    const response = await axios.get<StatusData>(`/api/status?${queryParams}`);
    return response.data;
  }

  /**
   * Start the monitoring scheduler
   */
  async startScheduler(): Promise<void> {
    await axios.get('/api/scheduler/start');
  }

  /**
   * Calculate earliest and latest data dates from services
   */
  calculateDataDateRange(services: Service[]): {
    earliest: Date | null;
    latest: Date | null;
  } {
    let earliest: Date | null = null;
    let latest: Date | null = null;
    
    services.forEach((service) => {
      if (service.dailyData && service.dailyData.length > 0) {
        service.dailyData.forEach((day) => {
          if (day.totalChecks > 0) {
            const dayDate = new Date(day.date);
            if (!earliest || dayDate < earliest) earliest = dayDate;
            if (!latest || dayDate > latest) latest = dayDate;
          }
        });
      }
    });
    
    return { earliest, latest };
  }

  /**
   * Check if a date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Format date range for display
   */
  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }
}

export const statusService = new StatusService();
