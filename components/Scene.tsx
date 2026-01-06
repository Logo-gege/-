import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import Sword from './Sword.tsx';
import SwordArray from './SwordArray.tsx';
import SwordTrail from './SwordTrail.tsx';
import Environment from './Environment.tsx';
import MonsterManager from './MonsterManager.tsx';
import { VIEW_HEIGHT, COLOR_JADE } from '../constants.ts';

interface SceneProps {
  swordTargetRef: React.MutableRefObject<THREE.Vector3>;
  swordRotationRef: React.MutableRefObject<THREE.Euler>;
  arrayScaleFactorRef: React.MutableRefObject<number>;
  swordTextureUrl: string | null;
  isSwordArray: boolean;
  isRain: boolean;
  rainProgress: number;
  onMonsterKill: () => void;
  onComplete: () => void;
}

const Scene: React.FC<SceneProps> = ({ 
  swordTargetRef, 
  swordRotationRef, 
  arrayScaleFactorRef,
  swordTextureUrl, 
  isSwordArray, 
  isRain, 
  rainProgress, 
  onMonsterKill,
  onComplete 
}) => {
  const swordGroupRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      orthographic
      camera={{ 
        near: 0.1, 
        far: 1000, 
        position: [0, 0, 50] 
      }}
      onCreated={({ camera, viewport, gl }) => {
        const factor = viewport.height / VIEW_HEIGHT;
        camera.zoom = factor;
        camera.updateProjectionMatrix();
        // 强制 gl 属性以配合 postprocessing
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      gl={{ 
        antialias: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance"
      }}
      className="w-full h-full"
    >
      <Environment />
      
      {!isSwordArray && (
        <>
          <Sword 
            ref={swordGroupRef} 
            targetPositionRef={swordTargetRef} 
            targetRotationRef={swordRotationRef}
            textureUrl={swordTextureUrl} 
          />
          <SwordTrail swordGroupRef={swordGroupRef} color={COLOR_JADE} />
          
          <MonsterManager 
            swordPosRef={swordTargetRef} 
            swordRotationRef={swordRotationRef}
            onKill={onMonsterKill} 
            active={!isRain} 
          />
        </>
      )}

      <SwordArray 
        isActive={isSwordArray} 
        isRainTriggered={isRain}
        rainProgress={rainProgress}
        scaleFactorRef={arrayScaleFactorRef}
        centerRef={swordTargetRef}
        textureUrl={swordTextureUrl} 
        onComplete={onComplete}
      />

      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom 
          intensity={1.2} 
          luminanceThreshold={0.15} 
          mipmapBlur 
          radius={0.7} 
        />
      </EffectComposer>
    </Canvas>
  );
};

export default Scene;