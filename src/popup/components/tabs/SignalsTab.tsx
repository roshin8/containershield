/**
 * Signals Tab - Per-API fingerprint signal controls with value selectors.
 * Each signal has Off/Spoof/Block mode and optional value dropdown.
 */

import React, { useEffect, useState, useMemo } from 'react';
import browser from 'webextension-polyfill';
import type { ContainerSettings, FingerprintAccess } from '@/types';
import {
  CANVAS_NOISE_OPTIONS, AUDIO_NOISE_OPTIONS, TIMING_PRECISION_OPTIONS,
  BATTERY_OPTIONS, DOMRECT_NOISE_OPTIONS, FONT_LIST_OPTIONS,
  MEDIA_DEVICE_OPTIONS, TOUCH_OPTIONS, WEBGL_NOISE_OPTIONS,
  SVG_NOISE_OPTIONS, MATH_NOISE_OPTIONS, PLUGINS_OPTIONS, HISTORY_OPTIONS,
} from '@/popup/data/signal-options';

interface SignalsTabProps {
  settings: ContainerSettings;
  onSaveSettings: (updates: Partial<ContainerSettings>) => void;
  highlightedSignal?: { category: string; signal: string };
}

/**
 * Build a map of API name -> value from the fingerprint access log.
 * For APIs that appear multiple times, the most recent value wins.
 */
function buildValueMap(apis: FingerprintAccess[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of apis) {
    if (a.value && a.spoofed) {
      map[a.api] = a.value;
    }
  }
  return map;
}

export default function SignalsTab({ settings, onSaveSettings, highlightedSignal }: SignalsTabProps) {
  const [accessedAPIs, setAccessedAPIs] = useState<FingerprintAccess[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const resp = await browser.runtime.sendMessage({ type: 'GET_RECOMMENDATIONS', tabId: tab.id }) as Record<string, unknown> | null;
        if (!cancelled && resp && Array.isArray(resp.accessedAPIs)) {
          setAccessedAPIs(resp.accessedAPIs as FingerprintAccess[]);
        }
      } catch {
        // Background script not available
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const vals = useMemo(() => buildValueMap(accessedAPIs), [accessedAPIs]);

  const get = (cat: string, key: string): string => (settings.spoofers as any)[cat]?.[key] || 'off';

  const set = (cat: string, key: string, mode: string) => {
    const spoofers = { ...settings.spoofers } as any;
    spoofers[cat] = { ...spoofers[cat], [key]: mode };
    onSaveSettings({ spoofers });
  };

  const hl = (cat: string, key: string) =>
    highlightedSignal?.category === cat && highlightedSignal?.signal === key;

  const S = (p: { name: string; cat: string; k: string; opts?: { id: string; name: string }[]; val?: string }) => (
    <SignalRow name={p.name} mode={get(p.cat, p.k)} onModeChange={(m) => set(p.cat, p.k, m)}
      highlighted={hl(p.cat, p.k)} valueOptions={p.opts} currentValue={p.val} />
  );

  return (
    <div className="space-y-2">
      <G label="Graphics">
        <S name="Canvas" cat="graphics" k="canvas" opts={CANVAS_NOISE_OPTIONS} />
        <S name="WebGL" cat="graphics" k="webgl" opts={WEBGL_NOISE_OPTIONS} val={vals['WebGLRenderingContext.getParameter']} />
        <S name="WebGL2" cat="graphics" k="webgl2" opts={WEBGL_NOISE_OPTIONS} val={vals['WebGL2RenderingContext.getParameter']} />
        <S name="DOMRect" cat="graphics" k="domRect" opts={DOMRECT_NOISE_OPTIONS} />
        <S name="Text Metrics" cat="graphics" k="textMetrics" opts={DOMRECT_NOISE_OPTIONS} />
        <S name="SVG" cat="graphics" k="svg" opts={SVG_NOISE_OPTIONS} />
        <S name="OffscreenCanvas" cat="graphics" k="offscreenCanvas" opts={CANVAS_NOISE_OPTIONS} />
        <S name="WebGL Shaders" cat="graphics" k="webglShaders" />
        <S name="WebGPU" cat="graphics" k="webgpu" />
      </G>
      <G label="Audio">
        <S name="AudioContext" cat="audio" k="audioContext" opts={AUDIO_NOISE_OPTIONS} />
        <S name="Offline Audio" cat="audio" k="offlineAudio" opts={AUDIO_NOISE_OPTIONS} />
        <S name="Audio Latency" cat="audio" k="latency" val={vals['AudioContext.baseLatency']} />
        <S name="Codecs" cat="audio" k="codecs" />
      </G>
      <G label="Hardware">
        <S name="Screen" cat="hardware" k="screen" val={vals['screen.width']} />
        <S name="Screen Frame" cat="hardware" k="screenFrame" />
        <S name="Device Memory" cat="hardware" k="deviceMemory" val={vals['navigator.deviceMemory']} />
        <S name="CPU Cores" cat="hardware" k="hardwareConcurrency" val={vals['navigator.hardwareConcurrency']} />
        <S name="Media Devices" cat="hardware" k="mediaDevices" opts={MEDIA_DEVICE_OPTIONS} />
        <S name="Battery" cat="hardware" k="battery" opts={BATTERY_OPTIONS} />
        <S name="Touch" cat="hardware" k="touch" opts={TOUCH_OPTIONS} />
        <S name="Sensors" cat="hardware" k="sensors" />
      </G>
      <G label="Navigator">
        <S name="User Agent" cat="navigator" k="userAgent" val={vals['navigator.userAgent']} />
        <S name="Languages" cat="navigator" k="languages" val={vals['navigator.languages']} />
        <S name="Plugins" cat="navigator" k="plugins" opts={PLUGINS_OPTIONS} />
        <S name="Client Hints" cat="navigator" k="clientHints" val={vals['navigator.userAgentData']} />
        <S name="Window.name" cat="navigator" k="windowName" />
        <S name="Tab History" cat="navigator" k="tabHistory" opts={HISTORY_OPTIONS} />
      </G>
      <G label="Network">
        <SignalRow name="WebRTC" mode={get('network', 'webrtc')}
          onModeChange={(m) => set('network', 'webrtc', m)}
          customModes={[{id:'off',name:'Off'},{id:'public_only',name:'Public Only'},{id:'block',name:'Block'}]} />
        <S name="Connection" cat="network" k="connection" />
        <S name="Geolocation" cat="network" k="geolocation" />
        <SignalRow name="WebSocket" mode={get('network', 'websocket')}
          onModeChange={(m) => set('network', 'websocket', m)}
          customModes={[{id:'off',name:'Off'},{id:'noise',name:'3rd Party Only'},{id:'block',name:'Block All'}]} />
      </G>
      <G label="Timing & Timezone">
        <S name="Performance" cat="timing" k="performance" opts={TIMING_PRECISION_OPTIONS} val={vals['performance.now']} />
        <S name="Memory" cat="timing" k="memory" />
        <S name="Timezone" cat="timezone" k="intl" val={vals['Intl.DateTimeFormat'] || vals['Date.getTimezoneOffset']} />
        <S name="Date" cat="timezone" k="date" val={vals['Date.getTimezoneOffset']} />
      </G>
      <G label="Fonts & Rendering">
        <S name="Font Enum" cat="fonts" k="enumeration" opts={FONT_LIST_OPTIONS} />
        <S name="CSS Fonts" cat="fonts" k="cssDetection" />
        <S name="Emoji" cat="rendering" k="emoji" />
        <S name="MathML" cat="rendering" k="mathml" />
      </G>
      <G label="Other">
        <S name="Math" cat="math" k="functions" opts={MATH_NOISE_OPTIONS} />
        <S name="Keyboard" cat="keyboard" k="layout" />
        <S name="Key Cadence" cat="keyboard" k="cadence" />
        <S name="Speech" cat="speech" k="synthesis" />
        <S name="Permissions" cat="permissions" k="query" />
        <S name="Storage" cat="storage" k="estimate" />
        <S name="Features" cat="features" k="detection" />
        <S name="Crypto" cat="crypto" k="webCrypto" />
        <S name="Errors" cat="errors" k="stackTrace" />
        <S name="Workers" cat="workers" k="fingerprint" />
      </G>
    </div>
  );
}

function G({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="section-label">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SignalRow({ name, mode, onModeChange, highlighted, valueOptions, customModes, currentValue }: {
  name: string; mode: string; onModeChange: (m: string) => void;
  highlighted?: boolean; valueOptions?: { id: string; name: string }[];
  customModes?: { id: string; name: string }[];
  currentValue?: string;
}) {
  const isOn = mode !== 'off';
  const modes = customModes || [
    { id: 'off', name: 'Off' },
    { id: 'noise', name: 'Spoof' },
    { id: 'block', name: 'Block' },
  ];
  const modeClass = (m: string) => {
    if (m !== mode) return 'off';
    if (m === 'off') return 'off-active';
    if (m === 'block') return 'block';
    return 'noise'; // noise, public_only, or any other active state
  };

  return (
    <div style={{
      borderBottom: '1px solid var(--border)', padding: '6px 0',
      background: highlighted ? 'var(--accent-muted)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text)' }}>{name}</span>
          {currentValue && isOn && (
            <div style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }} className="truncate">{currentValue}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {modes.map((m) => (
            <button key={m.id} onClick={() => onModeChange(m.id)}
              className={`pill ${modeClass(m.id)}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      {isOn && mode !== 'block' && valueOptions && (
        <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
          <select className="select" style={{ fontSize: '10px', padding: '3px 6px', flex: 1 }}>
            {valueOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="input" type="number" min="0" placeholder="#"
            style={{ width: '50px', fontSize: '10px', padding: '3px 6px', textAlign: 'center' }} />
        </div>
      )}
    </div>
  );
}
