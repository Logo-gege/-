
import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import Sword from './Sword';
import SwordArray from './SwordArray';
import SwordTrail from './SwordTrail';
import Environment from './Environment';
import MonsterManager from './MonsterManager';
import { VIEW_HEIGHT, COLOR_JADE } from '../constants';

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
      onCreated={({ camera, viewport }) => {
        const factor = viewport.height / VIEW_HEIGHT;
        camera.zoom = factor;
        camera.updateProjectionMatrix();
      }}
      gl={{ 
        antialias: false, 
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Environment />
        
        {!isSwordArray && (
          <>
            <Sword 
              ref={swordGroupRef} 
              targetPositionRef={swordTargetRef} 
              targetRotationRef={swordRotationRef}
              textureUrl={swordTextureUrl} 
            />
            {/* 加入残影组件，传入飞剑引用 */}
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

        <EffectComposer disableNormalPass>
          <Bloom 
            intensity={1.2} 
            luminanceThreshold={0.15} 
            mipmapBlur 
            radius={0.7} 
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
};

export default Scene;
