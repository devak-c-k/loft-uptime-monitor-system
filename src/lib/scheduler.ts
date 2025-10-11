import cron, { ScheduledTask } from "node-cron";
import { prisma } from "./prisma";
import { checkServiceStatus } from "./monitoring";
import { sendSlackAlert, formatDowntimeAlert, formatRecoveryAlert } from "./slack";
import { CheckStatus } from "../generated/prisma";

// Track downtime for each endpoint
interface DowntimeTracker {
  consecutiveFailures: number;
  firstFailureTime: Date | null;
  alertSent: boolean;
  lastStatus: CheckStatus | null;
}

const downtimeTrackers = new Map<string, DowntimeTracker>();

// Constants
const ALERT_THRESHOLD_CHECKS = 4; // 4 failures = 2 minutes (30 seconds * 4)
const CHECK_INTERVAL_SECONDS = 30;

// Global singleton to ensure only ONE scheduler instance across all server instances
const SCHEDULER_KEY = Symbol.for("app.monitoring.scheduler");
const globalForScheduler = global as typeof global & {
  [SCHEDULER_KEY]: {
    isRunning: boolean;
    task: ScheduledTask | null;
  };
};

if (!globalForScheduler[SCHEDULER_KEY]) {
  globalForScheduler[SCHEDULER_KEY] = {
    isRunning: false,
    task: null,
  };
}

const schedulerState = globalForScheduler[SCHEDULER_KEY];

/**
 * Start the monitoring scheduler that checks all endpoints periodically
 * Runs automatically on server startup and continues 24/7
 * Uses global singleton to prevent multiple instances
 */
export function startMonitoringScheduler() {
  if (schedulerState.isRunning) {
    console.log("✓ Scheduler is already running (singleton check)");
    return;
  }

  console.log("🚀 Starting monitoring scheduler...");

  // Run every 30 seconds
  schedulerState.task = cron.schedule("*/30 * * * * *", async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Running scheduled health checks...`);
    
    try {
      const endpoints = await prisma.endpoints.findMany();

      if (endpoints.length === 0) {
        console.log("No endpoints to monitor");
        return;
      }
      
      for (const endpoint of endpoints) {
        const result = await checkServiceStatus(endpoint.url);
        
        await prisma.checks.create({
          data: {
            endpoint_id: endpoint.id,
            status: result.status,
            http_code: result.httpCode,
            response_time: result.responseTime,
            error_message: result.errorMessage,
          },
        });
        
        // Get or initialize downtime tracker for this endpoint
        if (!downtimeTrackers.has(endpoint.id)) {
          downtimeTrackers.set(endpoint.id, {
            consecutiveFailures: 0,
            firstFailureTime: null,
            alertSent: false,
            lastStatus: null,
          });
        }
        
        const tracker = downtimeTrackers.get(endpoint.id)!;
        
        if (result.status === CheckStatus.DOWN) {
          tracker.consecutiveFailures++;
          
          // Record first failure time
          if (tracker.consecutiveFailures === 1) {
            tracker.firstFailureTime = new Date();
          }
          
          console.warn(`⚠️ Service DOWN: ${endpoint.name} (${endpoint.url}) - Failure ${tracker.consecutiveFailures}/${ALERT_THRESHOLD_CHECKS}`);
          
          // Send Slack alert if threshold reached and not already sent
          if (tracker.consecutiveFailures >= ALERT_THRESHOLD_CHECKS && !tracker.alertSent) {
            const downtimeMinutes = Math.round((tracker.consecutiveFailures * CHECK_INTERVAL_SECONDS) / 60);
            const alertMessage = formatDowntimeAlert(
              endpoint.name,
              endpoint.url,
              downtimeMinutes,
              tracker.firstFailureTime!,
              result.httpCode || undefined,
              result.errorMessage || undefined
            );
            
            await sendSlackAlert(alertMessage);
            tracker.alertSent = true;
            console.error(`🚨 SLACK ALERT SENT: ${endpoint.name} down for ${downtimeMinutes} minutes`);
          }
        } else {
          // Service is UP
          console.log(`✓ ${endpoint.name}: ${result.status} (${result.responseTime}ms)`);
          
          // If service recovered after being down, send recovery alert
          if (tracker.lastStatus === CheckStatus.DOWN && tracker.alertSent) {
            const downtimeDuration = Math.round((tracker.consecutiveFailures * CHECK_INTERVAL_SECONDS) / 60);
            const recoveryMessage = formatRecoveryAlert(
              endpoint.name,
              endpoint.url,
              downtimeDuration
            );
            
            await sendSlackAlert(recoveryMessage);
            console.log(`✅ RECOVERY ALERT SENT: ${endpoint.name} back online after ${downtimeDuration} minutes`);
          }
          
          // Reset tracker
          tracker.consecutiveFailures = 0;
          tracker.firstFailureTime = null;
          tracker.alertSent = false;
        }
        
        tracker.lastStatus = result.status;
      }
      
      console.log(`✅ Health check complete: ${endpoints.length} endpoints checked`);
    } catch (error) {
      console.error("❌ Error in scheduler:", error);
    }
  });

  schedulerState.isRunning = true;
  console.log("✅ Monitoring scheduler started successfully!");
  console.log("📊 Checking all endpoints every 30 seconds...");
  console.log("🔄 Scheduler will run continuously until server stops");
}

/**
 * Stop the monitoring scheduler (useful for graceful shutdown)
 */
export function stopMonitoringScheduler() {
  if (schedulerState.task) {
    schedulerState.task.stop();
    schedulerState.task = null;
    schedulerState.isRunning = false;
    console.log("⏹️ Monitoring scheduler stopped");
  }
}
