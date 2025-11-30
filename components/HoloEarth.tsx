import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { HandData } from './HandTracker';

interface HoloEarthProps {
  handDataRef: React.MutableRefObject<HandData>;
  onLocationSelect: (lat: number, lon: number) => void;
  selectedLocation: { lat: number, lon: number } | null;
}

// --- Textures ---
const EARTH_TEXTURES = {
  map: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
  specular: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  normal: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
  clouds: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
};

const LocationMarker = ({ position }: { position: THREE.Vector3 }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
         <sphereGeometry args={[0.03, 16, 16]} />
         <meshBasicMaterial color="#ff3366" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
         <cylinderGeometry args={[0.005, 0.005, 0.5]} />
         <meshBasicMaterial color="#ff3366" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color="#ff3366" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const RealisticEarth = ({ handDataRef, onLocationSelect, selectedLocation }: HoloEarthProps) => {
  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [textures, setTextures] = useState<any>(null);
  
  // Previous hand position for calculating Drag Delta
  const lastHandPos = useRef<{x: number, y: number} | null>(null);

  // Load textures manually to ensure they exist before rendering
  const [colorMap, specularMap, normalMap, cloudsMap] = useTexture([
    EARTH_TEXTURES.map,
    EARTH_TEXTURES.specular,
    EARTH_TEXTURES.normal,
    EARTH_TEXTURES.clouds
  ]);

  useFrame((state, delta) => {
    if (!earthRef.current) return;

    const handData = handDataRef.current;

    // --- CLOUD ANIMATION ---
    if (cloudsRef.current) {
        cloudsRef.current.rotation.y += delta * 0.02; // Slow independent cloud rotation
    }

    // --- INTERACTION LOGIC (GRAB & DRAG) ---
    if (handData.active) {
       // If this is the first frame of a grab, just store position, don't move yet
       if (!lastHandPos.current) {
           lastHandPos.current = { x: handData.x, y: handData.y };
           return;
       }

       // Calculate Delta (Movement since last frame)
       const deltaX = handData.x - lastHandPos.current.x;
       const deltaY = handData.y - lastHandPos.current.y;

       // Apply Rotation
       // Moving Hand LEFT (negative X) should rotate Earth LEFT (negative Y rotation)
       // Sensitivity Multiplier: 10
       earthRef.current.rotation.y += deltaX * 10; 
       earthRef.current.rotation.x += deltaY * 10;

       // Update last pos
       lastHandPos.current = { x: handData.x, y: handData.y };

    } else {
        // Reset drag state
        lastHandPos.current = null;

        // Auto Rotation (Idle)
        if (!selectedLocation) {
             earthRef.current.rotation.y += delta * 0.05;
        }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const point = e.point;
    
    if (earthRef.current) {
        // Convert world point to local point relative to the Earth Group
        const localPoint = earthRef.current.worldToLocal(point.clone());
        
        // Normalize to unit sphere (radius 1) for math, although our sphere is radius 2
        localPoint.normalize();

        // Calculate Lat/Lon
        // Y is up in Three.js default
        const phi = Math.acos(localPoint.y); // Angle from North Pole
        const theta = Math.atan2(localPoint.x, localPoint.z); // Angle around Y axis

        const lat = 90 - (phi * 180 / Math.PI);
        const lon = (theta * 180 / Math.PI);
        
        onLocationSelect(lat, lon);
    }
  };

  return (
    <group ref={earthRef} onPointerDown={handlePointerDown} onPointerOver={() => document.body.style.cursor = 'crosshair'} onPointerOut={() => document.body.style.cursor = 'default'}>
      {/* 1. SURFACE SPHERE */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial 
            map={colorMap}
            specularMap={specularMap}
            normalMap={normalMap}
            specular={new THREE.Color(0x333333)}
            shininess={15}
        />
      </mesh>

      {/* 2. CLOUD LAYER */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.02, 64, 64]} />
        <meshPhongMaterial 
            map={cloudsMap}
            transparent={true}
            opacity={0.8}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
      </mesh>

      {/* 3. ATMOSPHERE GLOW (Fresnel Effect) */}
      <mesh>
        <sphereGeometry args={[2.1, 64, 64]} />
        <meshPhongMaterial
            color="#44aaff"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Selected Location Marker */}
      {selectedLocation && (
          <LocationMarker position={new THREE.Vector3(
              2.02 * Math.sin((90 - selectedLocation.lat) * Math.PI / 180) * Math.sin(selectedLocation.lon * Math.PI / 180),
              2.02 * Math.cos((90 - selectedLocation.lat) * Math.PI / 180),
              2.02 * Math.sin((90 - selectedLocation.lat) * Math.PI / 180) * Math.cos(selectedLocation.lon * Math.PI / 180)
          )} />
      )}
    </group>
  );
};

const HoloEarth: React.FC<HoloEarthProps> = (props) => {
  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 6], fov: 45 }} 
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
        {/* REALISTIC SPACE LIGHTING */}
        <ambientLight intensity={0.1} color="#404040" /> {/* Dim ambient space light */}
        <directionalLight 
            position={[10, 5, 5]} 
            intensity={2.5} 
            castShadow 
            color="#ffffff"
        />
        <pointLight position={[-10, 0, -10]} intensity={0.5} color="#001133" /> {/* Blue rim light from back */}
        
        {/* Background Stars */}
        <Stars radius={300} depth={50} count={10000} factor={4} saturation={0} fade speed={0} />
        
        <React.Suspense fallback={null}>
             <RealisticEarth {...props} />
        </React.Suspense>
        
        <OrbitControls 
            enableZoom={true} 
            minDistance={2.5}
            maxDistance={15}
            enablePan={true}
            // Disable Mouse Rotate ONLY if hand is active
            enableRotate={!props.handDataRef.current.active}
            autoRotate={!props.handDataRef.current.active && !props.selectedLocation}
            autoRotateSpeed={0.5} 
            zoomSpeed={0.8}
            rotateSpeed={0.5}
            dampingFactor={0.1}
        />
      </Canvas>
    </div>
  );
};

export default HoloEarth;