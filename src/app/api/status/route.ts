import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/status
 * Get overall status of all services with optimized daily aggregation
 * Query params:
 * - endDate: ISO date string (defaults to today)
 * - days: number of days to fetch (defaults to 90)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endDateParam = searchParams.get("endDate");
    const daysParam = searchParams.get("days");
    
    const days = daysParam ? parseInt(daysParam) : 90;
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all endpoints
    const endpoints = await prisma.endpoints.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
      },
    });

    // Get aggregated daily data for all endpoints
    const services = await Promise.all(
      endpoints.map(async (endpoint) => {
        // Get latest check for current status
        const latestCheck = await prisma.checks.findFirst({
          where: { endpoint_id: endpoint.id },
          orderBy: { checked_at: "desc" },
          select: {
            status: true,
            checked_at: true,
          },
        });

        // Get aggregated daily data - GROUP BY date
        const dailyStats = await prisma.$queryRaw<
          Array<{
            date: Date;
            total_checks: bigint;
            up_checks: bigint;
            down_checks: bigint;
            avg_response_time: number | null;
            first_error: string | null;
          }>
        >`
          WITH daily_aggregates AS (
            SELECT 
              DATE(checked_at) as date,
              COUNT(*) as total_checks,
              COUNT(*) FILTER (WHERE status = 'UP') as up_checks,
              COUNT(*) FILTER (WHERE status = 'DOWN') as down_checks,
              AVG(response_time) FILTER (WHERE response_time IS NOT NULL) as avg_response_time
            FROM checks
            WHERE endpoint_id = ${endpoint.id}::uuid
              AND checked_at >= ${startDate}
              AND checked_at <= ${endDate}
            GROUP BY DATE(checked_at)
          ),
          first_errors AS (
            SELECT DISTINCT ON (DATE(checked_at))
              DATE(checked_at) as date,
              error_message as first_error
            FROM checks
            WHERE endpoint_id = ${endpoint.id}::uuid
              AND checked_at >= ${startDate}
              AND checked_at <= ${endDate}
              AND status = 'DOWN'
              AND error_message IS NOT NULL
            ORDER BY DATE(checked_at), checked_at ASC
          )
          SELECT 
            da.date,
            da.total_checks,
            da.up_checks,
            da.down_checks,
            da.avg_response_time,
            fe.first_error
          FROM daily_aggregates da
          LEFT JOIN first_errors fe ON da.date = fe.date
          ORDER BY da.date DESC
        `;

        // Calculate overall uptime for the period
        const totalChecks = dailyStats.reduce(
          (sum, day) => sum + Number(day.total_checks),
          0
        );
        const totalUpChecks = dailyStats.reduce(
          (sum, day) => sum + Number(day.up_checks),
          0
        );
        const uptime = totalChecks > 0 
          ? ((totalUpChecks / totalChecks) * 100).toFixed(1)
          : "0.0";

        // Calculate average response time
        const responseTimesAvg = dailyStats
          .filter((d) => d.avg_response_time !== null)
          .map((d) => d.avg_response_time as number);
        const averageResponseTime =
          responseTimesAvg.length > 0
            ? Math.round(
                responseTimesAvg.reduce((a, b) => a + b, 0) / responseTimesAvg.length
              )
            : null;

        // Format daily data for frontend
        const dailyData = dailyStats.map((day) => ({
          date: day.date.toISOString().split('T')[0],
          totalChecks: Number(day.total_checks),
          upChecks: Number(day.up_checks),
          downChecks: Number(day.down_checks),
          uptimePercent: Number(day.total_checks) > 0
            ? ((Number(day.up_checks) / Number(day.total_checks)) * 100)
            : 0,
          errorMessage: day.first_error,
        }));

        return {
          id: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
          type: endpoint.type,
          currentStatus: latestCheck?.status || "UNKNOWN",
          uptime,
          averageResponseTime,
          lastChecked: latestCheck?.checked_at || null,
          dailyData, // Optimized daily aggregated data
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        };
      })
    );

    const allOperational = services.every((s) => s.currentStatus === "UP");

    return NextResponse.json({
      allOperational,
      services,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days,
      },
    });
  } catch (error: any) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
