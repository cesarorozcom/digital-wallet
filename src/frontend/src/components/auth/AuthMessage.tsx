import React from 'react';

interface AuthMessageProps {
  message: string;
}

export default function AuthMessage({ message }: AuthMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  );
}

