import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, ContactShadows, Stars, Sparkles } from '@react-three/drei';
import { F1CarModel } from './F1CarModel';
import { Suspense } from 'react';

export default function Scene() {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas>
        <PerspectiveCamera makeDefault position={[4, 2, 5]} fov={45} />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
          
          <group position={[0, -0.5, 0]}>
            <F1CarModel />
            
            <ContactShadows 
              resolution={1024} 
              scale={10} 
              blur={1} 
              opacity={0.5} 
              far={1} 
              color="#000000" 
            />
          </group>

          {/* Dramatic Lighting */}
          <ambientLight intensity={0.5} />
          <spotLight 
            position={[10, 10, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={10} 
            castShadow 
            color="#E10600"
          />
          <pointLight position={[-10, -10, -10]} intensity={5} color="#0090FF" />

          {/* Particles for speed/tech feel */}
          <Sparkles count={100} scale={10} size={4} speed={0.4} opacity={0.5} color="#E10600" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Suspense>

        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
