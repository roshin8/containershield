/**
 * Worker Fingerprint Spoofer
 *
 * Workers run in a separate JS context where main-thread spoofers
 * don't apply. CreepJS reads navigator/hardwareConcurrency inside
 * a Worker and compares to main thread values.
 *
 * Fix: Intercept Worker constructor, prepend spoofer overrides
 * into the Worker's script so values match the main thread.
 */

import type { ProtectionMode, AssignedProfileData } from '@/types';
import type { PRNG } from '@/lib/crypto';
import { TIMEZONE_IANA } from '@/lib/constants';
import { logAccess } from '../../monitor/fingerprint-monitor';
import { getSelectedGPU } from '../graphics/webgl';

function buildWorkerPreamble(assignedProfile?: AssignedProfileData): string {
  if (!assignedProfile?.userAgent) return '';

  const ua = assignedProfile.userAgent;
  const hc = assignedProfile.hardwareConcurrency || 8;
  const dm = assignedProfile.deviceMemory || 8;
  const langs = assignedProfile.languages || ['en-US'];
  const tzOffset = assignedProfile.timezoneOffset;
  const tzName = tzOffset !== undefined ? (TIMEZONE_IANA[tzOffset] || 'UTC') : null;
  // appVersion must match main thread: profile value or derived from userAgent
  const appVersion = ua.appVersion || (ua.userAgent ? ua.userAgent.replace(/^Mozilla\//, '') : '');

  let code = `(function(){try{
var n=self.navigator.__proto__||Object.getPrototypeOf(self.navigator);
Object.defineProperty(n,'userAgent',{get:function(){return ${JSON.stringify(ua.userAgent)}}});
Object.defineProperty(n,'platform',{get:function(){return ${JSON.stringify(ua.platform)}}});
Object.defineProperty(n,'vendor',{get:function(){return ${JSON.stringify(ua.vendor || '')}}});
Object.defineProperty(n,'appVersion',{get:function(){return ${JSON.stringify(appVersion)}}});
Object.defineProperty(n,'hardwareConcurrency',{get:function(){return ${hc}}});
Object.defineProperty(n,'languages',{get:function(){return Object.freeze(${JSON.stringify(langs)})}});
Object.defineProperty(n,'language',{get:function(){return ${JSON.stringify(langs[0])}}});
try{Object.defineProperty(self.navigator,'deviceMemory',{get:function(){return ${dm}},configurable:true})}catch(e){}`;

  // Spoof oscpu for Firefox profiles
  if (ua.oscpu) {
    code += `\ntry{Object.defineProperty(n,'oscpu',{get:function(){return ${JSON.stringify(ua.oscpu)}}})}catch(e){}`;
  }

  // Spoof userAgentData (Client Hints) in Worker context
  if (ua.brands) {
    const platformName = ua.platformName || 'Windows';
    const platformVersion = ua.platformVersion || '10.0.0';
    const mobile = ua.mobile ?? false;
    code += `
try{Object.defineProperty(n,'userAgentData',{get:function(){
var b=${JSON.stringify(ua.brands)};
var m=${mobile};
var p=${JSON.stringify(platformName)};
return{brands:b,mobile:m,platform:p,
getHighEntropyValues:function(){return Promise.resolve({brands:b,mobile:m,platform:p,
architecture:'x86',bitness:'64',model:'',
platformVersion:${JSON.stringify(platformVersion)},
uaFullVersion:b[0].version+'.0.0.0',fullVersionList:b})},
toJSON:function(){return{brands:b,mobile:m,platform:p}}};
}})}catch(e){}`;
  }

  // Spoof WebGL in Worker context (CreepJS uses OffscreenCanvas in Workers)
  // Use the SAME GPU selected by the main thread WebGL spoofer (null if WebGL off)
  const gpu = getSelectedGPU();

  if (gpu) {
    const gpuVendor = gpu.vendor;
    const gpuRenderer = gpu.renderer;

    code += `
try{if(typeof OffscreenCanvas!=='undefined'){
var _origGetCtx=OffscreenCanvas.prototype.getContext;
OffscreenCanvas.prototype.getContext=function(t,a){
var ctx=_origGetCtx.call(this,t,a);
if(ctx&&(t==='webgl'||t==='webgl2')){
var _origGetParam=ctx.getParameter.bind(ctx);
ctx.getParameter=function(p){
if(p===0x9245)return ${JSON.stringify(gpuVendor)};
if(p===0x9246)return ${JSON.stringify(gpuRenderer)};
if(p===0x1F00)return ${JSON.stringify(gpuVendor)};
if(p===0x1F01)return ${JSON.stringify(gpuRenderer)};
return _origGetParam(p);
};
}
return ctx;
};
}}catch(e){}`;
  }

  // Spoof timezone in Worker context — embed pre-computed offset from main frame
  if (tzName) {
    // Read the main frame's spoofed offset (already patched by timezone spoofer)
    const mainOffset = new Date().getTimezoneOffset();

    code += `
var _tz=${JSON.stringify(tzName)};
var _origDTF=Intl.DateTimeFormat;
Intl.DateTimeFormat=function(l,o){return new _origDTF(l,Object.assign({},o,{timeZone:o&&o.timeZone||_tz}))};
Intl.DateTimeFormat.supportedLocalesOf=_origDTF.supportedLocalesOf;
try{Intl.DateTimeFormat.prototype=_origDTF.prototype}catch(e){}
Date.prototype.getTimezoneOffset=function(){return ${mainOffset}};`;
  }

  code += `\n}catch(e){}})();\n`;
  return code;
}

export function initWorkerSpoofer(
  mode: ProtectionMode,
  prng: PRNG,
  assignedProfile?: AssignedProfileData
): void {
  if (mode === 'off') return;

  const workerPreamble = buildWorkerPreamble(assignedProfile);

  // Hide SharedArrayBuffer in block mode
  if (mode === 'block' && typeof SharedArrayBuffer !== 'undefined') {
    try {
      Object.defineProperty(window, 'SharedArrayBuffer', { value: undefined, configurable: true });
    } catch {}
  }

  // Intercept Worker constructor to inject overrides into Worker scripts
  if (workerPreamble) {
    const OriginalWorker = window.Worker;
    const OriginalBlob = window.Blob;

    const WorkerProxy = function(this: any, scriptURL: string | URL, options?: WorkerOptions): Worker {
      logAccess('Worker.constructor', { spoofed: true, value: 'injected' });

      const urlStr = String(scriptURL);

      // For ALL non-module workers: use importScripts wrapper
      // This works for both blob: URLs and regular URLs in Firefox
      if (!options?.type || options.type !== 'module') {
        try {
          const wrapper = workerPreamble + 'importScripts(' + JSON.stringify(urlStr) + ');\n';
          const blob = new OriginalBlob([wrapper], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          const w = new OriginalWorker(blobUrl, options);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          return w;
        } catch {
          // importScripts failed (e.g., cross-origin), try inline approach
        }
      }

      // For module workers or failed importScripts: try inline blob approach
      if (urlStr.startsWith('blob:')) {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', urlStr, false);
          xhr.send();
          if (xhr.status === 200) {
            const newBlob = new OriginalBlob([workerPreamble + xhr.responseText], { type: 'application/javascript' });
            const newUrl = URL.createObjectURL(newBlob);
            const w = new OriginalWorker(newUrl, options);
            setTimeout(() => URL.revokeObjectURL(newUrl), 10000);
            return w;
          }
        } catch {}
      }

      // Fallback: can't inject
      return new OriginalWorker(scriptURL, options);
    } as unknown as typeof Worker;

    WorkerProxy.prototype = OriginalWorker.prototype;
    Object.setPrototypeOf(WorkerProxy, OriginalWorker);

    try {
      Object.defineProperty(window, 'Worker', { value: WorkerProxy, writable: true, configurable: true });
    } catch {}
  }

  // Also intercept SharedWorker (CreepJS tries SharedWorker if ServiceWorker fails)
  if (workerPreamble && typeof SharedWorker !== 'undefined') {
    const OriginalSharedWorker = window.SharedWorker;
    const OriginalBlob2 = window.Blob;

    const SharedWorkerProxy = function(this: any, scriptURL: string | URL, nameOrOptions?: string | WorkerOptions): SharedWorker {
      logAccess('SharedWorker.constructor', { spoofed: true, value: 'injected' });

      const urlStr = String(scriptURL);
      try {
        const wrapper = workerPreamble + 'importScripts(' + JSON.stringify(urlStr) + ');\n';
        const blob = new OriginalBlob2([wrapper], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const w = new OriginalSharedWorker(blobUrl, nameOrOptions);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return w;
      } catch {
        return new OriginalSharedWorker(scriptURL, nameOrOptions);
      }
    } as unknown as typeof SharedWorker;

    SharedWorkerProxy.prototype = OriginalSharedWorker.prototype;
    Object.setPrototypeOf(SharedWorkerProxy, OriginalSharedWorker);

    try {
      Object.defineProperty(window, 'SharedWorker', { value: SharedWorkerProxy, writable: true, configurable: true });
    } catch {}
  }

  // Handle ServiceWorker: We can't inject preamble into ServiceWorker scripts.
  // Block registration entirely so fingerprinters fall back to SharedWorker/DedicatedWorker.
  if ('serviceWorker' in navigator && workerPreamble) {
    try {
      // Save reference before hiding
      const origSW = navigator.serviceWorker;

      // Override the getter to return a fake that blocks registration
      // Use a never-resolving promise for 'ready' (avoids unhandled rejection)
      const neverReady = new Promise<void>(() => {});
      Object.defineProperty(Navigator.prototype, 'serviceWorker', {
        get() {
          return {
            register: () => Promise.reject(new DOMException('SecurityError', 'SecurityError')),
            getRegistration: () => Promise.resolve(undefined),
            getRegistrations: () => Promise.resolve([]),
            ready: neverReady,
            controller: null,
            oncontrollerchange: null,
            onmessage: null,
            onmessageerror: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          };
        },
        configurable: true,
      });
    } catch {}
  }

  // Handle AudioWorklet
  if (typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype) {
    try {
      const origAddModule = AudioWorklet.prototype.addModule;
      AudioWorklet.prototype.addModule = async function(url: string | URL, opts?: WorkletOptions) {
        logAccess('AudioWorklet.addModule', { spoofed: true, value: 'wrapped' });
        return origAddModule.call(this, url, opts);
      };
    } catch {}
  }
}
