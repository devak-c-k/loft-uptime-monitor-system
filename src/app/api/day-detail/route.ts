import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/day-detail
 * Get detailed hourly data for a specific day in IST timezone
 * Query params:
 * - endpointId: UUID of the endpoint
 * - date: ISO date string (YYYY-MM-DD) - interpreted as IST date
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

    // Parse date as IST and convert to UTC for database query
    // Example: User selects "2025-10-12" (meaning Oct 12 in IST)
    // IST = UTC+5:30, so:
    //   Oct 12 00:00 IST = Oct 11 18:30 UTC
    //   Oct 12 23:59 IST = Oct 12 18:29 UTC
    
    const [year, month, day] = dateParam.split('-').map(Number);
    
    // Create UTC midnight for the given date
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    // IST is UTC+5:30 (5 hours 30 minutes = 330 minutes = 19800000 milliseconds)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19800000 ms
    
    // To get IST midnight in UTC, we subtract the offset
    // IST 00:00 = UTC 18:30 (previous day)
    const startOfDay = new Date(utcMidnight.getTime() - IST_OFFSET_MS);
    const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1); // +24 hours - 1ms

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
        http_code: true,
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

    // Group by hour for hourly chart (IST-based buckets, 00:00 to 23:00 IST)
    // Each hour bucket represents one hour in IST timezone
    const hourlyData = Array.from({ length: 24 }, (_, istHour) => {
      // Calculate the UTC time range for this IST hour
      // Example: IST hour 0 (00:00-01:00) = UTC hour 18:30-19:30 (previous day)
      const istHourStart = new Date(startOfDay.getTime() + (istHour * 60 * 60 * 1000));
      const istHourEnd = new Date(istHourStart.getTime() + (60 * 60 * 1000) - 1);

      const hourChecks = checks.filter(c => {
        const checkTime = new Date(c.checked_at);
        return checkTime >= istHourStart && checkTime <= istHourEnd;
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
        hour: istHour, // IST hour (0-23), represents 00:00, 01:00, ... 23:00 IST
        hourISO: istHourStart.toISOString(), // UTC timestamp for this IST hour bucket start
        totalChecks: hourChecks.length,
        upChecks: hourUp,
        downChecks: hourDown,
        uptimePercent: hourChecks.length > 0 
          ? ((hourUp / hourChecks.length) * 100) 
          : null,
        avgResponseTime: hourAvgResponseTime,
      };
    }).filter(h => h.totalChecks > 0); // Only return hours with data

    // Get incidents (downtime periods) - send raw timestamps with status codes and duration
    const downtimeChecks = checks.filter(c => c.status === "DOWN");
    
    const incidents = downtimeChecks.map((c, index) => {
      let errorMessage = c.error_message || "Service unavailable";
      
      // Only prepend status code if it's not already in the error message
      if (c.http_code && !errorMessage.startsWith("HTTP")) {
        errorMessage = `HTTP ${c.http_code}: ${errorMessage}`;
      }
      
      // Calculate duration until recovery (next UP check or end of checks)
      const currentCheckTime = new Date(c.checked_at).getTime();
      const nextUpCheck = checks.find((check, idx) => 
        idx > checks.indexOf(c) && check.status === "UP"
      );
      
      let durationMs = null;
      let durationFormatted = null;
      
      if (nextUpCheck) {
        const nextUpTime = new Date(nextUpCheck.checked_at).getTime();
        durationMs = nextUpTime - currentCheckTime;
        
        // Format duration
        const totalSeconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        if (minutes > 0) {
          durationFormatted = `${minutes}m ${seconds}s`;
        } else {
          durationFormatted = `${seconds}s`;
        }
      } else {
        // Check if this is the last check or still down
        const lastCheck = checks[checks.length - 1];
        if (c.checked_at === lastCheck.checked_at) {
          durationFormatted = "Ongoing";
        } else {
          durationFormatted = "~1m";
        }
      }
      
      return {
        timestamp: c.checked_at, // Send UTC timestamp, format in frontend
        error: errorMessage,
        httpCode: c.http_code,
        responseTime: c.response_time, // Response time of the failed check
        durationMs,
        duration: durationFormatted,
      };
    });

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
      date: dateParam, // Already in YYYY-MM-DD format
      dateFormatted: startOfDay.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC', // Format in UTC to match the data
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
