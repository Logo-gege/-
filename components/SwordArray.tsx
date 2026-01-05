
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  COLOR_JADE, 
  COLOR_GOLD_THUNDER, 
  VIEW_HEIGHT, 
  VIEW_WIDTH, 
  RAIN_COUNT,
  RAIN_DURATION_S
} from '../constants';

interface SwordArrayProps {
  isActive: boolean;
  isRainTriggered: boolean;
  rainProgress: number;
  scaleFactorRef: React.MutableRefObject<number>;
  centerRef: React.MutableRefObject<THREE.Vector3>;
  textureUrl: string | null;
  onComplete: () => void;
}

const SwordArray: React.FC<SwordArrayProps> = ({ 
  isActive, 
  isRainTriggered, 
  rainProgress, 
  scaleFactorRef,
  centerRef,
  textureUrl, 
  onComplete 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRainRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  
  const [phase, setPhase] = useState<'idle' | 'rotating' | 'expanding' | 'raining' | 'completed'>('idle');
  const phaseStartTime = useRef(0);
  const triggerLocked = useRef(false);
  const hasCalledComplete = useRef(false);

  const initialPositions = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    if (isActive) {
      if (phase === 'idle') {
        setPhase('rotating');
        phaseStartTime.current = performance.now() / 1000;
        hasCalledComplete.current = false;
        triggerLocked.current = false;
      }
    } else {
      setPhase('idle');
      triggerLocked.current = false;
      hasCalledComplete.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (isRainTriggered && phase === 'rotating' && !triggerLocked.current) {
      triggerLocked.current = true;
      setPhase('expanding');
      phaseStartTime.current = performance.now() / 1000;
      
      if (groupRef.current) {
        initialPositions.current = groupRef.current.children.map(c => {
           const worldPos = new THREE.Vector3();
           c.getWorldPosition(worldPos);
           return worldPos;
        });
      }
    }
  }, [isRainTriggered, phase]);

  const bladeShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.04, 0);       
    shape.lineTo(0.04, 0);        
    shape.lineTo(0.04, 0.85);      
    shape.lineTo(0, 1.3); 
    shape.lineTo(-0.04, 0.85);     
    shape.closePath();
    return shape;
  }, []);

  const swordConfigs = useMemo(() => {
    const configs = [];
    const layers = [
      { count: 12, radius: 1.4, rotSpeed: 12.0, dir: 1,  z: 1.0 },  
      { count: 24, radius: 2.8, rotSpeed: 9.0,  dir: -1, z: 0.5 }, 
      { count: 36, radius: 4.5, rotSpeed: 6.5,  dir: 1,  z: 0.0 },
      { count: 48, radius: 6.8, rotSpeed: 4.5,  dir: -1, z: -0.5 },
      { count: 60, radius: 9.5, rotSpeed: 3.0,  dir: 1,  z: -1.2 }
    ];
    layers.forEach((layer, layerIdx) => {
      for (let i = 0; i < layer.count; i++) {
        configs.push({
          baseAngle: (i / layer.count) * Math.PI * 2,
          layerIdx,
          baseRadius: layer.radius,
          rotSpeed: layer.rotSpeed,
          dir: layer.dir,
          baseZ: layer.z
        });
      }
    });
    return configs;
  }, []);

  const rainData = useMemo(() => {
    return Array.from({ length: RAIN_COUNT }, (_, i) => {
      const startX = (Math.random() - 0.7) * VIEW_WIDTH * 5.0;
      const startY = VIEW_HEIGHT * 3.0 + Math.random() * 100; 
      return {
        x: startX,
        y: startY,
        speed: 130 + Math.random() * 200,
        scale: 0.15 + Math.random() * 0.55,
        delay: i < 800 ? 0 : Math.random() * (RAIN_DURATION_S - 1.2), 
        rotationOffset: (Math.random() - 0.5) * 0.1
      };
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const elapsedSincePhase = time - phaseStartTime.current;
    const currentCenter = centerRef.current;
    const currentScale = scaleFactorRef.current;

    if (ringRef.current) {
      ringRef.current.visible = isActive && phase !== 'raining' && phase !== 'completed';
      const s = isActive ? (0.95 + Math.sin(time * 1.5) * 0.03) : 0;
      ringRef.current.scale.setScalar(s * currentScale);
      ringRef.current.position.copy(currentCenter);
      ringRef.current.position.z = -2.5;

      const children = ringRef.current.children;
      if (children.length >= 6) {
        children[0].rotation.z = time * 0.45; 
        children[1].rotation.z = -time * 0.65; 
        children[2].rotation.z = time * 0.3;  
        children[3].rotation.z = -time * 0.4;  
        children[4].rotation.z = time * 0.2;  
        children[5].rotation.z = -time * 0.25; 
      }
    }

    if (groupRef.current) {
      if (phase === 'rotating') {
        groupRef.current.position.copy(currentCenter);
        groupRef.current.children.forEach((child, i) => {
          const config = swordConfigs[i];
          const angle = config.baseAngle + time * config.rotSpeed * config.dir;
          
          const shakeAmp = rainProgress > 60 ? (rainProgress - 60) / 40 * 0.15 : 0;
          const chargeInward = rainProgress >= 95 ? (Math.sin(time * 60) * shakeAmp) : 0;
          
          const radius = (config.baseRadius * currentScale) + chargeInward;
          
          const targetX = Math.cos(angle) * radius;
          const targetY = Math.sin(angle) * radius;
          const targetZ = config.baseZ + Math.sin(time * 3 + config.layerIdx) * 0.2;
          
          child.position.x = THREE.MathUtils.lerp(child.position.x, targetX, 0.2);
          child.position.y = THREE.MathUtils.lerp(child.position.y, targetY, 0.2);
          child.position.z = THREE.MathUtils.lerp(child.position.z, targetZ, 0.15);
          
          child.rotation.z = angle - Math.PI / 2 + (Math.sin(time * 8) * 0.04);
          
          const scale = (0.55 - config.layerIdx * 0.06) * (1 + Math.sin(time * 2 + i) * 0.02) * (0.85 + currentScale * 0.15);
          child.scale.setScalar(scale);

          const isGold = rainProgress >= 98;
          const color = isGold ? COLOR_GOLD_THUNDER : COLOR_JADE;
          const intensity = isGold ? 12.0 : 4.5;
          const mat = (child.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          
          // 颜色插值平滑化
          mat.color.lerp(new THREE.Color(color), 0.1);
          mat.emissive.lerp(new THREE.Color(color), 0.1);
          mat.emissiveIntensity = intensity + Math.sin(time * 20) * (isGold ? 6 : 1.5);
        });
      } 
      else if (phase === 'expanding') {
        const expandDuration = 0.5;
        if (elapsedSincePhase >= expandDuration) {
          setPhase('raining');
          phaseStartTime.current = time; 
        }
        const shrinkFactor = elapsedSincePhase < 0.06 ? (1.0 - elapsedSincePhase * 6) : 1.0;
        const pushFactor = Math.max(0, elapsedSincePhase - 0.06) * 450.0;

        groupRef.current.children.forEach((child, i) => {
          const startPos = initialPositions.current[i] || new THREE.Vector3();
          const direction = startPos.clone().sub(currentCenter).normalize();
          if (direction.length() === 0) direction.set(0, 1, 0); 
          
          child.position.copy(startPos).multiplyScalar(shrinkFactor).addScaledVector(direction, pushFactor);
          child.rotation.z = Math.atan2(direction.y, direction.x) - Math.PI / 2;
          child.scale.y = 0.6 * (1 + elapsedSincePhase * 30);
          child.scale.x = 0.2 / (1 + elapsedSincePhase * 10);
        });
      } else {
        groupRef.current.children.forEach(c => c.scale.setScalar(0));
      }
    }

    if (instancedRainRef.current) {
      if (phase === 'raining' || phase === 'expanding') {
        const rainElapsed = phase === 'expanding' ? -0.1 : elapsedSincePhase;
        if (phase === 'raining' && rainElapsed > RAIN_DURATION_S) {
          if (!hasCalledComplete.current) {
            hasCalledComplete.current = true;
            setPhase('completed');
            onComplete();
          }
          return;
        }
        const fadeOutStart = RAIN_DURATION_S - 1.0;
        const opacity = (phase === 'raining' && rainElapsed > fadeOutStart)
          ? 1.0 - (rainElapsed - fadeOutStart) / 1.0 
          : 1.0;
        (instancedRainRef.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, opacity);

        const tempMatrix = new THREE.Matrix4();
        const tempPos = new THREE.Vector3();
        const tempRot = new THREE.Quaternion();
        const tempScale = new THREE.Vector3();
        const baseRotZ = Math.atan2(-1.0, 0.42) - Math.PI / 2;

        rainData.forEach((d, i) => {
          const activeTime = rainElapsed - d.delay;
          if (activeTime > 0) {
            const cycleTime = activeTime % 1.2;
            const currentX = d.x + d.speed * 0.55 * cycleTime;
            const currentY = d.y - d.speed * 2.8 * cycleTime;
            tempPos.set(currentX, currentY, -1.8); 
            tempScale.set(d.scale * 0.65, d.scale * 5.0, d.scale); 
            tempRot.setFromAxisAngle(new THREE.Vector3(0, 0, 1), baseRotZ + d.rotationOffset);
          } else {
            tempScale.setScalar(0);
          }
          tempMatrix.compose(tempPos, tempRot, tempScale);
          instancedRainRef.current!.setMatrixAt(i, tempMatrix);
        });
        instancedRainRef.current.instanceMatrix.needsUpdate = true;
      } else {
        const emptyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        for(let i = 0; i < RAIN_COUNT; i++) {
          instancedRainRef.current.setMatrixAt(i, emptyMatrix);
        }
        instancedRainRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <group ref={ringRef} position={[0, 0, -2.5]}>
        <mesh>
          <ringGeometry args={[1.4, 1.42, 128]} />
          <meshBasicMaterial color={COLOR_JADE} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.48, 1.49, 128]} />
          <meshBasicMaterial color={COLOR_JADE} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh>
          <ringGeometry args={[4.4, 4.415, 128]} />
          <meshBasicMaterial color={COLOR_JADE} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
        <group>
          {Array.from({length: 12}).map((_, i) => {
             const angle = (i / 12) * Math.PI * 2;
             return (
               <mesh key={i} position={[Math.cos(angle)*4.45, Math.sin(angle)*4.45, 0]}>
                 <circleGeometry args={[0.045, 8]} />
                 <meshBasicMaterial color={COLOR_GOLD_THUNDER} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
               </mesh>
             )
          })}
        </group>
        <mesh>
          <ringGeometry args={[6.7, 6.71, 128]} />
          <meshBasicMaterial color={COLOR_JADE} transparent opacity={0.25} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh>
          <ringGeometry args={[6.78, 6.79, 128]} />
          <meshBasicMaterial color={COLOR_JADE} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      <group ref={groupRef}>
        {swordConfigs.map((_, i) => (
          <group key={i} scale={0}>
            {textureUrl ? (
              <mesh>
                <planeGeometry args={[0.7, 2.1]} />
                <meshBasicMaterial map={new THREE.TextureLoader().load(textureUrl)} transparent />
              </mesh>
            ) : (
              <>
                <mesh>
                  <shapeGeometry args={[bladeShape]} />
                  <meshStandardMaterial color={COLOR_JADE} emissive={COLOR_JADE} emissiveIntensity={5.0} transparent opacity={1} />
                </mesh>
                <mesh position={[0, 0, 0.02]}>
                  <planeGeometry args={[0.45, 0.08]} />
                  <meshStandardMaterial color={COLOR_GOLD_THUNDER} emissive={COLOR_GOLD_THUNDER} emissiveIntensity={7.0} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>

      <instancedMesh ref={instancedRainRef} args={[undefined, undefined, RAIN_COUNT]}>
        <shapeGeometry args={[bladeShape]} />
        <meshStandardMaterial 
          color={COLOR_GOLD_THUNDER} 
          emissive={COLOR_GOLD_THUNDER} 
          emissiveIntensity={15.0} 
          transparent 
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
};

export default SwordArray;
