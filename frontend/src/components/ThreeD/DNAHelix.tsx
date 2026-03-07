import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const DNAHelix = (props: any) => {
  const group = useRef<THREE.Group>(null);
  
  // Create a procedural DNA structure
  // Double Helix: Two strands winding around each other
  const count = 20; // Number of base pairs
  const radius = 2; // Radius of the helix
  const height = 8; // Total height
  const turns = 2; // Number of turns
  
  useFrame(() => {
    if (group.current) {
        // Gentle rotation
        group.current.rotation.y += 0.005;
        // Floating animation via useFrame (or use Float wrapper)
    }
  });

  const points = [];
  
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;
    
    // Strand 1
    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    
    // Strand 2 (opposite side)
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;
    
    points.push({ x1, y, z1, x2, z2 });
  }

  return (
    <group ref={group} {...props}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        {points.map((p, i) => (
          <group key={i}>
            {/* Base Pair Connection (Rod) */}
            <Cylinder 
                args={[0.1, 0.1, radius * 2, 8]} 
                position={[0, p.y, 0]} 
                rotation={[0, (i / (count - 1)) * Math.PI * 2 * turns, Math.PI / 2]}
            >
                <meshStandardMaterial color="#e2e8f0" transparent opacity={0.5} />
            </Cylinder>
            
            {/* Strand 1 Sphere */}
            <Sphere args={[0.4, 16, 16]} position={[p.x1, p.y, p.z1]}>
              <meshStandardMaterial 
                color="#0ea5e9" 
                emissive="#0ea5e9"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.8}
              />
            </Sphere>
            
            {/* Strand 2 Sphere */}
            <Sphere args={[0.4, 16, 16]} position={[p.x2, p.y, p.z2]}>
              <meshStandardMaterial 
                color="#6366f1" 
                emissive="#6366f1"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.8}
              />
            </Sphere>
          </group>
        ))}
      </Float>
    </group>
  );
};

export default DNAHelix;
