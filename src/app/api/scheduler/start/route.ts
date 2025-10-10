import { NextResponse } from "next/server";
import { startMonitoringScheduler } from "@/lib/scheduler";

/**
 * GET /api/scheduler/start
 * Start the monitoring scheduler
 */
export async function GET() {
  try {
    startMonitoringScheduler();
    return NextResponse.json({ 
      success: true,
      message: "Monitoring scheduler started"
    });
  } catch (error: any) {
    console.error("Error starting scheduler:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
