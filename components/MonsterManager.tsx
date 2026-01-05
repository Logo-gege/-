
import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VIEW_WIDTH, VIEW_HEIGHT, MONSTER_COLLISION_RADIUS } from '../constants';

interface Monster {
  id: number;
  type: 'wolf' | 'eagle'; 
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  isDead: boolean;
  deathTime: number;
  seed: number; 
}

interface MonsterManagerProps {
  swordPosRef: React.MutableRefObject<THREE.Vector3>;
  swordRotationRef: React.MutableRefObject<THREE.Euler>;
  onKill: () => void;
  active: boolean;
}

const MonsterManager: React.FC<MonsterManagerProps> = ({ swordPosRef, swordRotationRef, onKill, active }) => {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const lastSpawnTime = useRef(0);
  const monsterIdCounter = useRef(0);

  // 几何体预设
  const eyeGeometry = useMemo(() => new THREE.CircleGeometry(1, 32, 0, Math.PI), []);
  const bodyGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
  const tailSegmentGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const toothGeometry = useMemo(() => new THREE.ConeGeometry(0.06, 0.18, 4), []);
  const shardGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []); 
  
  // 材质预设
  const eyeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: "#ff0000", 
    transparent: true, 
    depthWrite: false, 
    side: THREE.DoubleSide 
  }), []);

  const bodyMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#0a1a25", 
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  }), []);

  const toothMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  }), []);

  const shardMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#00f2ff", 
    emissive: "#4fc3f7",
    emissiveIntensity: 5,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), []);

  // 强化粒子元数据 - 增加到 64 个
  const shardOffsets = useMemo(() => {
    return Array.from({ length: 64 }).map(() => ({
      dir: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize(),
      speed: 3 + Math.random() * 8,
      rotation: new THREE.Euler(Math.random() * 5, Math.random() * 5, Math.random() * 5),
      spiral: (Math.random() - 0.5) * 2.0 // 螺旋偏转率
    }));
  }, []);

  const _eyeCenterPos = useMemo(() => new THREE.Vector3(), []);
  const _swordTip = useMemo(() => new THREE.Vector3(), []);
  const _lineSegment = useMemo(() => new THREE.Line3(), []);
  const _closestPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!active) {
      if (monsters.length > 0) setMonsters([]);
      return;
    }

    const time = state.clock.elapsedTime;

    // 生成逻辑
    const liveMonsters = monsters.filter(m => !m.isDead);
    if (liveMonsters.length === 0 && time - lastSpawnTime.current > 1.2) {
      const types: ('wolf' | 'eagle')[] = ['wolf', 'eagle'];
      setMonsters(prev => [...prev, {
        id: monsterIdCounter.current++,
        type: types[Math.floor(Math.random() * types.length)],
        position: new THREE.Vector3(
          (Math.random() - 0.5) * VIEW_WIDTH * 0.8,
          (Math.random() - 0.5) * VIEW_HEIGHT * 0.7,
          0
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.03, 
          (Math.random() - 0.5) * 0.03, 
          0
        ),
        scale: 1.0 + Math.random() * 0.4,
        isDead: false,
        deathTime: 0,
        seed: Math.random() * 100
      }]);
      lastSpawnTime.current = time;
    }

    setMonsters(prev => {
      const next = prev.filter(m => !(m.isDead && time - m.deathTime > 0.8));
      _swordTip.set(0, 1.3, 0).applyEuler(swordRotationRef.current).add(swordPosRef.current);
      _lineSegment.set(swordPosRef.current, _swordTip);

      return next.map(m => {
        if (m.isDead) return m;

        m.velocity.x += Math.sin(time * 2 + m.seed) * 0.0005;
        m.velocity.y += Math.cos(time * 2 + m.seed) * 0.0005;
        m.position.add(m.velocity);

        const config = getMonsterConfig(m.type);
        _eyeCenterPos.copy(m.position).add(new THREE.Vector3(0, config.height * m.scale, 0.4));
        _lineSegment.closestPointToPoint(_eyeCenterPos, true, _closestPoint);

        const dist = _closestPoint.distanceTo(_eyeCenterPos);
        if (dist < MONSTER_COLLISION_RADIUS) {
          onKill();
          return { ...m, isDead: true, deathTime: time };
        }
        return m;
      });
    });
  });

  const getMonsterConfig = (type: string) => {
    switch(type) {
      case 'wolf':   return { gap: 0.5, height: 0.2, size: 0.05, slant: 0.35, tailLength: 6 };
      case 'eagle':
      default:       return { gap: 0.4, height: 0.4, size: 0.04, slant: 0.3, tailLength: 8 };
    }
  };

  return (
    <group>
      {monsters.map(m => {
        const runtime = performance.now() / 1000;
        const timeSinceDeath = m.isDead ? runtime - m.deathTime : 0;
        const config = getMonsterConfig(m.type);
        
        // 死亡进度：0.0 -> 1.0
        const deathProgress = m.isDead ? Math.min(1, timeSinceDeath * 1.6) : 0;
        
        // 身体快速坍缩：前 30% 死亡时间内缩小，随后彻底消失
        const bodyVisibility = Math.max(0, 1.0 - deathProgress * 4.0);
        const bodyScaleMult = m.isDead ? bodyVisibility : 1.0;
        const opacityMult = m.isDead ? bodyVisibility : 1.0;

        const pulse = Math.sin(runtime * 4 + m.seed) * 0.05 + 1.0;
        const currentBodyScale = m.scale * pulse * bodyScaleMult;
        const angle = Math.atan2(m.velocity.y, m.velocity.x);

        return (
          <group key={m.id} position={[m.position.x, m.position.y, m.position.z]}>
            
            {/* 灵力粒子流 (Death Particle Flow) */}
            {m.isDead && (
              <group position={[0, config.height * m.scale, 0]}>
                {shardOffsets.map((shard, i) => {
                  // 非线性爆发：先快后慢
                  const t = deathProgress;
                  const easedT = 1 - Math.pow(1 - t, 3); 
                  
                  const shardLife = Math.max(0, 1.0 - t * 1.2);
                  const travelDist = easedT * shard.speed * m.scale;
                  
                  // 螺旋轨迹计算
                  const spiralX = Math.sin(t * 10 + i) * shard.spiral * easedT;
                  const spiralY = Math.cos(t * 10 + i) * shard.spiral * easedT;

                  const shardScale = (0.04 + Math.random() * 0.08) * shardLife * m.scale;
                  
                  return (
                    <mesh 
                      key={i} 
                      geometry={shardGeometry} 
                      position={[
                        shard.dir.x * travelDist + spiralX, 
                        shard.dir.y * travelDist + spiralY, 
                        shard.dir.z * travelDist
                      ]}
                      rotation={[
                        shard.rotation.x + t * 5,
                        shard.rotation.y + t * 5,
                        shard.rotation.z
                      ]}
                      scale={shardScale}
                    >
                      <primitive object={shardMaterial} attach="material" opacity={shardLife} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {/* 妖兽主体：死亡时迅速缩并消失 */}
            {bodyVisibility > 0 && (
              <>
                <group rotation={[0, 0, angle + Math.PI]}>
                  {Array.from({ length: config.tailLength }).map((_, i) => {
                    const segmentFactor = (i + 1) / config.tailLength;
                    const wiggle = Math.sin(runtime * 8 - i * 0.8 + m.seed) * (0.1 + segmentFactor * 0.3);
                    const segmentX = (i + 1) * 0.4 * m.scale;
                    const segmentSize = (0.7 - segmentFactor * 0.5) * m.scale * bodyScaleMult;
                    
                    return (
                      <mesh key={i} position={[segmentX, wiggle, -0.1]} geometry={tailSegmentGeometry} scale={segmentSize}>
                        <primitive object={bodyMaterial} attach="material" opacity={0.5 * (1 - segmentFactor) * opacityMult} />
                      </mesh>
                    );
                  })}
                </group>

                <mesh 
                  position={[0, config.height * m.scale, -0.2]} 
                  geometry={bodyGeometry} 
                  scale={[currentBodyScale, currentBodyScale, currentBodyScale * 0.8]}
                >
                  <primitive object={bodyMaterial} attach="material" opacity={0.8 * opacityMult} />
                </mesh>

                {/* 牙齿 */}
                <group position={[0, config.height * m.scale - 0.2 * m.scale, 0.35]} scale={bodyScaleMult}>
                  {[ -1.5, -0.5, 0.5, 1.5 ].map((pos, i) => (
                    <mesh 
                      key={`ut-${i}`} 
                      geometry={toothGeometry} 
                      position={[pos * 0.08 * m.scale, 0.05 * m.scale, 0]} 
                      rotation={[Math.PI, 0, 0]}
                      scale={[0.8, 1.2, 0.8]}
                    >
                      <primitive object={toothMaterial} attach="material" opacity={0.9 * opacityMult} />
                    </mesh>
                  ))}
                  {[ -1, 0, 1 ].map((pos, i) => (
                    <mesh 
                      key={`lt-${i}`} 
                      geometry={toothGeometry} 
                      position={[pos * 0.09 * m.scale, -0.05 * m.scale, 0]} 
                      scale={[0.7, 1.0, 0.7]}
                    >
                      <primitive object={toothMaterial} attach="material" opacity={0.9 * opacityMult} />
                    </mesh>
                  ))}
                </group>

                {/* 眼睛 */}
                <group position={[0, config.height * m.scale, 0.4]} scale={[bodyScaleMult, -bodyScaleMult, bodyScaleMult]}>
                  {[-1, 1].map((side, idx) => {
                    const sideX = (config.gap / 2) * side;
                    const slantRotation = config.slant * -side; 
                    const flicker = (Math.sin(runtime * 20 + m.seed + idx) * 0.15 + 0.85);

                    return (
                      <mesh 
                        key={idx} 
                        geometry={eyeGeometry} 
                        position={[sideX, 0, 0]} 
                        rotation={[0, 0, slantRotation]}
                        scale={[config.size * 2.5, config.size * 1.2, 1]}
                      >
                        <primitive object={eyeMaterial} attach="material" opacity={0.9 * flicker * opacityMult} />
                      </mesh>
                    );
                  })}
                </group>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default MonsterManager;
