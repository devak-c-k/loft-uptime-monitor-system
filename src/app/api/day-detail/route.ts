import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/day-detail
 * Get detailed hourly data for a specific day
 * Query params:
 * - endpointId: UUID of the endpoint
 * - date: ISO date string (YYYY-MM-DD)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get("endpointId");
    const dateParam = searchParams.get("date");
    
    if (!endpointId || !dateParam) {
      return NextResponse.json(
        { error: "endpointId and date are required" },
        { status: 400 }
      );
    }

    const targetDate = new Date(dateParam);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get endpoint details
    const endpoint = await prisma.endpoints.findUnique({
      where: { id: endpointId },
      select: { name: true, url: true },
    });

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      );
    }

    // Get all checks for this day
    const checks = await prisma.checks.findMany({
      where: {
        endpoint_id: endpointId,
        checked_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        checked_at: "asc",
      },
      select: {
        status: true,
        response_time: true,
        checked_at: true,
        error_message: true,
      },
    });

    if (checks.length === 0) {
      return NextResponse.json({
        hasData: false,
        message: "No monitoring data available for this day",
      });
    }

    // Calculate statistics
    const upChecks = checks.filter(c => c.status === "UP").length;
    const downChecks = checks.filter(c => c.status === "DOWN").length;
    const uptimePercent = ((upChecks / checks.length) * 100).toFixed(2);
    
    const responseTimes = checks
      .filter(c => c.response_time !== null)
      .map(c => c.response_time as number);
    
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    const maxResponseTime = responseTimes.length > 0 
      ? Math.max(...responseTimes) 
      : 0;
    
    const minResponseTime = responseTimes.length > 0 
      ? Math.min(...responseTimes) 
      : 0;

    // Group by hour for hourly chart
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(startOfDay);
      hourEnd.setHours(hour, 59, 59, 999);

      const hourChecks = checks.filter(c => {
        const checkTime = new Date(c.checked_at);
        return checkTime >= hourStart && checkTime <= hourEnd;
      });

      const hourUp = hourChecks.filter(c => c.status === "UP").length;
      const hourDown = hourChecks.filter(c => c.status === "DOWN").length;
      const hourResponseTimes = hourChecks
        .filter(c => c.response_time !== null)
        .map(c => c.response_time as number);
      
      const hourAvgResponseTime = hourResponseTimes.length > 0
        ? Math.round(hourResponseTimes.reduce((a, b) => a + b, 0) / hourResponseTimes.length)
        : null;

      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        totalChecks: hourChecks.length,
        upChecks: hourUp,
        downChecks: hourDown,
        uptimePercent: hourChecks.length > 0 
          ? ((hourUp / hourChecks.length) * 100) 
          : null,
        avgResponseTime: hourAvgResponseTime,
      };
    }).filter(h => h.totalChecks > 0); // Only return hours with data

    // Get incidents (downtime periods)
    const incidents = checks
      .filter(c => c.status === "DOWN")
      .map(c => ({
        time: new Date(c.checked_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        error: c.error_message || "Service unavailable",
        timestamp: c.checked_at,
      }));

    // Format checks for timeline
    const timelineData = checks.map(c => ({
      time: new Date(c.checked_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      }),
      status: c.status,
      responseTime: c.response_time,
      timestamp: c.checked_at,
    }));

    return NextResponse.json({
      hasData: true,
      endpoint: {
        name: endpoint.name,
        url: endpoint.url,
      },
      date: targetDate.toISOString().split('T')[0],
      dateFormatted: targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      summary: {
        totalChecks: checks.length,
        upChecks,
        downChecks,
        uptimePercent,
        avgResponseTime,
        maxResponseTime,
        minResponseTime,
        firstCheck: checks[0].checked_at,
        lastCheck: checks[checks.length - 1].checked_at,
      },
      hourlyData,
      incidents,
      timelineData,
    });
  } catch (error: any) {
    console.error("Error fetching day detail:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
