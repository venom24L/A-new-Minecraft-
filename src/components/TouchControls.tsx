/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Shield, Compass, Swords, ArrowBigUp, Zap } from 'lucide-react';

interface TouchControlsProps {
  onMoveChange: (input: { x: number; z: number }) => void;
  onLookChange: (look: { dx: number; dy: number }) => void;
  onPlaceTrigger: (active: boolean) => void;
  onBreakTrigger: (active: boolean) => void;
  onJumpTrigger: (jumping: boolean) => void;
  onOpenInventory: () => void;
  showInventory?: boolean;
  isPortrait?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onLookChange,
  onPlaceTrigger,
  onBreakTrigger,
  onJumpTrigger,
  onOpenInventory,
  showInventory = false,
  isPortrait = false,
}) => {
  const touchAreaRef = useRef<HTMLDivElement>(null);

  // States for rendering the virtual joystick
  const [renderActive, setRenderActive] = useState(false);
  const [renderCenter, setRenderCenter] = useState({ x: 100, y: 100 });
  const [renderOffset, setRenderOffset] = useState({ x: 0, y: 0 });

  // Use refs in event listeners to guarantees 100% current state, dodging stale closures
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickActiveRef = useRef(false);
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const joystickOffsetRef = useRef({ x: 0, y: 0 });

  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef({ x: 0, y: 0 });

  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Check if a touch event targets an interactive element (e.g. action buttons inside UI)
  const isTouchOnInteractive = (target: EventTarget | null): boolean => {
    if (!target) return false;
    let el = target as HTMLElement;
    while (el && el !== document.body) {
      if (
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.id === 'inventory-btn' ||
        el.classList.contains('pointer-events-auto') && !el.classList.contains('touch-background')
      ) {
        return true;
      }
      el = el.parentElement as HTMLElement;
    }
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showInventory) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Bypass any interaction if clicking interactive hardware buttons
      if (isTouchOnInteractive(touch.target)) {
        continue;
      }

      const screenWidth = window.innerWidth;
      if (touch.clientX < screenWidth / 2) {
        // --- LEFT SIDE: WALK / DYNAMIC JOYSTICK ---
        if (joystickTouchIdRef.current === null) {
          joystickTouchIdRef.current = touch.identifier;
          joystickActiveRef.current = true;
          joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
          joystickOffsetRef.current = { x: 0, y: 0 };

          setRenderActive(true);
          setRenderCenter({ x: touch.clientX, y: touch.clientY });
          setRenderOffset({ x: 0, y: 0 });
        }
      } else {
        // --- RIGHT SIDE: LOOK CAMERA ---
        if (lookTouchIdRef.current === null) {
          lookTouchIdRef.current = touch.identifier;
          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  };

  useEffect(() => {
    const handleWindowTouchMove = (e: TouchEvent) => {
      if (showInventory) return;

      // 1. Process movement touch tracking
      if (joystickTouchIdRef.current !== null) {
        let joyTouch: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === joystickTouchIdRef.current) {
            joyTouch = e.touches[i];
            break;
          }
        }

        if (joyTouch) {
          const dx = joyTouch.clientX - joystickCenterRef.current.x;
          const dy = joyTouch.clientY - joystickCenterRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxRadius = 45; // limit drag threshold of joystick knob

          let finalDragX = dx;
          let finalDragY = dy;
          if (distance > maxRadius) {
            finalDragX = (dx / distance) * maxRadius;
            finalDragY = (dy / distance) * maxRadius;
          }

          joystickOffsetRef.current = { x: finalDragX, y: finalDragY };
          setRenderOffset({ x: finalDragX, y: finalDragY });

          // Send Walking intensities [x, z] mappings
          const moveX = finalDragX / maxRadius;
          const moveZ = -finalDragY / maxRadius; // Invert to bind upwards drag with walking forward
          onMoveChange({ x: moveX, z: moveZ });
        }
      }

      // 2. Process camera swiping updates
      if (lookTouchIdRef.current !== null) {
        let lookTouch: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === lookTouchIdRef.current) {
            lookTouch = e.touches[i];
            break;
          }
        }

        if (lookTouch) {
          const dx = lookTouch.clientX - lookLastPosRef.current.x;
          const dy = lookTouch.clientY - lookLastPosRef.current.y;

          // Dispatch mouse looking velocity to Canvas Euler calculations (smoothing factor 0.35)
          onLookChange({ dx: -dx * 0.35, dy: -dy * 0.35 });

          lookLastPosRef.current = { x: lookTouch.clientX, y: lookTouch.clientY };
        }
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === joystickTouchIdRef.current) {
          joystickTouchIdRef.current = null;
          joystickActiveRef.current = false;
          joystickOffsetRef.current = { x: 0, y: 0 };
          setRenderActive(false);
          setRenderOffset({ x: 0, y: 0 });
          onMoveChange({ x: 0, z: 0 });
        }

        if (touch.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
        }
      }
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [showInventory, onMoveChange, onLookChange]);

  // Continuous hold logic for mining and building
  const startBreaking = () => {
    onBreakTrigger(true);
  };

  const stopBreaking = () => {
    onBreakTrigger(false);
  };

  const startPlacing = () => {
    onPlaceTrigger(true);
  };

  const stopPlacing = () => {
    onPlaceTrigger(false);
  };

  useEffect(() => {
    return () => {
      stopBreaking();
      stopPlacing();
    };
  }, []);

  // Desktop drag look fallback
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseLastPosRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const mouseDownTimeRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    setIsMouseDown(true);
    const pos = { x: e.clientX, y: e.clientY };
    mouseLastPosRef.current = pos;
    mouseDownPosRef.current = pos;
    mouseDownTimeRef.current = Date.now();

    if (!isMobileRef.current) {
      document.getElementById('game-canvas')?.requestPointerLock();
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - mouseLastPosRef.current.x;
      const dy = e.clientY - mouseLastPosRef.current.y;
      onLookChange({ dx: -dx * 0.35, dy: -dy * 0.35 });
      mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return;
      setIsMouseDown(false);

      const travelX = e.clientX - mouseDownPosRef.current.x;
      const travelY = e.clientY - mouseDownPosRef.current.y;
      const travelDist = Math.hypot(travelX, travelY);
      const duration = Date.now() - mouseDownTimeRef.current;

      if (travelDist < 8 && duration < 300) {
        if (e.button === 0 && !e.shiftKey) {
          onBreakTrigger(true);
          setTimeout(() => onBreakTrigger(false), 50);
        } else {
          onPlaceTrigger(true);
          setTimeout(() => onPlaceTrigger(false), 50);
        }
      }
    };

    if (isMouseDown) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isMouseDown]);

  return (
    <div
      ref={touchAreaRef}
      id="touch-overlay-container"
      className="absolute inset-0 pointer-events-none w-full h-full select-none z-10"
    >
      {/* FULLSCREEN TOUCH ACTION BASE AREA */}
      <div
        id="look-touch-area"
        className="absolute inset-0 z-0 bg-transparent touch-none pointer-events-auto touch-background cursor-move"
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
      />

      {/* RENDER DYNAMIC VIRTUAL JOYSTICK */}
      <div
        className="pointer-events-none absolute z-20 transition-all duration-75"
        style={{
          left: renderActive ? `${renderCenter.x - 56}px` : '40px',
          bottom: renderActive ? `${window.innerHeight - renderCenter.y - 56}px` : (isPortrait ? '135px' : '40px'),
          display: showInventory ? 'none' : 'block',
        }}
      >
        <div className="w-28 h-28 rounded-full border-2 border-white/20 bg-black/45 backdrop-blur-md flex items-center justify-center relative shadow-2xl">
          {/* Inner ring track */}
          <div className="w-10 h-10 rounded-full border border-white/10 absolute pointer-events-none" />
          
          {/* Joystick Handle Knob */}
          <div
            className="w-12 h-12 rounded-full bg-white/40 border-2 border-white/60 shadow-lg absolute flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${renderOffset.x}px, ${renderOffset.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/70 shadow-sm" />
          </div>
        </div>
      </div>

      {/* ACTION TRIGGERS (RIGHT PANEL) */}
      <div className={`absolute pointer-events-auto flex flex-col items-end gap-3 z-10 transition-all ${
        isPortrait ? 'bottom-24 right-4' : 'bottom-6 right-6'
      }`}>
        <div className="flex gap-3">
          {/* BREAK BLOCK BUTTON */}
          <button
            onMouseDown={(e) => { e.preventDefault(); startBreaking(); }}
            onMouseUp={stopBreaking}
            onMouseLeave={stopBreaking}
            onTouchStart={(e) => { e.preventDefault(); startBreaking(); }}
            onTouchEnd={stopBreaking}
            onTouchCancel={stopBreaking}
            className={`rounded-full bg-rose-600/80 active:bg-rose-700 active:scale-95 border border-rose-500/30 flex flex-col items-center justify-center text-white font-bold select-none shadow-lg outline-none backdrop-blur-sm cursor-pointer pointer-events-auto transition-all ${
              isPortrait ? 'w-14 h-14 text-[10px]' : 'w-16 h-16 text-xs'
            }`}
            title="Mine Block"
          >
            <Zap className={`${isPortrait ? 'w-4 h-4' : 'w-5 h-5'} mb-0.5`} />
            <span>MINE</span>
          </button>

          {/* PLACE BLOCK BUTTON */}
          <button
            onMouseDown={(e) => { e.preventDefault(); startPlacing(); }}
            onMouseUp={stopPlacing}
            onMouseLeave={stopPlacing}
            onTouchStart={(e) => { e.preventDefault(); startPlacing(); }}
            onTouchEnd={stopPlacing}
            onTouchCancel={stopPlacing}
            className={`rounded-full bg-emerald-600/80 active:bg-emerald-700 active:scale-95 border border-emerald-500/30 flex flex-col items-center justify-center text-white font-bold select-none shadow-lg outline-none backdrop-blur-sm cursor-pointer pointer-events-auto transition-all ${
              isPortrait ? 'w-14 h-14 text-[10px]' : 'w-16 h-16 text-xs'
            }`}
            title="Build Block"
          >
            <ArrowBigUp className={`${isPortrait ? 'w-4 h-4' : 'w-5 h-5'} mb-0.5`} />
            <span>BUILD</span>
          </button>
        </div>

        {/* JUMP & INVENTORY CONTROLS */}
        <div className="flex gap-4 items-center">
          {/* INVENTORY DRAWER POP */}
          <button
            id="inventory-btn"
            onClick={(e) => { e.stopPropagation(); onOpenInventory(); }}
            onTouchStart={(e) => { e.stopPropagation(); onOpenInventory(); }}
            className={`rounded-lg bg-orange-600/85 active:bg-orange-700 border border-orange-500/30 font-bold text-white shadow-lg backdrop-blur-sm flex items-center justify-center select-none pointer-events-auto cursor-pointer transition-all ${
              isPortrait ? 'w-11 h-11 text-[10px]' : 'w-12 h-12 text-xs'
            }`}
          >
            CRAFT
          </button>

          {/* JUMP ACTION CONTAINER */}
          <button
            onMouseDown={(e) => { e.preventDefault(); onJumpTrigger(true); }}
            onMouseUp={(e) => { e.preventDefault(); onJumpTrigger(false); }}
            onTouchStart={(e) => { e.preventDefault(); onJumpTrigger(true); }}
            onTouchEnd={(e) => { e.preventDefault(); onJumpTrigger(false); }}
            className={`rounded-full bg-white/20 active:bg-white/40 active:scale-90 border border-white/25 flex items-center justify-center text-white font-black shadow-2xl backdrop-blur-sm pointer-events-auto cursor-pointer select-none transition-all ${
              isPortrait ? 'w-16 h-16 text-xs' : 'w-20 h-20 text-sm'
            }`}
            title="Jump Action"
          >
            JUMP
          </button>
        </div>
      </div>
    </div>
  );
};
