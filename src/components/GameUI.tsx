/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Trophy, RefreshCw, Trash2, Check, User, Code, Package, Settings, Flame } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { BlockType, BLOCK_DEFINITIONS, CRAFTING_RECIPES, PlayerState } from '../types';

interface GameUIProps {
  engine: GameEngine;
  playerState: PlayerState;
  showInventory: boolean;
  setShowInventory: (v: boolean) => void;
  isPortrait?: boolean;
  orientationMode: 'auto' | 'horizontal' | 'vertical';
  setOrientationMode: (m: 'auto' | 'horizontal' | 'vertical') => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  engine,
  playerState,
  showInventory,
  setShowInventory,
  isPortrait = false,
  orientationMode,
  setOrientationMode,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting' | 'settings'>('inventory');
  const [selectedInventorySlot, setSelectedInventorySlot] = useState<number | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(CRAFTING_RECIPES[0]?.id || '');

  // Render Hearts for Health representation (Divide 100 into 10 hearts)
  const renderHearts = () => {
    const heartCount = 10;
    const activeHealthHearts = Math.ceil(playerState.health / 10);
    const heartsList = [];

    for (let i = 0; i < heartCount; i++) {
      const isFilled = i < activeHealthHearts;
      heartsList.push(
        <Heart
          key={`heart-${i}`}
          className={`w-4 h-4 mr-0.5 ${
            isFilled ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-zinc-600 fill-transparent'
          }`}
        />
      );
    }
    return heartsList;
  };

  // Render Hunger drumsticks (10 drumsticks for 100 hunger)
  const renderHunger = () => {
    const drumstickCount = 10;
    const activeHungerUnits = Math.ceil(playerState.hunger / 10);
    const drumsticksList = [];

    for (let i = 0; i < drumstickCount; i++) {
      const isFilled = i < activeHungerUnits;
      drumsticksList.push(
        <Flame
          key={`drum-${i}`}
          className={`w-4 h-4 mr-0.5 ${
            isFilled ? 'text-amber-500 fill-amber-500' : 'text-zinc-600 fill-transparent'
          }`}
        />
      );
    }
    return drumsticksList;
  };

  // Render oxygen bubbles if player head goes underwater
  const renderOxygen = () => {
    if (playerState.air >= 100) return null;
    const bubbleCount = 10;
    const activeBubbles = Math.ceil(playerState.air / 10);
    const bubblesList = [];

    for (let i = 0; i < bubbleCount; i++) {
      const isFilled = i < activeBubbles;
      bubblesList.push(
        <div
          key={`bubble-${i}`}
          className={`w-3.5 h-3.5 rounded-full border-2 border-sky-400 mr-0.5 ${
            isFilled ? 'bg-sky-500' : 'bg-transparent'
          }`}
        />
      );
    }

    return (
      <div className="flex items-center mt-1.5 self-end">
        <span className="text-[10px] font-bold text-sky-400 mr-1.5">BREATH</span>
        {bubblesList}
      </div>
    );
  };

  // Inventory Cell Swap click handler
  const handleSlotClick = (index: number) => {
    if (selectedInventorySlot === null) {
      if (playerState.inventory[index] !== null || playerState.creativeMode) {
        setSelectedInventorySlot(index);
      }
    } else {
      // Perform block swap between Slot selected and Slot target clicked
      if (selectedInventorySlot === index) {
        setSelectedInventorySlot(null);
        return;
      }

      const temp = engine.playerState.inventory[selectedInventorySlot];
      engine.setInventorySlot(selectedInventorySlot, engine.playerState.inventory[index]);
      engine.setInventorySlot(index, temp);
      setSelectedInventorySlot(null);
    }
  };

  // Handle crafting loop
  const handleCraft = (recipeId: string) => {
    const isSuccess = engine.craftItem(recipeId, true);
    if (!isSuccess) {
      alert("Insufficient materials inside backpack to craft this block!");
    }
  };

  // Switch Survival vs Creative modes
  const handleModeToggle = () => {
    const creativeActive = engine.playerState.creativeMode;
    engine.setCreativeMode(!creativeActive);
  };

  // Find a block name from BlockType enum helper
  const blockName = (type: BlockType): string => {
    return BLOCK_DEFINITIONS[type]?.name || 'Unknown Block';
  };

  // Block color visual cell preview getter
  const blockColor = (type: BlockType): string => {
    return BLOCK_DEFINITIONS[type]?.color || '#ffffff';
  };

  return (
    <div id="game-ui-hud-root" className="absolute inset-0 pointer-events-none w-full h-full font-mono flex flex-col justify-between z-20">
      
      {/* 1. TOP HEADER STATUS INDICATORS */}
      <div className="w-full flex justify-between items-start p-4 bg-gradient-to-b from-black/40 to-transparent">
        
        {/* Left indicators: Vital Statistics */}
        <div className="flex flex-col gap-1 pointer-events-auto bg-black/40 p-2.5 rounded-lg border border-white/10 backdrop-blur-xs">
          
          {/* Health indicator bar */}
          {!playerState.creativeMode && (
            <div className="flex flex-col mb-1.5">
              <div className="flex items-center">
                <span className="text-[10px] text-zinc-400 font-bold mr-2 w-9">LIFE</span>
                {renderHearts()}
              </div>
            </div>
          )}

          {/* Hunger meter bar */}
          {!playerState.creativeMode && (
            <div className="flex flex-col mb-1.5">
              <div className="flex items-center">
                <span className="text-[10px] text-zinc-400 font-bold mr-2 w-9">HUNGER</span>
                {renderHunger()}
              </div>
              {renderOxygen()}
            </div>
          )}

          {/* Core Score count and Day cycle text */}
          <div className="flex items-center text-xs font-black text-white mt-1">
            <Trophy className="w-4 h-4 text-yellow-400 mr-1.5" />
            <span>XP SCORE: <span className="text-emerald-400">{playerState.score}</span></span>
          </div>
          <div className="text-[9px] text-zinc-400 font-bold mt-1">
            TIME OF DAY: {Math.floor(engine.skyTime / 1000)}:00 (
            {engine.skyTime < 12000 ? '☀️ DAYTIME' : '🌙 NIGHTTIME'}
            )
          </div>
        </div>

        {/* Right Indicators: Survival/Creative Controls */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          {/* Creative mode toggle pill */}
          <div className="flex gap-2.5 items-center">
            <button
              onClick={handleModeToggle}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-md cursor-pointer transition ${
                playerState.creativeMode
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              MODE: {playerState.creativeMode ? '🧪 CREATIVE' : '⚔️ SURVIVAL'}
            </button>
            <button
              onClick={() => engine.eatFood()}
              className="px-3 py-1.5 rounded-lg bg-orange-700 border border-orange-600 text-[11px] font-bold text-white shadow-md cursor-pointer hover:bg-orange-600"
            >
              🍴 EAT ACTIVE
            </button>
          </div>
        </div>
      </div>

      {/* 2. RECONSTRUCT DEATH SCREEN IF HEALTH <= 0 */}
      {playerState.isDead && (
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto">
          <h1 className="text-rose-600 text-4xl font-black tracking-widest leading-none animate-bounce mb-2">
            YOU DIED!
          </h1>
          <p className="text-zinc-400 text-xs mb-8 text-center max-w-sm">
            You fell too deep, starved, or drowned under water! Your earned score was reduced by 50% as a survival penalty.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => engine.respawn()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 border border-red-400 text-white text-sm font-black rounded-lg shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
              RESPAWN PLAYER
            </button>
            <button
              onClick={() => {
                if (confirm('Wipe world file and reset fully?')) {
                  engine.clearSave();
                }
              }}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              RESET WORLD
            </button>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC BOTTOM HOTBAR */}
      <div className="w-full flex flex-col items-center bg-transparent p-2 md:p-4">
        <div className="pointer-events-auto flex gap-1.5 p-2 bg-black/60 border border-white/10 rounded-xl max-w-full overflow-x-auto shadow-2xl backdrop-blur-xs">
          
          {Array(9).fill(null).map((_, i) => {
            const item = playerState.inventory[i];
            const isActive = playerState.activeSlot === i;
            const def = item ? BLOCK_DEFINITIONS[item.type] : null;

            return (
              <button
                key={`hotbar-${i}`}
                onClick={() => engine.setActiveSlot(i)}
                className={`relative rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isPortrait ? 'w-9 h-9' : 'w-12 h-12 shadow-md'
                } ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 scale-110 ring-[2px] ring-amber-400'
                    : 'bg-zinc-900/55 border-zinc-750 hover:bg-zinc-800/60'
                }`}
              >
                {/* Visual Block Miniature representation */}
                {def ? (
                  <div className="flex flex-col items-center justify-center relative w-full h-full">
                    <div
                      className={`shadow-[inset_1px_1px_0_rgba(255,255,255,0.45),_0_1.5px_3px_rgba(0,0,0,0.5)] relative ${
                        isPortrait ? 'w-4 h-4 border-[2px]' : 'w-5.5 h-5.5 border-[3px]'
                      }`}
                      style={{
                        backgroundColor: def.color,
                        borderTopColor: def.topColor || def.color,
                        borderLeftColor: def.topColor || def.color,
                        borderBottomColor: def.bottomColor || def.color,
                        borderRightColor: def.bottomColor || def.color,
                      }}
                    >
                      {/* Subtle pixel grit effect for authentic retro feel */}
                      <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:4px_4px] bg-[position:0_0,0_2px,2px_-2px,-2px_0]" />
                    </div>
                    <span className={`absolute font-black text-white bg-black/80 px-0.5 rounded leading-none ${
                        isPortrait ? 'bottom-0.5 right-0.5 text-[8px]' : 'bottom-1 right-1 text-[9px]'
                    }`}>
                      {playerState.creativeMode ? '♾️' : item.count}
                    </span>
                  </div>
                ) : (
                  <div className={`border border-dashed border-zinc-700/50 rounded ${
                    isPortrait ? 'w-3.5 h-3.5' : 'w-5 h-5'
                  }`} />
                )}
                {/* Core slot index numbers help text */}
                <span className="absolute top-[1px] left-[3px] text-[7px] font-bold text-zinc-500">
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MODAL BACKPACK SYSTEM SYSTEM (Storage + Crafting) */}
      {showInventory && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center pointer-events-auto z-40 p-4 animate-fade-in">
          <div className="w-full max-w-3xl h-[88vh] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal tab selectors */}
            <div className="w-full bg-zinc-950 border-b border-zinc-800 flex justify-between items-center px-4 py-2.5">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'inventory'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  BAG STORAGE (36)
                </button>
                <button
                  onClick={() => setActiveTab('crafting')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'crafting'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  CRAFTING ENGINE
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'settings'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  WORLD SETTINGS
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowInventory(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* TAB CONTENT: BACKPACK STORAGE GRID */}
            {activeTab === 'inventory' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <p className="text-[10px] text-zinc-400">
                  💡 <span className="font-bold text-zinc-300">Tip:</span> Tap a block slot to select, then tap any destination slot to move or stack items smoothly.
                </p>

                {/* 27 Slots Storage section (Rows 9-35) */}
                <div className="flex-1">
                  <span className="text-xs font-black text-zinc-400 mb-2 block">🎒 BACKPACK STORAGE SHELVES</span>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/40 max-h-[35vh] overflow-y-auto">
                    {Array(27).fill(null).map((_, idx) => {
                      const realIdx = idx + 9; // Skip first 9 (hotbar)
                      const item = playerState.inventory[realIdx];
                      const isSelected = selectedInventorySlot === realIdx;
                      const def = item ? BLOCK_DEFINITIONS[item.type] : null;

                      return (
                        <button
                          key={`bag-${idx}`}
                          onClick={() => handleSlotClick(realIdx)}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-[2px] ring-amber-400'
                              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          {def ? (
                            <div className="flex flex-col items-center justify-center">
                              <div
                                className="w-5.5 h-5.5 border-[3px] shadow-[inset_1px_1px_0_rgba(255,255,255,0.45)] relative"
                                style={{
                                  backgroundColor: def.color,
                                  borderTopColor: def.topColor || def.color,
                                  borderLeftColor: def.topColor || def.color,
                                  borderBottomColor: def.bottomColor || def.color,
                                  borderRightColor: def.bottomColor || def.color,
                                }}
                              >
                                <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:4px_4px]" />
                              </div>
                              <span className="absolute bottom-1 right-1 text-[8px] font-black text-white bg-black/60 px-0.5 rounded leading-none">
                                {item.count}
                              </span>
                            </div>
                          ) : (
                            <div className="w-4 h-4 border border-dashed border-zinc-800 rounded" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hotbar slots replication shelf so players can drag back/forth into hotbar directly */}
                <div>
                  <span className="text-xs font-black text-zinc-400 mb-2 block">🤝 ACTIVE HOTBAR</span>
                  <div className="grid grid-cols-9 gap-1.5 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/40">
                    {Array(9).fill(null).map((_, idx) => {
                      const item = playerState.inventory[idx];
                      const isSelected = selectedInventorySlot === idx;
                      const def = item ? BLOCK_DEFINITIONS[item.type] : null;

                      return (
                        <button
                          key={`rephotbar-${idx}`}
                          onClick={() => handleSlotClick(idx)}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-[2px] ring-amber-500'
                              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          {def ? (
                            <div className="flex flex-col items-center justify-center">
                              <div
                                className="w-5.5 h-5.5 border-[3px] shadow-[inset_1px_1px_0_rgba(255,255,255,0.45)] relative"
                                style={{
                                  backgroundColor: def.color,
                                  borderTopColor: def.topColor || def.color,
                                  borderLeftColor: def.topColor || def.color,
                                  borderBottomColor: def.bottomColor || def.color,
                                  borderRightColor: def.bottomColor || def.color,
                                }}
                              >
                                <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:4px_4px]" />
                              </div>
                              <span className="absolute bottom-1 right-1 text-[8px] font-black text-white bg-black/60 px-0.5 rounded leading-none">
                                {item.count}
                              </span>
                            </div>
                          ) : (
                            <div className="w-4 h-4 border border-dashed border-zinc-800 rounded" />
                          )}
                          <span className="absolute top-[1px] left-[3px] text-[7px] font-bold text-zinc-500">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CRAFTING PANEL MODULE */}
            {activeTab === 'crafting' && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Recipe Books */}
                <div className="w-1/2 overflow-y-auto border-r border-zinc-800 p-4 flex flex-col gap-1.5 bg-zinc-950/20">
                  <span className="text-xs font-black text-zinc-400 mb-2">📒 AVAILABLE RECIPES</span>
                  {CRAFTING_RECIPES.map((rec) => {
                    const outputDef = BLOCK_DEFINITIONS[rec.output.type];
                    const isSelected = selectedRecipeId === rec.id;

                    return (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedRecipeId(rec.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4.5 h-4.5 border-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)] shrink-0"
                            style={{
                              backgroundColor: outputDef?.color,
                              borderTopColor: outputDef?.topColor || outputDef?.color,
                              borderLeftColor: outputDef?.topColor || outputDef?.color,
                              borderBottomColor: outputDef?.bottomColor || outputDef?.color,
                              borderRightColor: outputDef?.bottomColor || outputDef?.color,
                            }}
                          />
                          <span className="text-[11px] font-bold leading-none">{outputDef?.name}</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-black/30 px-1 rounded">
                          +{rec.output.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Recipe Crafting execution */}
                <div className="w-1/2 overflow-y-auto p-4 flex flex-col justify-between bg-zinc-950/60 p-6">
                  {(() => {
                    const rec = CRAFTING_RECIPES.find((r) => r.id === selectedRecipeId);
                    if (!rec) return <div className="text-zinc-500 text-xs">Select a recipe...</div>;

                    const outputDef = BLOCK_DEFINITIONS[rec.output.type];

                    return (
                      <div className="h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3.5 mb-5 border-b border-zinc-800/60 pb-3">
                            <div
                              className="w-10 h-10 border-[3px] shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center"
                              style={{
                                backgroundColor: outputDef?.color,
                                borderTopColor: outputDef?.topColor || outputDef?.color,
                                borderLeftColor: outputDef?.topColor || outputDef?.color,
                                borderBottomColor: outputDef?.bottomColor || outputDef?.color,
                                borderRightColor: outputDef?.bottomColor || outputDef?.color,
                              }}
                            />
                            <div>
                              <h2 className="text-sm font-black text-white">{outputDef?.name}</h2>
                              <span className="text-[9px] font-bold text-zinc-400">
                                YIELD: <span className="text-emerald-400">{rec.output.count} BLOCKS</span>
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-black text-zinc-400 mb-2 block">
                            🛒 REQUIRED INGREDIENTS
                          </span>
                          <div className="flex flex-col gap-2">
                            {rec.ingredients.map((ing) => {
                              const ingDef = BLOCK_DEFINITIONS[ing.type];
                              // Check active backpack count
                              const owned = playerState.inventory.reduce((sum, curr) => {
                                if (curr && curr.type === ing.type) return sum + curr.count;
                                return sum;
                              }, 0);
                              const hasEnough = owned >= ing.count;

                              return (
                                <div
                                  key={ing.type}
                                  className="flex items-center justify-between bg-zinc-900/40 border border-zinc-900 p-2 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 border-2 shadow-[inset_0.5px_0.5px_0_rgba(255,255,255,0.4)] shrink-0"
                                      style={{
                                        backgroundColor: ingDef?.color,
                                        borderTopColor: ingDef?.topColor || ingDef?.color,
                                        borderLeftColor: ingDef?.topColor || ingDef?.color,
                                        borderBottomColor: ingDef?.bottomColor || ingDef?.color,
                                        borderRightColor: ingDef?.bottomColor || ingDef?.color,
                                      }}
                                    />
                                    <span className="text-[10px] text-zinc-300 font-bold">{ingDef?.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-black ${hasEnough ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {owned} / {ing.count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Craft Button */}
                        <button
                          onClick={() => handleCraft(rec.id)}
                          className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border border-emerald-400/20 shadow-lg cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          CRAFT {rec.output.count}x {outputDef?.name.toUpperCase()}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB CONTENT: WORLD SETTINGS UTILS */}
            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-zinc-950/40">
                <span className="text-xs font-black text-zinc-400 mb-1 border-b border-zinc-850 pb-1.5 flex items-center gap-1">
                  ⚙️ SETTINGS DASHBOARD
                </span>

                {/* ACCESSIBILITY ORIENTATION SWITCHER */}
                <div className="bg-zinc-900/60 p-3 border border-zinc-800/40 rounded-xl flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">♿ View Orientation (Accessibility)</h3>
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setOrientationMode('auto')}
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
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
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
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
                      className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                        orientationMode === 'vertical'
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      Vertical (P)
                    </button>
                  </div>
                </div>

                {/* SENSITIVITY CONTROLS */}
                <div className="bg-zinc-900/60 p-3 border border-zinc-800/40 rounded-xl flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">🎛️ Touch & Look Sensitivity</h3>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-bold">
                      {engine.settings.sensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[0.5, 1.0, 1.5, 2.0].map((val) => (
                      <button
                        key={`sens-${val}`}
                        onClick={() => engine.updateSettings({ sensitivity: val })}
                        className={`flex-1 py-1.5 focus:outline-none transition-all rounded text-[10px] font-black border cursor-pointer ${
                          engine.settings.sensitivity === val
                            ? 'bg-amber-500 border-amber-400 text-black shadow-md'
                            : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {val.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRAPHICS & SOUNDS TOGGLES */}
                <div className="bg-zinc-900/60 p-3 border border-zinc-800/40 rounded-xl flex flex-col gap-3">
                  {/* Dynamic Shadows */}
                  <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">🌅 Enhanced Dynamic Shadows</span>
                      <span className="text-[9px] text-zinc-500">Real-time solar shadow projection</span>
                    </div>
                    <button
                      onClick={() => engine.updateSettings({ shadowsEnabled: !engine.settings.shadowsEnabled })}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border cursor-pointer ${
                        engine.settings.shadowsEnabled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                    >
                      {engine.settings.shadowsEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">🎵 Spatial Sound Effects</span>
                      <span className="text-[9px] text-zinc-500">Immersive feedback on break & build</span>
                    </div>
                    <button
                      onClick={() => engine.updateSettings({ soundEnabled: !engine.settings.soundEnabled })}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border cursor-pointer ${
                        engine.settings.soundEnabled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                    >
                      {engine.settings.soundEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* RISK UTILITIES */}
                <div className="bg-zinc-900/60 p-3 border border-zinc-800/40 rounded-xl flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold text-rose-400">⚠️ Risk Operations</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        engine.respawn();
                        setShowInventory(false);
                      }}
                      className="flex-1 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-[10px] font-bold rounded-lg cursor-pointer transition active:scale-95"
                    >
                      RESPAWN PLAYER
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete saved world contents and start fresh?')) {
                          engine.clearSave();
                          setShowInventory(false);
                        }
                      }}
                      className="flex-1 py-1.5 bg-red-650/10 hover:bg-red-600/20 text-red-400 border border-red-500/25 text-[10px] font-bold rounded-lg cursor-pointer transition active:scale-95"
                    >
                      RESET WORLD
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
