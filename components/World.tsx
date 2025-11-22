
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles, Cloud, Stars, Text, Float, Billboard, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, EnvFeature } from '../store';
import { playBubbleHover, playMushroomHover, playSunHover, playWindBlock, playWindDamage } from '../utils/audio';

const PhysicsPlane: React.FC = () => {
    const { setCursorWorldPos, setMouseDown, cancelDrag, interactionMode } = useGameStore();
    return (
        <mesh 
            rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={true} 
            onPointerMove={(e) => { if (e.isPrimary) setCursorWorldPos(e.point); }}
            onPointerDown={(e) => { if (e.isPrimary && e.button === 0) setMouseDown(true); }}
            onPointerUp={(e) => { if (e.isPrimary) { setMouseDown(false); cancelDrag(); } }}
        >
            <planeGeometry args={[200, 200]} />
            <meshBasicMaterial color="red" transparent opacity={0} />
        </mesh>
    )
}

export const World: React.FC = () => {
  const { currentLevel, envFeatures, rainLevel } = useGameStore();
  
  return (
    <group>
       <PhysicsPlane />

       {currentLevel === 'HOME' ? <LakeBed /> : <BreathingGround level={currentLevel} rainLevel={rainLevel} />}

       {envFeatures.map((feature) => (
           <OrganicFeature key={feature.id} feature={feature} />
       ))}

       {currentLevel === 'WIND' && <WindDanmakuSystem />}

       <Atmosphere level={currentLevel} />
    </group>
  );
};

const BreathingGround: React.FC<{ level: string, rainLevel?: number }> = ({ level, rainLevel = 0 }) => {
    const materialRef = useRef<any>(null);
    let color = "#d88";
    if (level === 'CHAPTER_1') color = "#fff0f5";
    if (level === 'NAME') color = "#1a0b2e"; 
    if (level === 'CHEWING') color = "#90ee90"; 
    if (level === 'WIND') color = "#ffe4e1"; 
    if (level === 'TRAVEL') color = "#000020"; 
    if (level === 'CONNECTION') color = "#fcfbf9"; // Bone White
    if (level === 'SUN') color = "#2a0a0a"; 

    // Dynamic Water Transformation for Sun Finale
    useFrame((state) => {
        if (level === 'SUN' && rainLevel > 0 && materialRef.current) {
            const waterColor = new THREE.Color("#8b0000"); // Blood Red Water
            const groundColor = new THREE.Color("#2a0a0a");
            const progress = Math.min(rainLevel / 5, 1);
            materialRef.current.color.lerpColors(groundColor, waterColor, progress);
            materialRef.current.roughness = THREE.MathUtils.lerp(0.4, 0.02, progress);
            materialRef.current.metalness = THREE.MathUtils.lerp(0.1, 0.8, progress);
            materialRef.current.distort = THREE.MathUtils.lerp(0.15, 0.5, progress); // More waves
            materialRef.current.speed = THREE.MathUtils.lerp(1, 2, progress);
        }
    });

    const yPos = level === 'SUN' ? -0.5 + rainLevel : -0.5;

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yPos, 0]} receiveShadow>
            <planeGeometry args={[50, 200, 128, 128]} />
            <MeshDistortMaterial ref={materialRef} color={color} roughness={0.4} metalness={0.1} distort={0.15} speed={1} radius={1} />
        </mesh>
    )
}

const LakeBed: React.FC = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, -20]}>
         <planeGeometry args={[100, 100, 32, 32]} />
         <meshStandardMaterial color="#000" emissive="#050510" roughness={0.1} />
    </mesh>
)

// --- WIND SYSTEM (Danmaku) ---
const WindDanmakuSystem: React.FC = () => {
    const instanceRef = useRef<THREE.InstancedMesh>(null);
    const { playerPos, leafHealth, healLeaf, damageLeaf, triggerPlayerBlock, growPlayer, playerScale, isLevelComplete } = useGameStore();
    
    // Configuration
    const count = 100; // Number of active wind particles allowed
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const STRIDE = 7;
    
    // State for bullets: [x, y, z, speed, sineOffset, active(1/0), sizeVar]
    const bullets = useRef(new Float32Array(count * STRIDE)); 
    const leafPos = new THREE.Vector3(0, 0.1, 8);
    const emitterZ = -15;
    
    // Initialize bullets off-screen
    useEffect(() => {
        for (let i = 0; i < count; i++) {
            bullets.current[i * STRIDE + 2] = 100; // Move out of view
            bullets.current[i * STRIDE + 5] = 0; // Inactive
        }
    }, []);

    useFrame((state, delta) => {
        if (!instanceRef.current) return;

        // 1. Spawn new bullets periodically (STOP spawning if level complete)
        if (!isLevelComplete && Math.random() < 0.1) { // Spawn chance
            for (let i = 0; i < count; i++) {
                if (bullets.current[i * STRIDE + 5] === 0) { // Find inactive
                    bullets.current[i * STRIDE + 0] = (Math.random() - 0.5) * 12; // Spread X
                    bullets.current[i * STRIDE + 1] = 0.5 + Math.random() * 0.5; // Height Y
                    bullets.current[i * STRIDE + 2] = emitterZ; // Start Z
                    bullets.current[i * STRIDE + 3] = 4 + Math.random() * 4; // Speed
                    bullets.current[i * STRIDE + 4] = Math.random() * Math.PI * 2; // Sine Offset
                    bullets.current[i * STRIDE + 5] = 1; // Active
                    bullets.current[i * STRIDE + 6] = 0.7 + Math.random() * 0.8; // Random Size Variation (0.7 to 1.5)
                    break;
                }
            }
        }

        // 2. Update bullets
        const playerV = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
        // Radius grows as player grows to make blocking easier/more satisfying
        const hitRadius = 1.2 * (1 + (playerScale - 1) * 0.3); 

        for (let i = 0; i < count; i++) {
            const idx = i * STRIDE;
            if (bullets.current[idx + 5] === 1) {
                
                // Move Forward
                bullets.current[idx + 2] += bullets.current[idx + 3] * delta;
                // Sine Wave Motion
                const wave = Math.sin(state.clock.elapsedTime * 2 + bullets.current[idx + 4]) * 0.05;
                bullets.current[idx + 0] += wave;

                const bx = bullets.current[idx + 0];
                const by = bullets.current[idx + 1];
                const bz = bullets.current[idx + 2];
                const sizeVar = bullets.current[idx + 6];

                // Only check collisions if game is active
                if (!isLevelComplete) {
                    // Collision: Player (Block)
                    const distPlayer = Math.sqrt(Math.pow(bx - playerV.x, 2) + Math.pow(bz - playerV.z, 2));
                    if (distPlayer < hitRadius) {
                        bullets.current[idx + 5] = 0; // Destroy
                        triggerPlayerBlock(); // Visual flash
                        playWindBlock(); // Sound (Thud/Liquid)
                        growPlayer(0.1); // Grow player slightly
                        continue;
                    }

                    // Collision: Leaf (Damage)
                    const distLeaf = Math.sqrt(Math.pow(bx - leafPos.x, 2) + Math.pow(bz - leafPos.z, 2));
                    if (distLeaf < 1.5) {
                        bullets.current[idx + 5] = 0; // Destroy
                        damageLeaf(5);
                        playWindDamage(); // Sound (Crisp/Crack)
                        continue;
                    }
                }

                // Out of bounds
                if (bz > 15) {
                    bullets.current[idx + 5] = 0;
                }

                // Render
                tempObject.position.set(bx, by, bz);
                // Rotate to face movement roughly
                tempObject.rotation.set(0, 0, wave * 2);
                const scale = 0.3;
                // Apply random size variation, with slight stretch effect based on size
                tempObject.scale.set(scale * sizeVar, scale * sizeVar, scale * 3 * sizeVar); 
                tempObject.updateMatrix();
                instanceRef.current.setMatrixAt(i, tempObject.matrix);
            } else {
                // Hide inactive
                instanceRef.current.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
            }
        }
        instanceRef.current.instanceMatrix.needsUpdate = true;

        // Passive Healing logic (only if not being bombarded too hard)
        if (leafHealth < 100) {
            healLeaf(delta * 3); 
        }
    });

    return (
        <instancedMesh ref={instanceRef} args={[undefined as any, undefined as any, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#e0ffff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}


const BubbleFeature: React.FC<{ feature: EnvFeature }> = ({ feature }) => {
    const { popBubble, setInteractiveHover } = useGameStore();
    const [hover, setHover] = useState(false);
    
    const handleOver = (e: any) => { 
        e.stopPropagation(); 
        setHover(true); 
        setInteractiveHover(true);
        playBubbleHover(); 
    };
    const handleOut = (e: any) => { e.stopPropagation(); setHover(false); setInteractiveHover(false); };
    const handleClick = (e: any) => { e.stopPropagation(); popBubble(feature.id); setInteractiveHover(false); };

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <group position={feature.position} 
                   onClick={handleClick} 
                   onPointerOver={handleOver}
                   onPointerOut={handleOut}>
                <mesh scale={hover ? 1.2 : 1}>
                    <sphereGeometry args={[feature.scale[0], 64, 64]} />
                    <MeshDistortMaterial 
                        color="#8a2be2"
                        emissive={hover ? "#a020f0" : "#4b0082"}
                        emissiveIntensity={hover ? 1 : 0.3}
                        roughness={0.1}
                        metalness={0.8}
                        distort={0.5} 
                        speed={2}
                        transparent
                        opacity={0.7}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {feature.data?.text && (
                    <Text fontSize={0.8} color="#e0a0ff" anchorX="center" anchorY="middle">
                        {feature.data.text}
                        <meshBasicMaterial color="#e0a0ff" toneMapped={false} />
                    </Text>
                )}
            </group>
        </Float>
    )
}

const RealisticMushroom: React.FC<{ feature: EnvFeature }> = ({ feature }) => {
    const { triggerRain, setInteractiveHover, rainLevel } = useGameStore();
    const [hover, setHover] = useState(false);

    const handleOver = (e: any) => { 
        e.stopPropagation(); 
        setHover(true); 
        setInteractiveHover(true); 
        playMushroomHover();
    };
    const handleOut = (e: any) => { e.stopPropagation(); setHover(false); setInteractiveHover(false); };
    const handleClick = (e: any) => { e.stopPropagation(); triggerRain(); setInteractiveHover(false); };

    // Rising & Dissolving Logic
    const yOffset = rainLevel;
    const dissolveFactor = Math.min(rainLevel / 10, 1);
    const opacity = Math.max(0, 1 - dissolveFactor);
    const scale = (hover ? 1.1 : 1) * (1 + dissolveFactor * 0.5); // Expand into aether
    
    if (opacity <= 0) return null;

    return (
        <group position={[feature.position[0], feature.position[1] + yOffset, feature.position[2]]} 
               onClick={handleClick}
               onPointerOver={handleOver}
               onPointerOut={handleOut}
               scale={scale}>
            
            {/* Holy Glow */}
            <pointLight color="#ffd700" intensity={(hover ? 5 : 2) * opacity} distance={6} decay={2} position={[0, 1, 0]} />

            {/* Stalk - Organic curve */}
            <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.15, 0.25, 0.8, 16]} />
                <MeshDistortMaterial color="#deb887" roughness={0.8} distort={0.1} speed={1} transparent opacity={opacity} />
            </mesh>
            
            {/* Cap - Translucent and fleshy */}
            <mesh position={[0, 0.8, 0]} rotation={[0,0,0.1]}>
                <sphereGeometry args={[0.6, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <MeshDistortMaterial 
                    color={feature.color} 
                    emissive={hover ? "#ffec8b" : "#8b4513"} 
                    emissiveIntensity={(hover ? 0.5 : 0.1) * opacity}
                    roughness={0.2}
                    metalness={0.1}
                    distort={0.15} 
                    speed={1}
                    transparent
                    opacity={0.95 * opacity}
                />
            </mesh>

            {/* Gills */}
            <mesh position={[0, 0.78, 0]} rotation={[Math.PI, 0, -0.1]}>
                <coneGeometry args={[0.55, 0.2, 32]} />
                <meshStandardMaterial color="#3e2723" transparent opacity={opacity} />
            </mesh>
            
            {/* Magic Spores - Explode on dissolve */}
            <Sparkles count={30 + dissolveFactor * 50} scale={2 + dissolveFactor * 4} color={hover ? "white" : "gold"} speed={1 + dissolveFactor} size={hover ? 6 : 3} position={[0, 1, 0]} opacity={opacity} />
        </group>
    )
}

const SunFeature: React.FC<{ feature: EnvFeature, rainLevel?: number }> = ({ feature, rainLevel = 0 }) => {
    const { setInteractiveHover } = useGameStore();
    const [hover, setHover] = useState(false);

    const handleOver = (e: any) => { 
        e.stopPropagation(); 
        setHover(true);
        setInteractiveHover(true); 
        playSunHover();
    };
    const handleOut = (e: any) => { 
        e.stopPropagation(); 
        setHover(false);
        setInteractiveHover(false); 
    };

    // Sun disappear logic
    const engulfment = Math.max(0, rainLevel - 6) / 14; 
    const scale = Math.max(0, 1 - engulfment);
    const opacity = Math.max(0, 1 - engulfment);

    if (scale <= 0.01) return null;

    return (
        <group position={feature.position} scale={[feature.scale[0] * scale, feature.scale[1] * scale, feature.scale[2] * scale]}
               onPointerOver={handleOver} onPointerOut={handleOut}>
            {/* Core Sun */}
            <mesh>
                <sphereGeometry args={[1, 64, 64]} />
                <meshBasicMaterial color="#ff4500" transparent opacity={0.3} />
            </mesh>
            {/* Boiling Plasma Surface */}
            <mesh scale={1.05}>
                <sphereGeometry args={[1, 64, 64]} />
                <MeshDistortMaterial
                    color="#ff0000"
                    emissive={hover ? "#ff6347" : "#8b0000"}
                    emissiveIntensity={(hover ? 2 : 1) * opacity}
                    roughness={0.1}
                    metalness={0.1}
                    distort={0.3 + engulfment} // More violent as it dies
                    speed={3 + engulfment * 2}
                    transparent
                    opacity={0.6 * opacity}
                />
            </mesh>
            {/* Corona / Flares */}
            <mesh scale={1.2}>
                <sphereGeometry args={[1, 32, 32]} />
                <MeshDistortMaterial
                    color="#ff8c00"
                    transparent
                    opacity={0.1 * opacity}
                    distort={0.5}
                    speed={2}
                    side={THREE.BackSide} 
                />
            </mesh>
            <pointLight intensity={5 * opacity} distance={50} color="#ff0000" decay={2} />
            <Sparkles count={100} scale={3} size={20} speed={0.4 + engulfment} opacity={0.5 * opacity} color="#ffa500" />
        </group>
    )
}

const EmotionOrbFeature: React.FC<{ feature: EnvFeature }> = ({ feature }) => {
    const isTear = feature.data?.type === 'TEAR';
    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh position={feature.position} scale={feature.scale}>
                <sphereGeometry args={[1, 32, 32]} />
                {/* Irregular Ellipsoid Shape */}
                <MeshDistortMaterial 
                    color={feature.color} 
                    emissive={feature.color} 
                    emissiveIntensity={isTear ? 2 : 0.8} // Tear is much brighter
                    roughness={0.1}
                    metalness={0.1}
                    distort={0.4}
                    speed={1.5}
                />
                {/* Light Reminder */}
                <pointLight color={feature.color} intensity={isTear ? 5 : 2} distance={8} decay={2} />
            </mesh>
            {/* Contrast Effect for TEAR: White/Cyan sparkles against Blue */}
            {isTear && (
                <Sparkles 
                    position={feature.position} 
                    scale={[4,4,4]} 
                    count={50} 
                    speed={0.5} 
                    color="#e0ffff" 
                    size={6} 
                    opacity={0.8}
                />
            )}
        </Float>
    )
}

const OrganicFeature: React.FC<{ feature: EnvFeature }> = ({ feature }) => {
    const { rainLevel, hoverFleshBall, setInteractiveHover } = useGameStore();

    // --- Prologue ---
    if (feature.type === 'FLESH_TUNNEL') {
        return (
            <mesh position={feature.position} rotation={new THREE.Euler(...(feature.rotation || [0,0,0]))} scale={feature.scale}>
                <sphereGeometry args={[1, 32, 32]} />
                <MeshDistortMaterial color={feature.color} distort={0.3} speed={2} roughness={0.5} />
            </mesh>
        )
    }
    if (feature.type === 'EXIT_GATE') {
        return (
            <group position={feature.position}>
                <mesh position={[0, 20, 0]}>
                    <cylinderGeometry args={[2, 4, 40, 32, 1, true]} />
                    <meshBasicMaterial color="#fffff0" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <pointLight intensity={10} distance={30} color="#ffffff" decay={1} />
                <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[3, 0.2, 16, 100]} /><meshBasicMaterial color="#fff" /></mesh>
                <Sparkles count={300} scale={10} size={20} speed={3} color="#ffffff" />
            </group>
        )
    }

    // --- Name ---
    if (feature.type === 'BUBBLE') {
        return <BubbleFeature feature={feature} />
    }
    if (feature.type === 'FRAGMENT') {
        return (
            <group position={feature.position} rotation={new THREE.Euler(...(feature.rotation || [0,0,0]))}>
                <Text 
                    fontSize={1} 
                    color={feature.color} 
                    anchorX="center" 
                    anchorY="middle"
                    fillOpacity={0.8}
                >
                    {feature.data?.char || '碎片'}
                    <meshBasicMaterial color={feature.color} toneMapped={false} />
                </Text>
                <Sparkles count={5} scale={1} size={2} color={feature.color} />
            </group>
        )
    }

    // --- Chewing ---
    if (feature.type === 'FLESH_BALL') {
        return (
            <mesh 
                position={feature.position} 
                scale={feature.scale}
                onPointerOver={(e) => { e.stopPropagation(); hoverFleshBall(); }}
                onPointerOut={(e) => { e.stopPropagation(); setInteractiveHover(false); }}
            >
                <sphereGeometry args={[1, 32, 32]} />
                <MeshDistortMaterial color={feature.color} distort={0.4} speed={1.5} roughness={0.6} />
            </mesh>
        )
    }

    // --- Wind ---
    if (feature.type === 'WIND_EMITTER') {
         // Emitter is just a visual source now, bullets are handled in WindDanmakuSystem
         return (
             <group position={feature.position}>
                 <Sparkles count={20} scale={[5, 5, 1]} size={4} speed={1} color="#e0ffff" opacity={0.5} />
             </group>
         )
    }
    if (feature.type === 'WITHERED_LEAF') {
        const { leafHealth } = useGameStore();
        const ratio = leafHealth / 100;
        // Color: Brown -> Green
        const color = new THREE.Color('#8b4513').lerp(new THREE.Color('#32cd32'), ratio);
        // Unfurl: Scale x axis from 0.2 (curled/folded) to 1 (flat)
        const unfurl = 0.2 + ratio * 0.8;
        
        // Define iconic leaf shape (Teardrop/Oval)
        const leafShape = useMemo(() => {
            const s = new THREE.Shape();
            s.moveTo(0, -1);
            // Curve out and up to a tip
            s.bezierCurveTo(0.7, -0.6, 0.9, 0.4, 0, 1.2); // Right Side
            s.bezierCurveTo(-0.9, 0.4, -0.7, -0.6, 0, -1); // Left Side
            return s;
        }, []);

        return (
            <group position={feature.position} scale={feature.scale} rotation={[-Math.PI/3, 0, 0]}>
                <group scale={[unfurl, 1, 1]}> 
                    {/* Main Leaf Blade */}
                    <mesh receiveShadow castShadow>
                        <shapeGeometry args={[leafShape]} />
                        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.6} metalness={0.1} />
                    </mesh>
                    
                    {/* Central Vein (Stem) */}
                    <mesh position={[0, 0, 0.02]}>
                        <boxGeometry args={[0.06, 2.2, 0.05]} />
                        <meshStandardMaterial color={ratio > 0.5 ? "#228b22" : "#5d4037"} />
                    </mesh>

                    {/* Left Side Vein */}
                    <mesh position={[-0.25, 0.1, 0.02]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.04, 0.7, 0.04]} />
                        <meshStandardMaterial color={ratio > 0.5 ? "#228b22" : "#5d4037"} />
                    </mesh>

                    {/* Right Side Vein */}
                    <mesh position={[0.25, 0.3, 0.02]} rotation={[0, 0, -Math.PI / 3.5]}>
                        <boxGeometry args={[0.04, 0.6, 0.04]} />
                        <meshStandardMaterial color={ratio > 0.5 ? "#228b22" : "#5d4037"} />
                    </mesh>
                </group>

                {/* Healing Glow */}
                {ratio > 0 && (
                    <pointLight color="#32cd32" intensity={3 * ratio} distance={5} decay={2} position={[0, 0, 1]} />
                )}
                <Sparkles count={10 + Math.floor(ratio * 30)} scale={3} color={ratio > 0.5 ? "#00ff00" : "#d2691e"} size={ratio > 0.5 ? 6 : 3} speed={0.5 + ratio} opacity={0.6} />
            </group>
        )
    }

    // --- Travel ---
    if (feature.type === 'EMOTION_ORB') {
        return <EmotionOrbFeature feature={feature} />
    }

    // --- Sun ---
    if (feature.type === 'SUN') {
        return <SunFeature feature={feature} rainLevel={rainLevel} />
    }
    if (feature.type === 'MUSHROOM') {
        return <RealisticMushroom feature={feature} />
    }

    // --- Connection / Home ---
    if (feature.type === 'ORGANIC_PLATFORM') {
         return (
            <mesh position={feature.position} receiveShadow>
                <cylinderGeometry args={[feature.scale[0]/2, feature.scale[0]/2, feature.scale[1], 32]} />
                <MeshDistortMaterial color={feature.color} distort={0.1} speed={1} />
            </mesh>
         )
    }
    if (feature.type === 'LAKE') {
        return (
             <group position={feature.position}>
                <mesh rotation={[-Math.PI/2, 0, 0]}><circleGeometry args={[feature.scale[0]/2, 64]} /><meshBasicMaterial color="#87cefa" transparent opacity={0.8} /></mesh>
                <pointLight color="#00bfff" intensity={2} distance={20} decay={2} position={[0, 2, 0]} />
             </group>
        )
    }

    return <mesh position={feature.position} scale={feature.scale}><dodecahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={feature.color} /></mesh>
}

const Atmosphere: React.FC<{ level: string }> = ({ level }) => {
    const { rainLevel } = useGameStore();
    return (
        <>
             {level === 'PROLOGUE' && <Cloud opacity={0.4} speed={0.1} bounds={[5, 2, 15]} color="#b03060" position={[0, 2, -5]} />}
             {level === 'CHAPTER_1' && <Sparkles count={50} scale={20} size={4} speed={0.4} opacity={0.5} color="#fff0f5" />}
             {level === 'NAME' && <Sparkles count={80} scale={15} size={3} speed={0.2} opacity={0.4} color="#8a2be2" />}
             {level === 'WIND' && <Cloud opacity={0.3} speed={1} bounds={[10, 2, 10]} color="#ffe4e1" />}
             {level === 'TRAVEL' && <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />}
             {level === 'SUN' && (
                 <>
                    <Sparkles count={100} scale={20} size={5} speed={0.1} color="#ff4500" opacity={0.2} />
                    {/* Engulfing mist/water vapor rising */}
                    {rainLevel > 0 && <Cloud opacity={Math.min(rainLevel/10, 0.8)} speed={0.5} bounds={[20, 4, 20]} color="#ffadad" position={[0, rainLevel/2, 0]} />}
                 </>
             )}
             {level === 'HOME' && (
                 <>
                    <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
                    <Sparkles count={200} scale={30} size={6} speed={0.2} color="#00bfff" position={[0, -2, -15]} />
                 </>
             )}
        </>
    )
}
