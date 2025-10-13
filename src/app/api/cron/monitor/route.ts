import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { prisma } from "@/lib/prisma";
import { checkServiceStatus } from "@/lib/monitoring";
import { sendSlackAlert, formatDowntimeAlert, formatRecoveryAlert } from "@/lib/slack";
import { CheckStatus } from "@/generated/prisma";

// Runtime configuration
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max execution time

// Track downtime for each endpoint
interface DowntimeTracker {
  consecutiveFailures: number;
  firstFailureTime: Date | null;
  alertSent: boolean;
  lastStatus: CheckStatus | null;
}

// In-memory downtime tracker (persists across invocations in same instance)
const downtimeTrackers = new Map<string, DowntimeTracker>();

// Constants
const ALERT_THRESHOLD_CHECKS = 3; // 3 consecutive failures = send alert (3 minutes)

/**
 * GET /api/cron/monitor
 * 
 * This endpoint can be triggered by external cron services (cron-job.org, etc.)
 * or called directly for testing purposes.
 * 
 * Security: Requires CRON_SECRET in Authorization header
 * 
 * @example
 * curl -X GET https://your-domain.vercel.app/api/cron/monitor \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 🔐 SECURITY: Verify the secret key
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("❌ CRON_SECRET not configured in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check for Bearer token or direct secret
    const providedSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (providedSecret !== expectedSecret) {
      console.warn("⚠️ Unauthorized cron trigger attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`\n🔄 [CRON] Starting monitoring cycle at ${new Date().toISOString()}`);

    // Fetch all active endpoints from database
    const endpoints = await prisma.endpoints.findMany({
      orderBy: { name: "asc" },
    });

    if (endpoints.length === 0) {
      console.log("ℹ️ No endpoints configured for monitoring");
      return NextResponse.json({
        success: true,
        message: "No endpoints to monitor",
        checked: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📊 Found ${endpoints.length} endpoint(s) to check`);

    // Check all endpoints
    const results = [];
    let upCount = 0;
    let downCount = 0;

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Checking: ${endpoint.name} (${endpoint.url})`);
      
      // Perform health check
      const result = await checkServiceStatus(endpoint.url);
      
      // Save check result to database
      await prisma.checks.create({
        data: {
          endpoint_id: endpoint.id,
          status: result.status,
          http_code: result.httpCode,
          response_time: result.responseTime,
          error_message: result.errorMessage,
        },
      });

      // Update endpoint counts
      if (result.status === CheckStatus.UP) {
        upCount++;
        console.log(`✅ UP - ${result.responseTime}ms - HTTP ${result.httpCode}`);
      } else {
        downCount++;
        console.log(`❌ DOWN - ${result.errorMessage}`);
      }

      // Initialize downtime tracker if needed
      if (!downtimeTrackers.has(endpoint.id)) {
        downtimeTrackers.set(endpoint.id, {
          consecutiveFailures: 0,
          firstFailureTime: null,
          alertSent: false,
          lastStatus: null,
        });
      }

      const tracker = downtimeTrackers.get(endpoint.id)!;

      // Handle downtime tracking and alerts
      if (result.status === CheckStatus.DOWN) {
        tracker.consecutiveFailures++;

        // Record first failure time
        if (tracker.consecutiveFailures === 1) {
          tracker.firstFailureTime = new Date();
        }

        console.log(`⚠️ Consecutive failures: ${tracker.consecutiveFailures}/${ALERT_THRESHOLD_CHECKS}`);

        // Send Slack alert if threshold reached and not already sent
        if (tracker.consecutiveFailures >= ALERT_THRESHOLD_CHECKS && !tracker.alertSent) {
          console.log(`🚨 Sending downtime alert for ${endpoint.name}`);
          
          const downtimeDuration = tracker.firstFailureTime
            ? Math.round((Date.now() - tracker.firstFailureTime.getTime()) / 1000 / 60)
            : tracker.consecutiveFailures;

          const alertMessage = formatDowntimeAlert(
            endpoint.name,
            endpoint.url,
            downtimeDuration,
            tracker.firstFailureTime!,
            result.httpCode || undefined,
            result.errorMessage || "Service unreachable"
          );

          await sendSlackAlert(alertMessage);
          tracker.alertSent = true;
        }
      } else {
        // Service is UP
        // Send recovery alert if it was previously down
        if (tracker.lastStatus === CheckStatus.DOWN && tracker.alertSent) {
          console.log(`✅ Sending recovery alert for ${endpoint.name}`);
          
          const downtimeDuration = tracker.firstFailureTime
            ? Math.round((Date.now() - tracker.firstFailureTime.getTime()) / 1000 / 60)
            : tracker.consecutiveFailures;

          const recoveryMessage = formatRecoveryAlert(
            endpoint.name,
            endpoint.url,
            downtimeDuration
          );

          await sendSlackAlert(recoveryMessage);
        }

        // Reset tracker
        tracker.consecutiveFailures = 0;
        tracker.firstFailureTime = null;
        tracker.alertSent = false;
      }

      // Update last status
      tracker.lastStatus = result.status;

      results.push({
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        status: result.status,
        responseTime: result.responseTime,
        httpCode: result.httpCode,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ [CRON] Completed monitoring cycle in ${duration}ms`);
    console.log(`📈 Summary: ${upCount} UP, ${downCount} DOWN\n`);

    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: endpoints.length,
        up: upCount,
        down: downCount,
      },
      results,
      duration,
    });

  } catch (error: any) {
    console.error("❌ [CRON] Error during monitoring cycle:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/monitor
 * 
 * This endpoint is triggered by QStash (Upstash) every 60 seconds to check all endpoints.
 * QStash automatically verifies the signature using the signing keys.
 * 
 * Security: QStash signature verification via verifySignatureAppRouter
 * 
 * @example
 * QStash will automatically send:
 * POST https://your-domain.vercel.app/api/cron/monitor
 * Headers: Upstash-Signature, Upstash-Timestamp, etc.
 */
async function handler(request: NextRequest) {
  // Call the same logic as GET
  return GET(request);
}

// Wrap POST handler with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
