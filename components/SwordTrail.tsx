import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TRAIL_LENGTH, TRAIL_PARTICLE_PER_STEP, COLOR_JADE } from '../constants';

// Fix for JSX intrinsic element type errors
const InstancedMesh = 'instancedMesh' as any;
const CircleGeometry = 'circleGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;

interface SwordTrailProps {
  swordGroupRef: React.RefObject<THREE.Group>;
  color?: string;
}

const SwordTrail: React.FC<SwordTrailProps> = ({ swordGroupRef, color = COLOR_JADE }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // 1. 循环缓冲区状态 (Circular Buffer)
  const buffer = useMemo(() => {
    return {
      positions: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3()),
      quaternions: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Quaternion()),
      speeds: new Float32Array(TRAIL_LENGTH),
      head: 0
    };
  }, []);

  // 2. 粒子随机差异数据
  const randomOffsets = useMemo(() => {
    return Array.from({ length: TRAIL_LENGTH * TRAIL_PARTICLE_PER_STEP }, () => ({
      x: (Math.random() - 0.5) * 0.35,
      y: (Math.random() - 0.5) * 0.35,
      z: (Math.random() - 0.5) * 0.1,
      speed: Math.random() * 2.0 + 1.5,
      scaleVar: Math.random() * 0.5 + 0.5
    }));
  }, []);

  // 3. 复用数学对象
  const _tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const _tempPos = useMemo(() => new THREE.Vector3(), []);
  const _tempQuat = useMemo(() => new THREE.Quaternion(), []);
  const _tempScale = useMemo(() => new THREE.Vector3(), []);
  const _v3 = useMemo(() => new THREE.Vector3(), []);
  const _lastInputPos = useRef(new THREE.Vector3());

  useFrame((state) => {
    const sword = swordGroupRef.current;
    const mesh = meshRef.current;
    if (!mesh || !sword) return;

    const time = state.clock.elapsedTime;
    
    // 物理速度计算
    const currentPos = sword.position;
    const inputDist = currentPos.distanceTo(_lastInputPos.current);
    const currentSpeed = inputDist * 60; 
    _lastInputPos.current.copy(currentPos);

    // 更新循环缓冲区
    buffer.head = (buffer.head + 1) % TRAIL_LENGTH;
    buffer.positions[buffer.head].copy(sword.position);
    buffer.quaternions[buffer.head].copy(sword.quaternion);
    buffer.speeds[buffer.head] = currentSpeed;

    let instanceIdx = 0;
    
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const bufferIdx = (buffer.head - i + TRAIL_LENGTH) % TRAIL_LENGTH;
      
      const pos = buffer.positions[bufferIdx];
      const quat = buffer.quaternions[bufferIdx];
      const speed = buffer.speeds[bufferIdx];
      
      const ageFactor = i / TRAIL_LENGTH; 
      // 更加明显的淡出曲线
      const baseSize = 0.08 * Math.pow(1.0 - ageFactor, 1.5);
      const alpha = 0.4 * Math.pow(1.0 - ageFactor, 2.0);

      for (let j = 0; j < TRAIL_PARTICLE_PER_STEP; j++) {
        const rnd = randomOffsets[instanceIdx];
        
        // 随时间扩散
        const spread = ageFactor * (0.15 + speed * 0.05);
        _v3.set(rnd.x * spread, rnd.y * spread, rnd.z * spread);
        
        _tempPos.copy(pos).add(_v3);
        _tempQuat.copy(quat);
        
        // 运动拉伸与闪烁
        const shimmer = (Math.sin(time * 15 + instanceIdx) * 0.3 + 0.7) * rnd.scaleVar;
        const finalScale = baseSize * shimmer;
        // 速度越快，残影拉得越长
        const stretch = 1.0 + Math.min(speed * 2.5, 8.0); 
        
        _tempScale.set(finalScale, finalScale * stretch, finalScale);

        _tempMatrix.compose(_tempPos, _tempQuat, _tempScale);
        mesh.setMatrixAt(instanceIdx, _tempMatrix);
        instanceIdx++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <InstancedMesh ref={meshRef} args={[undefined, undefined, TRAIL_LENGTH * TRAIL_PARTICLE_PER_STEP]}>
      <CircleGeometry args={[0.2, 8]} />
      <MeshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.3}
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </InstancedMesh>
  );
};

export default SwordTrail;