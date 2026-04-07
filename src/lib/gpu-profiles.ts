/**
 * GPU profile lists by platform.
 * Shared between inject (WebGL spoofer) and background (signal values computation).
 */

import type { AssignedProfileData } from '@/types';

export interface GPUProfile {
  vendor: string;
  renderer: string;
}

// No Intel GPUs — too similar to real hardware on Macs
export const WINDOWS_GPUS: GPUProfile[] = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 4070 Ti Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)' },
];

export const MAC_GPUS: GPUProfile[] = [
  { vendor: 'Apple Inc.', renderer: 'Apple M1' },
  { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3' },
  { vendor: 'Apple Inc.', renderer: 'Apple M3 Pro' },
  { vendor: 'Apple Inc.', renderer: 'Apple M4' },
];

export const MOBILE_GPUS: GPUProfile[] = [
  { vendor: 'Apple GPU', renderer: 'Apple A16 GPU' },
  { vendor: 'Apple GPU', renderer: 'Apple A17 Pro GPU' },
  { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
  { vendor: 'ARM', renderer: 'Mali-G710 MC10' },
];

export const LINUX_GPUS: GPUProfile[] = [
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 580 (polaris10, DRM 3.49.0)' },
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 6700 XT (navi22, DRM 3.49.0)' },
  { vendor: 'X.Org', renderer: 'AMD Radeon RX 7800 XT (navi32, DRM 3.54.0)' },
  { vendor: 'nouveau', renderer: 'NV136' },
  { vendor: 'nouveau', renderer: 'NV167' },
];

/**
 * Select a GPU matching the profile's platform using the given PRNG.
 */
export function selectGPUForProfile(
  pick: <T>(arr: T[]) => T,
  assignedProfile?: AssignedProfileData
): GPUProfile {
  const platform = assignedProfile?.userAgent?.platformName?.toLowerCase() || '';
  const isMobile = assignedProfile?.userAgent?.mobile ?? false;
  let gpuList: GPUProfile[] = WINDOWS_GPUS;
  if (isMobile) gpuList = MOBILE_GPUS;
  else if (platform.includes('mac') || platform.includes('ios')) gpuList = MAC_GPUS;
  else if (platform.includes('linux')) gpuList = LINUX_GPUS;
  return pick(gpuList);
}
