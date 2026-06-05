/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GameEngine } from './engine/GameEngine';
import { GameCanvas } from './components/GameCanvas';
import { TouchControls } from './components/TouchControls';
import { GameUI } from './components/GameUI';
import { Play, Compass, Key } from 'lucide-react';

export default function App() {
  // Store the game engine inside a mutable React reference so it survives re-renders
  const engineRef = useRef<GameEngine | null>(null);
  
  // Use a state tick to trigger full UI rerenders when properties inside the engine mutate
  const [tick, setTick] = useState(0);

  // Touch Inputs coordinate tracking
  const [moveInput, setMoveInput] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const lookInputRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [touchPlaceTrigger, setTouchPlaceTrigger] = useState(false);
  const [touchBreakTrigger, setTouchBreakTrigger] = useState(false);

  // Backpack Modals and Splash Start Controls
  const [showInventory, setShowInventory] = useState(false);
  const [hasBegun, setHasBegun] = useState(false);

  // Dynamic Orientation Mode Accessibility (auto, horizontal, vertical)
  const [orientationMode, setOrientationMode] = useState<'auto' | 'horizontal' | 'vertical'>('auto');
  const [devicePortrait, setDevicePortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setDevicePortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = orientationMode === 'auto'
    ? devicePortrait
    : orientationMode === 'vertical';

  // Initialize GameEngine once on mount
  useEffect(() => {
    engineRef.current = new GameEngine(() => {
      setTick((prev) => prev + 1);
    });
    // Force first render
    setTick(1);
  }, []);

  const engine = engineRef.current;

  // Render Loading splash screen until initialized
  if (!engine) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Generating Voxel Terrain...
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen select-none overflow-hidden bg-zinc-950 font-mono text-white text-xs flex items-center justify-center">
      
      {/* 1. START LAUNCH SCREEN SPLASH SCREEN */}
      {!hasBegun ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-950 border border-zinc-900 z-50 flex items-center justify-center p-4 select-none"
        >
          <div className="w-full max-w-md bg-zinc-900 p-6 rounded-2xl border border-zinc-850 shadow-2xl text-center flex flex-col items-center">
            
            {/* Visual Header Grid Icon */}
            <div className="w-20 h-20 bg-emerald-600 rounded-xl mb-3 border-2 border-emerald-400 shadow-lg relative flex items-center justify-center">
              <div className="w-8 h-8 bg-amber-700 border-2 border-amber-500 rounded-md transform rotate-12 absolute" />
              <Compass className="w-6 h-6 text-white z-10 animate-pulse" />
            </div>

            <h1 className="text-xl font-black text-white uppercase tracking-wider mb-1">
              VOXEL CRAFT MOBILE
            </h1>
            <p className="text-[10px] text-amber-400 font-bold mb-3 uppercase tracking-widest">
              3D Pocket Game Clone
            </p>

            {/* Accessibility Orientation Select */}
            <div className="w-full text-left mb-4">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-black mb-1.5 block">
                ♿ ACCESSIBILITY ORIENTATION
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setOrientationMode('auto')}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                    orientationMode === 'auto'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Auto Detect
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode('horizontal')}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                    orientationMode === 'horizontal'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Horizontal (L)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode('vertical')}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                    orientationMode === 'vertical'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Vertical (P)
                </button>
              </div>
            </div>

            {/* Instruction keys guides */}
            <div className="w-full text-left bg-zinc-950 p-3 rounded-xl border border-white/5 mb-4 text-[9.5px] leading-relaxed text-zinc-450 flex flex-col gap-1.5">
              <span className="font-bold text-zinc-300 border-b border-white/5 pb-1 block">
                🎮 MOBILE HOW-TO-PLAY:
              </span>
              <p>• Left stick controls walking directions.</p>
              <p>• Right screen drag guides looking and camera angle.</p>
              <p>• Action <span className="font-bold text-rose-450">MINE</span> & <span className="font-bold text-emerald-450">BUILD</span> buttons action block changes.</p>
              
              <span className="font-bold text-zinc-300 border-b border-white/5 pb-1 block mt-1">
                💻 DESKTOP keyboard controls fallback:
              </span>
              <p>• <kbd className="bg-zinc-800 text-white px-1 rounded border border-zinc-700">W</kbd> <kbd className="bg-zinc-800 text-white px-1 rounded border border-zinc-700">A</kbd> <kbd className="bg-zinc-800 text-white px-1 rounded border border-zinc-700">S</kbd> <kbd className="bg-zinc-800 text-white px-1 rounded border border-zinc-700">D</kbd> walk. <kbd className="bg-zinc-800 text-white px-1 rounded border border-zinc-700">SPACE</kbd> jump.</p>
            </div>

            <button
              id="start-button"
              onClick={() => setHasBegun(true)}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 border-b-4 border-amber-800"
            >
              <Play className="w-4 h-4 text-white fill-white" />
              GENERATE LAND
            </button>
          </div>
        </motion.div>
      ) : null}

      {/* 2. GAME VIEWPORT AND HEADS-UP DISPLAY */}
      {hasBegun && (
        <div
          id="viewport-root"
          className={
            orientationMode === 'vertical' && !devicePortrait
              ? "aspect-[9/16] h-full max-h-[820px] w-auto mx-auto shadow-2xl border border-zinc-800/60 rounded-2xl overflow-hidden relative flex flex-col justify-between bg-black"
              : orientationMode === 'horizontal' && devicePortrait
                ? "aspect-[16/9] w-full max-w-[960px] h-auto my-auto mx-auto shadow-2xl border border-zinc-800/60 rounded-xl overflow-hidden relative flex flex-col justify-between bg-black"
                : "relative w-full h-full select-none overflow-hidden flex flex-col justify-between"
          }
        >
          
          {/* Main 3D Canvas */}
          <GameCanvas
            engine={engine}
            moveInput={moveInput}
            lookInputRef={lookInputRef}
            touchPlaceTrigger={touchPlaceTrigger}
            touchBreakTrigger={touchBreakTrigger}
            setTouchPlaceTrigger={setTouchPlaceTrigger}
            setTouchBreakTrigger={setTouchBreakTrigger}
          />

          {/* Tacoma mobile virtual joystick controllers overlays */}
          <TouchControls
            onMoveChange={(moveVec) => setMoveInput((prev) => ({ ...prev, ...moveVec }))}
            onLookChange={(lookDiff) => {
              lookInputRef.current.dx += lookDiff.dx;
              lookInputRef.current.dy += lookDiff.dy;
            }}
            onPlaceTrigger={(active) => setTouchPlaceTrigger(active)}
            onBreakTrigger={(active) => setTouchBreakTrigger(active)}
            onJumpTrigger={(jumping) => setMoveInput((prev) => ({ ...prev, y: jumping ? 1.0 : 0 }))}
            onOpenInventory={() => setShowInventory(true)}
            showInventory={showInventory}
            isPortrait={isPortrait}
          />

          {/* Hud status trackers indicators (Health hearts, XP, Active slot replication) */}
          <GameUI
            engine={engine}
            playerState={engine.playerState}
            showInventory={showInventory}
            setShowInventory={setShowInventory}
            isPortrait={isPortrait}
            orientationMode={orientationMode}
            setOrientationMode={setOrientationMode}
          />
        </div>
      )}

    </div>
  );
}
