"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthModal() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowModal(true);
      // Reset form state when modal shows (e.g., after logout)
      setPasscode('');
      setError('');
      setIsSubmitting(false);
    } else {
      setShowModal(false);
    }
  }, [isLoading, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(passcode);

    if (!result.success) {
      setError(result.error || 'Invalid passcode');
      setPasscode('');
      setIsSubmitting(false);
    }
    // Note: If login is successful, the modal will close via useEffect
    // when isAuthenticated changes to true
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg p-8 max-w-sm w-full mx-4 border border-gray-200">
        {/* Title */}
        <h2 className="text-xl font-semibold text-center text-gray-800 mb-6">
          Enter Passcode
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent outline-none transition-all text-gray-800"
              placeholder="Enter passcode"
              autoFocus
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !passcode}
            className="w-full bg-[#FF5A5F] text-white font-medium py-2.5 px-4 rounded-lg hover:bg-[#FC4C4C] focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Verifying...' : 'Access'}
          </button>
        </form>
      </div>
    </div>
  );
}
