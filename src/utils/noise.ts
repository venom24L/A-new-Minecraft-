/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Improved Perlin Noise Implementation (Deterministic & Robust)
class ImprovedNoise {
  private p: Uint8Array;

  constructor(seed: number = 42) {
    this.p = new Uint8Array(256);
    // Use a deterministic pseudo-random generator seeded with user input
    const random = this.mulberry32(seed);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = temp;
    }
  }

  private mulberry32(a: number) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const p = this.p;
    const A = (p[X] + Y) & 255;
    const AA = (p[A] + Z) & 255;
    const AB = (p[(A + 1) & 255] + Z) & 255;
    const B = (p[(X + 1) & 255] + Y) & 255;
    const BA = (p[B] + Z) & 255;
    const BB = (p[(B + 1) & 255] + Z) & 255;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u,
          this.grad(p[AA], x, y, z),
          this.grad(p[BA], x - 1, y, z)
        ),
        this.lerp(u,
          this.grad(p[AB], x, y - 1, z),
          this.grad(p[BB], x - 1, y - 1, z)
        )
      ),
      this.lerp(v,
        this.lerp(u,
          this.grad(p[(AA + 1) & 255], x, y, z - 1),
          this.grad(p[(BA + 1) & 255], x - 1, y, z - 1)
        ),
        this.lerp(u,
          this.grad(p[(AB + 1) & 255], x, y - 1, z - 1),
          this.grad(p[(BB + 1) & 255], x - 1, y - 1, z - 1)
        )
      )
    );
  }

  // Fractional Brownian Motion for multi-octave landscape variations
  public fbm2d(x: number, y: number, octaves: number, lacunarity: number = 2.0, gain: number = 0.5): number {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency, 1.23) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return (total / maxValue + 1.0) / 2.0; // Map range to [0, 1]
  }

  public fbm3d(x: number, y: number, z: number, octaves: number, lacunarity: number = 2.0, gain: number = 0.5): number {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return (total / maxValue + 1.0) / 2.0;
  }
}

// Single active seed instance of World Noise
export const worldNoise = new ImprovedNoise(1028);
