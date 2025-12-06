import { Chunk, ChunkGenerator, ChunkGenerationContext } from '../Chunk';
import { TileType } from '../TileType';
import { RandomChunkGenerator } from './RandomChunkGenerator';

// Prebuilt chunk definitions - easy to add more
export const PREBUILT_CHUNKS: Chunk[] = [
    // Example: A simple platform chunk
    {
        width: 16,
        height: 20,
        tiles: (() => {
            const tiles: TileType[][] = [];
            for (let y = 0; y < 20; y++) {
                tiles[y] = [];
                for (let x = 0; x < 16; x++) {
                    tiles[y][x] = TileType.EMPTY;
                }
            }
            // Add a ground platform
            for (let x = 0; x < 16; x++) {
                tiles[15][x] = TileType.GRASS;
                tiles[16][x] = TileType.DIRT;
                tiles[17][x] = TileType.DIRT;
            }
            // Add a floating platform
            for (let x = 4; x < 12; x++) {
                tiles[10][x] = TileType.DIRT;
            }
            return tiles;
        })()
    },
    // Example: A chunk with a gap
    {
        width: 16,
        height: 20,
        tiles: (() => {
            const tiles: TileType[][] = [];
            for (let y = 0; y < 20; y++) {
                tiles[y] = [];
                for (let x = 0; x < 16; x++) {
                    tiles[y][x] = TileType.EMPTY;
                }
            }
            // Left side ground
            for (let x = 0; x < 6; x++) {
                tiles[15][x] = TileType.GRASS;
                tiles[16][x] = TileType.DIRT;
            }
            // Right side ground
            for (let x = 10; x < 16; x++) {
                tiles[15][x] = TileType.GRASS;
                tiles[16][x] = TileType.DIRT;
            }
            return tiles;
        })()
    },
    // Example: A chunk with stairs
    {
        width: 16,
        height: 20,
        tiles: (() => {
            const tiles: TileType[][] = [];
            for (let y = 0; y < 20; y++) {
                tiles[y] = [];
                for (let x = 0; x < 16; x++) {
                    tiles[y][x] = TileType.EMPTY;
                }
            }
            // Create stairs going up
            for (let step = 0; step < 8; step++) {
                const x = step * 2;
                const y = 15 - step;
                if (x < 16 && y >= 0) {
                    tiles[y][x] = TileType.GRASS;
                    if (x + 1 < 16) tiles[y][x + 1] = TileType.GRASS;
                    if (y + 1 < 20) tiles[y + 1][x] = TileType.DIRT;
                    if (y + 1 < 20 && x + 1 < 16) tiles[y + 1][x + 1] = TileType.DIRT;
                }
            }
            return tiles;
        })()
    }
];

// Generator that mixes prebuilt chunks with random generation
export class PrebuiltChunkGenerator implements ChunkGenerator {
    private randomGenerator: RandomChunkGenerator;
    private usePrebuiltProbability: number; // 0-1, probability of using a prebuilt chunk

    constructor(seed?: number, usePrebuiltProbability: number = 0.3) {
        this.randomGenerator = new RandomChunkGenerator(seed);
        this.usePrebuiltProbability = usePrebuiltProbability;
    }

    generateChunk(width: number, height: number, context?: ChunkGenerationContext): Chunk {
        // Decide whether to use a prebuilt chunk or generate randomly
        const usePrebuilt = Math.random() < this.usePrebuiltProbability && PREBUILT_CHUNKS.length > 0;

        if (usePrebuilt) {
            // Select a random prebuilt chunk
            const prebuiltIndex = Math.floor(Math.random() * PREBUILT_CHUNKS.length);
            let chunk = PREBUILT_CHUNKS[prebuiltIndex];

            // If dimensions don't match, we could scale or pad, but for now just use as-is
            // In a more sophisticated system, you'd handle dimension mismatches
            if (chunk.width === width && chunk.height === height) {
                // Deep copy the chunk to avoid mutations
                const tiles: TileType[][] = [];
                for (let y = 0; y < chunk.height; y++) {
                    tiles[y] = [...chunk.tiles[y]];
                }
                return {
                    width: chunk.width,
                    height: chunk.height,
                    tiles
                };
            }
        }

        // Fall back to random generation
        return this.randomGenerator.generateChunk(width, height, context);
    }
}

