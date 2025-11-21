
import { create } from 'zustand';
import * as THREE from 'three';
import { playBubblePop, playFloodSound, playSunExtinguish } from './utils/audio';

export interface NodeData {
  id: string;
  position: [number, number, number];
  connected: boolean;
}

export type LevelType = 'PROLOGUE' | 'CHAPTER_1' | 'NAME' | 'CHEWING' | 'WIND' | 'TRAVEL' | 'CONNECTION' | 'HOME' | 'SUN';
export type InteractionMode = 'SLINGSHOT' | 'LURE' | 'OBSERVER' | 'CLICK';

export interface EnvFeature {
  id: string;
  type: 'WALL' | 'FLESH_TUNNEL' | 'ORGANIC_PLATFORM' | 'LAKE' | 'DECORATION' | 'EXIT_GATE' | 
        'BUBBLE' | 'FRAGMENT' | 'FLESH_BALL' | 'WIND_EMITTER' | 'WITHERED_LEAF' | 'EMOTION_ORB' | 'SUN' | 'MUSHROOM';
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  data?: any; // Generic data for specific logic (e.g. text content, orb type)
}

interface GameState {
  currentLevel: LevelType;
  interactionMode: InteractionMode;
  narrativeIndex: number;
  
  nodes: NodeData[];
  connections: [string, string][]; 
  
  envFeatures: EnvFeature[];

  // Physics & Input State
  playerPos: THREE.Vector3;
  cursorWorldPos: THREE.Vector3;
  isMouseDown: boolean;
  hoveredNodeId: string | null;
  draggingNodeId: string | null;
  
  // Generic Interactive Hover (for Bubbles, Mushrooms, etc.)
  isInteractiveHover: boolean;

  // Sequence Logic (Ch1)
  sequenceOrder: string[];
  nextSequenceIndex: number;
  
  // Tether Logic (Connection)
  tetheredNodeId: string | null;

  // --- New Mechanics State ---
  // Name (Ch3)
  bubblesPopped: number;
  fragmentsCollected: number;
  
  // Chewing (Ch4)
  playerScale: number;
  
  // Wind (Ch5)
  leafHealth: number; // 0 to 100
  
  // Sun (Finale)
  rainLevel: number;
  isRaining: boolean;

  isLevelComplete: boolean;
  
  // Actions
  setCursorWorldPos: (pos: THREE.Vector3) => void;
  setMouseDown: (isDown: boolean) => void;
  setHoveredNode: (id: string | null) => void;
  setInteractiveHover: (isHover: boolean) => void;
  
  startDragConnection: (id: string) => void;
  cancelDrag: () => void;
  completeConnection: (targetId: string) => void;
  
  updatePlayerPos: (pos: THREE.Vector3) => void;
  advanceNarrative: () => void;
  startLevel: (level: LevelType) => void;
  resetGame: () => void;
  setTetheredNode: (id: string | null) => void;

  // New Actions
  popBubble: (id: string) => void;
  absorbFragment: (id: string) => void;
  growPlayer: (amount: number) => void;
  healLeaf: (amount: number) => void;
  triggerRain: () => void;
  selectVehicle: (type: string) => void;
}

// --- Procedural Generation ---

const generatePrologueEnv = () => {
    const env: EnvFeature[] = [];
    for (let i = 0; i < 14; i++) {
        const z = -12 + i * 2;
        const width = 3 - (i * 0.1); 
        env.push({ id: `canal-l-${i}`, type: 'FLESH_TUNNEL', position: [-width, 1, z], scale: [2, 4, 2], rotation: [0, 0, -0.2], color: '#d88' });
        env.push({ id: `canal-r-${i}`, type: 'FLESH_TUNNEL', position: [width, 1, z], scale: [2, 4, 2], rotation: [0, 0, 0.2], color: '#d88' });
    }
    env.push({ id: 'exit-gate', type: 'EXIT_GATE', position: [0, 2, 16], scale: [1, 1, 1], color: '#fff' });
    return { nodes: [], env };
};

const generateLevel1Env = () => {
    const nodes: NodeData[] = [];
    const env: EnvFeature[] = [];
    const positions = [[-4, 0, -4], [0, 0, -2], [4, 0, -4], [-2, 0, 2], [2, 0, 2], [0, 0, 5]];
    positions.forEach((pos, i) => nodes.push({ id: `n1-${i}`, position: [pos[0], 0.5, pos[2]], connected: false }));
    for(let i=0; i<8; i++) env.push({ id: `spore-${i}`, type: 'DECORATION', position: [(Math.random()-0.5)*15, 0, (Math.random()-0.5)*15], scale: [0.5, 0.5, 0.5], color: '#e6e6fa' });
    return { nodes, env };
};

const generateNameEnv = () => {
    const env: EnvFeature[] = [];
    // Floating Text Bubbles
    for(let i=0; i<15; i++) {
        env.push({
            id: `bubble-${i}`,
            type: 'BUBBLE',
            position: [(Math.random()-0.5)*12, 1 + Math.random()*2, (Math.random()-0.5)*12],
            scale: [0.8, 0.8, 0.8],
            color: '#e6e6fa',
            data: { text: String.fromCharCode(0x4e00 + Math.floor(Math.random() * 100)) } // Random CJK char
        });
    }
    return { nodes: [], env };
};

const generateChewingEnv = () => {
    const env: EnvFeature[] = [];
    // Narrow fleshy corridor packed with balls
    for (let i = 0; i < 20; i++) {
         env.push({
             id: `fleshball-${i}`,
             type: 'FLESH_BALL',
             position: [(Math.random()-0.5)*3, 0.5, -5 + i * 1.5],
             scale: [1 + Math.random(), 1 + Math.random(), 1 + Math.random()],
             color: '#ff9999'
         });
    }
    return { nodes: [], env };
};

const generateWindEnv = () => {
    const env: EnvFeature[] = [];
    // Wind Source
    env.push({ id: 'wind-emitter', type: 'WIND_EMITTER', position: [0, 2, -10], scale: [1, 1, 1], color: '#fff' });
    // Withered Leaf
    env.push({ id: 'withered-leaf', type: 'WITHERED_LEAF', position: [0, 1, 5], scale: [2, 2, 2], color: '#8b4513' });
    return { nodes: [], env };
};

const generateTravelEnv = () => {
    const env: EnvFeature[] = [];
    const types = ['HAPPY', 'ANGRY', 'ENVY', 'TEAR'];
    const colors = { HAPPY: '#ffd700', ANGRY: '#ff4500', ENVY: '#800080', TEAR: '#00bfff' };
    
    // Create distinct orb islands - Lower height to 0.8 for easier reach
    env.push({ id: 'orb-happy', type: 'EMOTION_ORB', position: [-5, 0.8, -5], scale: [2, 2, 2], color: colors.HAPPY, data: { type: 'HAPPY' } });
    env.push({ id: 'orb-angry', type: 'EMOTION_ORB', position: [5, 0.8, -5], scale: [2, 2, 2], color: colors.ANGRY, data: { type: 'ANGRY' } });
    env.push({ id: 'orb-envy', type: 'EMOTION_ORB', position: [-5, 0.8, 5], scale: [2, 2, 2], color: colors.ENVY, data: { type: 'ENVY' } });
    env.push({ id: 'orb-tear', type: 'EMOTION_ORB', position: [5, 0.8, 5], scale: [2, 2, 2], color: colors.TEAR, data: { type: 'TEAR' } });
    
    return { nodes: [], env };
};

const generateConnectionEnv = () => {
    const nodes: NodeData[] = [];
    const env: EnvFeature[] = [];
    env.push({ id: 'plat-upper', type: 'ORGANIC_PLATFORM', position: [0, 2.5, -2], scale: [6, 0.5, 6], color: '#fff0f5' });
    nodes.push({ id: 'n2-low-1', position: [-5, 0.5, 4], connected: false });
    nodes.push({ id: 'n2-low-2', position: [5, 0.5, 4], connected: false });
    nodes.push({ id: 'n2-mid', position: [0, 0.5, 0], connected: false });
    nodes.push({ id: 'n2-high-1', position: [-2, 3, -2], connected: false });
    nodes.push({ id: 'n2-high-2', position: [2, 3, -2], connected: false });
    return { nodes, env };
}

const generateHomeEnv = () => {
    const env: EnvFeature[] = [];
    env.push({ id: 'lake', type: 'LAKE', position: [0, -2, -15], scale: [30, 1, 30], color: '#ffffff' });
    return { nodes: [], env };
}

const generateSunEnv = () => {
    const env: EnvFeature[] = [];
    // The Sun
    env.push({ id: 'the-sun', type: 'SUN', position: [0, 10, -20], scale: [8, 8, 8], color: '#ff0000' });
    // The Mushroom (Trigger)
    env.push({ id: 'mushroom', type: 'MUSHROOM', position: [0, 0.5, 2], scale: [1, 1, 1], color: '#f0e68c' });
    return { nodes: [], env };
}

const START_POSITIONS: Record<LevelType, [number, number, number]> = {
    PROLOGUE: [0, 0.5, -12],
    CHAPTER_1: [0, 0.5, 8],
    NAME: [0, 0.5, 0],
    CHEWING: [0, 0.5, -8],
    WIND: [0, 0.5, 8],
    TRAVEL: [0, 0.5, 0],
    CONNECTION: [0, 0.5, 8],
    HOME: [0, 0.5, 5],
    SUN: [0, 0.5, 5]
};

export const useGameStore = create<GameState>((set, get) => ({
  currentLevel: 'PROLOGUE',
  interactionMode: 'SLINGSHOT',
  narrativeIndex: 0,
  nodes: [],
  connections: [],
  envFeatures: [],

  playerPos: new THREE.Vector3(0, 0.5, -12),
  cursorWorldPos: new THREE.Vector3(0, 0, 0),
  isMouseDown: false,
  hoveredNodeId: null,
  draggingNodeId: null,
  
  isInteractiveHover: false,

  sequenceOrder: [],
  nextSequenceIndex: 0,
  tetheredNodeId: null,

  // New State Init
  bubblesPopped: 0,
  fragmentsCollected: 0,
  playerScale: 1,
  leafHealth: 0,
  rainLevel: 0,
  isRaining: false,

  isLevelComplete: false,

  setCursorWorldPos: (pos) => set({ cursorWorldPos: pos }),
  setMouseDown: (isDown) => set({ isMouseDown: isDown }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setInteractiveHover: (isHover) => set({ isInteractiveHover: isHover }),
  
  startDragConnection: (id) => set({ draggingNodeId: id }),
  cancelDrag: () => set({ draggingNodeId: null }),
  setTetheredNode: (id) => set({ tetheredNodeId: id }),

  // --- Actions ---
  popBubble: (id) => {
      playBubblePop(); // Trigger Sound Effect
      
      const { envFeatures } = get();
      const bubble = envFeatures.find(f => f.id === id);
      if (!bubble) return;

      // Remove bubble, add multiple font fragments
      const newEnv = envFeatures.filter(f => f.id !== id);
      const strokes = ['丿', '丶', '一', '丨', '乙', '乀'];
      
      for (let i = 0; i < 3; i++) {
          newEnv.push({
              id: `frag-${id}-${i}`,
              type: 'FRAGMENT',
              position: [
                  bubble.position[0] + (Math.random() - 0.5), 
                  0.2, 
                  bubble.position[2] + (Math.random() - 0.5)
              ], 
              scale: [0.5, 0.5, 0.5],
              color: '#e0a0ff', // Bright Neon Purple
              rotation: [-Math.PI/2, 0, Math.random() * Math.PI],
              data: { char: strokes[Math.floor(Math.random() * strokes.length)] }
          });
      }
      
      set({ envFeatures: newEnv, bubblesPopped: get().bubblesPopped + 1, isInteractiveHover: false });
  },

  absorbFragment: (id) => {
      const { envFeatures, fragmentsCollected } = get();
      const newEnv = envFeatures.filter(f => f.id !== id);
      const count = fragmentsCollected + 1;
      const isComplete = count >= 5;
      
      set({ 
          envFeatures: newEnv, 
          fragmentsCollected: count,
          isLevelComplete: isComplete,
          narrativeIndex: isComplete ? 1 : get().narrativeIndex // Update to "什么是身体性的语言？"
      });
  },

  growPlayer: (amount) => {
      const newScale = Math.min(get().playerScale + amount, 10);
      const isComplete = newScale > 8;
      set({ 
          playerScale: newScale,
          isLevelComplete: isComplete,
          narrativeIndex: isComplete ? 1 : get().narrativeIndex // Update to "咀嚼，就是互相成就彼此的形状。"
      });
  },

  healLeaf: (amount) => {
      const newHealth = Math.min(get().leafHealth + amount, 100);
      set({ 
          leafHealth: newHealth,
          isLevelComplete: newHealth >= 100 // Win condition for Wind
      });
  },
  
  selectVehicle: (type) => {
      if (type === 'TEAR') {
          set({ isLevelComplete: true, narrativeIndex: 1 });
      }
  },

  triggerRain: () => {
      set({ isRaining: true, isInteractiveHover: false });
      playFloodSound(); // Start massive water sound
      
      let hasTriggeredExtinguish = false;

      // Animate rain level - Slower for dramatic effect
      const interval = setInterval(() => {
          const { rainLevel } = get();
          if (rainLevel >= 20) {
              clearInterval(interval);
              set({ isLevelComplete: true, narrativeIndex: 1 });
          } else {
              const nextLevel = rainLevel + 0.04; // Slower Rise
              
              // Trigger sun extinguish sound when water hits bottom of sun (approx level 6)
              if (!hasTriggeredExtinguish && nextLevel > 6.0) {
                  playSunExtinguish();
                  hasTriggeredExtinguish = true;
              }

              set({ rainLevel: nextLevel });
          }
      }, 50);
  },

  completeConnection: (targetId) => {
      const { draggingNodeId, connections, nodes, currentLevel, sequenceOrder, nextSequenceIndex, tetheredNodeId } = get();
      
      let sourceId = draggingNodeId;
      if (currentLevel === 'CONNECTION') sourceId = tetheredNodeId;

      if (!sourceId || sourceId === targetId) { set({ draggingNodeId: null }); return; }

      const exists = connections.some(c => (c[0] === sourceId && c[1] === targetId) || (c[0] === targetId && c[1] === sourceId));

      if (!exists) {
          if (currentLevel === 'CHAPTER_1') {
              const currentSource = sequenceOrder[nextSequenceIndex];
              const currentTarget = sequenceOrder[nextSequenceIndex + 1];
              if (!currentSource || !currentTarget) { set({ draggingNodeId: null }); return; }
              const isValid = (sourceId === currentSource && targetId === currentTarget) || (sourceId === currentTarget && targetId === currentSource);
              if (!isValid) { set({ draggingNodeId: null }); return; }
          }

          const newConnections = [...connections, [sourceId, targetId] as [string, string]];
          const newNodes = nodes.map(n => (n.id === sourceId || n.id === targetId) ? { ...n, connected: true } : n);
          const connectedSet = new Set(newConnections.flat());
          const isComplete = connectedSet.size >= nodes.length && nodes.length > 0;
          
          let newSeqIndex = nextSequenceIndex;
          if (currentLevel === 'CHAPTER_1') newSeqIndex++;

          set({ 
              connections: newConnections, nodes: newNodes, draggingNodeId: null,
              narrativeIndex: get().narrativeIndex + 1, isLevelComplete: isComplete, nextSequenceIndex: newSeqIndex
          });
      } else {
          set({ draggingNodeId: null });
      }
  },

  updatePlayerPos: (pos) => set({ playerPos: pos }),
  advanceNarrative: () => set((state) => ({ narrativeIndex: state.narrativeIndex + 1 })),

  startLevel: (level) => {
    let genResult;
    let mode: InteractionMode = 'LURE';
    let seq: string[] = [];

    switch(level) {
        case 'PROLOGUE': genResult = generatePrologueEnv(); mode = 'SLINGSHOT'; break;
        case 'CHAPTER_1': genResult = generateLevel1Env(); seq = genResult.nodes.map(n => n.id); break;
        case 'NAME': genResult = generateNameEnv(); break;
        case 'CHEWING': genResult = generateChewingEnv(); break;
        case 'WIND': genResult = generateWindEnv(); break;
        case 'TRAVEL': genResult = generateTravelEnv(); break;
        case 'CONNECTION': genResult = generateConnectionEnv(); break;
        case 'HOME': genResult = generateHomeEnv(); mode = 'OBSERVER'; break;
        case 'SUN': genResult = generateSunEnv(); mode = 'CLICK'; break;
    }

    const startP = START_POSITIONS[level];

    set({
      currentLevel: level,
      interactionMode: mode,
      nodes: genResult.nodes,
      envFeatures: genResult.env,
      connections: [],
      playerPos: new THREE.Vector3(...startP),
      cursorWorldPos: new THREE.Vector3(...startP),
      isLevelComplete: false,
      narrativeIndex: 0,
      draggingNodeId: null,
      sequenceOrder: seq,
      nextSequenceIndex: 0,
      tetheredNodeId: null,
      // Reset new mechanics
      bubblesPopped: 0,
      fragmentsCollected: 0,
      playerScale: 1,
      leafHealth: 0,
      rainLevel: 0,
      isRaining: false,
      isInteractiveHover: false
    });
  },

  resetGame: () => get().startLevel('PROLOGUE')
}));
