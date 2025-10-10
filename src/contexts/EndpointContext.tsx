"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { endpointService, Endpoint, CreateEndpointDTO, UpdateEndpointDTO } from '@/services/endpointService';
import { useToast } from './ToastContext';

interface EndpointContextType {
  endpoints: Endpoint[];
  loading: boolean;
  fetchEndpoints: () => Promise<void>;
  createEndpoint: (data: CreateEndpointDTO) => Promise<void>;
  updateEndpoint: (id: string, data: UpdateEndpointDTO) => Promise<void>;
  deleteEndpoint: (id: string) => Promise<void>;
}

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export function EndpointProvider({ children }: { children: ReactNode }) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const data = await endpointService.getAllEndpoints();
      setEndpoints(data);
    } catch (err: any) {
      showToast('error', 'Something went wrong while loading endpoints');
    } finally {
      setLoading(false);
    }
  };

  const createEndpoint = async (data: CreateEndpointDTO) => {
    try {
      await endpointService.createEndpoint(data);
      showToast('success', 'Endpoint created successfully!');
      await fetchEndpoints();
    } catch (err: any) {
      // Check if it's a validation error (409 Conflict)
      if (err.response?.status === 409) {
        // Throw the specific error message for form to handle
        throw new Error(err.response?.data?.error || 'Validation error');
      }
      // For other errors, show generic toast
      showToast('error', 'Something went wrong while creating endpoint');
      throw new Error('Failed to create endpoint');
    }
  };

  const updateEndpoint = async (id: string, data: UpdateEndpointDTO) => {
    try {
      await endpointService.updateEndpoint(id, data);
      showToast('success', 'Endpoint updated successfully!');
      await fetchEndpoints();
    } catch (err: any) {
      // Check if it's a validation error (409 Conflict)
      if (err.response?.status === 409) {
        // Throw the specific error message for form to handle
        throw new Error(err.response?.data?.error || 'Validation error');
      }
      // For other errors, show generic toast
      showToast('error', 'Something went wrong while updating endpoint');
      throw new Error('Failed to update endpoint');
    }
  };

  const deleteEndpoint = async (id: string) => {
    try {
      await endpointService.deleteEndpoint(id);
      showToast('success', 'Endpoint deleted successfully!');
      await fetchEndpoints();
    } catch (err: any) {
      showToast('error', 'Something went wrong while deleting endpoint');
      throw new Error('Failed to delete endpoint');
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  return (
    <EndpointContext.Provider
      value={{
        endpoints,
        loading,
        fetchEndpoints,
        createEndpoint,
        updateEndpoint,
        deleteEndpoint,
      }}
    >
      {children}
    </EndpointContext.Provider>
  );
}

export function useEndpoints() {
  const context = useContext(EndpointContext);
  if (context === undefined) {
    throw new Error('useEndpoints must be used within an EndpointProvider');
  }
  return context;
}
