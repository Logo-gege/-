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
} from '../constants.ts';

// Fix for JSX intrinsic element type errors
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const RingGeometry = 'ringGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const ShapeGeometry = 'shapeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const InstancedMesh = 'instancedMesh' as any;

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
    }

    if (groupRef.current) {
      if (phase === 'rotating') {
        groupRef.current.position.copy(currentCenter);
        groupRef.current.children.forEach((child, i) => {
          const config = swordConfigs[i];
          const angle = config.baseAngle + time * config.rotSpeed * config.dir;
          const radius = (config.baseRadius * currentScale);
          child.position.x = THREE.MathUtils.lerp(child.position.x, Math.cos(angle) * radius, 0.2);
          child.position.y = THREE.MathUtils.lerp(child.position.y, Math.sin(angle) * radius, 0.2);
          child.position.z = THREE.MathUtils.lerp(child.position.z, config.baseZ, 0.15);
          child.rotation.z = angle - Math.PI / 2;
          child.scale.setScalar(0.55 - config.layerIdx * 0.06);
          const mat = (child.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 4.5 + Math.sin(time * 20) * 1.5;
        });
      } 
      else if (phase === 'expanding') {
        const expandDuration = 0.5;
        if (elapsedSincePhase >= expandDuration) {
          setPhase('raining');
          phaseStartTime.current = time; 
        }
        groupRef.current.children.forEach((child, i) => {
          const startPos = initialPositions.current[i] || new THREE.Vector3();
          const direction = startPos.clone().sub(currentCenter).normalize();
          child.position.addScaledVector(direction, elapsedSincePhase * 400);
          child.scale.y = 0.6 * (1 + elapsedSincePhase * 30);
        });
      }
    }

    if (instancedRainRef.current && (phase === 'raining' || phase === 'expanding')) {
      const rainElapsed = phase === 'expanding' ? -0.1 : elapsedSincePhase;
      if (phase === 'raining' && rainElapsed > RAIN_DURATION_S) {
        if (!hasCalledComplete.current) {
          hasCalledComplete.current = true;
          setPhase('completed');
          onComplete();
        }
        return;
      }
      const tempMatrix = new THREE.Matrix4();
      const tempPos = new THREE.Vector3();
      const tempRot = new THREE.Quaternion();
      const tempScale = new THREE.Vector3();
      const baseRotZ = Math.atan2(-1.0, 0.42) - Math.PI / 2;

      rainData.forEach((d, i) => {
        const activeTime = rainElapsed - d.delay;
        if (activeTime > 0) {
          const cycleTime = activeTime % 1.2;
          tempPos.set(d.x + d.speed * 0.55 * cycleTime, d.y - d.speed * 2.8 * cycleTime, -1.8); 
          tempScale.set(d.scale * 0.65, d.scale * 5.0, d.scale); 
          tempRot.setFromAxisAngle(new THREE.Vector3(0, 0, 1), baseRotZ + d.rotationOffset);
        } else {
          tempScale.setScalar(0);
        }
        tempMatrix.compose(tempPos, tempRot, tempScale);
        instancedRainRef.current!.setMatrixAt(i, tempMatrix);
      });
      instancedRainRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <Group ref={ringRef} position={[0, 0, -2.5]}>
        <Mesh>
          <RingGeometry args={[1.4, 1.42, 128]} />
          <MeshBasicMaterial color={COLOR_JADE} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </Mesh>
      </Group>

      <Group ref={groupRef}>
        {swordConfigs.map((_, i) => (
          <Group key={i} scale={0}>
            <Mesh>
              <ShapeGeometry args={[bladeShape]} />
              <MeshStandardMaterial color={COLOR_JADE} emissive={COLOR_JADE} emissiveIntensity={5.0} />
            </Mesh>
          </Group>
        ))}
      </Group>

      <InstancedMesh ref={instancedRainRef} args={[undefined, undefined, RAIN_COUNT]}>
        <ShapeGeometry args={[bladeShape]} />
        <MeshStandardMaterial 
          color={COLOR_GOLD_THUNDER} 
          emissive={COLOR_GOLD_THUNDER} 
          emissiveIntensity={15.0} 
          transparent 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </InstancedMesh>
    </>
  );
};

export default SwordArray;