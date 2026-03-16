import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import type { ContainerIdentity, ContainerSettings } from '@/types';
import { createDefaultSettings } from '@/types/settings';
import {
  MSG_GET_ALL_CONTAINERS,
  MSG_GET_CONTAINER_INFO,
  MSG_GET_SETTINGS,
  MSG_SET_SETTINGS,
} from '@/constants';
import ContainerSelector from './components/ContainerSelector';
import ProtectionLevel from './components/ProtectionLevel';
import CategoryToggle from './components/CategoryToggle';
import FingerprintMonitor from './components/FingerprintMonitor';

interface ContainerInfo {
  containerId: string;
  containerName: string;
  containerColor: string;
  containerIcon: string;
}

export default function App() {
  const [containers, setContainers] = useState<ContainerIdentity[]>([]);
  const [currentContainer, setCurrentContainer] = useState<ContainerInfo | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [settings, setSettings] = useState<ContainerSettings>(createDefaultSettings());
  const [loading, setLoading] = useState(true);

  // Load containers and current container info on mount
  useEffect(() => {
    async function init() {
      try {
        // Get all containers
        const allContainers = await browser.runtime.sendMessage({
          type: MSG_GET_ALL_CONTAINERS,
        }) as ContainerIdentity[];
        setContainers(allContainers);

        // Get current tab's container
        const containerInfo = await browser.runtime.sendMessage({
          type: MSG_GET_CONTAINER_INFO,
        }) as ContainerInfo;
        setCurrentContainer(containerInfo);
        setSelectedContainer(containerInfo.containerId);

        // Load settings for current container
        const containerSettings = await browser.runtime.sendMessage({
          type: MSG_GET_SETTINGS,
          containerId: containerInfo.containerId,
        }) as ContainerSettings;
        setSettings(containerSettings);
      } catch (error) {
        console.error('Failed to initialize popup:', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Load settings when selected container changes
  useEffect(() => {
    async function loadSettings() {
      if (!selectedContainer) return;

      try {
        const containerSettings = await browser.runtime.sendMessage({
          type: MSG_GET_SETTINGS,
          containerId: selectedContainer,
        }) as ContainerSettings;
        setSettings(containerSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    loadSettings();
  }, [selectedContainer]);

  // Save settings
  const saveSettings = async (updates: Partial<ContainerSettings>) => {
    if (!selectedContainer) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      await browser.runtime.sendMessage({
        type: MSG_SET_SETTINGS,
        containerId: selectedContainer,
        settings: updates,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Enable a specific spoofer from recommendation
  const enableSpoofer = async (settingPath: string) => {
    const [category, setting] = settingPath.split('.');
    if (!category || !setting) return;

    const currentSpoofers = { ...settings.spoofers } as any;
    if (currentSpoofers[category]) {
      currentSpoofers[category] = {
        ...currentSpoofers[category],
        [setting]: 'noise',
      };
    }

    await saveSettings({ spoofers: currentSpoofers });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedContainerInfo = containers.find(c => c.cookieStoreId === selectedContainer);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🦎</span>
          Chameleon Containers
        </h1>
      </header>

      {/* Container Selector */}
      <div className="px-4 py-3 bg-gray-800/50">
        <ContainerSelector
          containers={containers}
          selectedContainer={selectedContainer}
          currentContainer={currentContainer?.containerId}
          onSelect={setSelectedContainer}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Fingerprint Monitor */}
        <FingerprintMonitor onEnableSpoofer={enableSpoofer} />

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div>
            <div className="font-medium">Protection</div>
            <div className="text-sm text-gray-400">
              {settings.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => saveSettings({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
        </div>

        {/* Protection Level */}
        <ProtectionLevel
          level={settings.protectionLevel}
          onChange={(level) => saveSettings({ protectionLevel: level })}
          disabled={!settings.enabled}
        />

        {/* Category Toggles */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Protection Categories
          </h3>

          <CategoryToggle
            category="Graphics"
            description="Canvas, WebGL, SVG"
            settings={settings.spoofers.graphics}
            onChange={(graphics) =>
              saveSettings({
                spoofers: { ...settings.spoofers, graphics },
              })
            }
            disabled={!settings.enabled}
          />

          <CategoryToggle
            category="Audio"
            description="AudioContext fingerprinting"
            settings={settings.spoofers.audio}
            onChange={(audio) =>
              saveSettings({
                spoofers: { ...settings.spoofers, audio },
              })
            }
            disabled={!settings.enabled}
          />

          <CategoryToggle
            category="Hardware"
            description="Screen, CPU, memory"
            settings={settings.spoofers.hardware}
            onChange={(hardware) =>
              saveSettings({
                spoofers: { ...settings.spoofers, hardware },
              })
            }
            disabled={!settings.enabled}
          />

          <CategoryToggle
            category="Navigator"
            description="User agent, languages"
            settings={settings.spoofers.navigator}
            onChange={(navigator) =>
              saveSettings({
                spoofers: { ...settings.spoofers, navigator },
              })
            }
            disabled={!settings.enabled}
          />

          <CategoryToggle
            category="Timezone"
            description="Date, Intl APIs"
            settings={settings.spoofers.timezone}
            onChange={(timezone) =>
              saveSettings({
                spoofers: { ...settings.spoofers, timezone },
              })
            }
            disabled={!settings.enabled}
          />

          <CategoryToggle
            category="Network"
            description="WebRTC leak protection"
            settings={settings.spoofers.network}
            onChange={(network) =>
              saveSettings({
                spoofers: { ...settings.spoofers, network },
              })
            }
            disabled={!settings.enabled}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>
            Container: {selectedContainerInfo?.name || 'Default'}
          </span>
          <span>v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
