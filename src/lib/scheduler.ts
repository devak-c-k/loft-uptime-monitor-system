import cron, { ScheduledTask } from "node-cron";
import { prisma } from "./prisma";
import { checkServiceStatus } from "./monitoring";

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
        
        if (result.status === "DOWN") {
          console.warn(`⚠️ Service DOWN: ${endpoint.name} (${endpoint.url})`);
          // You can add alert logic here (email, SMS, etc.)
        } else {
          console.log(`✓ ${endpoint.name}: ${result.status} (${result.responseTime}ms)`);
        }
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
