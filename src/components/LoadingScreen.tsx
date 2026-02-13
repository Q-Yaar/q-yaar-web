import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
