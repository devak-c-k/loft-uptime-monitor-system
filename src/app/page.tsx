"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusProvider, useStatus } from "@/contexts/StatusContext";
import UptimeBar from "@/components/UptimeBar";
import DayDetailPanel from "@/components/DayDetailPanel";

function StatusPageContent() {
  const {
    statusData,
    loading,
    error,
    selectedDay,
    setSelectedDay,
    navigateNext,
    navigatePrevious,
    canNavigateNext,
    canNavigatePrevious,
    formatDateRange,
    handleDayClick,
  } = useStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          selectedDay ? 'pr-[516px]' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo/Logo.png"
              alt="Loft Logo"
              width={80}
              height={40}
              className="object-contain"
            />
            <div>
              <h1 className="text-[28px] font-black text-gray-900" style={{ fontFamily: 'Circular Std, sans-serif' }}>
                System Status
              </h1>
              <p className="mt-1 text-gray-600 text-sm">
                Real-time monitoring of all services
              </p>
            </div>
          </div>
        </div>

        {/* Overall Status Banner */}
        {/* <div
          className={`mb-8 p-6 rounded-lg border-2 ${
            statusData?.allOperational
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">
              {statusData?.allOperational ? "✓" : "✗"}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {statusData?.allOperational
                  ? "All Systems Operational"
                  : "Service Disruption"}
              </h2>
              <p className="text-gray-600 mt-1">
                {statusData?.services.length || 0} service
                {statusData?.services.length !== 1 ? "s" : ""} monitored
              </p>
            </div>
          </div>
        </div> */}

        {/* Services List */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
                      <button
                        onClick={navigatePrevious}
                        disabled={!canNavigatePrevious()}
                        className={`p-1 transition-colors ${
                          canNavigatePrevious() 
                            ? 'hover:text-gray-700 cursor-pointer' 
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                        title={canNavigatePrevious() ? "Previous 90 days" : "No earlier data available"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="font-medium whitespace-nowrap">
                        {formatDateRange()}
                      </span>
                      <button
                        onClick={navigateNext}
                        disabled={!canNavigateNext()}
                        className={`p-1 transition-colors ${
                          canNavigateNext() 
                            ? 'hover:text-gray-700 cursor-pointer' 
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                        title={canNavigateNext() ? "Next 90 days" : "No newer data available"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
          {statusData?.services && statusData.services.length > 0 ? (
            statusData.services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6"
              >
                {/* Service Header with Date Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {service.name}
                    </h3>
                    
                    {/* Date Range Navigation */}
                    
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      {service.uptime}%
                    </div>
                    <div className="text-sm text-gray-500">Uptime</div>
                  </div>
                </div>

                {/* Uptime Bar */}
                <div className="mt-4">
                  <UptimeBar 
                    dailyData={service.dailyData} 
                    startDate={service.dateRange.start}
                    endDate={service.dateRange.end}
                    onDayClick={handleDayClick(service.id, service.name)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <p className="text-gray-600 mb-4">
                No endpoints configured yet
              </p>
              <Link
                href="/add-endpoint"
                className="inline-block bg-[#FF5A5F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FC4C4C] transition-colors shadow-md"
              >
                Add Your First Endpoint
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Day Detail Panel */}
    {selectedDay && (
      <DayDetailPanel
        endpointId={selectedDay.endpointId}
        endpointName={selectedDay.endpointName}
        date={selectedDay.date}
        onClose={() => setSelectedDay(null)}
      />
    )}
    </>
  );
}

export default function Home() {
  return (
    <StatusProvider>
      <StatusPageContent />
    </StatusProvider>
  );
}
