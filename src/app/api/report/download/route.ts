import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

/**
 * GET /api/report/download
 * Generate and download an Excel report for uptime monitoring data
 * Query params:
 * - startDate: ISO date string (YYYY-MM-DD)
 * - endDate: ISO date string (YYYY-MM-DD)
 * - endpointId: Optional - specific endpoint ID (omit for all endpoints)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const endpointId = searchParams.get("endpointId");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

    // Fetch endpoints
    const endpoints = await prisma.endpoints.findMany({
      where: endpointId ? { id: endpointId } : undefined,
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
      },
      orderBy: { name: "asc" },
    });

    if (endpoints.length === 0) {
      return NextResponse.json(
        { error: "No endpoints found" },
        { status: 404 }
      );
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Loft Uptime Monitor";
    workbook.created = new Date();

    // Main Report sheet with day-by-day data
    const reportSheet = workbook.addWorksheet("Daily Report");
    
    // Add title
    reportSheet.mergeCells("A1:F1");
    const titleCell = reportSheet.getCell("A1");
    titleCell.value = "Uptime Monitoring - Daily Report";
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    
    // Add date range
    reportSheet.mergeCells("A2:F2");
    const dateRangeCell = reportSheet.getCell("A2");
    dateRangeCell.value = `Period: ${startDateParam} to ${endDateParam}`;
    dateRangeCell.font = { size: 12, bold: true };
    dateRangeCell.alignment = { horizontal: "center" };
    
    reportSheet.getRow(3).values = [];
    
    // Headers for day-by-day report
    reportSheet.getRow(4).values = [
      "Endpoint",
      "Date",
      "Uptime %",
      "Total Checks",
      "Failed Checks",
      "Error Message",
      "Status Code",
    ];
    reportSheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
    reportSheet.getRow(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" },
    };
    reportSheet.getRow(4).alignment = { horizontal: "center", vertical: "middle" };

    let currentRow = 5;
    let overallTotalChecks = 0;
    let overallUpChecks = 0;
    let overallDownChecks = 0;

    // Fetch data for each endpoint and generate day-by-day report
    for (const endpoint of endpoints) {
      // Get daily aggregated data
      const dailyStats = await prisma.$queryRaw<
        Array<{
          date: Date;
          total_checks: bigint;
          up_checks: bigint;
          down_checks: bigint;
          first_error: string | null;
          first_http_code: number | null;
        }>
      >`
        WITH daily_aggregates AS (
          SELECT 
            DATE(checked_at) as date,
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE status = 'UP') as up_checks,
            COUNT(*) FILTER (WHERE status = 'DOWN') as down_checks
          FROM checks
          WHERE endpoint_id = ${endpoint.id}::uuid
            AND checked_at >= ${startDate}
            AND checked_at <= ${endDate}
          GROUP BY DATE(checked_at)
        ),
        first_errors AS (
          SELECT DISTINCT ON (DATE(checked_at))
            DATE(checked_at) as date,
            error_message as first_error,
            http_code as first_http_code
          FROM checks
          WHERE endpoint_id = ${endpoint.id}::uuid
            AND checked_at >= ${startDate}
            AND checked_at <= ${endDate}
            AND status = 'DOWN'
          ORDER BY DATE(checked_at), checked_at ASC
        )
        SELECT 
          da.date,
          da.total_checks,
          da.up_checks,
          da.down_checks,
          fe.first_error,
          fe.first_http_code
        FROM daily_aggregates da
        LEFT JOIN first_errors fe ON da.date = fe.date
        ORDER BY da.date ASC
      `;

      // Add each day as a row
      for (const day of dailyStats) {
        const totalChecks = Number(day.total_checks);
        const upChecks = Number(day.up_checks);
        const downChecks = Number(day.down_checks);
        const uptimePercent = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(2) : "0.00";
        
        // Format date
        const dateStr = new Date(day.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        });

        // Format error message with status code if available
        let errorMessage = day.first_error || (downChecks > 0 ? "Service unavailable" : "-");
        if (errorMessage !== "-" && day.first_http_code && !errorMessage.startsWith("HTTP")) {
          errorMessage = `HTTP ${day.first_http_code}: ${errorMessage}`;
        }

        const row = reportSheet.getRow(currentRow);
        row.values = [
          endpoint.name,
          dateStr,
          `${uptimePercent}%`,
          totalChecks,
          downChecks,
          errorMessage,
          day.first_http_code || "-",
        ];

        // Color code based on uptime
        if (parseFloat(uptimePercent) === 100) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE8F5E9" }, // Light green
          };
        } else if (parseFloat(uptimePercent) >= 95) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF4E6" }, // Light orange
          };
        } else {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFDE8E8" }, // Light red
          };
        }

        // Update overall stats
        overallTotalChecks += totalChecks;
        overallUpChecks += upChecks;
        overallDownChecks += downChecks;

        currentRow++;
      }
    }

    // Add overall summary at the bottom
    currentRow += 2; // Add some spacing
    
    reportSheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const summaryTitleCell = reportSheet.getCell(`A${currentRow}`);
    summaryTitleCell.value = "OVERALL SUMMARY";
    summaryTitleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    summaryTitleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" },
    };
    summaryTitleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    const overallUptimePercent = overallTotalChecks > 0 
      ? ((overallUpChecks / overallTotalChecks) * 100).toFixed(2)
      : "0.00";

    reportSheet.getRow(currentRow).values = ["Total Checks:", overallTotalChecks];
    reportSheet.getRow(currentRow).font = { bold: true };
    currentRow++;

    reportSheet.getRow(currentRow).values = ["Successful Checks:", overallUpChecks];
    reportSheet.getRow(currentRow).font = { bold: true };
    reportSheet.getCell(`B${currentRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F5E9" },
    };
    currentRow++;

    reportSheet.getRow(currentRow).values = ["Failed Checks:", overallDownChecks];
    reportSheet.getRow(currentRow).font = { bold: true };
    reportSheet.getCell(`B${currentRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFDE8E8" },
    };
    currentRow++;

    reportSheet.getRow(currentRow).values = ["Overall Uptime:", `${overallUptimePercent}%`];
    reportSheet.getRow(currentRow).font = { bold: true, size: 12 };
    reportSheet.getCell(`B${currentRow}`).font = { bold: true, size: 12, color: { argb: "FF2E75B6" } };

    // Auto-fit columns for main report
    reportSheet.columns = [
      { width: 30 }, // Endpoint
      { width: 15 }, // Date
      { width: 12 }, // Uptime
      { width: 15 }, // Total Checks
      { width: 15 }, // Failed Checks
      { width: 50 }, // Error Message
      { width: 15 }, // Status Code
    ];

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="uptime-report-${startDateParam}-to-${endDateParam}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}

