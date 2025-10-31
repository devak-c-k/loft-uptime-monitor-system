"use client";

import { useEffect, useState, useRef } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { dayDetailService, DayDetailData } from "@/services/dayDetailService";
import { formatTimeInTimezone, formatChartHour, getHourInTimezone } from "@/lib/timezone";

interface DayDetailPanelProps {
    endpointId: string;
    endpointName: string;
    date: string;
    onClose: () => void;
}

const chartConfig = {
    responseTime: {
        label: "Response Time",
        color: "#10B981",
    },
} satisfies ChartConfig;

export default function DayDetailPanel({
    endpointId,
    endpointName,
    date,
    onClose,
}: DayDetailPanelProps) {
    const timezone = "Asia/Kolkata"; // Fixed to IST
    const [data, setData] = useState<DayDetailData>({
        hasData: false,
    });
    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);
    const lastFetchKey = useRef<string>("");

    useEffect(() => {
        const fetchKey = `${endpointId}-${date}`;
        
        // Only fetch if we haven't fetched this exact data yet
        if (fetchedRef.current && lastFetchKey.current === fetchKey) {
            return;
        }

        const fetchDayDetail = async () => {
            try {
                setLoading(true);
                lastFetchKey.current = fetchKey;
                const result = await dayDetailService.getDayDetail(endpointId, date);
                setData(result);
                fetchedRef.current = true;
            } catch (error: any) {
                // Ignore abort errors
                if (error.code !== 'ERR_CANCELED') {
                    console.error("Failed to fetch day detail:", error);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDayDetail();
    }, [endpointId, date]);

    if (loading) {
        return (
            <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 z-50 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!data.hasData) {
        return (
            <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">No Data</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-gray-500">{data.message || "No data available for this day."}</p>
                </div>
            </div>
        );
    }

    // Transform hourly data for Recharts with timezone conversion
    // Ensure all 24 hours (0-23) are represented, PLUS hour 24 (end of day marker)
    const allHours = Array.from({ length: 25 }, (_, i) => i); // 0 to 24
    
    const chartData = allHours.map((hour) => {
        // Hour 24 represents end of day (00:00 next day) - same as hour 23 data
        const dataHour = hour === 24 ? 23 : hour;
        
        // Find matching data from API for this hour
        const hourData = data.hourlyData?.find(h => h.hour === dataHour);
        
        if (hourData && hour < 24) {
            const utcHourISO = hourData.hourISO;
            const utcDate = new Date(utcHourISO);
            const tzLabel = formatTimeInTimezone(utcDate, timezone, 'time');
            
            return {
                hour: hour,
                label: tzLabel,
                responseTime: hourData.avgResponseTime || 0,
                uptime: hourData.uptimePercent || 0,
                incidents: hourData.downChecks || 0,
            };
        } else if (hour === 24) {
            // End of day marker (24:00 = 00:00 next day)
            return {
                hour: 24,
                label: '24:00',
                responseTime: hourData?.avgResponseTime || 0,
                uptime: hourData?.uptimePercent || 100,
                incidents: 0,
            };
        } else {
            // No data for this hour - show empty
            const hourStr = String(hour).padStart(2, '0');
            return {
                hour: hour,
                label: `${hourStr}:00`,
                responseTime: 0,
                uptime: 100,
                incidents: 0,
            };
        }
    });

    const maxResponseTime = Math.max(
        ...(data.hourlyData?.map(h => h.avgResponseTime || 0) || [0]),
        100 // Minimum scale
    );

    return (
        <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{endpointName}</h2>
                        <p className="text-xs text-gray-500">{data.endpoint?.url}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-2"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Timezone Indicator (IST Only) */}
                <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-700">India Standard Time (IST)</span>
                    </div>
                    <span className="text-xs text-gray-400">UTC+5:30</span>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="text-xs text-gray-400">
                        {data.dateFormatted}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit ${
                        (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) === 100)
                            ? 'bg-green-50'
                            : (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) >= 95)
                            ? 'bg-yellow-50'
                            : 'bg-red-50'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) === 100)
                                ? 'bg-green-500'
                                : (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) >= 95)
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}></span>
                        <span className={`text-xs font-medium ${
                            (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) === 100)
                                ? 'text-green-700'
                                : (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) >= 95)
                                ? 'text-yellow-700'
                                : 'text-red-700'
                        }`}>
                            {(data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) === 100)
                                ? 'Site was up all day'
                                : (data.summary?.uptimePercent && parseFloat(data.summary.uptimePercent) >= 95)
                                ? `Site had ${data.summary?.downChecks} incident${data.summary?.downChecks !== 1 ? 's' : ''}`
                                : `Site experienced ${data.summary?.downChecks} downtime${data.summary?.downChecks !== 1 ? 's' : ''}`
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Status Header */}
                <div className="mb-6">
                    <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-xs font-medium text-gray-500">Response Time</h3>
                        <div className="text-xs text-gray-400">
                            Last 24 hours
                        </div>
                    </div>
                </div>

                {/* Response Time Chart using Recharts */}
                <div className="mb-6">
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="fillResponseTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-responseTime)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-responseTime)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={true}
                                tickMargin={8}
                                minTickGap={20}
                                tick={{ fontSize: 11 }}
                                domain={['dataMin', 'dataMax']}
                                ticks={['00:00', '06:00', '12:00', '18:00', '24:00']}
                                tickFormatter={(value) => {
                                    // Show key hours including end of day
                                    return value;
                                }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => `${value}ms`}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        indicator="dot"
                                        labelFormatter={(value) => `Time: ${value}`}
                                        formatter={(value, name, item) => (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">Response Time</span>
                                                    <span className="font-mono font-medium">{value}ms</span>
                                                </div>
                                                {item.payload.incidents > 0 && (
                                                    <div className="text-xs text-red-500">
                                                        {item.payload.incidents} incident{item.payload.incidents > 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Area
                                dataKey="responseTime"
                                type="monotone"
                                fill="url(#fillResponseTime)"
                                stroke="var(--color-responseTime)"
                                strokeWidth={2}
                                dot={(props: any) => {
                                    const { cx, cy, payload, index } = props;
                                    const isDown = payload.incidents > 0;

                                    return (
                                        <circle
                                            key={`dot-${index}-${payload.hour}`}
                                            cx={cx}
                                            cy={cy}
                                            r={3}
                                            fill={isDown ? "#EF4444" : "#10B981"}
                                            stroke="white"
                                            strokeWidth={2}
                                        />
                                    );
                                }}
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>

            
                {/* Incidents Section */}
                <div className="border-t border-gray-200 pt-6">
                    {data.incidents && data.incidents.length > 0 ? (
                        <>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                All Incidents ({data.incidents.length})
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {data.incidents.map((incident, index) => {
                                    const incidentTime = formatTimeInTimezone(
                                        new Date(incident.timestamp),
                                        timezone,
                                        'datetime'
                                    );
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0">
                                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold">{index + 1}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-xs font-semibold text-red-900">
                                                            {incidentTime}
                                                        </span>
                                                    </div>
                                                   
                                                </div>
                                                <div className="text-xs text-red-800 break-words leading-relaxed mb-1">
                                                    {incident.error || "Service unavailable"}
                                                </div>
                                                {incident.responseTime && (
                                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        Response: {incident.responseTime}ms
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {data.incidents.length > 10 && (
                                <div className="mt-3 text-xs text-gray-500 text-center">
                                    Showing all {data.incidents.length} incidents
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 px-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                No Incidents Reported
                            </h3>
                            <p className="text-xs text-gray-500 text-center">
                                The site was operational throughout the entire day with no downtime events.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>  
    );
}
