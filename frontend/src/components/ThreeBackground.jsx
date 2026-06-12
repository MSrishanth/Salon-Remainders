import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';

function FloatingScissors() {
  const group = useRef();

  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.2;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    group.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5;
  });

  return (
    <group ref={group} scale={2}>
      {/* Blade 1 */}
      <mesh position={[0.5, 2, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.2, 3, 0.05]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Handle 1 */}
      <mesh position={[0.8, -0.5, 0]}>
        <torusGeometry args={[0.4, 0.1, 16, 32]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>

      {/* Blade 2 */}
      <mesh position={[-0.5, 2, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.2, 3, 0.05]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      {/* Handle 2 */}
      <mesh position={[-0.8, -0.5, 0]}>
        <torusGeometry args={[0.4, 0.1, 16, 32]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>

      {/* Screw */}
      <mesh position={[0, 0.5, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function FloatingShapes() {
  const shapes = useRef();

  useFrame((state, delta) => {
    shapes.current.rotation.y -= delta * 0.1;
  });

  return (
    <group ref={shapes}>
      {/* Abstract Ring */}
      <mesh position={[-5, 3, -5]} rotation={[1, 1, 0]}>
        <torusGeometry args={[1.5, 0.3, 16, 32]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
      
      {/* Abstract Cube */}
      <mesh position={[6, -2, -3]} rotation={[0.5, 0.5, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#ffffff" />
        <Edges color="black" threshold={15} scale={1.05} />
      </mesh>
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        {/* We use basic materials and Edges to maintain the brutalist flat 2D/3D look */}
        <FloatingScissors />
        <FloatingShapes />
      </Canvas>
    </div>
  );
}
