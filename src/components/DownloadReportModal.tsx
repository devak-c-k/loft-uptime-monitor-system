"use client";

import { useState } from "react";

interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: Array<{ id: string; name: string }>;
}

export default function DownloadReportModal({
  isOpen,
  onClose,
  endpoints,
}: DownloadReportModalProps) {
  const [dateRange, setDateRange] = useState<"10days" | "30days" | "custom">("10days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("all");
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate default dates
  const getDefaultEndDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getDefaultStartDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let start: string;
      let end: string;

      if (dateRange === "custom") {
        if (!startDate || !endDate) {
          alert("Please select both start and end dates");
          setIsDownloading(false);
          return;
        }
        start = startDate;
        end = endDate;
      } else {
        end = getDefaultEndDate();
        start = getDefaultStartDate(dateRange === "10days" ? 10 : 30);
      }

      // Build query parameters
      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
      });

      if (selectedEndpoint !== "all") {
        params.append("endpointId", selectedEndpoint);
      }

      // Make the API call to download the report
      const response = await fetch(`/api/report/download?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uptime-report-${start}-to-${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Download Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Endpoint Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Endpoint
            </label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent"
            >
              <option value="all">All Endpoints</option>
              {endpoints.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="10days"
                  checked={dateRange === "10days"}
                  onChange={(e) => setDateRange(e.target.value as "10days")}
                  className="mr-2 text-[#FF5A5F] focus:ring-[#FF5A5F]"
                />
                <span className="text-sm text-gray-700">Last 10 Days</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="30days"
                  checked={dateRange === "30days"}
                  onChange={(e) => setDateRange(e.target.value as "30days")}
                  className="mr-2 text-[#FF5A5F] focus:ring-[#FF5A5F]"
                />
                <span className="text-sm text-gray-700">Last 30 Days</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom"
                  checked={dateRange === "custom"}
                  onChange={(e) => setDateRange(e.target.value as "custom")}
                  className="mr-2 text-[#FF5A5F] focus:ring-[#FF5A5F]"
                />
                <span className="text-sm text-gray-700">Custom Range</span>
              </label>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || getDefaultEndDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={getDefaultEndDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isDownloading}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#FC4C4C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

