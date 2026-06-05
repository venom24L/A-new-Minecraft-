/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Block Types
export enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  SAND = 4,
  WOOD = 5,
  LEAVES = 6,
  WATER = 7,
  COAL = 8,
  IRON_ORE = 9,
  DIAMOND_ORE = 10,
  BEDROCK = 11,
  GLASS = 12,
  PLANKS = 13,
  CRAFTING_TABLE = 14,
  GOLD_ORE = 15,
  BRICK = 16,
  GLOWSTONE = 17,
}

// Block Metadata for textures and UI
export interface BlockDefinition {
  type: BlockType;
  name: string;
  color: string; // fallback color
  topColor?: string; // grass-top
  bottomColor?: string; // grass-bottom/side
  isSolid: boolean;
  isTransparent: boolean;
  isLiquid: boolean;
  breakTime: number; // in ms
  harvestTool?: string;
  texturePattern?: 'noise' | 'grass' | 'water' | 'leaves' | 'stone' | 'wood' | 'planks' | 'crafting' | 'ore';
  patternAccent?: string;
}

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  [BlockType.AIR]: {
    type: BlockType.AIR,
    name: 'Air',
    color: 'transparent',
    isSolid: false,
    isTransparent: true,
    isLiquid: false,
    breakTime: 0,
  },
  [BlockType.DIRT]: {
    type: BlockType.DIRT,
    name: 'Dirt',
    color: '#865439',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 400,
    texturePattern: 'noise',
  },
  [BlockType.GRASS]: {
    type: BlockType.GRASS,
    name: 'Grass Block',
    color: '#34d399',
    topColor: '#15803d',
    bottomColor: '#865439',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 500,
    texturePattern: 'grass',
  },
  [BlockType.STONE]: {
    type: BlockType.STONE,
    name: 'Stone',
    color: '#6b7280',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 1000,
    texturePattern: 'stone',
  },
  [BlockType.SAND]: {
    type: BlockType.SAND,
    name: 'Sand',
    color: '#fef08a',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 300,
    texturePattern: 'noise',
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD,
    name: 'Oak Wood',
    color: '#713f12',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 800,
    texturePattern: 'wood',
  },
  [BlockType.LEAVES]: {
    type: BlockType.LEAVES,
    name: 'Oak Leaves',
    color: '#166534',
    isSolid: true,
    isTransparent: true,
    isLiquid: false,
    breakTime: 150,
    texturePattern: 'leaves',
  },
  [BlockType.WATER]: {
    type: BlockType.WATER,
    name: 'Water',
    color: '#3b82f6',
    isSolid: false,
    isTransparent: true,
    isLiquid: true,
    breakTime: 100,
    texturePattern: 'water',
  },
  [BlockType.COAL]: {
    type: BlockType.COAL,
    name: 'Coal Ore',
    color: '#4b5563',
    patternAccent: '#111827',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 1200,
    texturePattern: 'ore',
  },
  [BlockType.IRON_ORE]: {
    type: BlockType.IRON_ORE,
    name: 'Iron Ore',
    color: '#5b5b5b',
    patternAccent: '#eab308',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 1500,
    texturePattern: 'ore',
  },
  [BlockType.DIAMOND_ORE]: {
    type: BlockType.DIAMOND_ORE,
    name: 'Diamond Ore',
    color: '#4b5563',
    patternAccent: '#22d3ee',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 2500,
    texturePattern: 'ore',
  },
  [BlockType.BEDROCK]: {
    type: BlockType.BEDROCK,
    name: 'Bedrock',
    color: '#1f2937',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: Infinity, // Unbreakable
    texturePattern: 'stone',
  },
  [BlockType.GLASS]: {
    type: BlockType.GLASS,
    name: 'Glass',
    color: '#e2e8f0',
    isSolid: true,
    isTransparent: true,
    isLiquid: false,
    breakTime: 100,
    texturePattern: 'noise',
  },
  [BlockType.PLANKS]: {
    type: BlockType.PLANKS,
    name: 'Oak Planks',
    color: '#b45309',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 500,
    texturePattern: 'planks',
  },
  [BlockType.CRAFTING_TABLE]: {
    type: BlockType.CRAFTING_TABLE,
    name: 'Crafting Table',
    color: '#7c2d12',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 600,
    texturePattern: 'crafting',
  },
  [BlockType.GOLD_ORE]: {
    type: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    color: '#eab308',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 1800,
    texturePattern: 'ore',
  },
  [BlockType.BRICK]: {
    type: BlockType.BRICK,
    name: 'Clay Brick',
    color: '#b91c1c',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 1200,
    texturePattern: 'planks',
  },
  [BlockType.GLOWSTONE]: {
    type: BlockType.GLOWSTONE,
    name: 'Glowstone',
    color: '#fef08a',
    isSolid: true,
    isTransparent: false,
    isLiquid: false,
    breakTime: 400,
    texturePattern: 'stone',
  },
};

// Player Inventory Slot Structure
export interface InventoryItem {
  type: BlockType;
  count: number;
}

// Crafting Recipe Structure
export interface CraftingRecipe {
  id: string;
  ingredients: { type: BlockType; count: number }[];
  output: { type: BlockType; count: number };
  requiresCraftingTable: boolean;
}

// Standard Crafting Recipes
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'planks',
    ingredients: [{ type: BlockType.WOOD, count: 1 }],
    output: { type: BlockType.PLANKS, count: 4 },
    requiresCraftingTable: false,
  },
  {
    id: 'crafting_table',
    ingredients: [{ type: BlockType.PLANKS, count: 4 }],
    output: { type: BlockType.CRAFTING_TABLE, count: 1 },
    requiresCraftingTable: false,
  },
  {
    id: 'glass',
    ingredients: [{ type: BlockType.SAND, count: 1 }],
    output: { type: BlockType.GLASS, count: 1 },
    requiresCraftingTable: true, // Needs crafting table for smelting/forming
  },
  {
    id: 'grass',
    ingredients: [
      { type: BlockType.DIRT, count: 1 },
      { type: BlockType.LEAVES, count: 1 },
    ],
    output: { type: BlockType.GRASS, count: 1 },
    requiresCraftingTable: true,
  },
  {
    id: 'diamond_block_cheat', // A fun survival crafting loop
    ingredients: [
      { type: BlockType.COAL, count: 4 },
      { type: BlockType.IRON_ORE, count: 2 },
    ],
    output: { type: BlockType.DIAMOND_ORE, count: 1 },
    requiresCraftingTable: true,
  },
  {
    id: 'brick',
    ingredients: [
      { type: BlockType.DIRT, count: 2 },
      { type: BlockType.STONE, count: 2 },
    ],
    output: { type: BlockType.BRICK, count: 4 },
    requiresCraftingTable: true,
  },
  {
    id: 'glowstone',
    ingredients: [
      { type: BlockType.COAL, count: 2 },
      { type: BlockType.SAND, count: 2 },
    ],
    output: { type: BlockType.GLOWSTONE, count: 1 },
    requiresCraftingTable: true,
  },
  {
    id: 'gold_smelt_cheat',
    ingredients: [
      { type: BlockType.COAL, count: 2 },
      { type: BlockType.IRON_ORE, count: 1 },
    ],
    output: { type: BlockType.GOLD_ORE, count: 1 },
    requiresCraftingTable: true,
  },
];

// Touch Joystick Data
export interface TouchJoystickData {
  moveX: number;
  moveY: number;
}

// Game Stats and Play State
export interface PlayerState {
  health: number; // 0 to 100
  hunger: number; // 0 to 100
  air: number; // 0 to 100
  score: number;
  isDead: boolean;
  activeSlot: number; // 0 to 8 (Hotbar index)
  inventory: (InventoryItem | null)[]; // size 36 (9 hotbar + 27 main chest)
  onGround: boolean;
  creativeMode: boolean;
}

// Game Constants
export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 64;
export const CHUNK_DEPTH = 16;
export const VIEW_DISTANCE = 3; // 3 chunks radius (total 7x7 grid)
export const MAX_INVENTORY_SLOTS = 36;
export const HOTBAR_SLOTS = 9;
