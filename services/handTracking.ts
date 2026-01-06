import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTrackingService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private isInitializing = false;

  async initialize() {
    if (this.handLandmarker || this.isInitializing) return;
    this.isInitializing = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
    } finally {
      this.isInitializing = false;
    }
  }

  setVideo(video: HTMLVideoElement) {
    this.video = video;
  }

  detect(): any {
    if (!this.handLandmarker || !this.video || this.video.readyState < 2) return null;
    const startTimeMs = performance.now();
    return this.handLandmarker.detectForVideo(this.video, startTimeMs);
  }
}

export const handTracker = new HandTrackingService();