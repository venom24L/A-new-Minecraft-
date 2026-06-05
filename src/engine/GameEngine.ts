/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockType,
  BLOCK_DEFINITIONS,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  CHUNK_DEPTH,
  VIEW_DISTANCE,
  MAX_INVENTORY_SLOTS,
  HOTBAR_SLOTS,
  PlayerState,
  InventoryItem,
  CRAFTING_RECIPES,
} from '../types';
import { worldNoise } from '../utils/noise';

// Simple Vector3 helper for math
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export class GameEngine {
  // Loaded world chunks: key 'cx,cz' -> chunk data
  public chunks: Map<string, Uint8Array> = new Map();
  // Dirty chunks that need rendering updates
  public dirtyChunks: Set<string> = new Set();
  // Player modified chunks needing persistence saving
  public modifiedChunks: Set<string> = new Set();
  
  // Game Settings
  public settings = {
    sensitivity: 1.0,
    shadowsEnabled: true,
    soundEnabled: true,
  };
  
  // Player Position, Velocity and Head Direction
  public playerPos: Vec3 = { x: 8, y: 32, z: 8 };
  public playerVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  public playerRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };

  // Survival / Player Stats
  public playerState: PlayerState;

  // Day / Night loop
  public skyTime: number = 2400; // 0 to 24000 ticks. Noon is 6000, Sunset is 12000, Midnight is 18000.
  
  // Custom game ticks counters
  private survivalTickAcc: number = 0;
  private autoSaveTickAcc: number = 0;

  // Callback for state updates to force React trigger
  private onStateChange: () => void = () => {};

  constructor(onStateChange?: () => void) {
    if (onStateChange) {
      this.onStateChange = onStateChange;
    }

    // Initialize default Player Stats
    this.playerState = {
      health: 100,
      hunger: 100,
      air: 100,
      score: 0,
      isDead: false,
      activeSlot: 0,
      creativeMode: false,
      onGround: false,
      inventory: Array(MAX_INVENTORY_SLOTS).fill(null),
    };

    this.loadGame();
    this.ensureStarterInventory();
    this.streamWorld(this.playerPos.x, this.playerPos.z);
  }

  // Force a react state refresh
  private triggerUpdate() {
    this.onStateChange();
  }

  // Set active hotbar item slot
  public setActiveSlot(index: number) {
    if (index >= 0 && index < HOTBAR_SLOTS) {
      this.playerState.activeSlot = index;
      this.triggerUpdate();
    }
  }

  // Get item in the active hotbar slot
  public getActiveItem(): InventoryItem | null {
    return this.playerState.inventory[this.playerState.activeSlot];
  }

  // Deduct one item from the active slot
  public consumeActiveItem() {
    if (this.playerState.creativeMode) return; // infinite blocks in creative
    
    const slotIndex = this.playerState.activeSlot;
    const item = this.playerState.inventory[slotIndex];
    if (item) {
      item.count--;
      if (item.count <= 0) {
        this.playerState.inventory[slotIndex] = null;
      }
      this.triggerUpdate();
    }
  }

  // Add block/item to inventory
  public addToInventory(type: BlockType, count: number = 1): boolean {
    // 1. Try stacking in existing matching slots
    for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
      const slot = this.playerState.inventory[i];
      if (slot && slot.type === type && slot.count < 64) {
        const canTake = Math.min(64 - slot.count, count);
        slot.count += canTake;
        count -= canTake;
        if (count <= 0) {
          this.triggerUpdate();
          return true;
        }
      }
    }

    // 2. Try placing in an empty slot
    for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
      if (this.playerState.inventory[i] === null) {
        this.playerState.inventory[i] = { type, count: Math.min(64, count) };
        count -= Math.min(64, count);
        if (count <= 0) {
          this.triggerUpdate();
          return true;
        }
      }
    }

    this.triggerUpdate();
    return count === 0;
  }

  // Drop slot item
  public setInventorySlot(index: number, item: InventoryItem | null) {
    if (index >= 0 && index < MAX_INVENTORY_SLOTS) {
      this.playerState.inventory[index] = item;
      this.triggerUpdate();
    }
  }

  private ensureStarterInventory() {
    // If inventory is completely empty, give some starter blocks and tools
    const hasItems = this.playerState.inventory.some((v) => v !== null);
    if (!hasItems) {
      this.playerState.inventory[0] = { type: BlockType.DIRT, count: 64 };
      this.playerState.inventory[1] = { type: BlockType.PLANKS, count: 32 };
      this.playerState.inventory[2] = { type: BlockType.STONE, count: 16 };
      this.playerState.inventory[3] = { type: BlockType.CRAFTING_TABLE, count: 2 };
      this.playerState.inventory[4] = { type: BlockType.GLASS, count: 16 };
      this.playerState.inventory[5] = { type: BlockType.WOOD, count: 8 };
    }
  }

  // Crafting functionality
  public craftItem(recipeId: string, searchInCraftingTable: boolean): boolean {
    const recipe = requireRecipe(recipeId);
    if (!recipe) return false;
    
    if (recipe.requiresCraftingTable && !searchInCraftingTable) {
      return false; // Can't craft standard crafting table items without one open
    }

    // Check if player has all ingredients
    const copyInventory = JSON.parse(JSON.stringify(this.playerState.inventory)) as (InventoryItem | null)[];
    let ingredientsMet = true;

    for (const req of recipe.ingredients) {
      let needed = req.count;
      for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
        const item = copyInventory[i];
        if (item && item.type === req.type) {
          const spend = Math.min(item.count, needed);
          item.count -= spend;
          needed -= spend;
          if (item.count <= 0) {
            copyInventory[i] = null;
          }
          if (needed <= 0) break;
        }
      }
      if (needed > 0) {
        ingredientsMet = false;
        break;
      }
    }

    if (!ingredientsMet) return false;

    // Apply crafting consumption
    this.playerState.inventory = copyInventory;
    
    // Add crafted output
    this.addToInventory(recipe.output.type, recipe.output.count);
    this.playerState.score += 5;
    this.triggerUpdate();
    return true;
  }

  // Get index in chunk array
  private getBlockIndex(lx: number, ly: number, lz: number): number {
    return lx + lz * CHUNK_WIDTH + ly * CHUNK_WIDTH * CHUNK_DEPTH;
  }

  // Stream in chunks surrounding player, unload far away ones
  public streamWorld(playerX: number, playerZ: number) {
    const pcx = Math.floor(playerX / CHUNK_WIDTH);
    const pcz = Math.floor(playerZ / CHUNK_DEPTH);

    const activeKeys = new Set<string>();

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = `${cx},${cz}`;
        activeKeys.add(key);

        if (!this.chunks.has(key)) {
          this.generateChunk(cx, cz);
        }
      }
    }

    // Unload chunks that are out of rendering range (to save mobile device memory)
    for (const key of this.chunks.keys()) {
      if (!activeKeys.has(key)) {
        // Save any custom block modifications locally before fully unloading
        this.saveChunkToStorage(key);
        this.chunks.delete(key);
      }
    }
  }

  // Generate a procedural chunk using fbm Noise
  private generateChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;

    // Check if the user has custom-saved block coordinates for this chunk
    const stored = localStorage.getItem(`voxel_chunk_${key}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        let arr: Uint8Array;
        const targetSize = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;
        if (parsed.length === targetSize) {
          arr = new Uint8Array(parsed);
        } else {
          arr = decompressChunk(parsed, targetSize);
        }
        this.chunks.set(key, arr);
        this.modifiedChunks.add(key); // Track as modified so we save it upon unload
        this.dirtyChunks.add(key);
        return;
      } catch (e) {
        console.error("Failed loading persistent chunk", e);
      }
    }

    const chunkData = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);

    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
        const gx = cx * CHUNK_WIDTH + lx;
        const gz = cz * CHUNK_DEPTH + lz;

        // Multi-layered height generation (2D fBm noise)
        const scaleHeight = worldNoise.fbm2d(gx * 0.005, gz * 0.005, 3) * 0.6 + 0.2;
        const details = worldNoise.fbm2d(gx * 0.02, gz * 0.02, 2) * 0.15;
        const noiseFactor = scaleHeight + details;

        // Smooth surface heights
        const surfaceHeight = Math.floor(10 + noiseFactor * 32);
        
        // Define biome characteristics
        const biomeNoise = worldNoise.fbm2d(gx * 0.002, gz * 0.002, 2);
        const isDesert = biomeNoise > 0.65;
        const isMountain = biomeNoise < 0.35 && noiseFactor > 0.45;

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          const index = this.getBlockIndex(lx, ly, lz);

          // 1. Bedrock bottom boundary
          if (ly === 0) {
            chunkData[index] = BlockType.BEDROCK;
            continue;
          }

          // 2. Cave carving with 3D noise (strictly below surface height minus 4 blocks to protect the grass floor)
          const caveNoiseValue = worldNoise.fbm3d(gx * 0.04, ly * 0.08, gz * 0.04, 2);
          const isCave = ly > 2 && ly < (surfaceHeight - 4) && caveNoiseValue > 0.72;

          if (isCave) {
            // Fill with air except for river layers below standard height, to avoid infinite flooding
            if (ly <= 14) {
              chunkData[index] = BlockType.WATER;
            } else {
              chunkData[index] = BlockType.AIR;
            }
            continue;
          }

          // 3. Fill terrain height
          if (ly <= surfaceHeight) {
            const depth = surfaceHeight - ly;

            if (isDesert) {
              if (depth < 4) {
                chunkData[index] = BlockType.SAND;
              } else {
                chunkData[index] = BlockType.STONE;
              }
            } else if (isMountain) {
              if (ly === surfaceHeight) {
                chunkData[index] = BlockType.STONE; // Rocky mountains
              } else {
                chunkData[index] = BlockType.STONE;
              }
            } else {
              // Plentiful Grass plains
              if (ly === surfaceHeight) {
                chunkData[index] = BlockType.GRASS;
              } else if (depth < 4) {
                chunkData[index] = BlockType.DIRT;
              } else {
                // Stone containing ores (Coal, Iron, Gold, Diamond, Glowstone based on depth)
                const oreNoise = worldNoise.fbm3d(gx * 0.08, ly * 0.08, gz * 0.08, 1);
                if (oreNoise > 0.78) {
                  if (ly < 10) {
                    chunkData[index] = Math.random() < 0.35 ? BlockType.GLOWSTONE : BlockType.DIAMOND_ORE;
                  } else if (ly < 18) {
                    chunkData[index] = BlockType.GOLD_ORE;
                  } else if (ly < 25) {
                    chunkData[index] = BlockType.IRON_ORE;
                  } else {
                    chunkData[index] = BlockType.COAL;
                  }
                } else {
                  chunkData[index] = BlockType.STONE;
                }
              }
            }
          } else {
            // Fluid generation for oceanic lakes below height level 16
            if (ly <= 16) {
              chunkData[index] = BlockType.WATER;
            } else {
              chunkData[index] = BlockType.AIR;
            }
          }
        }

        // 4. Place decorative Oak Trees in Plains/Forest regions deterministically
        if (!isDesert && !isMountain && surfaceHeight > 16) {
          // A beautiful linear hash from absolute world position to avoid random trees changing on load
          const hashValue = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453;
          const randomVal = hashValue - Math.floor(hashValue);

          if (randomVal > 0.982) {
            const trunkHeight = 4 + Math.floor(randomVal * 3); // 4 to 6 tall
            const startY = surfaceHeight + 1;

            // Make sure the bottom block can support an oak sapling
            const bottomIdx = this.getBlockIndex(lx, surfaceHeight, lz);
            if (chunkData[bottomIdx] === BlockType.GRASS) {
              // Build Trunk
              for (let ty = 0; ty < trunkHeight; ty++) {
                const heightY = startY + ty;
                if (heightY < CHUNK_HEIGHT - 4) {
                  const trunkIdx = this.getBlockIndex(lx, heightY, lz);
                  chunkData[trunkIdx] = BlockType.WOOD;
                }
              }

              // Build Leaves Canopy
              const canopyTopY = startY + trunkHeight - 1;
              for (let dy = -2; dy <= 1; dy++) {
                const leafY = canopyTopY + dy;
                if (leafY >= CHUNK_HEIGHT) continue;
                
                // Radius gets narrower at the absolute top peak of leaf stack
                const r = dy >= 0 ? 1 : 2;

                for (let dx = -r; dx <= r; dx++) {
                  for (let dz = -r; dz <= r; dz++) {
                    const leafX = lx + dx;
                    const leafZ = lz + dz;

                    // Skip the outer corners occasionally for natural-looking rounded foliage
                    if (Math.abs(dx) === r && Math.abs(dz) === r && Math.random() < 0.4) {
                      continue;
                    }

                    // Keep leaf blocks within chunk bounds or ignore wrapping to avoid crash
                    if (leafX >= 0 && leafX < CHUNK_WIDTH && leafZ >= 0 && leafZ < CHUNK_DEPTH) {
                      const leafIdx = this.getBlockIndex(leafX, leafY, leafZ);
                      // Don't replace wood logs with leaf foliage
                      if (chunkData[leafIdx] === BlockType.AIR) {
                        chunkData[leafIdx] = BlockType.LEAVES;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    this.chunks.set(key, chunkData);
    this.dirtyChunks.add(key);
  }

  // Retrieve block type at absolute global coordinates
  public getBlock(x: number, y: number, z: number): BlockType {
    const rx = Math.floor(x);
    const ry = Math.floor(y);
    const rz = Math.floor(z);

    if (ry < 0 || ry >= CHUNK_HEIGHT) {
      return BlockType.AIR;
    }

    const cx = Math.floor(rx / CHUNK_WIDTH);
    const cz = Math.floor(rz / CHUNK_DEPTH);
    const key = `${cx},${cz}`;

    const chunk = this.chunks.get(key);
    if (!chunk) {
      return BlockType.AIR; // Unloaded chunks act as air transparent boundaries
    }

    const lx = ((rx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
    const lz = ((rz % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH;
    const index = this.getBlockIndex(lx, ry, lz);

    return chunk[index];
  }

  // Set block type at absolute coordinates and mark chunk as needing a visual rewrite
  public setBlock(x: number, y: number, z: number, type: BlockType): boolean {
    const rx = Math.floor(x);
    const ry = Math.floor(y);
    const rz = Math.floor(z);

    if (ry < 0 || ry >= CHUNK_HEIGHT) return false;

    const cx = Math.floor(rx / CHUNK_WIDTH);
    const cz = Math.floor(rz / CHUNK_DEPTH);
    const key = `${cx},${cz}`;

    const chunk = this.chunks.get(key);
    if (!chunk) return false;

    const lx = ((rx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
    const lz = ((rz % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH;
    const index = this.getBlockIndex(lx, ry, lz);

    // Bedrock boundary is totally unbreakable for stability
    if (chunk[index] === BlockType.BEDROCK && type === BlockType.AIR) {
      return false;
    }

    chunk[index] = type;
    this.dirtyChunks.add(key);
    this.modifiedChunks.add(key); // Mark as custom modified

    // Flag adjacent chunks if coordinates lie directly on block chunk borders
    if (lx === 0) this.dirtyChunks.add(`${cx - 1},${cz}`);
    if (lx === CHUNK_WIDTH - 1) this.dirtyChunks.add(`${cx + 1},${cz}`);
    if (lz === 0) this.dirtyChunks.add(`${cx},${cz - 1}`);
    if (lz === CHUNK_DEPTH - 1) this.dirtyChunks.add(`${cx},${cz + 1}`);

    // Queue save to local browser
    this.saveChunkToStorage(key);
    return true;
  }

  // Core Physics AABB Engine Update
  public updatePhysics(dt: number, moveInput: { x: number; z: number }, doJump: boolean) {
    if (this.playerState.isDead) return;

    const gravity = this.playerState.creativeMode ? 0 : -32.0;
    const terminalVelocity = -50;
    const speedMultiplier = this.playerState.creativeMode ? 14.0 : 6.5;
    const frictionMultiplier = this.playerState.onGround ? 8.0 : 3.0;

    // Head immersion level drowning check
    const isHeadInWater = this.getBlock(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z) === BlockType.WATER;
    const isFeetInWater = this.getBlock(this.playerPos.x, this.playerPos.y - 1.2, this.playerPos.z) === BlockType.WATER;
    const inFluid = isHeadInWater || isFeetInWater;

    // Apply fluid resistance deceleration
    const activeGravity = inFluid ? gravity * 0.25 : gravity;
    const finalSpeed = inFluid ? speedMultiplier * 0.45 : speedMultiplier;

    // Air resistance/drag
    this.playerVelocity.y += activeGravity * dt;
    if (this.playerVelocity.y < terminalVelocity) {
      this.playerVelocity.y = terminalVelocity;
    }

    // Horizontal look vector calculation based on camera rotation
    // Player is controlled using moveInput: x = lateral, z = forward/back
    const sinYaw = Math.sin(this.playerRotation.yaw);
    const cosYaw = Math.cos(this.playerRotation.yaw);

    const targetVelX = (moveInput.z * -sinYaw + moveInput.x * cosYaw) * finalSpeed;
    const targetVelZ = (moveInput.z * -cosYaw + moveInput.x * -sinYaw) * finalSpeed;

    // Apply inertia friction to smooth out sliding
    this.playerVelocity.x += (targetVelX - this.playerVelocity.x) * frictionMultiplier * dt;
    this.playerVelocity.z += (targetVelZ - this.playerVelocity.z) * frictionMultiplier * dt;

    if (this.playerState.creativeMode) {
      // In creative, player velocity Y stays under command flight
      if (doJump) {
        this.playerVelocity.y = 8.0;
      } else if (moveInput.z === 0 && moveInput.x === 0) {
        this.playerVelocity.y = 0;
      }
    } else {
      // Standard Jump implementation if ground contact stands solid
      if (doJump) {
        if (this.playerState.onGround) {
          this.playerVelocity.y = 11.5;
          this.playerState.onGround = false;
        } else if (inFluid) {
          // Swim upwards in lakes or dynamic currents
          this.playerVelocity.y = 3.5;
        }
      }
    }

    // Perform Axis-by-Axis bounding collision resolution to prevent falling through walls
    const playerWidth = 0.58; // slightly smaller than a standard block index (0.6)
    const playerHeight = 1.75;

    // Track previous height to perform fall damage maths
    const prevVy = this.playerVelocity.y;

    // 1. Move and resolve collision along X axis
    this.playerPos.x += this.playerVelocity.x * dt;
    const collidedX = this.resolveCollisions('x', playerWidth, playerHeight);

    // 2. Move and resolve collision along Y axis
    this.playerPos.y += this.playerVelocity.y * dt;
    this.playerState.onGround = false;
    this.resolveCollisions('y', playerWidth, playerHeight);

    // 3. Move and resolve collision along Z axis
    this.playerPos.z += this.playerVelocity.z * dt;
    const collidedZ = this.resolveCollisions('z', playerWidth, playerHeight);

    // Dynamic Step-Up Auto-Jump (for smooth mobile touch gameplay)
    if ((collidedX || collidedZ) && this.playerState.onGround) {
      // Find driving direction vectors
      const dirX = Math.sign(this.playerVelocity.x || targetVelX);
      const dirZ = Math.sign(this.playerVelocity.z || targetVelZ);

      // Check coordinates 0.4 blocks ahead of player's boundary
      const checkX = Math.floor(this.playerPos.x + dirX * 0.4);
      const checkZ = Math.floor(this.playerPos.z + dirZ * 0.4);
      const feetY = Math.floor(this.playerPos.y - playerHeight + 0.1);

      // We allow auto-stepping over exactly 1 block height obstacles
      const blockAtKnee = this.getBlock(checkX, feetY, checkZ);
      const blockAtEye = this.getBlock(checkX, feetY + 1.2, checkZ);
      const blockAboveEye = this.getBlock(checkX, feetY + 2.2, checkZ);

      const isObstacleSolid = BLOCK_DEFINITIONS[blockAtKnee]?.isSolid;
      const isSpaceAboveClear = !BLOCK_DEFINITIONS[blockAtEye]?.isSolid && !BLOCK_DEFINITIONS[blockAboveEye]?.isSolid;

      if (isObstacleSolid && isSpaceAboveClear) {
        // Trigger a springy upward hop to smoothly ascend the step
        this.playerVelocity.y = 8.2;
        this.playerState.onGround = false;
      }
    }

    // Handle Fall damage calculations
    if (this.playerState.onGround && prevVy < -12.0 && !this.playerState.creativeMode) {
      const damage = Math.floor((Math.abs(prevVy) - 10.0) * 1.8);
      if (damage > 0) {
        this.damagePlayer(damage);
        this.playerState.score = Math.max(0, this.playerState.score - damage);
      }
    }

    // Stream world around new position coords
    this.streamWorld(this.playerPos.x, this.playerPos.z);
    
    // Tweak survival hunger rates based on motion speed
    const isMoving = Math.abs(this.playerVelocity.x) > 0.1 || Math.abs(this.playerVelocity.z) > 0.1;
    if (isMoving && !this.playerState.creativeMode) {
      this.playerState.hunger = Math.max(0, this.playerState.hunger - 0.005);
    }
  }

  // Rigid AABB Collision Resolver
  private resolveCollisions(axis: 'x' | 'y' | 'z', width: number, height: number): boolean {
    let collided = false;
    const minX = Math.floor(this.playerPos.x - width / 2);
    const maxX = Math.floor(this.playerPos.x + width / 2);
    // Player model coordinate starts from bottom anchor, up to top head heights
    const minY = Math.floor(this.playerPos.y - height);
    const maxY = Math.floor(this.playerPos.y + 0.1);
    const minZ = Math.floor(this.playerPos.z - width / 2);
    const maxZ = Math.floor(this.playerPos.z + width / 2);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.getBlock(x, y, z);
          const def = BLOCK_DEFINITIONS[block];

          // Check solid collision
          if (def && def.isSolid) {
            // Check if there is actual intersection between player and block aabb
            const pMinX = this.playerPos.x - width / 2;
            const pMaxX = this.playerPos.x + width / 2;
            const pMinY = this.playerPos.y - height;
            const pMaxY = this.playerPos.y;
            const pMinZ = this.playerPos.z - width / 2;
            const pMaxZ = this.playerPos.z + width / 2;

            // Block boundaries are [x, x + 1], [y, y + 1], [z, z + 1]
            const overlapX = pMinX < x + 1 && pMaxX > x;
            const overlapY = pMinY < y + 1 && pMaxY > y;
            const overlapZ = pMinZ < z + 1 && pMaxZ > z;

            if (overlapX && overlapY && overlapZ) {
              collided = true;
              if (axis === 'x') {
                if (this.playerVelocity.x > 0) {
                  // Moving right, clip left border
                  this.playerPos.x = x - width / 2 - 0.001;
                } else if (this.playerVelocity.x < 0) {
                  // Moving left, clip right border
                  this.playerPos.x = x + 1 + width / 2 + 0.001;
                }
                this.playerVelocity.x = 0;
              } else if (axis === 'y') {
                if (this.playerVelocity.y > 0) {
                  // Hit head on roof
                  this.playerPos.y = y - 0.005;
                  this.playerVelocity.y = 0;
                } else if (this.playerVelocity.y < 0) {
                  // Landed solid on floor block! (which has top-surface at y + 1)
                  this.playerPos.y = y + 1 + height + 0.005;
                  this.playerVelocity.y = 0;
                  this.playerState.onGround = true;
                }
              } else if (axis === 'z') {
                if (this.playerVelocity.z > 0) {
                  this.playerPos.z = z - width / 2 - 0.001;
                } else if (this.playerVelocity.z < 0) {
                  this.playerPos.z = z + 1 + width / 2 + 0.001;
                }
                this.playerVelocity.z = 0;
              }
            }
          }
        }
      }
    }
    return collided;
  }

  // Survival Timers loop (Health regen, starvation ticks, drowning alerts)
  public updateSurvivalLoops(dt: number) {
    if (this.playerState.creativeMode || this.playerState.isDead) return;

    this.survivalTickAcc += dt;
    if (this.survivalTickAcc < 1.0) return; // execute stats updates once/sec
    this.survivalTickAcc = 0;

    // Drowning check: head inside water subtracts air
    const headBlock = this.getBlock(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z);
    if (headBlock === BlockType.WATER) {
      this.playerState.air = Math.max(0, this.playerState.air - 12);
      if (this.playerState.air === 0) {
        this.damagePlayer(10); // drowning damage
      }
    } else {
      this.playerState.air = Math.min(100, this.playerState.air + 20); // recover oxygen
    }

    // Starvation check
    if (this.playerState.hunger <= 0) {
      this.damagePlayer(5); // starvation damage
    } else {
      // Natural passive hunger depletion
      this.playerState.hunger = Math.max(0, this.playerState.hunger - 0.25);
    }

    // Health Regeneration when full
    if (this.playerState.health < 100 && this.playerState.hunger > 80) {
      this.playerState.health = Math.min(100, this.playerState.health + 4);
    }

    // Fall below world map death
    if (this.playerPos.y < -15) {
      this.damagePlayer(100);
    }

    this.triggerUpdate();
  }

  // Tents damage to the player
  public damagePlayer(amt: number) {
    if (this.playerState.creativeMode || this.playerState.isDead) return;
    this.playerState.health = Math.max(0, this.playerState.health - amt);
    
    if (this.playerState.health <= 0) {
      this.playerState.isDead = true;
      console.log("Player died!");
    }
    this.triggerUpdate();
  }

  // Revive / Respawn Player
  public respawn() {
    this.playerPos.x = 8;
    this.playerPos.z = 8;
    this.spawnPlayerOnSurface();
    this.playerState.health = 100;
    this.playerState.hunger = 100;
    this.playerState.air = 100;
    this.playerState.isDead = false;
    this.playerState.score = Math.floor(this.playerState.score * 0.5); // reduce score by half as penalty
    this.triggerUpdate();
  }

  // Calculate terrain surface height at coordinate
  public getSurfaceHeight(gx: number, gz: number): number {
    const scaleHeight = worldNoise.fbm2d(gx * 0.005, gz * 0.005, 3) * 0.6 + 0.2;
    const details = worldNoise.fbm2d(gx * 0.02, gz * 0.02, 2) * 0.15;
    const noiseFactor = scaleHeight + details;
    return Math.floor(10 + noiseFactor * 32);
  }

  // Teleport player cleanly above surface (eye position is height of surface + 2.8)
  public spawnPlayerOnSurface() {
    const sh = this.getSurfaceHeight(this.playerPos.x, this.playerPos.z);
    this.playerPos.y = sh + 2.8;
    this.playerVelocity = { x: 0, y: 0, z: 0 };
    this.streamWorld(this.playerPos.x, this.playerPos.z);
  }

  // Set Creative/Survival modes
  public setCreativeMode(enabled: boolean) {
    this.playerState.creativeMode = enabled;
    if (enabled) {
      this.playerState.health = 100;
      this.playerState.hunger = 100;
      this.playerState.air = 100;
    }
    this.triggerUpdate();
  }

  // Eat Food/Use passive item (e.g. Grass or leaves context loops)
  public eatFood(): boolean {
    const activeItem = this.playerState.inventory[this.playerState.activeSlot];
    if (!activeItem) return false;

    // Grass block, Leaves, Sand are edible for fun minecraft survival elements
    if (activeItem.type === BlockType.LEAVES || activeItem.type === BlockType.GRASS) {
      this.playerState.hunger = Math.min(100, this.playerState.hunger + 15);
      this.playerState.health = Math.min(100, this.playerState.health + 2);
      this.consumeActiveItem();
      this.playerState.score += 2;
      return true;
    }

    if (activeItem.type === BlockType.DIRT) {
      this.playerState.hunger = Math.min(100, this.playerState.hunger + 5);
      this.consumeActiveItem();
      return true;
    }

    return false;
  }

  // Clock Update
  public updateSkyTicks(dt: number) {
    // 24000 ticks in a standard Minecraft game day. Standard speed = ~1200 ticks/sec so 20 mins a cycle
    this.skyTime = (this.skyTime + dt * 100) % 24000;

    // Auto save game state once in 15 seconds
    this.autoSaveTickAcc += dt;
    if (this.autoSaveTickAcc > 15.0) {
      this.autoSaveTickAcc = 0;
      this.saveGame();
    }
  }

  // Save specific modified chunk state to browser Storage
  private saveChunkToStorage(key: string) {
    if (!this.modifiedChunks.has(key)) {
      return; // Skip saving unmodified chunks to protect browser localStorage quota!
    }
    const chunkData = this.chunks.get(key);
    if (chunkData) {
      try {
        const compressed = compressChunk(chunkData);
        localStorage.setItem(`voxel_chunk_${key}`, JSON.stringify(compressed));
      } catch (e) {
        console.error("Browser Storage local quota full. Unloading some saved files.", e);
      }
    }
  }

  // Full Save Game state
  public saveGame() {
    try {
      const stateObj = {
        playerPos: this.playerPos,
        playerRotation: this.playerRotation,
        playerState: this.playerState,
        skyTime: this.skyTime,
        settings: this.settings,
      };
      localStorage.setItem('voxelcraft_save_game', JSON.stringify(stateObj));
      console.log("Game auto-saved successfully!");
    } catch (e) {
      console.error("Failed autosaving state data", e);
    }
  }

  // Full Load Game State
  public loadGame() {
    try {
      const saved = localStorage.getItem('voxelcraft_save_game');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.playerPos = parsed.playerPos || { x: 8, y: 32, z: 8 };
        this.playerRotation = parsed.playerRotation || { pitch: 0, yaw: 0 };
        this.playerState = {
          ...this.playerState,
          ...parsed.playerState,
        };
        this.skyTime = parsed.skyTime || 2400;
        if (parsed.settings) {
          this.settings = { ...this.settings, ...parsed.settings };
        }
        console.log("Game loaded from disk successfully.");
        // Safety check: if they load underground or dead, pull them up
        if (this.playerPos.y < -15) {
          this.spawnPlayerOnSurface();
        }
      } else {
        // Safe spawn for clean new game
        this.playerPos.x = 8;
        this.playerPos.z = 8;
        this.spawnPlayerOnSurface();
      }
    } catch (e) {
      console.error("Error reading saved state files, starting clean.", e);
      // Fallback spawn
      this.playerPos.x = 8;
      this.playerPos.z = 8;
      this.spawnPlayerOnSurface();
    }
  }

  // Update game settings safely
  public updateSettings(newSettings: Partial<{ sensitivity: number; shadowsEnabled: boolean; soundEnabled: boolean }>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveGame();
    this.triggerUpdate();
  }

  // Wipe Save & Restart cleanly
  public clearSave() {
    // Collect all local storage keys matching this game
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('voxel_chunk_') || key.startsWith('voxelcraft_save_'))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    
    // Reset state variables
    this.chunks.clear();
    this.dirtyChunks.clear();
    this.modifiedChunks.clear(); // Clear all tracked modifications
    this.playerPos.x = 8;
    this.playerPos.z = 8;
    this.spawnPlayerOnSurface();
    this.playerRotation = { pitch: 0, yaw: 0 };
    this.playerState = {
      health: 100,
      hunger: 100,
      air: 100,
      score: 0,
      isDead: false,
      activeSlot: 0,
      creativeMode: false,
      onGround: false,
      inventory: Array(MAX_INVENTORY_SLOTS).fill(null),
    };
    this.ensureStarterInventory();
    this.streamWorld(this.playerPos.x, this.playerPos.z);
    this.triggerUpdate();
  }
}

// Simple helper recipe getter
function requireRecipe(id: string): any {
  return CRAFTING_RECIPES.find((v) => v.id === id) || null;
}

/**
 * Compresses a Uint8Array using a simple, web-safe Run-Length Encoding.
 * Format: [value1, count1, value2, count2, ...]
 */
export function compressChunk(data: Uint8Array | number[]): number[] {
  const rle: number[] = [];
  if (data.length === 0) return rle;

  let currentVal = data[0];
  let count = 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i] === currentVal) {
      count++;
    } else {
      rle.push(currentVal, count);
      currentVal = data[i];
      count = 1;
    }
  }
  rle.push(currentVal, count);
  return rle;
}

/**
 * Decompresses an RLE compressed number array back into a Uint8Array.
 */
export function decompressChunk(rle: number[], targetSize: number): Uint8Array {
  const data = new Uint8Array(targetSize);
  let index = 0;
  for (let i = 0; i < rle.length; i += 2) {
    const val = rle[i];
    const count = rle[i + 1];
    for (let c = 0; c < count; c++) {
      if (index < targetSize) {
        data[index++] = val;
      }
    }
  }
  return data;
}
