"use client";

import React, { useState, useEffect } from 'react';
import InputField from './InputField';
import SelectField from './SelectField';
import { Endpoint } from '@/services/endpointService';

interface EndpointFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EndpointFormData) => Promise<void>;
  endpoint?: Endpoint | null;
  mode: 'create' | 'edit';
}

export interface EndpointFormData {
  name: string;
  url: string;
  type: string;
}

const initialFormState: EndpointFormData = {
  name: '',
  url: '',
  type: 'Website',
};

const typeOptions = [
  { value: 'Website', label: 'Website' },
  { value: 'API', label: 'API' },
  { value: 'Service', label: 'Service' },
  { value: 'Database', label: 'Database' },
  { value: 'Other', label: 'Other' },
];

export default function EndpointFormModal({
  isOpen,
  onClose,
  onSubmit,
  endpoint,
  mode,
}: EndpointFormModalProps) {
  const [formData, setFormData] = useState<EndpointFormData>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EndpointFormData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && endpoint) {
        setFormData({
          name: endpoint.name || '',
          url: endpoint.url || '',
          type: endpoint.type || 'Website',
        });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [isOpen, mode, endpoint]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    // Clear error for this field
    if (errors[name as keyof EndpointFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EndpointFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      // Handle specific validation errors
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('name already exists')) {
        setErrors((prev) => ({ ...prev, name: 'An endpoint with this name already exists' }));
      } else if (errorMessage.includes('URL is already being monitored')) {
        setErrors((prev) => ({ ...prev, url: 'This URL is already being monitored' }));
      } else if (errorMessage.includes('URL') || errorMessage.includes('url')) {
        setErrors((prev) => ({ ...prev, url: errorMessage }));
      } else if (errorMessage.includes('name')) {
        setErrors((prev) => ({ ...prev, name: errorMessage }));
      }
      // Error is handled by showing it under the field, no need to show toast
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add New Endpoint' : 'Edit Endpoint'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
            disabled={submitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            label="Endpoint Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="My Website API"
            error={errors.name}
          />

          <InputField
            label="URL"
            name="url"
            type="url"
            value={formData.url}
            onChange={handleChange}
            required
            placeholder="https://example.com/api"
            error={errors.url}
          />

          <SelectField
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={typeOptions}
            required
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="hover:cursor-pointer flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="hover:cursor-pointer flex-1 px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#FC4C4C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>{mode === 'create' ? 'Add Endpoint' : 'Save Changes'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
