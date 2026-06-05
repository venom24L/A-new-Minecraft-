/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../types';
import { GameEngine } from '../engine/GameEngine';

// Helper to generate procedurally drawn 16x16 pixel art texture atlas for standard Minecraft theme blocks
const createRetroTextureAtlas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Clear background with deep carbon black
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(0, 0, 256, 256);

  // Helper inside to draw individual pixels in 16x16 tile grids
  const setPixel = (tx: number, ty: number, px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(tx * 16 + px, ty * 16 + py, 1, 1);
  };

  // Tile (0, 0): DIRT
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      const color = r < 0.15 ? '#53351f' : r < 0.4 ? '#674127' : r < 0.75 ? '#805234' : '#905d3c';
      setPixel(0, 0, x, y, color);
    }
  }

  // Tile (1, 0): GRASS TOP
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      const color = r < 0.25 ? '#156b30' : r < 0.55 ? '#1a823a' : r < 0.8 ? '#22c55e' : '#39da73';
      setPixel(1, 0, x, y, color);
    }
  }

  // Tile (2, 0): GRASS SIDE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let isGrass = false;
      if (y < 4) isGrass = true;
      else if (y < 8) isGrass = y < (4 + (x * 7 + 13) % 4);
      
      if (isGrass) {
        const r = Math.random();
        const color = r < 0.25 ? '#156b30' : r < 0.55 ? '#1a823a' : r < 0.8 ? '#22c55e' : '#39da73';
        setPixel(2, 0, x, y, color);
      } else {
        const r = Math.random();
        const color = r < 0.15 ? '#53351f' : r < 0.4 ? '#674127' : r < 0.75 ? '#805234' : '#905d3c';
        setPixel(2, 0, x, y, color);
      }
    }
  }

  // Tile (3, 0): STONE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      let color = '#78716c';
      if (r < 0.12) color = '#44403c'; // crack
      else if (r < 0.3) color = '#57534e'; // shadow stone
      else if (r < 0.55) color = '#a8a29e'; // highlight stone
      setPixel(3, 0, x, y, color);
    }
  }

  // Tile (4, 0): SAND
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wave = Math.sin((x + y * 0.5) * 0.8);
      const r = Math.random();
      let color = '#fde047';
      if (wave > 0.5) color = '#fef08a';
      else if (wave < -0.4) color = '#eab308';
      if (r < 0.05) color = '#fef9c3';
      setPixel(4, 0, x, y, color);
    }
  }

  // Tile (5, 0): WOOD SIDE (Bark)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isCrack = x % 4 === 0 || (x + y * 2) % 6 === 0;
      const color = isCrack ? '#271201' : Math.random() < 0.45 ? '#3b1d04' : '#57300c';
      setPixel(5, 0, x, y, color);
    }
  }

  // Tile (6, 0): WOOD TOP
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let color = '#d97706';
      if (dist > 6.5) color = '#3b1d04'; // dark bark
      else if (dist > 4.2 && dist < 5.0) color = '#b45309'; // ring
      else if (dist > 2.0 && dist < 2.7) color = '#b45309'; // ring
      setPixel(6, 0, x, y, color);
    }
  }

  // Tile (7, 0): LEAVES
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const cutout = (x * 3 + y * 7) % 7 === 0;
      if (cutout) {
        setPixel(7, 0, x, y, 'rgba(0,0,0,0)');
      } else {
        const r = Math.random();
        const color = r < 0.3 ? '#14532d' : r < 0.7 ? '#15803d' : '#16a34a';
        setPixel(7, 0, x, y, color);
      }
    }
  }

  // Tile (8, 0): WATER
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wVal = Math.sin((x * 0.45 + y) * 0.5);
      const color = wVal > 0.4 ? '#3b82f6' : wVal > 0.8 ? '#60a5fa' : wVal < -0.3 ? '#1d4ed8' : '#2563eb';
      setPixel(8, 0, x, y, color);
    }
  }

  // Tile (9, 0): COAL ORE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      let color = r < 0.15 ? '#44403c' : r < 0.3 ? '#57534e' : '#78716c';
      const ore = (x * 3 + y * 8) % 11;
      if (ore < 3 && x > 1 && x < 15 && y > 1 && y < 15) color = '#18181b';
      setPixel(9, 0, x, y, color);
    }
  }

  // Tile (10, 0): IRON ORE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      let color = r < 0.15 ? '#44403c' : r < 0.3 ? '#57534e' : '#78716c';
      const ore = (x * 5 + y * 7) % 12;
      if (ore < 3 && x > 1 && x < 15 && y > 1 && y < 15) color = '#d97706';
      setPixel(10, 0, x, y, color);
    }
  }

  // Tile (11, 0): DIAMOND ORE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      let color = r < 0.15 ? '#44403c' : r < 0.3 ? '#57534e' : '#78716c';
      const ore = (x * 4 + y * 13) % 10;
      if (ore < 3 && x > 1 && x < 15 && y > 1 && y < 15) color = '#06b6d4';
      setPixel(11, 0, x, y, color);
    }
  }

  // Tile (12, 0): BEDROCK
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      const color = r < 0.25 ? '#0c0a09' : r < 0.6 ? '#1c1917' : r < 0.85 ? '#292524' : '#44403c';
      setPixel(12, 0, x, y, color);
    }
  }

  // Tile (13, 0): GLASS
  ctx.clearRect(13 * 16, 0, 16, 16);
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.strokeRect(13 * 16 + 0.5, 0.5, 15, 15);
  setPixel(13, 0, 2, 2, '#ffffff');
  setPixel(13, 0, 3, 2, '#ffffff');
  setPixel(13, 0, 2, 3, '#ffffff');
  setPixel(13, 0, 12, 12, '#ffffff');
  setPixel(13, 0, 13, 11, '#ffffff');

  // Tile (14, 0): PLANKS
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isBorder = y % 4 === 0;
      const isSeam = x % 8 === 0 && (y % 4 !== 0);
      let color = '#d97706';
      if (isBorder) color = '#78350f';
      else if (isSeam) color = '#451a03';
      else if (Math.random() < 0.3) color = '#b45309';
      setPixel(14, 0, x, y, color);
    }
  }

  // Tile (15, 0): CRAFTING TABLE TOP
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isRim = x < 2 || x > 13 || y < 2 || y > 13;
      const isCenterLine = x === 7 || y === 7;
      let color = '#b45309';
      if (isRim) color = '#451a03';
      else if (isCenterLine) color = '#78350f';
      else if (Math.random() < 0.45) color = '#d97706';
      setPixel(15, 0, x, y, color);
    }
  }

  // Tile (0, 1): CRAFTING TABLE SIDE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isFrame = x === 0 || x === 15 || y === 0 || y === 15;
      const isHammer = x > 3 && x < 12 && y > 3 && y < 12;
      let color = '#d97706';
      if (isFrame) color = '#451a03';
      else if (isHammer) {
        color = '#b0b0b0';
        if (x === y) color = '#78350f';
      } else if (Math.random() < 0.3) {
        color = '#b45309';
      }
      setPixel(0, 1, x, y, color);
    }
  }

  // Tile (1, 1): GOLD ORE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      // Stone background
      let color = r < 0.15 ? '#44403c' : r < 0.3 ? '#57534e' : '#78716c';
      // Gold veins
      const ore = (x * 7 + y * 5) % 9;
      if (ore < 3 && x > 1 && x < 15 && y > 1 && y < 15) {
        color = Math.random() < 0.5 ? '#facc15' : '#ca8a04';
      }
      setPixel(1, 1, x, y, color);
    }
  }

  // Tile (2, 1): BRICK
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isRowBorder = y % 4 === 0;
      // Stagger vertical seams every 4 rows
      const isSeam = (y % 8 < 4) ? (x % 8 === 0) : ((x + 4) % 8 === 0);
      let color = '#b91c1c'; // main brick red
      if (isRowBorder || isSeam) {
        color = '#374151'; // dark grout line
      } else {
        const r = Math.random();
        if (r < 0.25) color = '#7f1d1d'; // dark brick
        else if (r < 0.5) color = '#991b1b'; // medium brick
        else if (r < 0.7) color = '#dc2626'; // bright brick accent
      }
      setPixel(2, 1, x, y, color);
    }
  }

  // Tile (3, 1): GLOWSTONE
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      // crystalline lattice drawing
      const isLattice = (x + y) % 4 === 0 || (x - y) % 4 === 0;
      let color = '#facc15'; // yellow
      if (isLattice) {
        color = r < 0.5 ? '#d97706' : '#ea580c'; // darker glow/border amber
      } else {
        color = r < 0.3 ? '#fef08a' : r < 0.7 ? '#fef9c3' : '#facc15'; // warm bright core
      }
      setPixel(3, 1, x, y, color);
    }
  }

  return canvas;
};

interface GameCanvasProps {
  engine: GameEngine;
  moveInput: { x: number; z: number };
  lookInputRef: React.RefObject<{ dx: number; dy: number }>;
  touchPlaceTrigger: boolean;
  touchBreakTrigger: boolean;
  setTouchPlaceTrigger: (v: boolean) => void;
  setTouchBreakTrigger: (v: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  moveInput,
  lookInputRef,
  touchPlaceTrigger,
  touchBreakTrigger,
  setTouchPlaceTrigger,
  setTouchBreakTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Keep fresh references to inputs to avoid closures in the loop
  const inputRef = useRef({ moveInput, touchPlaceTrigger, touchBreakTrigger });
  useEffect(() => {
    inputRef.current = { moveInput, touchPlaceTrigger, touchBreakTrigger };
  }, [moveInput, touchPlaceTrigger, touchBreakTrigger]);

  // Track keyboard state for PC fallback controls
  const keysRef = useRef<Record<string, boolean>>({});

  // Active highlighted target wireframe
  const highlightMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // --- 1. SET UP THREE.JS SCENE ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#38bdf8', 0.025); // slightly clearer fog for beautiful scene depth

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // Position camera slightly higher than foot standard coordinate
    camera.position.set(engine.playerPos.x, engine.playerPos.y, engine.playerPos.z);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false, // turn off antialiasing for maximum mobile performance and nice retro feel
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // limit to 2x for performance
    renderer.setSize(width, height);
    renderer.setClearColor('#38bdf8');

    // Dynamic sky sphere helper for day/night
    const skyGeo = new THREE.SphereGeometry(300, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.BackSide,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // Custom stars group under night cycle
    const starsGroup = new THREE.Group();
    const starGeo = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      // Scatter stars in random sky directions near dome radius
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 280;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // only upper hemisphere
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    starsGroup.add(starPoints);
    scene.add(starsGroup);

    // Beautiful blocky Minecraft sun and moon orbiting setup
    const celestialGroup = new THREE.Group();
    
    // Sun
    const sunGeometry = new THREE.BoxGeometry(22, 22, 22);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfffacd }); // butter-yellow warm glow
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(160, 0, 0);
    celestialGroup.add(sunMesh);

    // Moon
    const moonGeometry = new THREE.BoxGeometry(14, 14, 14);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe6e6fa }); // pale blue-grey moon
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.set(-160, 0, 0);
    celestialGroup.add(moonMesh);

    scene.add(celestialGroup);

    // Blocky floating Minecraft clouds layer
    const cloudsGroup = new THREE.Group();
    const cloudGeo = new THREE.BoxGeometry(24, 4, 24);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    
    // Create random floating clouds
    for (let i = 0; i < 30; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      const cx = (Math.random() - 0.5) * 450;
      const cy = 64 + Math.random() * 8;
      const cz = (Math.random() - 0.5) * 450;
      cloud.position.set(cx, cy, cz);
      cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);

    // Light setups: Dynamic sun + ambient sky and earth bounce
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const sunDirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    sunDirLight.position.set(100, 150, 50);
    scene.add(sunDirLight);

    // Hemispherical lighting maps beautiful sky and dark under-layers
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x333344, 0.35);
    scene.add(hemiLight);

    // 3D wireframe outline highlighter box for targeted voxel blocks
    const highlightGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(highlightGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const targetOutline = new THREE.LineSegments(edges, edgeMat);
    targetOutline.visible = false;
    scene.add(targetOutline);

    // Cracking overlay canvas & texture for mining visual feedback
    const cracksCanvas = document.createElement('canvas');
    cracksCanvas.width = 16;
    cracksCanvas.height = 16;
    const cracksCtx = cracksCanvas.getContext('2d')!;
    cracksCtx.imageSmoothingEnabled = false;

    // Helper to draw a pixel-perfect line using Bresenham's algorithm on the 16x16 canvas
    const drawPixelLine = (x0: number, y0: number, x1: number, y1: number, color: string) => {
      cracksCtx.fillStyle = color;
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      let x = x0;
      let y = y0;

      while (true) {
        if (x >= 0 && x < 16 && y >= 0 && y < 16) {
          cracksCtx.fillRect(x, y, 1, 1);
        }
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    };

    interface CrackLine {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      stage: number;
    }

    // Cumulative crack segments that build upon each other (like real Minecraft!)
    const crackLines: CrackLine[] = [
      // Stage 1 (progress > 10%): Core central micro-fractures
      { x0: 7, y0: 8, x1: 9, y1: 7, stage: 1 },
      { x0: 8, y0: 7, x1: 7, y1: 9, stage: 1 },

      // Stage 2 (progress > 20%): Expanding the center point outward
      { x0: 7, y0: 8, x1: 5, y1: 6, stage: 2 },
      { x0: 9, y0: 7, x1: 11, y1: 8, stage: 2 },

      // Stage 3 (progress > 30%): Developing vertical & diagonal branches
      { x0: 5, y0: 6, x1: 4, y1: 3, stage: 3 },
      { x0: 11, y0: 8, x1: 12, y1: 11, stage: 3 },
      { x0: 7, y0: 9, x1: 6, y1: 12, stage: 3 },

      // Stage 4 (progress > 40%): Branching auxiliary sideways lines
      { x0: 8, y0: 7, x1: 9, y1: 4, stage: 4 },
      { x0: 6, y0: 12, x1: 3, y1: 13, stage: 4 },
      { x0: 12, y0: 11, x1: 14, y1: 12, stage: 4 },

      // Stage 5 (progress > 50%): Reaching block edges
      { x0: 4, y0: 3, x1: 1, y1: 3, stage: 5 },
      { x0: 9, y0: 4, x1: 13, y1: 3, stage: 5 },
      { x0: 14, y0: 12, x1: 15, y1: 9, stage: 5 },
      { x0: 3, y0: 13, x1: 1, y1: 11, stage: 5 },

      // Stage 6 (progress > 60%): Secondary diagonal fractures
      { x0: 5, y0: 6, x1: 2, y1: 8, stage: 6 },
      { x0: 11, y0: 8, x1: 14, y1: 6, stage: 6 },
      { x0: 6, y0: 12, x1: 8, y1: 15, stage: 6 },

      // Stage 7 (progress > 70%): Intersecting forks and corner cracks
      { x0: 2, y0: 8, x1: 2, y1: 11, stage: 7 },
      { x0: 14, y0: 6, x1: 13, y1: 2, stage: 7 },
      { x0: 4, y0: 3, x1: 5, y1: 1, stage: 7 },

      // Stage 8 (progress > 80%): Thick junction lines
      { x0: 7, y0: 8, x1: 11, y1: 8, stage: 8 },
      { x0: 8, y0: 7, x1: 8, y1: 12, stage: 8 },
      { x0: 1, y0: 3, x1: 1, y1: 7, stage: 8 },
      { x0: 12, y0: 11, x1: 11, y1: 15, stage: 8 },

      // Stage 9 (progress > 90%): Complete shattering Web of lines
      { x0: 2, y0: 11, x1: 5, y1: 14, stage: 9 },
      { x0: 13, y0: 2, x1: 11, y1: 1, stage: 9 },
      { x0: 15, y0: 9, x1: 10, y1: 10, stage: 9 },
      { x0: 1, y0: 11, x1: 1, y1: 15, stage: 9 },
      { x0: 15, y0: 1, x1: 15, y1: 6, stage: 9 },
    ];

    // Helper to draw retro pixelated cracks on a 16x16 canvas
    const drawCracks = (progressRatio: number) => {
      cracksCtx.clearRect(0, 0, 16, 16);
      if (progressRatio <= 0) return;

      const maxStage = Math.floor(progressRatio * 10);
      if (maxStage <= 0) return;

      // 1. Draw light highlights slightly offset to give 3D depth and retro chisel relief
      for (const line of crackLines) {
        if (line.stage <= maxStage) {
          drawPixelLine(line.x0 + 1, line.y0 + 1, line.x1 + 1, line.y1 + 1, 'rgba(255, 255, 255, 0.45)');
        }
      }

      // 2. Draw the primary dark fractures on top
      for (const line of crackLines) {
        if (line.stage <= maxStage) {
          drawPixelLine(line.x0, line.y0, line.x1, line.y1, 'rgba(15, 15, 17, 0.92)');
        }
      }
    };

    const cracksTexture = new THREE.CanvasTexture(cracksCanvas);
    cracksTexture.magFilter = THREE.NearestFilter;
    cracksTexture.minFilter = THREE.NearestFilter;
    cracksTexture.generateMipmaps = false;

    const cracksMat = new THREE.MeshBasicMaterial({
      map: cracksTexture,
      transparent: true,
      depthWrite: false, // Prevents transparent plane z-fighting sorts
      polygonOffset: true,
      polygonOffsetFactor: -1, // Sits slightly on top of standard block faces
      polygonOffsetUnits: -1
    });

    const cracksGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const cracksMesh = new THREE.Mesh(cracksGeo, cracksMat);
    cracksMesh.visible = false;
    scene.add(cracksMesh);

    const updateCrackingVisual = (progressRatio: number) => {
      // Crack lines start faint, get bolder, and reach full visibility at stage end
      cracksMat.opacity = Math.min(1.0, progressRatio * 1.35);
      drawCracks(progressRatio);
      cracksTexture.needsUpdate = true;
    };

    // First person player arm and held item elements attached to camera view
    const heldGroup = new THREE.Group();
    heldGroup.position.set(0.35, -0.32, -0.6);
    heldGroup.rotation.set(0.15, -0.4, 0.1);
    heldGroup.scale.set(0.12, 0.12, 0.12);
    camera.add(heldGroup);
    scene.add(camera); // Required so parented camera objects are active within scene rendering pipeline

    // Keep references of loaded chunk 3D meshes: Key -> THREE.Object3D (Mesh or Group)
    const chunkMeshes = new Map<string, THREE.Object3D>();

    // Generate voxel pixel art texture atlas
    const atlasCanvas = createRetroTextureAtlas();
    const texture = new THREE.CanvasTexture(atlasCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Standard materials react with rich lighting to give actual depth, reflections and block shapes
    const materials = {
      solid: new THREE.MeshStandardMaterial({
        map: texture,
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
        side: THREE.FrontSide,
        transparent: true, // support leaf transparent gaps
        alphaTest: 0.1,    // prevent transparency depth sorted glitches!
      }),
      water: new THREE.MeshStandardMaterial({
        map: texture,
        vertexColors: true,
        roughness: 0.15,
        metalness: 0.8,
        flatShading: true,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    };

    // Helper to get tile uv column/row coordinates based on blockType and face direction
    const getTileCoords = (blockType: BlockType, face: 'top' | 'bottom' | 'side'): { tx: number; ty: number } => {
      switch (blockType) {
        case BlockType.DIRT:
          return { tx: 0, ty: 0 };
        case BlockType.GRASS:
          if (face === 'top') return { tx: 1, ty: 0 };
          if (face === 'bottom') return { tx: 0, ty: 0 }; // dirt bottom
          return { tx: 2, ty: 0 }; // grass side
        case BlockType.STONE:
          return { tx: 3, ty: 0 };
        case BlockType.SAND:
          return { tx: 4, ty: 0 };
        case BlockType.WOOD:
          if (face === 'top' || face === 'bottom') return { tx: 6, ty: 0 };
          return { tx: 5, ty: 0 };
        case BlockType.LEAVES:
          return { tx: 7, ty: 0 };
        case BlockType.WATER:
          return { tx: 8, ty: 0 };
        case BlockType.COAL:
          return { tx: 9, ty: 0 };
        case BlockType.IRON_ORE:
          return { tx: 10, ty: 0 };
        case BlockType.DIAMOND_ORE:
          return { tx: 11, ty: 0 };
        case BlockType.BEDROCK:
          return { tx: 12, ty: 0 };
        case BlockType.GLASS:
          return { tx: 13, ty: 0 };
        case BlockType.PLANKS:
          return { tx: 14, ty: 0 };
        case BlockType.CRAFTING_TABLE:
          if (face === 'top') return { tx: 15, ty: 0 };
          if (face === 'bottom') return { tx: 14, ty: 0 }; // planks bottom
          return { tx: 0, ty: 1 }; // crafting side
        case BlockType.GOLD_ORE:
          return { tx: 1, ty: 1 };
        case BlockType.BRICK:
          return { tx: 2, ty: 1 };
        case BlockType.GLOWSTONE:
          return { tx: 3, ty: 1 };
        default:
          return { tx: 0, ty: 0 };
      }
    };

    // Helper to dynamically build the player's 3D hand/arm and current item block
    const rebuildHeldArm = (activeBlockType: BlockType | null) => {
      // Clear previous sub-objects
      while (heldGroup.children.length > 0) {
        heldGroup.remove(heldGroup.children[0]);
      }

      // 1. Sleeve (Emerald / Teal block styled standard sleeve)
      const sleeveGeo = new THREE.BoxGeometry(0.7, 0.7, 2.4);
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
      });
      const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeveMesh.position.set(0, -0.1, -1.0);
      heldGroup.add(sleeveMesh);

      // 2. Skin Hand (Peach colored block)
      const skinGeo = new THREE.BoxGeometry(0.62, 0.62, 1.0);
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xdfa080,
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true
      });
      const skinMesh = new THREE.Mesh(skinGeo, skinMat);
      skinMesh.position.set(0, -0.1, 0.7);
      heldGroup.add(skinMesh);

      // 3. Mini hand-held Block clone of the active hotbar selection
      if (activeBlockType !== null) {
        const miniGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const def = BLOCK_DEFINITIONS[activeBlockType];
        const miniColor = def ? def.color : '#ffffff';

        const miniMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(miniColor),
          roughness: 0.6,
          metalness: 0.1,
          flatShading: true,
          map: texture
        });

        // UV map miniGeo to match block texture sheet face tile perfectly!
        const tile = getTileCoords(activeBlockType, 'side');
        const uvAttribute = miniGeo.attributes.uv;
        const bInset = 0.005;
        const u0 = (tile.tx + bInset) / 16;
        const v0 = 1.0 - (tile.ty + 1.0 - bInset) / 16;
        const u1 = (tile.tx + 1.0 - bInset) / 16;
        const v1 = 1.0 - (tile.ty + bInset) / 16;

        for (let i = 0; i < uvAttribute.count; i += 4) {
          uvAttribute.setXY(i, u0, v0);
          uvAttribute.setXY(i + 1, u1, v0);
          uvAttribute.setXY(i + 2, u1, v1);
          uvAttribute.setXY(i + 3, u0, v1);
        }
        uvAttribute.needsUpdate = true;

        const miniMesh = new THREE.Mesh(miniGeo, miniMat);
        miniMesh.position.set(0, 0.15, 1.4);
        miniMesh.rotation.set(0.2, 0.4, 0.1);
        heldGroup.add(miniMesh);
      }
    };

    // --- 2. FAST VOXEL MESH BUILDER ---
    const buildChunkMesh = (key: string): THREE.Object3D | null => {
      const parts = key.split(',');
      const cx = parseInt(parts[0]);
      const cz = parseInt(parts[1]);

      const chunkData = engine.chunks.get(key);
      if (!chunkData) return null;

      // Temporary vectors and buffers to calculate faces and vertices for solid blocks
      const solidPosAttr: number[] = [];
      const solidColorAttr: number[] = [];
      const solidUVAttr: number[] = [];
      const solidIndexAttr: number[] = [];
      let solidVertexCounter = 0;

      // Temporary vectors and buffers for water blocks
      const waterPosAttr: number[] = [];
      const waterColorAttr: number[] = [];
      const waterUVAttr: number[] = [];
      const waterIndexAttr: number[] = [];
      let waterVertexCounter = 0;

      const pushFace = (
        isWater: boolean,
        gx: number, gy: number, gz: number,
        v0: [number, number, number],
        v1: [number, number, number],
        v2: [number, number, number],
        v3: [number, number, number],
        shadingMult: number,
        tx: number,
        ty: number
      ) => {
        const pos = isWater ? waterPosAttr : solidPosAttr;
        const color = isWater ? waterColorAttr : solidColorAttr;
        const uvs = isWater ? waterUVAttr : solidUVAttr;
        const index = isWater ? waterIndexAttr : solidIndexAttr;
        const vc = isWater ? waterVertexCounter : solidVertexCounter;

        // Vertex 3D coordinates
        pos.push(
          gx + v0[0], gy + v0[1], gz + v0[2],
          gx + v1[0], gy + v1[1], gz + v1[2],
          gx + v2[0], gy + v2[1], gz + v2[2],
          gx + v3[0], gy + v3[1], gz + v3[2]
        );

        // Ambient shading and vertex lighting ratios: White multiplied by side lighting mult
        for (let j = 0; j < 4; j++) {
          color.push(shadingMult, shadingMult, shadingMult);
        }

        // Texture atlas coordinates layout: Inset slightly (0.005) to completely block tile bleeding seams
        const borderInset = 0.005;
        const uvU0 = (tx + borderInset) / 16;
        const uvV0 = 1.0 - (ty + 1.0 - borderInset) / 16;
        const uvU1 = (tx + 1.0 - borderInset) / 16;
        const uvV1 = 1.0 - (ty + borderInset) / 16;

        uvs.push(
          uvU0, uvV0,
          uvU1, uvV0,
          uvU1, uvV1,
          uvU0, uvV1
        );

        // Triangle indices layouts
        index.push(
          vc, vc + 1, vc + 2,
          vc, vc + 2, vc + 3
        );

        if (isWater) {
          waterVertexCounter += 4;
        } else {
          solidVertexCounter += 4;
        }
      };

      // Traverse all blocks in the chunk
      for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
        for (let lz = 0; lz < CHUNK_DEPTH; lz++) {
          const gx = cx * CHUNK_WIDTH + lx;
          const gz = cz * CHUNK_DEPTH + lz;

          for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
            const index = lx + lz * CHUNK_WIDTH + ly * CHUNK_WIDTH * CHUNK_DEPTH;
            const blockType = chunkData[index];

            if (blockType === BlockType.AIR) continue;

            const def = BLOCK_DEFINITIONS[blockType];
            if (!def) continue;

            // Shading offsets to create neat pseudo-shadow depths on faces
            const SHADING = {
              TOP: 1.0,
              BOTTOM: 0.42,
              L_R_X: 0.8,
              F_B_Z: 0.72,
            };

            // Check culling around the 6 neighbors: Left, Right, Bottom, Top, Back, Front
            const lBlock = engine.getBlock(gx - 1, ly, gz);
            const rBlock = engine.getBlock(gx + 1, ly, gz);
            const bBlock = engine.getBlock(gx, ly - 1, gz);
            const tBlock = engine.getBlock(gx, ly + 1, gz);
            const backBlock = engine.getBlock(gx, ly, gz - 1);
            const fBlock = engine.getBlock(gx, ly, gz + 1);

            // Visibility conditions (culled if bordering opaque solid blocks)
            const showLeft = lBlock === BlockType.AIR || lBlock === BlockType.WATER || BLOCK_DEFINITIONS[lBlock]?.isTransparent;
            const showRight = rBlock === BlockType.AIR || rBlock === BlockType.WATER || BLOCK_DEFINITIONS[rBlock]?.isTransparent;
            const showBottom = bBlock === BlockType.AIR || bBlock === BlockType.WATER || BLOCK_DEFINITIONS[bBlock]?.isTransparent;
            const showTop = tBlock === BlockType.AIR || tBlock === BlockType.WATER || BLOCK_DEFINITIONS[tBlock]?.isTransparent;
            const showBack = backBlock === BlockType.AIR || backBlock === BlockType.WATER || BLOCK_DEFINITIONS[backBlock]?.isTransparent;
            const showFront = fBlock === BlockType.AIR || fBlock === BlockType.WATER || BLOCK_DEFINITIONS[fBlock]?.isTransparent;

            // Render specific block type
            if (blockType === BlockType.WATER) {
              // Water water borders should only show if adjacent to air to avoid weird internal faces
              const sL = lBlock === BlockType.AIR;
              const sR = rBlock === BlockType.AIR;
              const sB = bBlock === BlockType.AIR;
              const sT = tBlock === BlockType.AIR;
              const sBa = backBlock === BlockType.AIR;
              const sF = fBlock === BlockType.AIR;

              const tc = getTileCoords(blockType, 'side');
              const tcTop = getTileCoords(blockType, 'top');
              const tcBot = getTileCoords(blockType, 'bottom');

              // Build translucent water face vectors (0.85, lowered water mesh level to align neatly!)
              if (sL) pushFace(true, gx, ly, gz, [0, 0, 0], [0, 0, 1], [0, 0.85, 1], [0, 0.85, 0], SHADING.L_R_X, tc.tx, tc.ty);
              if (sR) pushFace(true, gx, ly, gz, [1, 0, 1], [1, 0, 0], [1, 0.85, 0], [1, 0.85, 1], SHADING.L_R_X, tc.tx, tc.ty);
              if (sB) pushFace(true, gx, ly, gz, [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], SHADING.BOTTOM, tcBot.tx, tcBot.ty);
              if (sT) pushFace(true, gx, ly, gz, [0, 0.85, 0], [0, 0.85, 1], [1, 0.85, 1], [1, 0.85, 0], SHADING.TOP, tcTop.tx, tcTop.ty);
              if (sBa) pushFace(true, gx, ly, gz, [1, 0, 0], [0, 0, 0], [0, 0.85, 0], [1, 0.85, 0], SHADING.F_B_Z, tc.tx, tc.ty);
              if (sF) pushFace(true, gx, ly, gz, [0, 0, 1], [1, 0, 1], [1, 0.85, 1], [0, 0.85, 1], SHADING.F_B_Z, tc.tx, tc.ty);
            } else {
              // Solid or glassy opaque blocks
              const tcSide = getTileCoords(blockType, 'side');
              const tcTop = getTileCoords(blockType, 'top');
              const tcBot = getTileCoords(blockType, 'bottom');

              // Left (x = 0)
              if (showLeft) pushFace(false, gx, ly, gz, [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0], SHADING.L_R_X, tcSide.tx, tcSide.ty);
              // Right (x = 1)
              if (showRight) pushFace(false, gx, ly, gz, [1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1], SHADING.L_R_X, tcSide.tx, tcSide.ty);
              // Bottom (y = 0)
              if (showBottom) pushFace(false, gx, ly, gz, [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], SHADING.BOTTOM, tcBot.tx, tcBot.ty);
              // Top (y = 1)
              if (showTop) pushFace(false, gx, ly, gz, [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0], SHADING.TOP, tcTop.tx, tcTop.ty);
              // Back (z = 0)
              if (showBack) pushFace(false, gx, ly, gz, [1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0], SHADING.F_B_Z, tcSide.tx, tcSide.ty);
              // Front (z = 1)
              if (showFront) pushFace(false, gx, ly, gz, [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], SHADING.F_B_Z, tcSide.tx, tcSide.ty);
            }
          }
        }
      }

      if (solidPosAttr.length === 0 && waterPosAttr.length === 0) return null;

      const group = new THREE.Group();

      // Pack solid buffer geometry
      if (solidPosAttr.length > 0) {
        const solidGeometry = new THREE.BufferGeometry();
        solidGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(solidPosAttr), 3));
        solidGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(solidColorAttr), 3));
        solidGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(solidUVAttr), 2));
        solidGeometry.setIndex(solidIndexAttr);
        solidGeometry.computeVertexNormals();

        const solidMesh = new THREE.Mesh(solidGeometry, materials.solid);
        group.add(solidMesh);
      }

      // Pack water buffer geometry
      if (waterPosAttr.length > 0) {
        const waterGeometry = new THREE.BufferGeometry();
        waterGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(waterPosAttr), 3));
        waterGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(waterColorAttr), 3));
        waterGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(waterUVAttr), 2));
        waterGeometry.setIndex(waterIndexAttr);
        waterGeometry.computeVertexNormals();

        const waterMesh = new THREE.Mesh(waterGeometry, materials.water);
        group.add(waterMesh);
      }

      return group;
    };

    // Helper: Hex color string converter
    const hexToRgb = (hex: string): [number, number, number] => {
      if (hex === 'transparent' || !hex.startsWith('#')) return [0, 0, 0];
      const r = parseInt(hex.substring(1, 3), 16) / 255;
      const g = parseInt(hex.substring(3, 5), 16) / 255;
      const b = parseInt(hex.substring(5, 7), 16) / 255;
      return [r, g, b];
    };

    // --- 3. PC DESKTOP KEYBOARD CONTROLS LISTENERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      // hotbar number shortcuts [1-9]
      if (e.key >= '1' && e.key <= '9') {
        engine.setActiveSlot(parseInt(e.key) - 1);
      }

      // E to trigger inventory modal directly
      if (k === 'e') {
        document.getElementById('inventory-btn')?.click();
      }

      // Space trigger jumping
      if (k === ' ') {
        keysRef.current['space'] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
      if (k === ' ') {
        keysRef.current['space'] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Track hold status for desktop Mouse triggers under pointer lock
    const isMiningHeld = { current: false };
    const isPlacingHeld = { current: false };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        const mouseSensitivity = 0.0022; // smooth looking sensitivity
        engine.playerRotation.yaw -= e.movementX * mouseSensitivity;
        engine.playerRotation.pitch = Math.max(
          -Math.PI / 2.1,
          Math.min(Math.PI / 2.1, engine.playerRotation.pitch - e.movementY * mouseSensitivity)
        );
      }
    };

    const handleWindowMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        e.preventDefault();
        if (e.button === 0) {
          isMiningHeld.current = true;
        } else if (e.button === 2) {
          isPlacingHeld.current = true;
        }
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isMiningHeld.current = false;
      } else if (e.button === 2) {
        isPlacingHeld.current = false;
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mousedown', handleWindowMouseDown, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);

    interface DebrisParticle {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
    }

    interface FloatingItem {
      mesh: THREE.Mesh;
      type: BlockType;
      velocity: THREE.Vector3;
      hoverOffset: number;
      birth: number;
    }

    let particles: DebrisParticle[] = [];
    let floatingItems: FloatingItem[] = [];

    // Browser-safe procedurally synthesized retro sound effects using Web Audio API
    let audioCtx: AudioContext | null = null;
    const playSynthSound = (soundType: 'dig' | 'break' | 'place' | 'pickup') => {
      if (!engine.settings.soundEnabled) return;
      try {
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (soundType === 'dig') {
          // Soft dead plink
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(130 + Math.random() * 30, now);
          osc.frequency.exponentialRampToValueAtTime(10, now + 0.08);
          gainNode.gain.setValueAtTime(0.18, now);
          gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (soundType === 'break') {
          // Double crunch sound
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.exponentialRampToValueAtTime(10, now + 0.22);
          gainNode.gain.setValueAtTime(0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);

          const noiseOsc = audioCtx.createOscillator();
          const noiseGain = audioCtx.createGain();
          noiseOsc.type = 'triangle';
          noiseOsc.connect(noiseGain);
          noiseGain.connect(audioCtx.destination);
          noiseOsc.frequency.setValueAtTime(300 + Math.random() * 120, now);
          noiseOsc.frequency.exponentialRampToValueAtTime(60, now + 0.14);
          noiseGain.gain.setValueAtTime(0.2, now);
          noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.14);
          noiseOsc.start(now);
          noiseOsc.stop(now + 0.14);
        } else if (soundType === 'place') {
          // Soft lower pop
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (soundType === 'pickup') {
          // Sweet bubble blip going up
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.09);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.linearRampToValueAtTime(0.01, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
        }
      } catch (err) {
        console.warn("Failed to play sound: ", err);
      }
    };

    // Particles system spawning debris
    const spawnDebrisParticles = (x: number, y: number, z: number, blockType: BlockType, customCount?: number) => {
      const blockDef = BLOCK_DEFINITIONS[blockType];
      const colorStr = blockDef ? blockDef.color : '#a1a1aa';
      const color = new THREE.Color(colorStr);

      const particleCount = customCount !== undefined ? customCount : (24 + Math.floor(Math.random() * 10));

      for (let i = 0; i < particleCount; i++) {
        // Varying particle scale to feel organic
        const size = 0.04 + Math.random() * 0.08;
        const geometry = new THREE.BoxGeometry(size, size, size);

        // Slightly vary block color shade to create textured dust depth
        const customColor = color.clone().multiplyScalar(0.55 + Math.random() * 0.55);

        const material = new THREE.MeshStandardMaterial({
          color: customColor,
          roughness: 0.85,
          metalness: 0.1,
          transparent: true,
          opacity: 1.0,
          flatShading: true
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Displace position within the bounds of a block
        const px = x + 0.15 + Math.random() * 0.7;
        const py = y + 0.15 + Math.random() * 0.7;
        const pz = z + 0.15 + Math.random() * 0.7;
        mesh.position.set(px, py, pz);

        scene.add(mesh);

        // Random radial velocities
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.5;
        const verticalSpeed = 1.5 + Math.random() * 3.0;

        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          verticalSpeed,
          Math.sin(angle) * speed
        );

        particles.push({
          mesh,
          velocity,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.4
        });
      }
    };

    // Helper: Build textured 3D miniature item drop mesh block (like real Minecraft drops!)
    const createMiniBlockMesh = (blockType: BlockType, size = 0.22): THREE.Mesh => {
      const miniGeo = new THREE.BoxGeometry(size, size, size);
      const def = BLOCK_DEFINITIONS[blockType];
      const colorStr = def ? def.color : '#ffffff';

      const miniMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorStr),
        roughness: 0.7,
        metalness: 0.1,
        flatShading: true,
        map: texture,
        transparent: def ? def.isTransparent : false,
      });

      // UV map miniGeo block so it displays corresponding block faces
      const tile = getTileCoords(blockType, 'side');
      const uvAttribute = miniGeo.attributes.uv;
      const bInset = 0.005;
      const u0 = (tile.tx + bInset) / 16;
      const v0 = 1.0 - (tile.ty + 1.0 - bInset) / 16;
      const u1 = (tile.tx + 1.0 - bInset) / 16;
      const v1 = 1.0 - (tile.ty + bInset) / 16;

      for (let i = 0; i < uvAttribute.count; i += 4) {
        uvAttribute.setXY(i, u0, v0);
        uvAttribute.setXY(i + 1, u1, v0);
        uvAttribute.setXY(i + 2, u1, v1);
        uvAttribute.setXY(i + 3, u0, v1);
      }
      uvAttribute.needsUpdate = true;

      return new THREE.Mesh(miniGeo, miniMat);
    };

    // Spawns spinning floating pickups
    const spawnFloatingItem = (x: number, y: number, z: number, blockType: BlockType) => {
      const mesh = createMiniBlockMesh(blockType);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      // Bounce-up velocity outward on birth
      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = 0.4 + Math.random() * 0.6;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * horizontalSpeed,
        2.2 + Math.random() * 1.4,
        Math.sin(angle) * horizontalSpeed
      );

      floatingItems.push({
        mesh,
        type: blockType,
        velocity,
        hoverOffset: Math.random() * Math.PI * 2,
        birth: performance.now()
      });
    };

    let breakTimer = 0.20;
    let placeTimer = 0.25;
    let currentMiningVoxel: { x: number; y: number; z: number } | null = null;
    let miningProgress = 0;

    let swingTime = 0;
    let isSwinging = false;
    let lastRenderedBlockType: BlockType | null = null;

    // Tactical micro-feedback variables
    let cameraRecoilImpulse = 0;
    let handRecoilImpulse = 0;
    let miningChipTimer = 0;

    // --- 4. GAME TICK CLOCK LOOP (requestAnimationFrame) ---
    let lastTime = performance.now();
    let frameId: number;

    const gameLoop = (timeNow: number) => {
      frameId = requestAnimationFrame(gameLoop);

      let dt = (timeNow - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // Cap dt to avoid immense jumps during frame skips or lag spikes
      lastTime = timeNow;

      // Fallback check if user is on PC (WASD Movement)
      const pcMove = { x: 0, z: 0 };
      if (keysRef.current['w'] || keysRef.current['arrowup']) pcMove.z = 1.0;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) pcMove.z = -1.0;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) pcMove.x = -1.0;
      if (keysRef.current['d'] || keysRef.current['arrowright']) pcMove.x = 1.0;

      // Merge on-screen virtual joystick data + PC keyboard vectors
      const finalMove = {
        x: pcMove.x !== 0 ? pcMove.x : inputRef.current.moveInput.x,
        z: pcMove.z !== 0 ? pcMove.z : inputRef.current.moveInput.z,
      };

      const doJump = keysRef.current['space'] || inputRef.current.moveInput.y > 0 || false; // virtual jump mapped on look input or moveInput.y

      // Rotate camera based on Mobile looking joystick swipes
      if (lookInputRef.current && (lookInputRef.current.dx !== 0 || lookInputRef.current.dy !== 0)) {
        engine.playerRotation.yaw += lookInputRef.current.dx * 0.005;
        // Clamp pitch looking coordinates to prevent looking upside down
        engine.playerRotation.pitch = Math.max(
          -Math.PI / 2.1,
          Math.min(Math.PI / 2.1, engine.playerRotation.pitch + lookInputRef.current.dy * 0.005)
        );

        // Reset the relative look input differences after ingestion
        lookInputRef.current.dx = 0;
        lookInputRef.current.dy = 0;
      }

      // Update Game state loops (Physics, collisions, hunger timers)
      engine.updatePhysics(dt, finalMove, doJump);
      engine.updateSurvivalLoops(dt);
      engine.updateSkyTicks(dt);

      // Decay tactical physics impulses
      if (cameraRecoilImpulse > 0) {
        cameraRecoilImpulse -= dt * 2.2;
        if (cameraRecoilImpulse < 0) cameraRecoilImpulse = 0;
      }
      if (handRecoilImpulse > 0) {
        handRecoilImpulse -= dt * 3.5;
        if (handRecoilImpulse < 0) handRecoilImpulse = 0;
      }

      // Compute precise camera jitter, rumble shakes and positional placements
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      let shakeOffsetZ = 0;

      // Align camera coordinates 3D position & rotations from Engine values
      const targetQuat = new THREE.Quaternion();
      const euler = new THREE.Euler(engine.playerRotation.pitch, engine.playerRotation.yaw, 0, 'YXZ');
      targetQuat.setFromEuler(euler);
      camera.quaternion.copy(targetQuat);

      // --- 5. ULTRA-FAST DIGITAL DIFFERENTIAL ANALYSIS (DDA) RAYCASTER ---
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      
      let targetVoxel: { x: number; y: number; z: number } | null = null;
      let placeVoxel: { x: number; y: number; z: number } | null = null;

      // Step along the ray in increments of 0.05 up to 5 blocks reach distance
      let currentRayPos = camera.position.clone();
      let prevRayVoxel = { x: Math.floor(currentRayPos.x), y: Math.floor(currentRayPos.y), z: Math.floor(currentRayPos.z) };

      for (let step = 0; step < 100; step++) {
        currentRayPos.addScaledVector(dir, 0.05);
        const rx = Math.floor(currentRayPos.x);
        const ry = Math.floor(currentRayPos.y);
        const rz = Math.floor(currentRayPos.z);

        const block = engine.getBlock(rx, ry, rz);
        if (block !== BlockType.AIR && block !== BlockType.WATER) {
          targetVoxel = { x: rx, y: ry, z: rz };
          placeVoxel = { ...prevRayVoxel };
          break;
        }
        prevRayVoxel = { x: rx, y: ry, z: rz };
      }

      // Setup wireframe edge block highlights
      let isCurrentlyMining = false;
      if (targetVoxel) {
        targetOutline.position.set(targetVoxel.x + 0.5, targetVoxel.y + 0.5, targetVoxel.z + 0.5);
        targetOutline.visible = true;

        // Continuous mining tracking block DEFINITIONS break times (like real Minecraft!)
        const blockToMineType = engine.getBlock(targetVoxel.x, targetVoxel.y, targetVoxel.z);
        const blockDef = BLOCK_DEFINITIONS[blockToMineType];
        
        // Bedrock is unbreakable, other blocks have explicit definition break times
        const isBreakable = blockToMineType !== BlockType.BEDROCK && blockDef && blockDef.breakTime !== Infinity;
        isCurrentlyMining = (inputRef.current.touchBreakTrigger || isMiningHeld.current) && isBreakable;

        if (isCurrentlyMining) {
          isSwinging = true;

          const isSameVoxel = currentMiningVoxel && 
                             currentMiningVoxel.x === targetVoxel.x && 
                             currentMiningVoxel.y === targetVoxel.y && 
                             currentMiningVoxel.z === targetVoxel.z;

          if (!isSameVoxel) {
            currentMiningVoxel = { ...targetVoxel };
            miningProgress = 0;
            miningChipTimer = 0;
          }

          // Slow the base break speed slightly so it feels extremely natural and heavy like real Minecraft
          const requiredTime = (blockDef ? blockDef.breakTime : 500) / 1000;
          
          miningProgress += dt;

          // Occasionally emit dust chipping particles and sound every 0.16 seconds of mining
          miningChipTimer += dt;
          if (miningChipTimer >= 0.16) {
            miningChipTimer = 0;
            spawnDebrisParticles(targetVoxel.x, targetVoxel.y, targetVoxel.z, blockToMineType, 3);
            playSynthSound('dig');
          }

          cracksMesh.position.set(targetVoxel.x + 0.5, targetVoxel.y + 0.5, targetVoxel.z + 0.5);
          cracksMesh.visible = true;
          updateCrackingVisual(miningProgress / requiredTime);

          if (miningProgress >= requiredTime || inputRef.current.touchBreakTrigger) {
            const success = engine.setBlock(targetVoxel.x, targetVoxel.y, targetVoxel.z, BlockType.AIR);
            if (success) {
              engine.playerState.score += 10;
              spawnDebrisParticles(targetVoxel.x, targetVoxel.y, targetVoxel.z, blockToMineType, 30);
              spawnFloatingItem(targetVoxel.x + 0.5, targetVoxel.y + 0.35, targetVoxel.z + 0.5, blockToMineType);
              playSynthSound('break');
              cameraRecoilImpulse = 0.25;
              handRecoilImpulse = 0.6;
            }
            currentMiningVoxel = null;
            miningProgress = 0;
            cracksMesh.visible = false;
            setTouchBreakTrigger(false);
          }
        } else {
          currentMiningVoxel = null;
          miningProgress = 0;
          cracksMesh.visible = false;
          if (!(inputRef.current.touchPlaceTrigger || isPlacingHeld.current)) {
            isSwinging = false;
          }
        }

        // Continuous building (right click hold or touchPlaceTrigger)
        if ((inputRef.current.touchPlaceTrigger || isPlacingHeld.current) && placeVoxel) {
          isSwinging = true;
          placeTimer += dt;
          if (placeTimer >= 0.25 || inputRef.current.touchPlaceTrigger) {
            const activeItem = engine.getActiveItem();
            if (activeItem && activeItem.count > 0) {
              const px = Math.floor(engine.playerPos.x);
              const pyFeet = Math.floor(engine.playerPos.y - 1.75);
              const pyHead = Math.floor(engine.playerPos.y);
              const pz = Math.floor(engine.playerPos.z);

              const intersectsPlayer = (placeVoxel.x === px && placeVoxel.z === pz && (placeVoxel.y === pyFeet || placeVoxel.y === pyHead));

              if (!intersectsPlayer) {
                const placed = engine.setBlock(placeVoxel.x, placeVoxel.y, placeVoxel.z, activeItem.type);
                if (placed) {
                  engine.consumeActiveItem();
                  engine.playerState.score += 3;
                  playSynthSound('place');
                }
              }
            }
            placeTimer = 0;
            setTouchPlaceTrigger(false);
          }
        } else {
          placeTimer = 0.25; // reset so next click builds instantly
        }
      } else {
        targetOutline.visible = false;
        cracksMesh.visible = false;
        currentMiningVoxel = null;
        miningProgress = 0;
        
        // Reset any false active flags if no block selected
        if (inputRef.current.touchBreakTrigger) setTouchBreakTrigger(false);
        if (inputRef.current.touchPlaceTrigger) setTouchPlaceTrigger(false);
        
        if (!(inputRef.current.touchPlaceTrigger || isPlacingHeld.current)) {
          isSwinging = false;
        }
        placeTimer = 0.25;
      }

      // Apply positional mining tremble & severe recoil cameras kick rumbles
      if (isCurrentlyMining) {
        shakeOffsetX = (Math.random() - 0.5) * 0.022;
        shakeOffsetY = (Math.random() - 0.5) * 0.022;
        shakeOffsetZ = (Math.random() - 0.5) * 0.022;
      }
      if (cameraRecoilImpulse > 0) {
        shakeOffsetX += (Math.random() - 0.5) * cameraRecoilImpulse * 0.35;
        shakeOffsetY += (Math.random() - 0.5) * cameraRecoilImpulse * 0.35;
        shakeOffsetZ += (Math.random() - 0.5) * cameraRecoilImpulse * 0.35;
      }

      camera.position.set(
        engine.playerPos.x + shakeOffsetX,
        engine.playerPos.y + shakeOffsetY,
        engine.playerPos.z + shakeOffsetZ
      );

      // --- 6. SEAMLESS CHUNK MESH GENERATOR/REBUILDER ---
      if (engine.dirtyChunks.size > 0) {
        for (const key of engine.dirtyChunks) {
          // Remove old 3D geometric mesh from Three.js Scene
          const oldMesh = chunkMeshes.get(key);
          if (oldMesh) {
            scene.remove(oldMesh);
            oldMesh.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
              }
            });
            chunkMeshes.delete(key);
          }

          // Compute and render new visual submesh
          const newMesh = buildChunkMesh(key);
          if (newMesh) {
            scene.add(newMesh);
            chunkMeshes.set(key, newMesh);
          }
        }
        engine.dirtyChunks.clear();
      }

      // --- 7. DYNAMIC DAY-NIGHT COSMIC TRANSITIONS ---
      // Smoothly rotate the light celestial coordinates to reflect sunrise/sunset ticks
      const skyRad = (engine.skyTime / 24000) * Math.PI * 2;
      const lightX = Math.cos(skyRad) * 150;
      const lightY = Math.sin(skyRad) * 150;
      sunDirLight.position.set(lightX, Math.abs(lightY), Math.cos(skyRad * 0.5) * 50);

      // Rotate celestial group setup (Sun and Moon cubes)
      celestialGroup.rotation.z = skyRad;

      // Drift floating clouds across the skyline
      cloudsGroup.children.forEach((cloud) => {
        cloud.position.x += dt * 1.8;
        if (cloud.position.x > 250) {
          cloud.position.x = -250;
        }
      });

      // Stars shine brighter as night creeps in
      starsGroup.rotation.y += 0.0003; // faint ambient stellar rotation

      // Determine colors based on Noon, Midnight or Sunset transitions
      let currentSkyHex = 0x38bdf8; // Blue
      let currentFogHex = 0x38bdf8;
      let lightIntensity = 0.85;

      if (engine.skyTime >= 10000 && engine.skyTime <= 13000) {
        // Sunset transition
        const t = (engine.skyTime - 10000) / 3000;
        currentSkyHex = blendHex(0x38bdf8, 0xa855f7, t); // fading blue to violet sunset
        currentFogHex = blendHex(0x38bdf8, 0x1f1f2e, t);
        lightIntensity = THREE.MathUtils.lerp(0.85, 0.2, t);
      } else if (engine.skyTime > 13000 && engine.skyTime < 22000) {
        // Starry night
        currentSkyHex = 0x020617; // Slate 950 deep space black
        currentFogHex = 0x020617;
        lightIntensity = 0.12;
      } else if (engine.skyTime >= 22000 && engine.skyTime <= 24000) {
        // Sunrise transition
        const t = (engine.skyTime - 22000) / 2000;
        currentSkyHex = blendHex(0x020617, 0xfdba74, t); // orange sunrise glow
        currentFogHex = blendHex(0x020617, 0x38bdf8, t);
        lightIntensity = THREE.MathUtils.lerp(0.12, 0.85, t);
      } else if (engine.skyTime > 0 && engine.skyTime < 10000) {
        // Bright day
        currentSkyHex = 0x38bdf8;
        currentFogHex = 0x38bdf8;
        lightIntensity = 0.85;
      }

      skyMat.color.setHex(currentSkyHex);
      scene.background = new THREE.Color(currentSkyHex);
      
      const fogCol = new THREE.Color(currentFogHex);
      scene.fog.color.copy(fogCol);
      renderer.setClearColor(fogCol);

      sunDirLight.intensity = lightIntensity;
      ambientLight.intensity = Math.max(0.18, lightIntensity * 0.45);
      hemiLight.intensity = Math.max(0.12, lightIntensity * 0.35);

      // Shimmering animated water effect
      materials.water.opacity = 0.55 + Math.sin(timeNow * 0.002) * 0.08;

      // Check if player's active block selection has changed
      const activeItem = engine.getActiveItem();
      const currentActiveBlock = (activeItem && activeItem.count > 0) ? activeItem.type : null;
      if (currentActiveBlock !== lastRenderedBlockType) {
        lastRenderedBlockType = currentActiveBlock;
        rebuildHeldArm(currentActiveBlock);
      }

      // Animate player swinging physical hand/held item with kinetic recoil overlays
      if (isSwinging) {
        swingTime += dt * 15; // smooth fast swinging tempo
        const swingZOffset = Math.sin(swingTime) * 0.15;
        const swingXAngle = Math.sin(swingTime) * 0.45;
        const swingYAngle = Math.cos(swingTime) * 0.25;

        heldGroup.position.set(
          0.35, 
          -0.32 - Math.abs(swingZOffset) * 0.5 - handRecoilImpulse * 0.4, 
          -0.6 + swingZOffset - handRecoilImpulse * 0.5
        );
        heldGroup.rotation.set(
          0.15 + swingXAngle - handRecoilImpulse * 0.65, 
          -0.4 + swingYAngle + handRecoilImpulse * 0.22, 
          0.1
        );
      } else {
        swingTime = 0;
        // Smooth linear interpolation decay to steady relaxed posture with recoil offset
        heldGroup.position.set(0.35, -0.32 - handRecoilImpulse * 0.4, -0.6 - handRecoilImpulse * 0.5);
        heldGroup.rotation.set(0.15 - handRecoilImpulse * 0.65, -0.4 + handRecoilImpulse * 0.22, 0.1);
      }

      // Update block destruction debris particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          if (Array.isArray(p.mesh.material)) {
            p.mesh.material.forEach((mat) => mat.dispose());
          } else {
            p.mesh.material.dispose();
          }
          particles.splice(i, 1);
        } else {
          // Gravity and air drag
          p.velocity.y -= 11.0 * dt;
          p.velocity.x *= 1.0 - 1.2 * dt;
          p.velocity.z *= 1.0 - 1.2 * dt;

          p.mesh.position.addScaledVector(p.velocity, dt);

          // Spin animations
          p.mesh.rotation.x += dt * 4.5;
          p.mesh.rotation.y += dt * 5.5;

          // Scale down & opacity fade-out
          const ratio = p.life / p.maxLife;
          const currentScale = 1.0 - ratio;
          p.mesh.scale.set(currentScale, currentScale, currentScale);

          const mat = p.mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.opacity = Math.max(0, 1.0 - ratio);
          }
        }
      }

      // Update floating spinning item pickups (like real Minecraft drops!)
      const playerX = engine.playerPos.x;
      const playerY = engine.playerPos.y - 0.75; // Target torso bounds
      const playerZ = engine.playerPos.z;

      for (let i = floatingItems.length - 1; i >= 0; i--) {
        const item = floatingItems[i];
        
        const dx = playerX - item.mesh.position.x;
        const dy = playerY - item.mesh.position.y;
        const dz = playerZ - item.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Pickup radius check: magnetism pulls item when nearby!
        if (dist < 3.2) {
          const attractSpeed = 5.0 + (3.2 - dist) * 4.0;
          item.velocity.set(
            (dx / dist) * attractSpeed,
            (dy / dist) * attractSpeed,
            (dz / dist) * attractSpeed
          );
          item.mesh.position.addScaledVector(item.velocity, dt);

          if (dist < 0.75) {
            // Collected drop block!
            playSynthSound('pickup');
            engine.addToInventory(item.type, 1);
            
            scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            if (Array.isArray(item.mesh.material)) {
              item.mesh.material.forEach((mat) => mat.dispose());
            } else {
              item.mesh.material.dispose();
            }
            floatingItems.splice(i, 1);
            continue;
          }
        } else {
          // Standard physics - gravity drop & collision on block floors
          if (item.mesh.position.y > -10) {
            item.velocity.y -= 9.8 * dt;
            item.velocity.x *= 1.0 - 1.5 * dt;
            item.velocity.z *= 1.0 - 1.5 * dt;

            const nextX = item.mesh.position.x + item.velocity.x * dt;
            const nextY = item.mesh.position.y + item.velocity.y * dt;
            const nextZ = item.mesh.position.z + item.velocity.z * dt;

            const blockX = Math.floor(nextX);
            const blockY = Math.floor(nextY);
            const blockZ = Math.floor(nextZ);
            const blockBelow = engine.getBlock(blockX, Math.floor(item.mesh.position.y - 0.12), blockZ);

            if (blockBelow !== BlockType.AIR && blockBelow !== BlockType.WATER) {
              item.mesh.position.y = Math.floor(item.mesh.position.y) + 0.15;
              item.velocity.set(0, 0, 0);
            } else {
              item.mesh.position.set(nextX, nextY, nextZ);
            }
          }
        }

        // Animate hovering float oscillation cycle & spin
        item.mesh.rotation.y += dt * 2.2;
        item.mesh.rotation.x = Math.sin(timeNow * 0.0025 + item.hoverOffset) * 0.15;
        if (item.velocity.lengthSq() < 0.05) {
          item.mesh.position.y = Math.floor(item.mesh.position.y) + 0.15 + Math.sin(timeNow * 0.005 + item.hoverOffset) * 0.06;
        }
      }

      // Render the frame viewport!
      renderer.render(scene, camera);
    };

    // Helper: HEX color linear interpolation blending
    function blendHex(c1: number, c2: number, t: number): number {
      const r1 = (c1 >> 16) & 255;
      const g1 = (c1 >> 8) & 255;
      const b1 = c1 & 255;

      const r2 = (c2 >> 16) & 255;
      const g2 = (c2 >> 8) & 255;
      const b2 = c2 & 255;

      const r = Math.round(r1 + t * (r2 - r1));
      const g = Math.round(g1 + t * (g2 - g1));
      const b = Math.round(b1 + t * (b2 - b1));

      return (r << 16) + (g << 8) + b;
    }

    frameId = requestAnimationFrame(gameLoop);

    // --- 8. PREVENT EVENT LEAKES ON RESIZE & CLEANUP ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w && h) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial load rebuild of all visible chunks around initial coordinate loading
    engine.dirtyChunks.clear();
    for (const key of engine.chunks.keys()) {
      engine.dirtyChunks.add(key);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mousedown', handleWindowMouseDown);
      window.removeEventListener('mouseup', handleWindowMouseUp);

      // Dispose newly created celestial geometries and cloud buffers
      sunGeometry.dispose();
      sunMaterial.dispose();
      moonGeometry.dispose();
      moonMaterial.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();

      // Dispose all active chunk meshes
      for (const mesh of chunkMeshes.values()) {
        scene.remove(mesh);
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
      }
      chunkMeshes.clear();

      // Dispose all active particles
      for (const p of particles) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
      }
      particles = [];

      // Dispose all active floating item meshes
      for (const item of floatingItems) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        if (Array.isArray(item.mesh.material)) {
          item.mesh.material.forEach((m) => m.dispose());
        } else {
          item.mesh.material.dispose();
        }
      }
      floatingItems = [];

      skyGeo.dispose();
      skyMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      highlightGeo.dispose();
      edgeMat.dispose();
      edges.dispose();
      materials.solid.dispose();
      materials.water.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [engine]);

  // Click on screen acts as fall-back desktop Mouse Capture setup for convenient PC debugging
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Lock mouse pointer on canvas click for immersive desktop look & feel
    const canvas = canvasRef.current;
    if (canvas && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="relative w-full h-full select-none overflow-hidden bg-sky-400"
    >
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="block w-full h-full outline-none"
        onMouseDown={handleCanvasClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Target Reticle Crosshair in screen center */}
      <div
        id="crosshair"
        className="pointer-events-none absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
      >
        <div className="w-4 h-[2px] bg-white opacity-60 absolute" />
        <div className="h-4 w-[2px] bg-white opacity-60 absolute" />
      </div>
    </div>
  );
};
