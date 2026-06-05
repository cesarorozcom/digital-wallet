import React from 'react';

interface AuthFieldProps {
  id: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
}

export default function AuthField({
  id,
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  hint,
}: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        placeholder={placeholder}
      />
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

