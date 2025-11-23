# Liquid Left (剩余液体)

![didi preview](didi.gif)

**didi v2.0 of Liquid Left** is a 2.5D atmospheric narrative exploration game. You play as *didi*, a sentient droplet navigating a breathing, organic world. Through a series of abstract, sensory stages, players explore themes of language, physical connection, and the cycle of nature.

> "我不害怕。我不在了，湿也永远会在。"  
> "I am not afraid. Even if I am gone, the wetness will always remain."

## 📖 The Journey

The game is divided into chapters, each introducing unique mechanics that serve as metaphors for the droplet's life cycle:

-   **Prologue: Birth** - Use slingshot physics to launch yourself towards the light.
-   **Ch 1: Language** - Lure and connect neural nodes to weave the "language of liquid."
-   **Ch 2: Name** - Burst bubbles and collect fragments to discover your identity.
-   **Ch 3: Chewing** - Squeeze through tight organic spaces; growth comes from friction and resistance.
-   **Ch 4: Wind** - Shield a withered leaf from wind bombardment to restore life.
-   **Ch 5: Travel** - Choose your vehicle; emotional resonance dictates your path.
-   **Ch 6: Connection** - Tether your body to nodes to form a skeletal structure.
-   **Ch 7: Home** - Return to the lake of tears and merge with the collective.
-   **Finale: Sun** - A ritual of evaporation and rain; the cycle completes.

## 🛠️ Tech Stack

This project is built with modern web technologies focusing on performance and procedural generation.

*   **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **3D Engine:** [Three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
*   **3D Helpers & Abstractions:** [@react-three/drei](https://github.com/pmndrs/drei)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Animation:** [Framer Motion](https://www.framer.com/motion/) (UI) & Custom Frame Loops (3D)
*   **Audio:** Native **Web Audio API** (No external assets; all sound effects and ambience are synthesized procedurally in real-time).
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)

## 🎮 Controls

*   **Mouse/Touch:** The primary input method.
    *   **Lure:** Hold Left Click to attract the droplet.
    *   **Slingshot:** Drag back and release to launch.
    *   **Interact:** Click to pop bubbles, trigger rain, or connect nodes.
*   **Cursor:** A custom glowing cursor provides feedback on interaction states.

---

*Navigating the breathing, organic world of Liquid Left.*
