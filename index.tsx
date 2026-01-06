import './services/three-patch.ts';
import * as THREE from 'three';
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { audioService } from './services/audioService.ts';
import { handTracker } from './services/handTracking.ts';
import Scene from './components/Scene.tsx';
import { 
  LANDMARK_INDEX_FINGER_TIP, 
  LANDMARK_INDEX_FINGER_MCP,
  LANDMARK_WRIST,
  VIEW_HEIGHT, 
  PLANE_DEPTH,
  PREDICTION_MS,
  VELOCITY_SMOOTHING,
  MONSTERS_TO_KILL
} from './constants.ts';

type SwordMode = 'single' | 'array';

const StatusSidebar = memo(({ progressRef, mode, handCount, hint, kills, isRain }: any) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const sync = () => {
      setDisplayProgress(Math.floor(progressRef.current || 0));
      animationFrameId = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(animationFrameId);
  }, [progressRef]);

  const getStatusTitle = () => {
    if (isRain) return "剑雨";
    if (mode === 'array') return "起阵";
    return "斩妖";
  };

  return (
    <div className="absolute top-0 left-0 h-full flex items-center pl-8 z-50 pointer-events-none">
      <div className="bg-black/40 backdrop-blur-3xl border border-white/10 border-l-[3px] border-l-[#2ecc71] rounded-r-3xl py-10 px-4 flex flex-col items-center gap-10 shadow-2xl w-[140px] relative overflow-hidden transition-all duration-500">
        <div className="flex flex-col items-center gap-1 min-h-[120px] justify-center text-center">
          {getStatusTitle().split('').map((char, i) => (
            <span key={i} className="text-4xl font-xianshi font-bold text-[#2ecc71] leading-none drop-shadow-[0_0_15px_#2ecc71] transition-all duration-500">
              {char}
            </span>
          ))}
        </div>
        <div className="w-8 h-[1px] bg-white/20" />
        <div className="flex flex-col gap-6 items-center text-center">
          <div className="flex flex-col gap-1">
            <p className="text-[9px] text-white/30 tracking-widest uppercase mb-1 font-xianshi">斩获</p>
            <p className="text-xl font-bold text-yellow-400 font-cinzel">{kills} / {MONSTERS_TO_KILL}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 relative">
          <p className="text-[8px] tracking-[0.2em] text-white/40 uppercase [writing-mode:vertical-lr] mb-2 font-xianshi">灵气进度</p>
          <div className="w-2 h-40 bg-white/5 rounded-full overflow-hidden relative border border-white/10 p-[1px]">
            <div 
              className={`absolute bottom-0 left-0 w-full transition-all duration-300 ${displayProgress >= 100 ? 'bg-yellow-400' : 'bg-[#2ecc71]'}`} 
              style={{ height: `${displayProgress}%` }} 
            />
          </div>
          <p className={`text-[11px] font-bold font-cinzel ${displayProgress >= 100 ? 'text-yellow-400' : 'text-[#2ecc71]'}`}>{displayProgress}%</p>
        </div>
        <div className="mt-auto opacity-40 flex flex-col items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${handCount > 0 ? 'bg-[#2ecc71] shadow-[0_0_10px_#2ecc71]' : 'bg-red-500'} animate-pulse`} />
          <p className="text-[8px] [writing-mode:vertical-lr] tracking-[0.3em] text-white/50 font-xianshi">{hint}</p>
        </div>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [mode, setMode] = useState<SwordMode>('single');
  const [isRainActive, setIsRainActive] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [hint, setHint] = useState('接入灵识');
  const [shake, setShake] = useState(false);
  const [kills, setKills] = useState(0);

  const progressRef = useRef(0);
  const swordTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const swordRotationRef = useRef(new THREE.Euler(0, 0, Math.PI));
  const arrayScaleFactorRef = useRef(1.0); 
  
  const lastRawPos = useRef(new THREE.Vector3(0, 0, 0));
  const stableTargetPos = useRef(new THREE.Vector3(0, 0, 0)); 
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const stableRotation = useRef({ x: 0, z: Math.PI });

  const isTransitioning = useRef(false);
  const isLocked = useRef(false);
  const pendingHandCount = useRef(0);
  const modeConfirmTimer = useRef(0);

  useEffect(() => {
    handTracker.initialize();
  }, []);

  const startCamera = async () => {
    if (isStarting) return;
    setIsStarting(true);
    await audioService.init();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          handTracker.setVideo(videoRef.current!);
          setIsCameraActive(true);
          setIsStarting(false);
        };
      }
    } catch (err) {
      setIsStarting(false);
      console.error("Camera error:", err);
      alert("无法访问摄像头。");
    }
  };

  const handleMonsterKill = useCallback(() => {
    setKills(prev => {
      const next = Math.min(MONSTERS_TO_KILL, prev + 1);
      progressRef.current = (next / MONSTERS_TO_KILL) * 100;
      audioService.playExplosion(); 
      audioService.playMonsterHowl();
      setShake(true);
      setTimeout(() => setShake(false), 50);
      return next;
    });
  }, []);

  const changeMode = useCallback((newMode: SwordMode) => {
    if (mode === 'array' && newMode === 'single') audioService.stopArraySounds();
    setMode(newMode);
  }, [mode]);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const triggerRain = () => {
      if (isTransitioning.current) return;
      isTransitioning.current = true;
      setIsRainActive(true);
      setShake(true);
      audioService.playExplosion();
      audioService.playSwordRain();
      setTimeout(() => setShake(false), 800);
    };

    const update = () => {
      const results = handTracker.detect();
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      lastTime = now;

      if (!isTransitioning.current && !isLocked.current && !isRainActive) {
        let rawHandCount = results?.landmarks?.length || 0;
        
        if (rawHandCount === 2) {
          const w1 = results.landmarks[0][LANDMARK_WRIST];
          const w2 = results.landmarks[1][LANDMARK_WRIST];
          const distSq = Math.pow(w1.x - w2.x, 2) + Math.pow(w1.y - w2.y, 2);
          if (distSq < 0.0225) rawHandCount = 1;
        }

        if (rawHandCount !== pendingHandCount.current) {
          pendingHandCount.current = rawHandCount;
          modeConfirmTimer.current = 0;
        } else {
          modeConfirmTimer.current += dt;
        }

        if (modeConfirmTimer.current >= 200) {
          if (rawHandCount !== handCount) setHandCount(rawHandCount);
          if (rawHandCount === 1 && mode !== 'single') changeMode('single');
          else if (rawHandCount === 2 && mode !== 'array') {
            if (progressRef.current >= 99) changeMode('array');
            else setHint('灵气不足，无法结阵');
          } else if (rawHandCount === 0 && mode === 'array') {
            if (progressRef.current >= 98) triggerRain();
            else changeMode('single');
          }
        }

        if (rawHandCount > 0) {
          const hand1 = results.landmarks[0];
          if (mode === 'single' || (mode === 'array' && rawHandCount === 1)) {
            const tip = hand1[LANDMARK_INDEX_FINGER_TIP];
            const mcp = hand1[LANDMARK_INDEX_FINGER_MCP];
            const wrist = hand1[LANDMARK_WRIST];
            const aspect = window.innerWidth / window.innerHeight;
            const palmSize = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));
            
            const rawPos = new THREE.Vector3(
              ((1 - tip.x) * 2 - 1) * (VIEW_HEIGHT * aspect / 2),
              -(tip.y * 2 - 1) * (VIEW_HEIGHT / 2),
              THREE.MathUtils.mapLinear(palmSize, 0.08, 0.32, -5, 5)
            );

            const currentVel = new THREE.Vector3().subVectors(rawPos, lastRawPos.current).divideScalar(dt);
            velocity.current.lerp(currentVel, VELOCITY_SMOOTHING);

            const predictionOffset = velocity.current.clone().multiplyScalar(PREDICTION_MS);
            const predictedPos = rawPos.clone().add(predictionOffset);
            const dist = predictedPos.distanceTo(stableTargetPos.current);
            
            stableTargetPos.current.lerp(predictedPos, 0.3);
            swordTargetRef.current.copy(stableTargetPos.current);
            lastRawPos.current.copy(rawPos);
            
            audioService.updateSwordSFX(velocity.current.length() * 100, dist);
            
            const targetRotationZ = Math.atan2(-(tip.y - mcp.y), -(tip.x - mcp.x)) - Math.PI / 2;
            stableRotation.current.z = THREE.MathUtils.lerp(stableRotation.current.z, targetRotationZ, 0.25);
            swordRotationRef.current.z = stableRotation.current.z;

            setHint(progressRef.current < 100 ? '控剑斩妖，积攒灵气' : '灵气已满，双手结阵');
          } else if (mode === 'array' && rawHandCount === 2) {
            const hand2 = results.landmarks[1];
            const distHands = Math.sqrt(Math.pow(hand1[0].x - hand2[0].x, 2) + Math.pow(hand1[0].y - hand2[0].y, 2));
            arrayScaleFactorRef.current = THREE.MathUtils.lerp(arrayScaleFactorRef.current, THREE.MathUtils.mapLinear(distHands, 0.1, 0.6, 0.6, 2.2), 0.15);
            audioService.updateArrayCharge(progressRef.current, true);
            swordTargetRef.current.lerp(new THREE.Vector3(0, 0, PLANE_DEPTH), 0.1);
            setHint('剑阵已成，撤手发雨');
          }
        }
      }
      animationId = requestAnimationFrame(update);
    };

    if (isCameraActive) update();
    return () => cancelAnimationFrame(animationId);
  }, [isCameraActive, mode, isRainActive, handCount, handleMonsterKill, changeMode]);

  const onSequenceComplete = () => {
    audioService.stopArraySounds();
    isTransitioning.current = false;
    setIsRainActive(false);
    changeMode('single');
    progressRef.current = 0;
    setKills(0);
    isLocked.current = true;
    setTimeout(() => { isLocked.current = false; }, 1000);
  };

  const trigrams = ["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${shake ? 'animate-pulse' : ''}`}>
      <Scene 
        swordTargetRef={swordTargetRef} 
        swordRotationRef={swordRotationRef}
        arrayScaleFactorRef={arrayScaleFactorRef}
        swordTextureUrl={null} 
        isSwordArray={mode === 'array'}
        isRain={isRainActive}
        rainProgress={progressRef.current}
        onMonsterKill={handleMonsterKill}
        onComplete={onSequenceComplete}
      />

      <StatusSidebar progressRef={progressRef} mode={mode} handCount={handCount} hint={hint} kills={kills} isRain={isRainActive} />

      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05080a] z-[100]">
           <div className="relative flex flex-col items-center gap-12 cursor-pointer" onClick={startCamera}>
              <div className="relative w-80 h-80 flex items-center justify-center">
                 <div className="absolute inset-0 border-4 border-[#2ecc71]/20 rounded-full animate-spin-slow" />
                 <div className="absolute inset-6 border-2 border-dashed border-[#2ecc71]/40 rounded-full animate-spin-reverse" />
                 <div className="absolute w-full h-full flex items-center justify-center">
                    {trigrams.map((t, i) => (
                      <div key={i} className="bagua-item font-bold" style={{ transform: `rotate(${i * 45}deg) translateY(-140px)` }}>{t}</div>
                    ))}
                 </div>
                 <h1 className="text-3d-emboss font-calligraphy text-7xl select-none z-10">凡人修仙</h1>
              </div>
              <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${isStarting ? 'opacity-50 scale-95' : 'opacity-100'}`}>
                <p className="text-[#2ecc71]/60 text-xs tracking-[0.5em] font-xianshi uppercase">开启仙路 • 感应灵识</p>
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#2ecc71]/40 to-transparent" />
              </div>
           </div>
        </div>
      )}
      
      <div className={`absolute top-10 right-10 transition-all duration-1000 ${isCameraActive ? 'opacity-90' : 'opacity-0'}`}>
        <div className="w-48 h-32 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-3xl" />
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);