'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Torus, Box } from '@react-three/drei';
import type { Mesh, Group } from 'three';

function FloatingDiya({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group ref={meshRef} position={position}>
        {/* Diya base */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.5, 0.2, 16]} />
          <meshStandardMaterial color="#c45500" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Flame glow */}
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#ff6b00"
            emissive="#ff6b00"
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Outer flame */}
        <mesh position={[0, 0.35, 0]} scale={[0.8, 1.2, 0.8]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#ffa500"
            emissive="#ffa500"
            emissiveIntensity={1}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </Float>
  );
}

function FloatingFlower({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <Torus
        ref={meshRef}
        args={[0.25, 0.08, 8, 32]}
        position={position}
      >
        <meshStandardMaterial 
          color={color} 
          roughness={0.4}
          metalness={0.2}
        />
      </Torus>
    </Float>
  );
}

function GlowingSphere({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2.5} rotationIntensity={0.2} floatIntensity={1.5}>
      <Sphere args={[0.4, 32, 32]} position={position}>
        <MeshDistortMaterial
          color="#ff6b00"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          emissive="#ff4500"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </Float>
  );
}

function FloatingKalash({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.6}>
      <group ref={groupRef} position={position}>
        {/* Kalash body */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
          <meshStandardMaterial color="#c9a227" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Kalash neck */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.3, 16]} />
          <meshStandardMaterial color="#c9a227" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Coconut on top */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#8B4513" roughness={0.7} />
        </mesh>
      </group>
    </Float>
  );
}

function FloatingOm({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.8} rotationIntensity={0.4} floatIntensity={1}>
      <Box args={[0.6, 0.6, 0.1]} position={position}>
        <meshStandardMaterial 
          color="#ff6b00" 
          roughness={0.2}
          metalness={0.6}
          emissive="#ff4500"
          emissiveIntensity={0.2}
        />
      </Box>
    </Float>
  );
}

function Particles() {
  const count = 50;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
      ref.current.rotation.x = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ff6b00"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export function Splash3DScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#fff5e6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b00" />
        <spotLight
          position={[0, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          color="#ffcc80"
        />

        <FloatingDiya position={[-2.5, 1, 0]} />
        <FloatingDiya position={[2.5, -0.5, 1]} />
        <FloatingKalash position={[2, 1.5, -1]} />
        <GlowingSphere position={[-1.5, -1.5, 0.5]} />
        <FloatingFlower position={[0, 2, -0.5]} color="#ff9933" />
        <FloatingFlower position={[-2, -0.5, -1]} color="#ffcc00" />
        <FloatingFlower position={[1.5, -2, 0]} color="#ff6600" />
        <FloatingOm position={[-0.5, 0.5, 1]} />
        <Particles />
      </Canvas>
    </div>
  );
}
