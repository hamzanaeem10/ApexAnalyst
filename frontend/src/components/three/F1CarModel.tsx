import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

export function F1CarModel(props: any) {
  const group = useRef<THREE.Group>(null);

  // Rotate the car slowly
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2 + Math.PI / 1.2;
    }
  });

  const materialProps = {
    thickness: 0.2,
    roughness: 0,
    transmission: 1,
    ior: 1.5,
    chromaticAberration: 0.02,
    backside: true,
  };

  const bodyColor = "#E10600"; // Ferrari Red
  const detailColor = "#151520"; // Dark

  return (
    <group ref={group} {...props} dispose={null}>
      {/* Main Body / Chassis */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.4, 0.25, 4.5]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Nose Cone */}
      <mesh position={[0, 0.2, 2.8]} rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.4, 1.5, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Front Wing */}
      <group position={[0, 0.1, 3.4]}>
        <mesh>
          <boxGeometry args={[2.2, 0.05, 0.6]} />
          <meshStandardMaterial color={detailColor} metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Endplates */}
        <mesh position={[1.1, 0.15, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.6]} />
          <meshStandardMaterial color={detailColor} />
        </mesh>
        <mesh position={[-1.1, 0.15, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.6]} />
          <meshStandardMaterial color={detailColor} />
        </mesh>
      </group>

      {/* Rear Wing */}
      <group position={[0, 0.8, -2.2]}>
        <mesh>
          <boxGeometry args={[1.8, 0.05, 0.6]} />
          <meshStandardMaterial color={detailColor} metalness={0.5} roughness={0.5} />
        </mesh>
        {/* DRS Flap */}
        <mesh position={[0, 0.2, 0.1]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[1.8, 0.02, 0.4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        {/* Endplates */}
        <mesh position={[0.9, -0.3, 0]}>
          <boxGeometry args={[0.05, 0.8, 0.8]} />
          <meshStandardMaterial color={detailColor} />
        </mesh>
        <mesh position={[-0.9, -0.3, 0]}>
          <boxGeometry args={[0.05, 0.8, 0.8]} />
          <meshStandardMaterial color={detailColor} />
        </mesh>
      </group>

      {/* Sidepods */}
      <group position={[0, 0.3, -0.5]}>
        <mesh position={[0.6, 0, 0]}>
          <boxGeometry args={[0.6, 0.4, 2.5]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.6, 0, 0]}>
          <boxGeometry args={[0.6, 0.4, 2.5]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Engine Cover / Shark Fin */}
      <mesh position={[0, 0.6, -1.0]}>
        <boxGeometry args={[0.15, 0.6, 2.0]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      <Wheel position={[1.0, 0.35, 1.8]} />
      <Wheel position={[-1.0, 0.35, 1.8]} />
      <Wheel position={[1.0, 0.35, -1.8]} scale={1.1} />
      <Wheel position={[-1.0, 0.35, -1.8]} scale={1.1} />

      {/* Halo */}
      <mesh position={[0, 0.6, 0.5]} rotation={[0.5, 0, 0]}>
        <torusGeometry args={[0.3, 0.05, 16, 100, Math.PI]} />
        <meshStandardMaterial color={detailColor} />
      </mesh>
      <mesh position={[0, 0.6, 0.8]} rotation={[0, 0, 0]}>
         <cylinderGeometry args={[0.05, 0.05, 0.6]} />
         <meshStandardMaterial color={detailColor} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, 0.05, -0.2]}>
        <boxGeometry args={[2.0, 0.05, 5.0]} />
        <meshStandardMaterial color="#111" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Wheel({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.41, 16]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wheel Cover Glow */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.21, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color="#E10600" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
