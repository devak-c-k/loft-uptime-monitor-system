"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EndpointProvider, useEndpoints } from "@/contexts/EndpointContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Endpoint } from "@/services/endpointService";
import EndpointFormModal, { EndpointFormData } from "@/components/dashboard/EndpointFormModal";
import DeleteConfirmModal from "@/components/dashboard/DeleteConfirmModal";
import EndpointsTable from "@/components/dashboard/EndpointsTable";
import ToastContainer from "@/components/ToastContainer";
import Image from "next/image";

function DashboardContent() {
  const router = useRouter();
  const {
    endpoints,
    loading,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
  } = useEndpoints();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setSelectedEndpoint(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (endpoint: Endpoint) => {
    setFormMode('edit');
    setSelectedEndpoint(endpoint);
    setShowFormModal(true);
  };

  const handleOpenDeleteModal = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (data: EndpointFormData) => {
    if (formMode === 'create') {
      await createEndpoint(data);
    } else if (selectedEndpoint) {
      await updateEndpoint(selectedEndpoint.id, data);
    }
    setShowFormModal(false);
    setSelectedEndpoint(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedEndpoint) {
      await deleteEndpoint(selectedEndpoint.id);
      setShowDeleteModal(false);
      setSelectedEndpoint(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                              src="/logo/Logo.png"
                              alt="Loft Logo"
                              width={80}
                              height={40}
                              className="object-contain"
                            />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Loft Uptime Monitor</h1>
                <p className="text-sm text-gray-500">Manage your monitored endpoints</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="hover:cursor-pointer px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Status Page
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="hover:cursor-pointer px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#FC4C4C] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Endpoint
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
{/*         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Endpoints"
            value={endpoints.length}
            color="blue"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />

          <StatsCard
            title="Active Monitors"
            value={endpoints.length}
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatsCard
            title="Check Interval"
            value="30s"
            color="purple"
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div> */}

        {/* Endpoints Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5A5F]"></div>
            <p className="text-gray-500 mt-4">Loading endpoints...</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No endpoints yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first endpoint to monitor</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#FC4C4C] transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Endpoint
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Monitored Endpoints</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and configure your uptime monitoring endpoints</p>
            </div>
            <EndpointsTable
              endpoints={endpoints}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteModal}
            />
          </div>
        )}
      </main>

      {/* Form Modal (Add/Edit) */}
      <EndpointFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedEndpoint(null);
        }}
        onSubmit={handleFormSubmit}
        mode={formMode}
        endpoint={selectedEndpoint}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        endpoint={selectedEndpoint}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <EndpointProvider>
        <DashboardContent />
      </EndpointProvider>
    </ToastProvider>
  );
}
