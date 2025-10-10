import React from 'react';

interface InputFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'url' | 'number';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: number;
  error?: string;
}

export default function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  min,
  error,
}: InputFieldProps) {
  // Ensure value is never undefined to prevent controlled/uncontrolled input warning
  const safeValue = value ?? '';
  
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={safeValue}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent transition-colors ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
