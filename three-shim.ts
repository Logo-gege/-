import * as THREE_RAW from 'three-raw';

// 定义 postprocessing 需要的常量别名
export const sRGBEncoding = 3001;
export const LinearEncoding = 3000;
export const S = sRGBEncoding; // 核心修复：对应报错中的 'S'
export const L = LinearEncoding; // 对应可能的 'L' 报错

// 创建补丁对象并合并
const THREE_PATCHED = {
  ...THREE_RAW,
  sRGBEncoding,
  LinearEncoding,
  S,
  L,
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'linear-srgb',
};

// 确保 ColorManagement 开启
if (THREE_PATCHED.ColorManagement) {
  THREE_PATCHED.ColorManagement.enabled = true;
}

// 挂载全局，兼容性后盾
(window as any).THREE = THREE_PATCHED;

// 重新导出所有内容
export * from 'three-raw';
export default THREE_PATCHED;