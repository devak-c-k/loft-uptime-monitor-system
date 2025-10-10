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
    
    return {
      status: CheckStatus.DOWN,
      httpCode: null,
      responseTime,
      errorMessage: error.message || "Unknown error occurred",
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
