import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VIEW_WIDTH, VIEW_HEIGHT, COLOR_JADE } from '../constants';

// Fix for JSX intrinsic element type errors
const Color = 'color' as any;
const AmbientLight = 'ambientLight' as any;
const Points = 'points' as any;
const PointsMaterial = 'pointsMaterial' as any;
const Mesh = 'mesh' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;

const Environment: React.FC = () => {
  const starsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);

  // 1. 生成远景恒星 (数量由 2500 减少至 1250)
  const starData = useMemo(() => {
    const count = 1250;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightness = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * VIEW_WIDTH * 3;
      positions[i * 3 + 1] = (Math.random() - 0.5) * VIEW_HEIGHT * 3;
      positions[i * 3 + 2] = -30 - Math.random() * 50; 
      
      sizes[i] = Math.random() * 0.08 + 0.02;
      brightness[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
    return geo;
  }, []);

  // 2. 生成近景浮动灵尘 (数量由 300 减少至 150)
  const dustData = useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * VIEW_WIDTH * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * VIEW_HEIGHT * 1.5;
      positions[i * 3 + 2] = -5 - Math.random() * 20; 
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: Math.random() * 0.005,
        speed: Math.random() * 0.5 + 0.5
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geo, velocities };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (starsRef.current) {
      starsRef.current.rotation.z = time * 0.01;
    }

    if (dustRef.current) {
      const posAttr = dustRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < dustData.velocities.length; i++) {
        const vel = dustData.velocities[i];
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        
        x += vel.x + Math.sin(time * vel.speed + i) * 0.002;
        y += vel.y + Math.cos(time * vel.speed + i) * 0.002;

        if (Math.abs(x) > VIEW_WIDTH) x = -x;
        if (Math.abs(y) > VIEW_HEIGHT) y = -y;

        posAttr.setXY(i, x, y);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <Color attach="background" args={['#000305']} />
      <AmbientLight intensity={0.2} />

      <Points ref={starsRef} geometry={starData}>
        <PointsMaterial 
          color="#ffffff" 
          size={0.15} 
          sizeAttenuation={true} 
          transparent 
          opacity={0.6} 
          blending={THREE.AdditiveBlending}
        />
      </Points>

      <Points ref={dustRef} geometry={dustData.geo}>
        <PointsMaterial 
          color={COLOR_JADE} 
          size={0.25} 
          sizeAttenuation={true} 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Points>

      <Mesh position={[0, -VIEW_HEIGHT / 2, -15]} rotation={[-Math.PI / 2, 0, 0]}>
        <PlaneGeometry args={[VIEW_WIDTH * 2, 20]} />
        <MeshBasicMaterial color="#000a08" transparent opacity={0.3} />
      </Mesh>
    </>
  );
};

export default Environment;