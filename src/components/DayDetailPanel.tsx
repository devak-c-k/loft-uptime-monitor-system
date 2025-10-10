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

    // Transform hourly data for Recharts
    const chartData = data.hourlyData?.map((hour) => ({
        hour: hour.hour,
        responseTime: hour.avgResponseTime || 0,
        uptime: hour.uptimePercent || 0,
        incidents: hour.downChecks,
    })) || [];

    const maxResponseTime = Math.max(
        ...(data.hourlyData?.map(h => h.avgResponseTime || 0) || [0]),
        100 // Minimum scale
    );

    return (
        <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{endpointName}</h2>
                        <p className="text-xs text-gray-500 mb-3">{data.endpoint?.url}</p>
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
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-4"
                        title="Close panel"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
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
                                dataKey="hour"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => {
                                    // Show every 1 hours
                                    const hour = parseInt(value.split(':')[0]);
                                    if (hour % 1 === 0) return value;
                                    return '';
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
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Incidents ({data.incidents.length})
                            </h3>
                            <div className="space-y-3">
                                {data.incidents.slice(0, 5).map((incident, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg"
                                    >
                                        <span className="text-red-500 mt-0.5">⚠</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-red-900 mb-1">
                                                {incident.time}
                                            </div>
                                            <div className="text-xs text-red-700 truncate">{incident.error}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
