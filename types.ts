
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandResult {
  landmarks: Point3D[][];
  worldLandmarks: Point3D[][];
}

export interface AppState {
  isCameraReady: boolean;
  isTracking: boolean;
  swordTextureUrl: string | null;
}
