import React from "react";

interface DailyData {
  date: string;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  uptimePercent: number;
  errorMessage?: string | null;
}

interface UptimeBarProps {
  dailyData: DailyData[];
  startDate: string;
  endDate: string;
  onDayClick?: (date: string, hasData: boolean) => void;
}

export default function UptimeBar({ dailyData, startDate, endDate, onDayClick }: UptimeBarProps) {
  // Generate all days in range (fill gaps with no data)
  const generateAllDays = (): Array<DailyData & { hasData: boolean }> => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dataMap = new Map(dailyData.map(d => [d.date, d]));
    const allDays: Array<DailyData & { hasData: boolean }> = [];
    
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const dayData = dataMap.get(dateKey);
      
      if (dayData) {
        allDays.push({ ...dayData, hasData: true });
      } else {
        allDays.push({
          date: dateKey,
          totalChecks: 0,
          upChecks: 0,
          downChecks: 0,
          uptimePercent: 0,
          hasData: false,
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return allDays;
  };

  const allDays = generateAllDays();

  const getBarColor = (day: DailyData & { hasData: boolean }) => {
    if (!day.hasData) return "bg-gray-200"; // No data - gray/blank
    if (day.uptimePercent === 100) return "bg-[#10B981]"; // Perfect - green
    if (day.uptimePercent >= 50) return "bg-[#F59E0B]"; // Partial - amber/orange
    return "bg-[#EF4444]"; // Major issues - red
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getDowntimeDisplay = (downChecks: number) => {
    // Assuming checks every 30 seconds: 2 checks per minute
    const downMinutes = Math.round((downChecks * 30) / 60);
    const hours = Math.floor(downMinutes / 60);
    const mins = downMinutes % 60;
    
    return { hours, mins };
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">90 days ago</span>
      <div className="flex gap-[2px] flex-1">
        {allDays.length > 0 ? (
          allDays.map((day, index) => {
            const downtime = getDowntimeDisplay(day.downChecks);
            
            return (
              <div
                key={index}
                onClick={() => day.hasData && onDayClick?.(day.date, day.hasData)}
                className={`h-8 flex-1 rounded-sm ${getBarColor(day)} ${
                  day.hasData ? ' transition-all cursor-pointer hover:scale-105' : ''
                } relative group`}
              >
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                  <div className="bg-[#1F2937] text-white text-xs rounded-lg shadow-2xl p-3 min-w-[200px] border border-gray-700">
                    {day.hasData ? (
                      <>
                        {/* Date Header */}
                        <div className="font-bold text-sm mb-2 border-b border-gray-700 pb-2">
                          {formatDate(day.date)}
                        </div>
                        
                        {day.uptimePercent === 100 ? (
                          // Perfect uptime - no issues
                          <div className="text-green-300">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">✓</span>
                              <span className="font-semibold">No downtime recorded on this day</span>
                            </div>
                          </div>
                        ) : (
                          // Had downtime
                          <>
                            <div className="mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-orange-400 text-base">⚠</span>
                                <span className="font-semibold text-orange-300">
                                  {day.uptimePercent >= 50 ? 'Partial outage' : 'Major outage'}
                                </span>
                              </div>
                              <div className="text-white font-medium">
                                {downtime.hours > 0 && (
                                  <span>{downtime.hours} hr{downtime.hours !== 1 ? 's' : ''} </span>
                                )}
                                <span>{downtime.mins} min{downtime.mins !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            
                            {/* Related/Error Message */}
                            {day.errorMessage && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-gray-400 text-xs mb-1">Related</div>
                                <div className="text-gray-200 text-xs leading-relaxed">
                                  {day.errorMessage}
                                </div>
                              </div>
                            )}
                            
                            {/* Stats */}
                            {/* <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400 text-xs">
                              {day.upChecks} of {day.totalChecks} checks passed ({day.uptimePercent.toFixed(1)}%)
                            </div> */}
                          </>
                        )}
                      </>
                    ) : (
                      // No data for this day
                      <>
                        <div className="font-bold text-sm mb-2">
                          {formatDate(day.date)}
                        </div>
                        <div className="text-gray-400">
                          No monitoring data available
                        </div>
                      </>
                    )}
                    
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px]">
                      <div className="border-[6px] border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 h-8 bg-gray-200 rounded-sm"></div>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">Today</span>
    </div>
  );
}
