
import React, { useEffect, useRef } from 'react';
import { useGameStore, LevelType } from '../store';
import { AnimatePresence, motion } from 'framer-motion';
import { resumeAudio, startAmbience } from '../utils/audio';

const NARRATIVE_SCRIPT: Record<LevelType, string[]> = {
  PROLOGUE: ["这一次,我好像是毛绒绒的一滴物。", "按住左键向后拉，瞄准，松开 (Drag Back & Release).", "向着远处的强光前进 (Head towards the Light)."],
  CHAPTER_1: ["湿季发生了，我和其他液体从这个星球的表面上冒出来。", "按住左键，花纹之中总是蕴含着密码吧 (Hold LMB to Lure).", "拖拽丝线，连接那些神经节点 (Drag to Connect)."],
  NAME: ["didi, 你的名字是什么？", "什么是身体性的语言？", "戳破那些泡泡，收集紫色的碎片。"],
  CHEWING: ["挤过去，让自己变大。", "", "越咀嚼你就会拥有越多的液体。", "咀嚼，就是互相成就彼此的形状。"],
  WIND: ["因为液体干枯的时候，会往我的身体里缩，好痛好痛...", "我能感觉自己在慢慢地变小，慢慢地变暗...", "没关系，我在抗拒生命的时候已经感受到了更强的生命力..."],
  TRAVEL: ["什么是交通工具？", "只要你甘心流下一滴眼泪，你就可以乘着你的眼泪去任何地方。"],
  CONNECTION: ["我们内在的结构稳固地连在一起...", "连接所有的节点...", "形成了一个巨大的网, 一个巨大的骨骼。"],
  HOME: ["滴滴, 这就是我们身体性的语言, 我们的家园。", "原来它掉进了湖泊里, 而湖就是由我们液体的眼泪组成的呀。"],
  SUN: ["我不害怕。我不在了，湿也永远会在。", "而这不是一场降临，只是无限循环中的一部分呀。", "点击蘑菇，降下甘霖。"]
};

const CHAPTER_TITLES: Record<LevelType, string> = {
    PROLOGUE: "序章：诞生 (Birth)",
    CHAPTER_1: "第一章：语言 (Language)",
    NAME: "第二章：名字 (Name)",
    CHEWING: "第三章：咀嚼 (Chewing)",
    WIND: "第四章：风 (Wind)",
    TRAVEL: "第五章：旅行 (Travel)",
    CONNECTION: "第六章：连接 (Connection)",
    HOME: "第七章：家园 (Home)",
    SUN: "终章：太阳 (Sun)"
};

export const UI: React.FC = () => {
  const { currentLevel, narrativeIndex, isLevelComplete, startLevel, resetGame } = useGameStore();
  
  // Detect touch device for context-sensitive text
  const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  let text = NARRATIVE_SCRIPT[currentLevel][Math.min(narrativeIndex, NARRATIVE_SCRIPT[currentLevel].length - 1)];

  // Dynamic Text Overrides
  if (currentLevel === 'PROLOGUE' && narrativeIndex === 1 && isTouch) {
      text = "按住向后拉，瞄准，松开 (Drag Back & Release).";
  }
  if (currentLevel === 'CHAPTER_1' && narrativeIndex === 1 && isTouch) {
      text = "按住，花纹之中总是蕴含着密码吧 (Touch & Hold to Lure).";
  }

  useEffect(() => { resumeAudio(); startAmbience(currentLevel); }, [currentLevel]);

  const handleNextLevel = () => {
      if (currentLevel === 'PROLOGUE') startLevel('CHAPTER_1');
      else if (currentLevel === 'CHAPTER_1') startLevel('NAME');
      else if (currentLevel === 'NAME') startLevel('CHEWING');
      else if (currentLevel === 'CHEWING') startLevel('WIND');
      else if (currentLevel === 'WIND') startLevel('TRAVEL');
      else if (currentLevel === 'TRAVEL') startLevel('CONNECTION');
      else if (currentLevel === 'CONNECTION') startLevel('HOME');
      else if (currentLevel === 'HOME') startLevel('SUN');
      else if (currentLevel === 'SUN') resetGame();
  };

  return (
    <>
    <div 
      className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 font-serif select-none p-4 md:p-6 lg:p-8" 
      onClick={() => resumeAudio()}
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <div className="text-gray-600/60">
        {/* Responsive Text: Mobile(xl) -> Tablet(xl) -> Desktop(2xl) */}
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-widest uppercase text-pink-900/50">
            {CHAPTER_TITLES[currentLevel]}
        </h1>
      </div>
      
      {/* Refactored: 3-Tier Responsive padding and text sizes */}
      <div className="w-full max-w-3xl px-2 md:px-4 text-center pointer-events-auto mx-auto mb-12 md:mb-16">
        <AnimatePresence mode='wait'>
            <motion.div key={`${currentLevel}-${text}`} initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }}>
                {/* Responsive Text: Mobile(lg) -> Tablet(xl) -> Desktop(2xl) */}
                <p className="text-lg md:text-xl lg:text-2xl text-slate-800/80 font-medium leading-relaxed drop-shadow-sm h-16">{text}</p>
                {isLevelComplete && currentLevel !== 'SUN' && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={(e) => { e.stopPropagation(); handleNextLevel(); }} className="mt-6 md:mt-8 text-pink-500 border border-pink-300 px-4 py-1.5 md:px-6 md:py-2 text-sm md:text-base rounded-full hover:bg-pink-50 transition-colors">前往下一章 (Proceed)</motion.button>
                )}
                {currentLevel === 'SUN' && isLevelComplete && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1, scale: 1.1 }} onClick={(e) => { e.stopPropagation(); resetGame(); }} className="mt-6 md:mt-8 text-blue-400 hover:text-blue-600 text-sm md:text-base">[ 轮回 (Rebirth) ]</motion.button>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </>
  );
};
