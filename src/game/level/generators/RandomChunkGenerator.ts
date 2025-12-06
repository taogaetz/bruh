import { Chunk, ChunkGenerator, ChunkGenerationContext } from '../Chunk';
import { TileType } from '../TileType';

// Random chunk generator - creates random terrain
export class RandomChunkGenerator implements ChunkGenerator {
    private seed: number;

    constructor(seed?: number) {
        this.seed = seed || Math.random() * 1000000;
    }

    // Simple seeded random function
    private random(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    generateChunk(width: number, height: number, context?: ChunkGenerationContext): Chunk {
        const tiles: TileType[][] = [];
        
        // Initialize all tiles as empty
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                tiles[y][x] = TileType.EMPTY;
            }
        }

        // Generate terrain
        // Create a ground level that varies slightly
        const baseGroundY = Math.floor(height * 0.7); // 70% down the chunk
        
        for (let x = 0; x < width; x++) {
            // Add some variation to ground height
            const groundVariation = Math.floor((this.random() - 0.5) * 3);
            const groundY = baseGroundY + groundVariation;
            
            // Fill from ground level to bottom with dirt
            for (let y = groundY; y < height; y++) {
                if (y === groundY) {
                    tiles[y][x] = TileType.GRASS; // Top layer is grass
                } else if (y < groundY + 3) {
                    tiles[y][x] = TileType.DIRT; // Dirt layer
                } else {
                    tiles[y][x] = TileType.STONE; // Stone deeper down
                }
            }

            // Add some random platforms/floating blocks
            if (this.random() > 0.85) {
                const platformY = Math.floor(this.random() * baseGroundY);
                const platformWidth = Math.floor(this.random() * 3) + 2;
                
                for (let px = 0; px < platformWidth && x + px < width; px++) {
                    if (platformY >= 0 && platformY < height) {
                        tiles[platformY][x + px] = TileType.DIRT;
                    }
                }
            }
        }

        // Connect with previous chunk if context provided
        if (context?.previousChunk) {
            this.connectChunks(tiles, context.previousChunk, width, height);
        }

        return {
            width,
            height,
            tiles
        };
    }

    private connectChunks(
        newTiles: TileType[][],
        previousChunk: Chunk,
        width: number,
        height: number
    ): void {
        // Connect the ground level between chunks
        // Find the ground level in the last column of previous chunk
        let prevGroundY = height - 1;
        for (let y = previousChunk.height - 1; y >= 0; y--) {
            if (previousChunk.tiles[y][previousChunk.width - 1] !== TileType.EMPTY) {
                prevGroundY = y;
                break;
            }
        }

        // Find the ground level in the first column of new chunk
        let newGroundY = height - 1;
        for (let y = height - 1; y >= 0; y--) {
            if (newTiles[y][0] !== TileType.EMPTY) {
                newGroundY = y;
                break;
            }
        }

        // Smooth the transition if there's a big difference
        if (Math.abs(prevGroundY - newGroundY) > 2) {
            const targetY = Math.floor((prevGroundY + newGroundY) / 2);
            for (let y = targetY; y < height; y++) {
                if (y === targetY) {
                    newTiles[y][0] = TileType.GRASS;
                } else if (y < targetY + 3) {
                    newTiles[y][0] = TileType.DIRT;
                } else {
                    newTiles[y][0] = TileType.STONE;
                }
            }
        }
    }
}

