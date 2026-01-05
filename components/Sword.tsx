
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SWORD_LERP_FACTOR, ORIENTATION_LERP_FACTOR, COLOR_JADE, COLOR_GOLD_THUNDER } from '../constants';

interface SwordProps {
  targetPositionRef: React.MutableRefObject<THREE.Vector3>;
  targetRotationRef: React.MutableRefObject<THREE.Euler>;
  textureUrl: string | null;
}

const Sword = forwardRef<THREE.Group, SwordProps>(({ targetPositionRef, targetRotationRef, textureUrl }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const bladeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useImperativeHandle(ref, () => groupRef.current!);

  // Pre-allocated math objects to avoid GC spikes
  const lastPos = useRef(new THREE.Vector3(0, 0, 0));
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const lastHeading = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const targetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tempQuat1 = useMemo(() => new THREE.Quaternion(), []);
  const tempQuat2 = useMemo(() => new THREE.Quaternion(), []);
  const upAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const rightAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

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

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const safeDelta = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const targetPos = targetPositionRef.current;
    const currentPos = groupRef.current.position;

    const distToTarget = currentPos.distanceTo(targetPos);
    const lerpVal = 1 - Math.pow(1 - SWORD_LERP_FACTOR, safeDelta * 120);
    currentPos.lerp(targetPos, lerpVal);

    velocity.subVectors(currentPos, lastPos.current);
    const moveDist = velocity.length();
    const speed = moveDist / (safeDelta || 0.016);
    
    if (moveDist > 0.001) {
      tempVec.subVectors(targetPos, currentPos).normalize();
      const moveDir = velocity.clone().normalize();
      lastHeading.lerpVectors(moveDir, tempVec, 0.6).normalize();
    }

    const angleZ = Math.atan2(lastHeading.y, lastHeading.x) - Math.PI / 2;
    const bankAngle = targetRotationRef.current.x * 1.5; 
    
    tempQuat1.setFromAxisAngle(upAxis, angleZ);
    tempQuat2.setFromAxisAngle(rightAxis, bankAngle);
    targetQuaternion.copy(tempQuat1).multiply(tempQuat2);
    
    const slerpFactor = 1 - Math.pow(1 - ORIENTATION_LERP_FACTOR, safeDelta * 120);
    groupRef.current.quaternion.slerp(targetQuaternion, slerpFactor);

    if (shockwaveRef.current) {
      const speedIntensity = THREE.MathUtils.clamp((speed - 0.1) * 2.0, 0, 1);
      const waveScale = 1.0 + speedIntensity * 1.5;
      shockwaveRef.current.scale.set(waveScale, waveScale, 1);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = speedIntensity * 0.4;
      shockwaveRef.current.rotation.z = time * 10;
    }

    if (swordRef.current) {
      swordRef.current.position.y = Math.sin(time * 1.2) * 0.06;
      if (bladeMatRef.current) {
        bladeMatRef.current.emissiveIntensity = 1.5 + Math.sin(time * 5) * 0.3 + speed * 0.5;
      }
    }

    lastPos.current.copy(currentPos);
  });

  return (
    <group ref={groupRef}>
      <mesh ref={shockwaveRef} position={[0, 0.6, 0.05]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.2, 0.4, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={swordRef}>
        <mesh>
          <shapeGeometry args={[bladeShape]} />
          <meshStandardMaterial ref={bladeMatRef} color={COLOR_JADE} emissive={COLOR_JADE} emissiveIntensity={2} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
           <planeGeometry args={[0.5, 0.1]} />
           <meshStandardMaterial color={COLOR_GOLD_THUNDER} emissive={COLOR_GOLD_THUNDER} emissiveIntensity={2.5} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
           <planeGeometry args={[0.08, 0.6]} />
           <meshStandardMaterial color="#0a4c2a" emissive="#0a4c2a" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
});

export default Sword;
