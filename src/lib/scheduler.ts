import cron from "node-cron";
import { prisma } from "./prisma";
import { checkServiceStatus } from "./monitoring";

let isSchedulerRunning = false;

/**
 * Start the monitoring scheduler that checks all endpoints periodically
 */
export function startMonitoringScheduler() {
  if (isSchedulerRunning) {
    console.log("Scheduler is already running");
    return;
  }

  // Run every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    console.log("Running scheduled health checks...");
    
    try {
      const endpoints = await prisma.endpoints.findMany();
      
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
        }
      }
      
      console.log(`✓ Checked ${endpoints.length} endpoints`);
    } catch (error) {
      console.error("Error in scheduler:", error);
    }
  });

  isSchedulerRunning = true;
  console.log("✓ Monitoring scheduler started (runs every 30 seconds)");
}
