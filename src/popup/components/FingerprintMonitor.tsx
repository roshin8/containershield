import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { MSG_GET_RECOMMENDATIONS, POPUP_REFRESH_INTERVAL_MS } from '@/constants';

interface Recommendation {
  api: string;
  category: string;
  settingPath: string;
  currentValue: string;
}

interface FingerprintData {
  recommendations: Recommendation[];
  accessedCategories: string[];
  totalAccesses: number;
  url: string;
}

interface Props {
  onEnableSpoofer?: (settingPath: string) => void;
}

export default function FingerprintMonitor({ onEnableSpoofer }: Props) {
  const [data, setData] = useState<FingerprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Get current tab
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Get recommendations from background
        const result = await browser.runtime.sendMessage({
          type: MSG_GET_RECOMMENDATIONS,
          tabId: tab.id,
        }) as FingerprintData;

        setData(result);
      } catch (error) {
        console.error('Failed to load fingerprint data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Refresh periodically
    const interval = setInterval(loadData, POPUP_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-3 bg-gray-800 rounded-lg">
        <div className="text-sm text-gray-400">Loading fingerprint data...</div>
      </div>
    );
  }

  if (!data || data.totalAccesses === 0) {
    return (
      <div className="p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <div>
            <div className="font-medium text-sm">Fingerprint Monitor</div>
            <div className="text-xs text-gray-400">
              No fingerprinting detected on this page yet
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasRecommendations = data.recommendations.length > 0;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{hasRecommendations ? '⚠️' : '✅'}</span>
          <div className="text-left">
            <div className="font-medium text-sm">Fingerprint Monitor</div>
            <div className="text-xs text-gray-400">
              {data.totalAccesses} API calls detected
              {hasRecommendations && (
                <span className="text-yellow-400 ml-1">
                  ({data.recommendations.length} unprotected)
                </span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Accessed Categories */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">
              Detected Fingerprinting Categories:
            </div>
            <div className="flex flex-wrap gap-1">
              {data.accessedCategories.map((category) => {
                const isUnprotected = data.recommendations.some(r => r.category === category);
                return (
                  <span
                    key={category}
                    className={`px-2 py-0.5 rounded text-xs ${
                      isUnprotected
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}
                  >
                    {category}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {hasRecommendations && (
            <div>
              <div className="text-xs font-medium text-yellow-400 mb-2">
                Recommended: Enable these spoofers
              </div>
              <div className="space-y-1">
                {data.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-700/50 rounded text-xs"
                  >
                    <div>
                      <div className="font-medium">{rec.category}</div>
                      <div className="text-gray-400 text-[10px]">{rec.api}</div>
                    </div>
                    {onEnableSpoofer && (
                      <button
                        onClick={() => onEnableSpoofer(rec.settingPath)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white transition-colors"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasRecommendations && (
            <div className="text-xs text-green-400 flex items-center gap-1">
              <span>✓</span>
              All detected fingerprinting APIs are protected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
