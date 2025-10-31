import axios from "axios";
import { CheckStatus } from "../generated/prisma";

export interface StatusCheckResult {
  status: CheckStatus;
  httpCode: number | null;
  responseTime: number | null;
  errorMessage: string | null;
}

/**
 * Check the status of a service by making an HTTP request
 * @param url - The URL to check
 * @returns Status check result with metrics
 */
export async function checkServiceStatus(url: string): Promise<StatusCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: 30000, // 30 seconds timeout
      validateStatus: () => true, // Don't throw on any status code
    });
    
    const responseTime = Date.now() - startTime;
    const isUp = response.status >= 200 && response.status < 500;
    
    return {
      status: isUp ? CheckStatus.UP : CheckStatus.DOWN,
      httpCode: response.status,
      responseTime,
      errorMessage: isUp ? null : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Build a more detailed error message
    let errorMessage = "Unknown error occurred";
    
    if (error.code === "ECONNREFUSED") {
      errorMessage = "Connection refused - Service is not responding";
    } else if (error.code === "ENOTFOUND") {
      errorMessage = "DNS lookup failed - Host not found";
    } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      errorMessage = "Request timeout - Service took too long to respond";
    } else if (error.code === "ECONNRESET") {
      errorMessage = "Connection reset - Service closed the connection";
    } else if (error.code === "EHOSTUNREACH") {
      errorMessage = "Host unreachable - Network path not available";
    } else if (error.code === "ENETUNREACH") {
      errorMessage = "Network unreachable - Cannot reach network";
    } else if (error.code === "CERT_HAS_EXPIRED") {
      errorMessage = "SSL certificate has expired";
    } else if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      errorMessage = "SSL certificate verification failed";
    } else if (error.response) {
      // The request was made and the server responded with a status code
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText || "Server error"}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = `No response received: ${error.message || "Service unavailable"}`;
    } else if (error.message) {
      // Something happened in setting up the request
      errorMessage = error.message;
    }
    
    return {
      status: CheckStatus.DOWN,
      httpCode: error.response?.status || null,
      responseTime,
      errorMessage,
    };
  }
}

/**
 * Calculate uptime percentage for a service over a time window
 * @param checks - Array of check results
 * @returns Uptime percentage (0-100)
 */
export function calculateUptime(checks: { status: CheckStatus }[]): number {
  if (checks.length === 0) return 100;
  
  const upChecks = checks.filter(check => check.status === CheckStatus.UP).length;
  return Math.round((upChecks / checks.length) * 100 * 100) / 100; // Round to 2 decimals
}
