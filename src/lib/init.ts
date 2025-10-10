/**
 * Application Initialization
 * This file is imported during server startup to initialize background services
 * Uses singleton pattern to prevent multiple initializations
 */

import { startMonitoringScheduler } from "./scheduler";

// Global flag to ensure initialization happens only once
const INIT_KEY = Symbol.for("app.initialized");
const globalForInit = global as typeof global & {
  [INIT_KEY]: boolean;
};

// Only run on server-side and only once
if (typeof window === "undefined" && !globalForInit[INIT_KEY]) {
  globalForInit[INIT_KEY] = true;
  
  console.log("🚀 Initializing application services...");
  startMonitoringScheduler();
  console.log("✅ Application initialization complete");
}

export {};