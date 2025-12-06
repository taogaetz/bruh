import { Chunk, ChunkGenerator, ChunkGenerationContext } from './Chunk';
import { TileType, TILE_SIZE } from './TileType';
import { RandomChunkGenerator } from './generators/RandomChunkGenerator';

export interface LevelConfig {
    width: number; // Total width in tiles
    height: number; // Total height in tiles
    chunkWidth: number; // Width of each chunk in tiles
    chunkHeight: number; // Height of each chunk in tiles
    generator?: ChunkGenerator; // Optional custom generator
}

export class LevelGenerator {
    private config: LevelConfig;
    private chunks: Chunk[] = [];
    private generator: ChunkGenerator;

    constructor(config: LevelConfig) {
        this.config = config;
        this.generator = config.generator || new RandomChunkGenerator();
    }

    // Generate the entire level
    generate(): void {
        this.chunks = [];
        const numChunks = Math.ceil(this.config.width / this.config.chunkWidth);

        for (let i = 0; i < numChunks; i++) {
            const context: ChunkGenerationContext = {
                chunkIndex: i,
                previousChunk: this.chunks.length > 0 ? this.chunks[this.chunks.length - 1] : undefined,
                seed: Math.random() * 1000000
            };

            const chunk = this.generator.generateChunk(
                this.config.chunkWidth,
                this.config.chunkHeight,
                context
            );

            this.chunks.push(chunk);
        }
    }

    // Get tile at world coordinates (in tiles)
    getTile(x: number, y: number): TileType {
        if (x < 0 || y < 0 || x >= this.config.width || y >= this.config.height) {
            return TileType.EMPTY;
        }

        const chunkIndex = Math.floor(x / this.config.chunkWidth);
        if (chunkIndex < 0 || chunkIndex >= this.chunks.length) {
            return TileType.EMPTY;
        }

        const chunk = this.chunks[chunkIndex];
        const localX = x % this.config.chunkWidth;
        const localY = y;

        if (localY < 0 || localY >= chunk.height) {
            return TileType.EMPTY;
        }

        return chunk.tiles[localY][localX] || TileType.EMPTY;
    }

    // Get all chunks (useful for rendering)
    getChunks(): Chunk[] {
        return this.chunks;
    }

    // Get the total width in pixels
    getWidthPixels(): number {
        return this.config.width * TILE_SIZE;
    }

    // Get the total height in pixels
    getHeightPixels(): number {
        return this.config.height * TILE_SIZE;
    }
}

