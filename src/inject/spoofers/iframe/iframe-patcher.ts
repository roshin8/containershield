/**
 * Iframe Patcher - Applies spoofing overrides to dynamically created iframes.
 *
 * Fingerprinting tools like CreepJS create hidden iframes to get clean,
 * unmodified prototypes, bypassing main-frame overrides. This module
 * intercepts contentWindow/contentDocument access and patches each
 * iframe's prototypes on first access.
 */

import type { AssignedProfileData, SpooferSettings } from '@/types';
import { GL, TIMEZONE_IANA } from '@/lib/constants';

interface IframePatchConfig {
  settings: SpooferSettings;
  assignedProfile?: AssignedProfileData;
  selectedGPU: { vendor: string; renderer: string } | null;
}

/**
 * Set up iframe interception to apply spoofing overrides to new iframes.
 */
export function initIframePatcher(config: IframePatchConfig): void {
  const { settings, assignedProfile, selectedGPU } = config;

  const screen = assignedProfile?.screen;
  const ua = assignedProfile?.userAgent;
  const hc = assignedProfile?.hardwareConcurrency;
  const dm = assignedProfile?.deviceMemory;
  const langs = assignedProfile?.languages;
  const tzOffset = assignedProfile?.timezoneOffset;
  const targetTimezone = tzOffset !== undefined ? (TIMEZONE_IANA[tzOffset] || null) : null;

  const patchedIframes = new WeakSet<HTMLIFrameElement>();

  function patchWindow(iframeWin: Window): void {
    try {
      patchWebGL(iframeWin, selectedGPU, settings);
      patchScreen(iframeWin, screen, settings);
      patchNavigator(iframeWin, ua, hc, dm, langs, settings);
      patchTimezone(iframeWin, targetTimezone, settings);
    } catch {
      // Iframe may be cross-origin or already detached
    }
  }

  // Intercept contentWindow getter
  const origCWDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
  if (origCWDesc?.get) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get() {
        const win = origCWDesc.get!.call(this);
        if (win && !patchedIframes.has(this)) {
          patchedIframes.add(this);
          try { patchWindow(win); } catch {}
        }
        return win;
      },
      configurable: true,
    });
  }

  // Intercept contentDocument getter
  const origCDDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
  if (origCDDesc?.get) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
      get() {
        const doc = origCDDesc.get!.call(this);
        if (doc && !patchedIframes.has(this)) {
          patchedIframes.add(this);
          try { patchWindow(doc.defaultView!); } catch {}
        }
        return doc;
      },
      configurable: true,
    });
  }
}

function patchWebGL(
  win: Window,
  gpu: { vendor: string; renderer: string } | null,
  settings: SpooferSettings
): void {
  if (!gpu || settings.graphics?.webgl === 'off') return;

  for (const ctxName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const Ctor = (win as any)[ctxName];
    if (!Ctor) continue;

    const origGP = Ctor.prototype.getParameter;
    Ctor.prototype.getParameter = function(pname: number) {
      if (pname === GL.UNMASKED_VENDOR || pname === GL.VENDOR) return gpu.vendor;
      if (pname === GL.UNMASKED_RENDERER || pname === GL.RENDERER) return gpu.renderer;
      return origGP.call(this, pname);
    };
  }
}

function patchScreen(
  win: Window,
  screen: AssignedProfileData['screen'] | undefined,
  settings: SpooferSettings
): void {
  if (!screen || settings.hardware?.screen === 'off') return;

  const props: Record<string, number> = {
    width: screen.width, height: screen.height,
    availWidth: screen.availWidth, availHeight: screen.availHeight,
    colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
  };

  for (const [prop, val] of Object.entries(props)) {
    try { Object.defineProperty(win.screen, prop, { get: () => val, configurable: true }); } catch {}
  }

  if (screen.devicePixelRatio) {
    try { Object.defineProperty(win, 'devicePixelRatio', { get: () => screen.devicePixelRatio, configurable: true }); } catch {}
  }
}

function patchNavigator(
  win: Window,
  ua: AssignedProfileData['userAgent'] | undefined,
  hc: number | undefined,
  dm: number | undefined,
  langs: string[] | undefined,
  settings: SpooferSettings
): void {
  if (!ua || settings.navigator?.userAgent === 'off') return;

  const nav = (win as any).Navigator?.prototype || win.navigator;
  const navProps: Record<string, string> = {
    userAgent: ua.userAgent, platform: ua.platform,
    vendor: ua.vendor || '', appVersion: ua.appVersion || '',
  };

  for (const [prop, val] of Object.entries(navProps)) {
    try { Object.defineProperty(nav, prop, { get: () => val, configurable: true }); } catch {}
  }

  if (hc) try { Object.defineProperty(nav, 'hardwareConcurrency', { get: () => hc, configurable: true }); } catch {}
  if (dm) try { Object.defineProperty(nav, 'deviceMemory', { get: () => dm, configurable: true }); } catch {}
  if (langs) {
    const frozen = Object.freeze([...langs]);
    try { Object.defineProperty(nav, 'languages', { get: () => frozen, configurable: true }); } catch {}
    try { Object.defineProperty(nav, 'language', { get: () => langs[0], configurable: true }); } catch {}
  }
}

function patchTimezone(
  win: Window,
  targetTimezone: string | null,
  settings: SpooferSettings
): void {
  if (!targetTimezone || settings.timezone?.date === 'off') return;

  const iframeDate = (win as any).Date;
  if (!iframeDate) return;

  const origDTF = (win as any).Intl?.DateTimeFormat;
  if (!origDTF) return;

  // Patch getTimezoneOffset
  iframeDate.prototype.getTimezoneOffset = function(this: Date): number {
    try {
      const parts: Record<string, number> = {};
      new origDTF('en-US', {
        timeZone: targetTimezone, year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(this).forEach((p: Intl.DateTimeFormatPart) => {
        if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
      });
      const tzAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      const utc = Date.UTC(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(),
        this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds());
      return (utc - tzAsUtc) / 60000;
    } catch { return 0; }
  };

  // Patch Intl.DateTimeFormat
  try {
    (win as any).Intl.DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      return new origDTF(locales, { ...options, timeZone: options?.timeZone || targetTimezone });
    };
    (win as any).Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
    (win as any).Intl.DateTimeFormat.prototype = origDTF.prototype;
  } catch {}
}
