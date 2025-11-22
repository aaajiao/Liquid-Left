
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, NodeData } from '../store';
import { playConnect, playFlow } from '../utils/audio';

const SwayingHairBeam: React.FC<{ color: string }> = ({ color }) => {
    const lineRef = useRef<any>(null);
    const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0,4,0), new THREE.Vector3(0,10,0), new THREE.Vector3(0,18,0), new THREE.Vector3(0,30,0)]), []);
    useFrame((state) => {
        if (lineRef.current) {
            const t = state.clock.elapsedTime;
            curve.points[1].x = Math.sin(t * 1.2) * 0.2; curve.points[1].z = Math.cos(t) * 0.2;
            curve.points[3].x = Math.sin(t * 0.6 + 2) * 2.0; curve.points[3].z = Math.cos(t * 0.5 + 2) * 2.0;
            lineRef.current.geometry.setFromPoints(curve.getPoints(50));
        }
    });
    return <line ref={lineRef as any}><bufferGeometry /><lineBasicMaterial color={color} transparent opacity={0.4} linewidth={1} blending={THREE.AdditiveBlending} /></line>;
}

const Chapter1NodeVisual: React.FC<{ connected: boolean; isNext: boolean }> = ({ connected, isNext }) => {
    const color = connected ? "#00ffff" : (isNext ? "#ff00ff" : "#00ced1");
    return (
        <group>
            <mesh><icosahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={isNext ? 3 : 1} wireframe={!connected} /></mesh>
            {!connected && <SwayingHairBeam color={isNext ? "#ff00ff" : "#00ffff"} />}
        </group>
    );
};

const Chapter2NodeVisual: React.FC<{ connected: boolean; isNext: boolean }> = ({ connected, isNext }) => {
    const color = connected ? "#ffd700" : "#ff8c00";
    return (
        <group>
            <mesh><sphereGeometry args={[0.5, 32, 32]} /><MeshDistortMaterial color={color} emissive={isNext ? "#ff4500" : "#ffa500"} emissiveIntensity={isNext ? 2 : 0.5} distort={0.4} speed={2} /></mesh>
            {!connected && <Sparkles position={[0, 5, 0]} scale={[2, 10, 2]} count={40} speed={2} opacity={0.8} color="#ffD700" size={6} />}
        </group>
    );
};

const Chapter6NodeVisual: React.FC<{ connected: boolean }> = ({ connected }) => {
    const ref = useRef<THREE.Mesh>(null);
    const initialRot = useMemo(() => [Math.random() * Math.PI, Math.random() * Math.PI], []);

    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.elapsedTime;
            ref.current.rotation.x = initialRot[0] + t * 0.2;
            ref.current.rotation.y = initialRot[1] + t * 0.3;
        }
    });

    const strokeColor = "#1E90FF"; 
    
    return (
        <group>
             <mesh ref={ref}>
                <torusGeometry args={[0.6, 0.2, 64, 64]} /> 
                <MeshDistortMaterial
                    color={connected ? "#00BFFF" : strokeColor}
                    emissive={connected ? "#E0FFFF" : "#00008B"}
                    emissiveIntensity={connected ? 0.5 : 0.1}
                    roughness={0.5}
                    metalness={0.1}
                    distort={0.5} 
                    speed={2}     
                />
             </mesh>

             <mesh scale={0.95} rotation={[0.5, 0.5, 0]}>
                <torusGeometry args={[0.6, 0.18, 16, 32]} />
                <meshBasicMaterial color="#000080" wireframe transparent opacity={0.1} />
             </mesh>

             {!connected && <Sparkles scale={2} count={8} speed={1} opacity={0.6} color="#87CEFA" size={4} />}
        </group>
    );
};

const Vertebra: React.FC<{ index: number; zPos: number; isEven: boolean }> = ({ index, zPos, isEven }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.elapsedTime;
            // Sync these constants with NeuralPulseLine!
            // Phase logic: roughly zPos based
            // Vertebra uses index to shift phase. 
            // index approx increases by 1 for every 1.5 units.
            const waveY = Math.sin(t * 2.5 + index * 0.5) * 0.15;
            const waveX = Math.cos(t * 2.0 + index * 0.4) * 0.08;
            
            groupRef.current.position.set(waveX, waveY, zPos);
            groupRef.current.rotation.z = isEven ? waveY * 1.5 : Math.PI/2 + waveY * 1.5;
            groupRef.current.rotation.x = waveX; 
        }
    });

    return (
        <group ref={groupRef}>
            <mesh rotation={[Math.PI/2, 0, 0]}>
                    <torusGeometry args={[0.35, 0.08, 8, 16]} />
                    <meshStandardMaterial color="#5F9EA0" transparent opacity={0.7} />
            </mesh>
            <mesh rotation={[0, Math.PI/2, 0]}>
                <torusGeometry args={[0.28, 0.04, 8, 16]} />
                    <meshStandardMaterial color="#B0E0E6" transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

const NeuralPulseLine: React.FC<{ dist: number }> = ({ dist }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { isLevelComplete } = useGameStore();
    const ampRef = useRef(1.0); // Initialize at 1.0
    
    // Create curve with control points along the Z axis
    const curve = useMemo(() => {
        const points = [];
        const segments = 12; // Enough points for smooth snake curve
        for(let i = 0; i <= segments; i++) {
            points.push(new THREE.Vector3(0, 0, (i/segments - 0.5) * dist));
        }
        return new THREE.CatmullRomCurve3(points);
    }, [dist]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        
        // Energy Surge Logic
        // If incomplete, target multiplier is 2.0 (gentle writhe)
        // If complete, target multiplier is 3.5 (violent energy surge/dragon)
        const targetAmp = isLevelComplete ? 3.5 : 2.0;
        ampRef.current = THREE.MathUtils.lerp(ampRef.current, targetAmp, delta * 0.5);
        const amp = ampRef.current;
        
        // Pulse opacity/color
        const freq = isLevelComplete ? 8 : 4;
        const pulse = (Math.sin(t * freq) + 1) * 0.5; // 0 to 1
        const material = meshRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = 0.6 + pulse * 0.4;
        
        // Update Curve Points
        const points = curve.points;
        
        // Slight speed up when excited
        const speedY = isLevelComplete ? 4.0 : 2.5;
        const speedX = isLevelComplete ? 3.5 : 2.0;

        for(let i=0; i<points.length; i++) {
            const p = points[i];
            // Current Z position determines phase
            const phase = (p.z + dist/2) * 0.333;
            
            // Apply amplitude multiplier to base values (0.15, 0.08)
            p.y = Math.sin(t * speedY + phase) * 0.15 * amp;
            p.x = Math.cos(t * speedX + phase * 0.8) * 0.08 * amp; 
        }
        
        // Rebuild geometry
        if (meshRef.current.geometry) meshRef.current.geometry.dispose();
        // Tube gets slightly thicker when surging
        meshRef.current.geometry = new THREE.TubeGeometry(curve, 32, 0.03 + (isLevelComplete ? 0.02 : 0), 8, false);
    });

    return (
        <mesh ref={meshRef}>
            <tubeGeometry args={[curve, 32, 0.03, 8, false]} />
            <meshBasicMaterial color="#E0FFFF" transparent opacity={0.8} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
    )
}

const Chapter6Connection: React.FC<{ start: [number, number, number]; end: [number, number, number] }> = ({ start, end }) => {
    const startV = useMemo(() => new THREE.Vector3(...start), [start]);
    const endV = useMemo(() => new THREE.Vector3(...end), [end]);
    const dist = startV.distanceTo(endV);
    const mid = new THREE.Vector3().addVectors(startV, endV).multiplyScalar(0.5);
    
    const quaternion = useMemo(() => {
        const m = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0); 
        m.lookAt(startV, endV, up);
        return new THREE.Quaternion().setFromRotationMatrix(m);
    }, [startV, endV]);

    const matRef = useRef<any>(null);

    useFrame((state) => {
        if(matRef.current) {
             const t = state.clock.elapsedTime;
             matRef.current.emissiveIntensity = 0.3 + Math.sin(t * 2.5) * 0.3;
             matRef.current.distort = 0.4 + Math.sin(t * 1.5) * 0.2;
        }
    });

    const segmentCount = Math.max(1, Math.floor(dist / 1.5)); 

    return (
        <group position={mid} quaternion={quaternion}>
             {/* Main Tissue (Ligament) */}
             <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.25, dist, 16, 20, true]} /> 
                <MeshDistortMaterial 
                    ref={matRef}
                    color="#B0E0E6" 
                    emissive="#4682B4" 
                    roughness={0.4}
                    metalness={0.1}
                    distort={0.4}
                    speed={3} 
                    transparent
                    opacity={0.4} // Lower opacity to see the nerve inside
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
             </mesh>

             {/* Vertebrae */}
             {Array.from({ length: segmentCount }).map((_, i) => {
                 const t = (i + 1) / (segmentCount + 1); 
                 const z = (t - 0.5) * dist; 
                 return (
                     <Vertebra key={i} index={i} zPos={z} isEven={i % 2 === 0} />
                 );
             })}
             
             {/* The New Neural Pulse Line */}
             <NeuralPulseLine dist={dist} />
        </group>
    )
}

const Node: React.FC<{ data: NodeData }> = ({ data }) => {
  const { setHoveredNode, startDragConnection, completeConnection, draggingNodeId, currentLevel, sequenceOrder, nextSequenceIndex } = useGameStore();
  const isSequenceMode = currentLevel === 'CHAPTER_1';
  const isNextInSequence = isSequenceMode && sequenceOrder.indexOf(data.id) === nextSequenceIndex;
  const isInteractive = isSequenceMode ? isNextInSequence : true;
  
  const handleDown = (e: any) => {
      if (!isInteractive || currentLevel === 'CONNECTION') return;
      e.stopPropagation(); (e.target as Element).releasePointerCapture(e.pointerId);
      startDragConnection(data.id); playFlow();
  };

  const renderVisual = () => {
      if (currentLevel === 'CHAPTER_1') return <Chapter1NodeVisual connected={data.connected} isNext={isNextInSequence} />;
      if (currentLevel === 'CONNECTION') return <Chapter6NodeVisual connected={data.connected} />;
      return <Chapter2NodeVisual connected={data.connected} isNext={!data.connected} />;
  }

  return (
    <group position={data.position}>
      <Float speed={2} rotationIntensity={0.1}>
        <group onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(data.id); }} onPointerOut={(e) => { e.stopPropagation(); setHoveredNode(null); }} onPointerDown={handleDown} onPointerUp={(e) => { if(currentLevel!=='CONNECTION'){ e.stopPropagation(); completeConnection(data.id); playConnect(); }}}>
            {renderVisual()}
            <mesh visible={true}><sphereGeometry args={[1.2, 16, 16]} /><meshBasicMaterial transparent opacity={0} color="red" depthWrite={false} /></mesh>
        </group>
      </Float>
      {isNextInSequence && sequenceOrder[nextSequenceIndex + 1] && <GhostLineToNext currentPos={data.position} nextId={sequenceOrder[nextSequenceIndex + 1]} />}
    </group>
  );
};

const GhostLineToNext: React.FC<{ currentPos: [number, number, number], nextId: string }> = ({ currentPos, nextId }) => {
    const nodes = useGameStore(state => state.nodes);
    const nextNode = nodes.find(n => n.id === nextId);
    if (!nextNode) return null;
    const start = new THREE.Vector3(...currentPos); const end = new THREE.Vector3(...nextNode.position);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5); mid.y += 2;
    return <Line points={new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20)} color="#ff00ff" lineWidth={2} dashed transparent opacity={0.4} />
}

const DraggingThread: React.FC = () => {
    const { draggingNodeId, nodes, cursorWorldPos, hoveredNodeId } = useGameStore();
    if (!draggingNodeId) return null;
    const startNode = nodes.find(n => n.id === draggingNodeId);
    if (!startNode) return null;
    const start = new THREE.Vector3(...startNode.position);
    let end = cursorWorldPos;
    if (hoveredNodeId && hoveredNodeId !== draggingNodeId) { const target = nodes.find(n => n.id === hoveredNodeId); if (target) end = new THREE.Vector3(...target.position); }
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5); mid.y += 1.0;
    return <Line points={new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20)} color="#00ffff" lineWidth={4} transparent opacity={0.7} dashed />
}

const BodyTether: React.FC = () => {
    const { tetheredNodeId, playerPos, nodes, currentLevel } = useGameStore();
    if (currentLevel !== 'CONNECTION' || !tetheredNodeId) return null;
    const node = nodes.find(n => n.id === tetheredNodeId);
    if (!node) return null;
    return <Line points={[new THREE.Vector3(...node.position), playerPos]} color="#ffd700" lineWidth={3} transparent opacity={0.6} />
}

export const PuzzleManager: React.FC = () => {
  const { nodes, connections, currentLevel } = useGameStore();
  return (
    <group>
      {nodes.map((node) => <Node key={node.id} data={node} />)}
      <DraggingThread />
      <BodyTether />
      {connections.map(([idA, idB]) => {
        const nA = nodes.find(n => n.id === idA); const nB = nodes.find(n => n.id === idB);
        if (!nA || !nB) return null;
        
        if (currentLevel === 'CONNECTION') {
            return <Chapter6Connection key={`${idA}-${idB}`} start={nA.position} end={nB.position} />
        }

        return <Line key={`${idA}-${idB}`} points={[new THREE.Vector3(...nA.position), new THREE.Vector3(...nB.position)]} color={currentLevel === 'CHAPTER_1' ? "#00ffff" : "#ffd700"} lineWidth={3} transparent opacity={0.8} />
      })}
    </group>
  );
};
