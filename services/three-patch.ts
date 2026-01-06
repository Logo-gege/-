import * as THREE from 'three';

const legacyConstants: any = {
  sRGBEncoding: 3001,
  LinearEncoding: 3000,
  S: 3001, // Minified alias for sRGBEncoding
  L: 3000, // Minified alias for LinearEncoding
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'linear-srgb'
};

// Patch the imported object
Object.assign(THREE, legacyConstants);

// Patch global window object for libraries that expect THREE to be global
(window as any).THREE = THREE;

console.log('Three.js legacy constants patched.');
