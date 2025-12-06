import { TileType } from './TileType';

// A chunk represents a fixed-size grid of tiles
export interface Chunk {
    width: number;  // Width in tiles
    height: number; // Height in tiles
    tiles: TileType[][]; // 2D array of tiles [y][x]
}

// Chunk generator interface - allows for different generation strategies
export interface ChunkGenerator {
    generateChunk(width: number, height: number, context?: ChunkGenerationContext): Chunk;
}

// Context passed to chunk generators (useful for connecting chunks, difficulty, etc.)
export interface ChunkGenerationContext {
    previousChunk?: Chunk;
    chunkIndex?: number;
    seed?: number;
}

