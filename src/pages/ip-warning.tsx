import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

interface ConflictParams {
  ip: string;
  url: string;
  currentContainer: string;
  originalContainer: string;
  originalContainerId: string;
  lastAccessed: string;
}

function IPWarningPage() {
  const [params, setParams] = useState<ConflictParams | null>(null);

  useEffect(() => {
    // Parse URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    setParams({
      ip: searchParams.get('ip') || '',
      url: searchParams.get('url') || '',
      currentContainer: searchParams.get('currentContainer') || '',
      originalContainer: searchParams.get('originalContainer') || '',
      originalContainerId: searchParams.get('originalContainerId') || '',
      lastAccessed: searchParams.get('lastAccessed') || '',
    });
  }, []);

  const formatTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - parseInt(timestamp, 10);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const handleBlock = () => {
    // Close the tab
    window.close();
  };

  const handleAllowOnce = async () => {
    // Navigate to the original URL
    if (params?.url) {
      window.location.href = params.url;
    }
  };

  const handleOpenInOriginal = async () => {
    if (!params) return;

    // Create a new tab in the original container
    await browser.runtime.sendMessage({
      type: 'OPEN_IN_CONTAINER',
      url: params.url,
      containerId: params.originalContainerId,
    });

    // Close this tab
    window.close();
  };

  if (!params) {
    return (
      <div className="text-center text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="max-w-lg w-full bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-yellow-600 px-6 py-4 flex items-center gap-3">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h1 className="text-xl font-bold text-white">
          IP Address Conflict Detected
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-4">
        <p className="text-gray-300">
          You're trying to access <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">{params.ip}</span> from:
        </p>

        <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Current Container:</span>
            <span className="font-medium text-blue-400">{params.currentContainer}</span>
          </div>
          <div className="border-t border-gray-600"></div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Previously Accessed From:</span>
            <span className="font-medium text-orange-400">{params.originalContainer}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Last Access:</span>
            <span className="text-gray-300">{formatTimeAgo(params.lastAccessed)}</span>
          </div>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 text-sm text-yellow-200">
          <strong>Warning:</strong> Accessing the same IP address from different containers may allow the server to correlate your identities across containers.
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex gap-3">
        <button
          onClick={handleBlock}
          className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
        >
          Block
        </button>
        <button
          onClick={handleAllowOnce}
          className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
        >
          Allow Once
        </button>
        <button
          onClick={handleOpenInOriginal}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          Open in {params.originalContainer}
        </button>
      </div>

      {/* Remember checkbox */}
      <div className="px-6 pb-4">
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input type="checkbox" className="rounded bg-gray-700 border-gray-600" />
          Remember my choice for this IP
        </label>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<IPWarningPage />);
}
