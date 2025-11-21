
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

  return (
    <group position={data.position}>
      <Float speed={2} rotationIntensity={0.1}>
        <group onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(data.id); }} onPointerOut={(e) => { e.stopPropagation(); setHoveredNode(null); }} onPointerDown={handleDown} onPointerUp={(e) => { if(currentLevel!=='CONNECTION'){ e.stopPropagation(); completeConnection(data.id); playConnect(); }}}>
            {currentLevel === 'CHAPTER_1' ? <Chapter1NodeVisual connected={data.connected} isNext={isNextInSequence} /> : <Chapter2NodeVisual connected={data.connected} isNext={!data.connected} />}
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
        return <Line key={`${idA}-${idB}`} points={[new THREE.Vector3(...nA.position), new THREE.Vector3(...nB.position)]} color={currentLevel === 'CHAPTER_1' ? "#00ffff" : "#ffd700"} lineWidth={3} transparent opacity={0.8} />
      })}
    </group>
  );
};
