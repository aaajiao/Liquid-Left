
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Environment, BakeShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, LevelType } from './store';
import { World } from './components/World';
import { Player } from './components/Player';
import { PuzzleManager } from './components/Puzzle';
import { UI } from './components/UI';

const LEVEL_THEMES: Record<LevelType, { bg: string, fog: string }> = {
  PROLOGUE: { bg: '#2a0a10', fog: '#501020' }, 
  CHAPTER_1: { bg: '#fff0f5', fog: '#ffc0cb' }, 
  NAME: { bg: '#050010', fog: '#1a0b2e' }, // Deep dark violet void for NAME
  CHEWING: { bg: '#f0fff0', fog: '#98fb98' },
  WIND: { bg: '#ffe4e1', fog: '#fa8072' },
  TRAVEL: { bg: '#000020', fog: '#191970' },
  CONNECTION: { bg: '#fcfbf9', fog: '#dbe7f0' }, // Bone White bg with Sketch Blue fog
  HOME: { bg: '#000005', fog: '#000010' },
  SUN: { bg: '#2a0a0a', fog: '#8b0000' }
};

const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const { isMouseDown, hoveredNodeId, isInteractiveHover } = useGameStore();
  
  // Mobile check: hide cursor on touch devices
  const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    if (isTouch) return;
    const onMouseMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isTouch]);

  if (isTouch) return null;

  return (
    <div className="fixed top-0 left-0 pointer-events-none z-[100]" style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}>
        {/* Core Light */}
        <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200 shadow-[0_0_10px_#fff]
            ${isMouseDown ? 'w-3 h-3 opacity-100' : 'w-4 h-4 opacity-90'}
        `} />
        
        {/* Outer Glow / Halo */}
        <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 blur-sm
            ${isMouseDown ? 'w-8 h-8 bg-cyan-300/40' : 'w-12 h-12 bg-pink-300/30'}
        `} />

        {/* Interaction Ring */}
        <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 transition-all duration-300
            ${hoveredNodeId || isInteractiveHover ? 'w-12 h-12 scale-100 rotate-180 opacity-100 border-2 bg-white/10' : 'w-4 h-4 scale-0 opacity-0'}
        `} style={{ borderStyle: 'dashed' }} />
    </div>
  );
};

const DynamicBackground: React.FC = () => {
  const { scene } = useThree();
  const currentLevel = useGameStore((state) => state.currentLevel);
  const colorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.bg));
  const fogColorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.fog));
  
  useFrame((state, delta) => {
    const theme = LEVEL_THEMES[currentLevel];
    colorRef.current.lerp(new THREE.Color(theme.bg), delta * 0.5);
    fogColorRef.current.lerp(new THREE.Color(theme.fog), delta * 0.5);
    scene.background = colorRef.current;
    if (!scene.fog) scene.fog = new THREE.Fog(fogColorRef.current, 10, 60);
    else { (scene.fog as THREE.Fog).color.copy(fogColorRef.current); (scene.fog as THREE.Fog).far = currentLevel === 'HOME' ? 80 : 40; }
  });
  return null;
};

const CameraController = () => {
    const { camera } = useThree();
    const playerPos = useGameStore((state) => state.playerPos);
    const currentLevel = useGameStore((state) => state.currentLevel);
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        if (!controlsRef.current) return;
        const offset = new THREE.Vector3(20, 20, 20);
        let zoom = 40;
        
        if (currentLevel === 'PROLOGUE') { offset.set(15, 15, 15); zoom = 40; }
        else if (currentLevel === 'CHEWING') { offset.set(10, 20, 10); zoom = 60; } // Close up
        else if (currentLevel === 'TRAVEL') { offset.set(30, 30, 30); zoom = 25; } // Wide
        else if (currentLevel === 'HOME') { offset.set(0, 30, 30); zoom = 30; }
        else if (currentLevel === 'SUN') { offset.set(20, 10, 20); zoom = 35; }

        camera.position.copy(playerPos).add(offset);
        camera.lookAt(playerPos);
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        controlsRef.current.target.copy(playerPos);
        controlsRef.current.update();
    }, [currentLevel]);

    useFrame(() => {
        if (controlsRef.current) {
            controlsRef.current.target.lerp(playerPos, 0.1);
            controlsRef.current.update();
        }
    });

    return (
        <OrbitControls 
            ref={controlsRef} 
            enableDamping 
            minDistance={10} 
            maxDistance={100} 
            maxPolarAngle={Math.PI / 2 - 0.1} 
            mouseButtons={{ LEFT: undefined as any, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} 
            touches={{ ONE: undefined as any, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        />
    );
}

const App: React.FC = () => {
    const startLevel = useGameStore((state) => state.startLevel);

    // Test Mode: Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch(e.key) {
                case '1': startLevel('PROLOGUE'); break;
                case '2': startLevel('CHAPTER_1'); break;
                case '3': startLevel('NAME'); break;
                case '4': startLevel('CHEWING'); break;
                case '5': startLevel('WIND'); break;
                case '6': startLevel('TRAVEL'); break;
                case '7': startLevel('CONNECTION'); break;
                case '8': startLevel('HOME'); break;
                case '9': startLevel('SUN'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [startLevel]);

    return (
        <div className="w-full h-screen bg-[#fdf4f5] relative overflow-hidden cursor-none">
        <CustomCursor />
        <UI />
        <Canvas shadows dpr={[1, 2]} onContextMenu={(e) => e.preventDefault()}>
            <Suspense fallback={null}>
            <DynamicBackground />
            <CameraController />
            <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={40} near={-50} far={200} />
            <ambientLight intensity={0.6} color="#ffeaf0" />
            <spotLight position={[10, 20, 5]} angle={0.3} penumbra={1} intensity={2} castShadow color="#fff" />
            <Environment preset="sunset" blur={1} />
            <World />
            <PuzzleManager />
            <Player />
            <BakeShadows />
            </Suspense>
        </Canvas>
        </div>
    );
};
export default App;
