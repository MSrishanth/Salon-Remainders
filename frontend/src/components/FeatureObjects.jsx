import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';

function TrimmerMesh() {
  const group = useRef();
  
  useFrame((state) => {
    // Buzzing effect
    group.current.position.x = Math.sin(state.clock.elapsedTime * 50) * 0.02;
    group.current.position.y = Math.cos(state.clock.elapsedTime * 40) * 0.02;
  });

  return (
    <group ref={group} rotation={[0.5, -0.5, 0]}>
      {/* Body */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.3, 2, 16]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.8, 0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Blade */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.1]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

export function Trimmer() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      <TrimmerMesh />
    </Canvas>
  );
}

function BellMesh() {
  const group = useRef();
  
  useFrame((state) => {
    // Swinging effect
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });

  return (
    <group ref={group}>
      {/* Bell Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.6, 1, 16]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Bell Top */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Clapper */}
      <mesh position={[0, -0.6, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

export function Bell() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      <BellMesh />
    </Canvas>
  );
}

function StarMesh() {
  const group = useRef();
  
  useFrame((state, delta) => {
    // Rotating effect
    group.current.rotation.y += delta;
    group.current.rotation.x += delta * 0.5;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
    </group>
  );
}

export function Star() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      <StarMesh />
    </Canvas>
  );
}
