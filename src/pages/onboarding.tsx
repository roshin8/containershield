import React from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const PURPLE = '#7c5cfc';
const PURPLE_LIGHT = '#a78bfa';
const GREEN = '#10b981';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const BG = '#0c0c14';
const CARD_BG = '#14141e';
const CARD_BORDER = '#1e1e30';
const TEXT = '#e8e8f0';
const MUTED = '#9898b0';
const DIM = '#606078';

const isMac = navigator.platform?.toUpperCase().includes('MAC');

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: '0 24px',
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: TEXT,
  marginBottom: '8px',
};

const subheadingStyle: React.CSSProperties = {
  fontSize: '14px',
  color: MUTED,
  lineHeight: 1.6,
  marginBottom: '32px',
};

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: '16px',
  padding: '28px',
};

/* ------------------------------------------------------------------ */
/*  SVG illustrations (inline, no external deps)                       */
/* ------------------------------------------------------------------ */

function FingerprintDiagram({ spoofed }: { spoofed: boolean }) {
  const color = spoofed ? GREEN : RED;
  const label = spoofed ? 'Spoofed' : 'Real';
  return (
    <div style={{
      width: '100%', padding: '20px', borderRadius: '12px',
      background: `${color}08`, border: `1px solid ${color}20`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', background: color,
          boxShadow: `0 0 8px ${color}`,
        }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label} Identity
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
        {[
          ['Canvas', spoofed ? '#a7f3b2c1' : 'Your real hash'],
          ['WebGL', spoofed ? 'RTX 3060' : 'Your real GPU'],
          ['Screen', spoofed ? '1440x900' : `${screen.width}x${screen.height}`],
          ['Timezone', spoofed ? 'America/New_York' : Intl.DateTimeFormat().resolvedOptions().timeZone],
          ['User Agent', spoofed ? 'Chrome 125 Win10' : 'Firefox (real)'],
          ['Audio', spoofed ? '#e8c2d91f' : 'Your real hash'],
        ].map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${color}10` }}>
            <span style={{ color: MUTED }}>{key}</span>
            <span style={{ color: spoofed ? GREEN : RED, fontFamily: 'monospace', fontSize: '11px' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContainerDiagram() {
  const containers = [
    { name: 'Work', color: '#3b82f6', fp: '#a7f3...' },
    { name: 'Shopping', color: '#f59e0b', fp: '#e2d1...' },
    { name: 'Social', color: '#ef4444', fp: '#91b4...' },
    { name: 'Banking', color: '#10b981', fp: '#c8f7...' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {containers.map((c) => (
        <div key={c.name} style={{
          background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '12px',
          padding: '16px 12px', textAlign: 'center',
          borderTop: `3px solid ${c.color}`,
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', margin: '0 auto 8px',
            background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            {c.name[0]}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT, marginBottom: '4px' }}>{c.name}</div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: c.color }}>{c.fp}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal grid visualization                                          */
/* ------------------------------------------------------------------ */

function SignalGrid() {
  const signals = [
    { name: 'Canvas', icon: '🎨' },
    { name: 'WebGL', icon: '🖥' },
    { name: 'Audio', icon: '🔊' },
    { name: 'Fonts', icon: '🔤' },
    { name: 'Screen', icon: '📐' },
    { name: 'Timezone', icon: '🕐' },
    { name: 'Navigator', icon: '🧭' },
    { name: 'Workers', icon: '⚙' },
    { name: 'DOMRect', icon: '📏' },
    { name: 'Network', icon: '🌐' },
    { name: 'Storage', icon: '💾' },
    { name: 'Devices', icon: '🎮' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      {signals.map((s) => (
        <div key={s.name} style={{
          background: `${PURPLE}10`, border: `1px solid ${PURPLE}20`, borderRadius: '10px',
          padding: '12px 8px', textAlign: 'center', fontSize: '11px', color: MUTED,
        }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
          {s.name}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step component                                                     */
/* ------------------------------------------------------------------ */

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`,
        color: '#fff', fontWeight: 700, fontSize: '15px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: TEXT, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Limitation row                                                     */
/* ------------------------------------------------------------------ */

function Limitation({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
      <span style={{ color: AMBER, fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>!</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function OnboardingPage() {
  const handleGetStarted = async () => {
    await browser.storage.local.set({ onboardingComplete: true });
    window.close();
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT }}>

      {/* ---- Hero ---- */}
      <div style={{
        padding: '80px 24px 64px', textAlign: 'center',
        background: `radial-gradient(ellipse at 50% 0%, ${PURPLE}15 0%, transparent 70%)`,
      }}>
        <div style={sectionStyle}>
          <img src="../icons/icon-96.svg" alt="" style={{
            width: '72px', height: '72px', marginBottom: '24px',
            filter: 'drop-shadow(0 0 24px rgba(124, 92, 252, 0.4))',
          }} />
          <h1 style={{
            fontSize: '40px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px',
            background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT}, #c4b5fd)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Container Shield
          </h1>
          <p style={{ fontSize: '18px', color: MUTED, maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            Every Firefox container gets a unique browser fingerprint.
            Sites can't link your identities across containers.
          </p>
        </div>
      </div>

      {/* ---- How it works: before/after ---- */}
      <div style={{ padding: '48px 0', background: `${CARD_BG}80` }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>How Fingerprinting Works</h2>
          <p style={subheadingStyle}>
            Websites combine dozens of browser signals into a unique fingerprint that tracks you, even without cookies.
            Container Shield spoofs these signals so each container looks like a different person.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: RED, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Without Container Shield
              </div>
              <FingerprintDiagram spoofed={false} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: GREEN, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                With Container Shield
              </div>
              <FingerprintDiagram spoofed={true} />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Per-container identity ---- */}
      <div style={{ padding: '48px 0' }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>One Browser, Unlimited Identities</h2>
          <p style={subheadingStyle}>
            Every Firefox container gets a unique fingerprint derived from its container ID.
            Consistent within, unique across. Add as many containers as you need — each one is a separate identity.
          </p>
          <ContainerDiagram />
        </div>
      </div>

      {/* ---- Signals protected ---- */}
      <div style={{ padding: '48px 0', background: `${CARD_BG}80` }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>50+ Signals Protected</h2>
          <p style={subheadingStyle}>
            Container Shield intercepts all major fingerprinting vectors. Each signal is spoofed with realistic,
            consistent values that match the assigned browser profile.
          </p>
          <SignalGrid />
          <p style={{ fontSize: '12px', color: DIM, marginTop: '16px', textAlign: 'center' }}>
            Plus: SVG, MathML, DOMRect, CSS media queries, WebRTC, speech synthesis, keyboard timing,
            permissions, codecs, WebGPU, clipboard, geolocation, and more.
          </p>
        </div>
      </div>

      {/* ---- Quick start ---- */}
      <div style={{ padding: '48px 0' }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Get Started in 30 Seconds</h2>
          <p style={subheadingStyle}>
            Container Shield works out of the box. No configuration required.
          </p>
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Step num={1} title="It's already running"
              desc="Protection is ON by default in Balanced mode for all containers." />
            <Step num={2} title="Click the toolbar icon"
              desc="Open the popup to see your current protection status, spoofed profile, and signal values." />
            <Step num={3} title="Customize if you want"
              desc="Use the Signals tab for per-signal control, or the Profile tab to pick a specific browser identity." />
            <Step num={4} title="Verify on fingerprinting sites"
              desc="Visit CreepJS, BrowserLeaks, or fingerprint.com to confirm your fingerprint is spoofed." />
          </div>
        </div>
      </div>

      {/* ---- Protection levels ---- */}
      <div style={{ padding: '48px 0', background: `${CARD_BG}80` }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Protection Levels</h2>
          <p style={subheadingStyle}>Choose how aggressively to protect your fingerprint.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { name: 'Off', color: '#64748b', desc: 'No spoofing. Real values exposed.' },
              { name: 'Low', color: GREEN, desc: 'Light noise. Minimal site breakage.' },
              { name: 'Balanced', color: PURPLE, desc: 'Recommended. Strong + compatible.' },
              { name: 'Strict', color: RED, desc: 'Maximum privacy. May break sites.' },
            ].map((l) => (
              <div key={l.name} style={{
                ...cardStyle, textAlign: 'center', borderTop: `3px solid ${l.color}`,
              }}>
                <div style={{
                  fontSize: '14px', fontWeight: 700, color: l.color, marginBottom: '8px',
                }}>{l.name}</div>
                <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.5 }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Keyboard shortcuts ---- */}
      <div style={{ padding: '48px 0' }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Keyboard Shortcuts</h2>
          <p style={subheadingStyle}>Quick access without touching the mouse.</p>
          <div style={cardStyle}>
            {[
              { label: 'Toggle protection', win: 'Alt+Shift+P', mac: 'Ctrl+Shift+P' },
              { label: 'Rotate fingerprint', win: 'Alt+Shift+R', mac: 'Ctrl+Shift+R' },
              { label: 'Toggle site exception', win: 'Alt+Shift+E', mac: 'Ctrl+Shift+E' },
              { label: 'Open popup', win: 'Alt+Shift+C', mac: 'Ctrl+Shift+C' },
            ].map((s, i) => (
              <div key={s.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < 3 ? `1px solid ${CARD_BORDER}` : 'none',
              }}>
                <span style={{ fontSize: '13px', color: MUTED }}>{s.label}</span>
                <kbd style={{
                  fontFamily: 'SFMono-Regular, Menlo, monospace', fontSize: '12px',
                  background: '#1a1a28', border: `1px solid ${CARD_BORDER}`,
                  borderRadius: '6px', padding: '4px 12px', color: '#c8c8d8',
                }}>
                  {isMac ? s.mac : s.win}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Limitations ---- */}
      <div style={{ padding: '48px 0', background: `${CARD_BG}80` }}>
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Limitations</h2>
          <p style={subheadingStyle}>
            Container Shield provides strong fingerprint protection, but no tool is perfect.
            Being transparent about limits helps you make informed decisions.
          </p>
          <div style={cardStyle}>
            <Limitation
              title="TLS/HTTP2 fingerprinting"
              desc="Your browser's TLS handshake and HTTP/2 settings are outside extension control. Advanced trackers (like Akamai Bot Manager) can identify Firefox regardless of JS-level spoofing."
            />
            <Limitation
              title="IP address correlation"
              desc="If two containers use the same IP, a tracker can link them. Use a VPN or Tor for each container to fully isolate network identity."
            />
            <Limitation
              title="Login-based tracking"
              desc="If you log into the same account in multiple containers, the service can trivially link them. Use different accounts per container."
            />
            <Limitation
              title="Browser-level system fonts"
              desc="Firefox exposes some system fonts at the CSS level that extensions cannot fully intercept. We mitigate this but can't eliminate it entirely."
            />
            <Limitation
              title="ServiceWorker injection"
              desc="Firefox does not allow extensions to inject code into ServiceWorker scripts. We block SW registration and fall back to spoofed SharedWorkers."
            />
            <Limitation
              title="Extension detection"
              desc="Very sophisticated trackers may detect that fingerprint values are being spoofed. Container Shield uses stealth techniques to minimize this, but it's an ongoing arms race."
            />
          </div>
        </div>
      </div>

      {/* ---- Privacy + open source ---- */}
      <div style={{ padding: '48px 0' }}>
        <div style={sectionStyle}>
          <div style={{
            ...cardStyle, display: 'flex', gap: '20px', alignItems: 'center',
            background: `linear-gradient(135deg, ${GREEN}08, ${GREEN}04)`,
            border: `1px solid ${GREEN}20`,
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: `${GREEN}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: '24px',
            }}>
              🔒
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: TEXT, marginBottom: '4px' }}>
                100% Local &amp; Open Source
              </div>
              <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
                No data collected. No telemetry. No external servers. All fingerprint generation and spoofing
                happens entirely in your browser. Source code is auditable on{' '}
                <a href="https://github.com/roshin8/containershield" target="_blank" rel="noopener noreferrer"
                  style={{ color: PURPLE, textDecoration: 'none' }}>GitHub</a>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- CTA ---- */}
      <div style={{ padding: '48px 24px 80px', textAlign: 'center' }}>
        <button onClick={handleGetStarted} style={{
          padding: '16px 56px', fontSize: '16px', fontWeight: 700,
          background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`,
          color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
          boxShadow: `0 8px 32px ${PURPLE}40`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 12px 40px ${PURPLE}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 8px 32px ${PURPLE}40`;
          }}
        >
          Start Browsing Privately
        </button>
        <p style={{ fontSize: '12px', color: DIM, marginTop: '14px' }}>
          Closes this tab. Protection is already active.
        </p>
      </div>

      {/* ---- Footer ---- */}
      <div style={{
        padding: '24px', textAlign: 'center', fontSize: '12px', color: DIM,
        borderTop: `1px solid ${CARD_BORDER}`,
      }}>
        Container Shield is free and open source.{' '}
        <a href="https://github.com/roshin8/containershield" target="_blank" rel="noopener noreferrer"
          style={{ color: PURPLE, textDecoration: 'none' }}>View on GitHub</a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mount                                                              */
/* ------------------------------------------------------------------ */

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<OnboardingPage />);
}
