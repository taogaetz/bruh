import type { Room, GridPosition } from './Room';
import { Direction } from './Room';
import { RoomType, GRID_WIDTH, GRID_HEIGHT } from './RoomType';
import { RoomTemplateGenerator } from './roomTemplates/RoomTemplate';

export class RoomLevelGenerator {
    private grid: (Room | null)[][];
    private solutionPath: GridPosition[] = [];
    private templateGenerator: RoomTemplateGenerator;
    private currentDirection: Direction = Direction.RIGHT; // Track direction for edge handling

    constructor() {
        this.grid = [];
        this.templateGenerator = new RoomTemplateGenerator();

        // Initialize grid
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    generate(): void {
        // Step 1: Place start room in top row
        const startX = Math.floor(Math.random() * GRID_WIDTH);
        const startPos: GridPosition = { x: startX, y: 0 };
        this.solutionPath = [];
        this.solutionPath.push({ ...startPos });

        // Place initial start room (Type 1 behavior: L/R)
        // We use RoomType.START but treat it as having L/R exits
        this.grid[0][startX] = this.templateGenerator.generateRoom(RoomType.START, {
            gridX: startX,
            gridY: 0,
            hasBottomExit: false
        });
        this.grid[0][startX]!.type = RoomType.START;

        let currentPos = { ...startPos };
        let exitPlaced = false;

        // Loop until we place the exit
        while (!exitPlaced) {
            // Roll for direction: 1-5
            // 1-2: Left
            // 3-4: Right
            // 5: Down
            const roll = Math.floor(Math.random() * 5) + 1;
            let direction: Direction;

            if (roll <= 2) {
                direction = Direction.LEFT;
            } else if (roll <= 4) {
                direction = Direction.RIGHT;
            } else {
                direction = Direction.DOWN;
            }

            // Edge handling: If hitting edge, force DOWN
            if (direction === Direction.LEFT && currentPos.x === 0) {
                direction = Direction.DOWN;
            } else if (direction === Direction.RIGHT && currentPos.x === GRID_WIDTH - 1) {
                direction = Direction.DOWN;
            }

            if (direction === Direction.DOWN) {
                // DOWN LOGIC

                // 1. Check if we are already on the bottom row
                if (currentPos.y === GRID_HEIGHT - 1) {
                    // "If we are on the bottom row... and we try to drop... place the exit room."
                    // Override current room to EXIT
                    // Check if the current room was a START room
                    const isStart = (currentPos.x === startPos.x && currentPos.y === startPos.y);

                    // We need to know if the room above connects down to us (hasTopEntry)
                    // If we moved laterally to get here, hasTopEntry is false.
                    // If we dropped into here, hasTopEntry is true.
                    // We can check the room above.
                    const roomAbove = currentPos.y > 0 ? this.grid[currentPos.y - 1][currentPos.x] : null;
                    const hasTopEntry = roomAbove ? roomAbove.hasExitBottom : false;

                    // Re-generate current room as EXIT
                    // If it was START, we technically lose the START type, but it's the exit now.
                    // However, START room usually isn't EXIT room. But if grid is 1x1...
                    // Let's assume grid is 4x4.

                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.EXIT, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: hasTopEntry
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = RoomType.EXIT;

                    exitPlaced = true;
                } else {
                    // 2. We are not on bottom row, so we drop down.

                    // First, override CURRENT room to Type 2 (LEFT_RIGHT_BOTTOM)
                    // If it's START, just update it to have bottom exit
                    const currentRoom = this.grid[currentPos.y][currentPos.x]!;

                    if (currentRoom.type === RoomType.START) {
                        // Re-generate START with bottom exit
                        this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.START, {
                            gridX: currentPos.x,
                            gridY: currentPos.y,
                            hasBottomExit: true
                        });
                        this.grid[currentPos.y][currentPos.x]!.type = RoomType.START;
                    } else {
                        // Override to Type 2 (LEFT_RIGHT_BOTTOM)
                        // We need to preserve hasTopEntry if it had one
                        const roomAbove = currentPos.y > 0 ? this.grid[currentPos.y - 1][currentPos.x] : null;
                        const hasTopEntry = roomAbove ? roomAbove.hasExitBottom : false;

                        this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.LEFT_RIGHT_BOTTOM, {
                            gridX: currentPos.x,
                            gridY: currentPos.y,
                            hasTopEntry: hasTopEntry,
                            hasBottomExit: true // Type 2 always has bottom exit
                        });
                        this.grid[currentPos.y][currentPos.x]!.type = RoomType.LEFT_RIGHT_BOTTOM;
                    }

                    // Now move down
                    currentPos.y++;
                    this.solutionPath.push({ ...currentPos });

                    // Decide type for NEW room
                    // "HAS to be another type 2 bottom drop, or a type 3 upside-down T shape"
                    // If on bottom row, MUST be Type 3 (can't drop further from Type 2)
                    let newRoomType: RoomType;

                    if (currentPos.y === GRID_HEIGHT - 1) {
                        newRoomType = RoomType.LEFT_RIGHT_TOP; // Type 3
                    } else {
                        newRoomType = Math.random() > 0.5 ? RoomType.LEFT_RIGHT_BOTTOM : RoomType.LEFT_RIGHT_TOP;
                    }

                    // Place the new room
                    // It definitely has a top entry because we just dropped down
                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(newRoomType, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: true,
                        hasBottomExit: newRoomType === RoomType.LEFT_RIGHT_BOTTOM
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = newRoomType;
                }
            } else {
                // LATERAL LOGIC (Left/Right)
                if (direction === Direction.LEFT) {
                    currentPos.x--;
                } else {
                    currentPos.x++;
                }
                this.solutionPath.push({ ...currentPos });

                // Place Type 1 (LEFT_RIGHT) only if room doesn't exist
                // If it exists, it's already a valid path room (Type 1, 2, or 3), all of which have L/R exits.
                if (!this.grid[currentPos.y][currentPos.x]) {
                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.LEFT_RIGHT, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: false,
                        hasBottomExit: false
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = RoomType.LEFT_RIGHT;
                }
            }
        }

        // Step 3: Fill remaining spaces with type 0 (side rooms)
        this.fillSideRooms();

        // Step 4: Check for snake pits
        this.createSnakePits();

        // Step 5: Validate that path exists from start to exit
        this.validatePath();
    }

    private validatePath(): void {
        // Verify that we have a start room and exit room
        let startPos: GridPosition | null = null;
        let exitPos: GridPosition | null = null;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const room = this.grid[y][x];
                if (room) {
                    if (room.type === RoomType.START) {
                        startPos = { x, y };
                    }
                    if (room.type === RoomType.EXIT) {
                        exitPos = { x, y };
                    }
                }
            }
        }

        if (!startPos || !exitPos) {
            console.error('Missing start or exit room!');
            return;
        }

        // Perform flood fill to verify connectivity
        // We need to check tile-level connectivity across the entire level
        // This is expensive but necessary for 100% confidence

        // 1. Construct a global tile grid
        const levelWidth = GRID_WIDTH * 20; // ROOM_WIDTH
        const levelHeight = GRID_HEIGHT * 15; // ROOM_HEIGHT
        const visited = new Set<string>();
        const queue: { x: number, y: number }[] = [];

        // Start at player spawn (approximate center of start room)
        const startRoom = this.grid[startPos.y][startPos.x]!;
        const startTileX = (startPos.x * 20) + 10;
        const startTileY = (startPos.y * 15) + 5;

        queue.push({ x: startTileX, y: startTileY });
        visited.add(`${startTileX},${startTileY}`);

        let reachedExit = false;

        // Directions: Up, Down, Left, Right
        const dx = [0, 0, -1, 1];
        const dy = [-1, 1, 0, 0];

        while (queue.length > 0) {
            const current = queue.shift()!;

            // Check if we reached the exit room's bottom area
            const currentGridX = Math.floor(current.x / 20);
            const currentGridY = Math.floor(current.y / 15);

            if (currentGridX === exitPos.x && currentGridY === exitPos.y) {
                // If we are in the exit room and near the bottom, we made it!
                const localY = current.y % 15;
                if (localY >= 13) {
                    reachedExit = true;
                    break;
                }
            }

            // Explore neighbors
            for (let i = 0; i < 4; i++) {
                const nx = current.x + dx[i];
                const ny = current.y + dy[i];

                // Bounds check
                if (nx >= 0 && nx < levelWidth && ny >= 0 && ny < levelHeight) {
                    const key = `${nx},${ny}`;
                    if (!visited.has(key)) {
                        // Check if tile is passable (EMPTY or GRASS/PLATFORM if we can jump through/stand on it)
                        // For simplicity, let's assume we can move through EMPTY tiles
                        // We also need to handle gravity... simple flood fill assumes flying.
                        // But since we carved paths, flying check is a good proxy for "is there a hole?"

                        const gridX = Math.floor(nx / 20);
                        const gridY = Math.floor(ny / 15);
                        const room = this.grid[gridY][gridX];

                        if (room) {
                            const localX = nx % 20;
                            const localY = ny % 15;
                            const tile = room.tiles[localY][localX];

                            // 0 = EMPTY. We can traverse empty space.
                            // We can also traverse platforms (GRASS) if we are just checking connectivity?
                            // No, let's stick to EMPTY for now to be strict.
                            if (tile === 0) { // TileType.EMPTY
                                visited.add(key);
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
            }
        }

        if (!reachedExit) {
            console.error('LEVEL VALIDATION FAILED: No path from start to exit!');
            // In a real scenario, we would trigger regeneration here
            // this.generate(); 
        } else {
            console.log('Level validation successful: Path confirmed.');
        }
    }

    private chooseDirection(currentPos: GridPosition): Direction {
        // If at bottom row, can't go down
        if (currentPos.y === GRID_HEIGHT - 1) {
            return Math.random() > 0.5 ? Direction.LEFT : Direction.RIGHT;
        }

        // If we're close to bottom, bias towards going down
        if (currentPos.y >= GRID_HEIGHT - 3) {
            // Higher chance of going down when close to bottom
            const roll = Math.random();
            if (roll < 0.4) {
                return Direction.DOWN;
            } else if (roll < 0.7) {
                return Direction.LEFT;
            } else {
                return Direction.RIGHT;
            }
        }

        // Random number 1-5
        const roll = Math.floor(Math.random() * 5) + 1;

        if (roll <= 2) {
            return Direction.LEFT;
        } else if (roll <= 4) {
            return Direction.RIGHT;
        } else {
            return Direction.DOWN;
        }
    }

    private fillSideRooms(): void {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (this.grid[y][x] === null) {
                    this.grid[y][x] = this.templateGenerator.generateRoom(RoomType.SIDE_ROOM);
                }
            }
        }
    }

    private createSnakePits(): void {
        // Check each column for vertical lines of type 0 rooms
        for (let x = 0; x < GRID_WIDTH; x++) {
            let consecutiveSideRooms = 0;
            let startY = -1;

            for (let y = 0; y < GRID_HEIGHT; y++) {
                const room = this.grid[y][x];
                if (room && room.type === RoomType.SIDE_ROOM) {
                    if (consecutiveSideRooms === 0) {
                        startY = y;
                    }
                    consecutiveSideRooms++;
                } else {
                    // Check if we have 3 or 4 consecutive side rooms
                    if (consecutiveSideRooms >= 3 && consecutiveSideRooms <= 4 && startY !== -1) {
                        // Chance to create snake pit
                        if (Math.random() > 0.6) { // 40% chance
                            this.createSnakePit(x, startY, consecutiveSideRooms);
                        }
                    }
                    consecutiveSideRooms = 0;
                    startY = -1;
                }
            }

            // Check at end of column
            if (consecutiveSideRooms >= 3 && consecutiveSideRooms <= 4 && startY !== -1) {
                if (Math.random() > 0.6) {
                    this.createSnakePit(x, startY, consecutiveSideRooms);
                }
            }
        }
    }

    private createSnakePit(columnX: number, startY: number, depth: number): void {
        // Create snake pit: 7 8 9 or 7 8 8 9 depending on depth
        if (depth === 3) {
            // 7 8 9
            this.grid[startY][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_TOP);
            this.grid[startY + 1][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_MIDDLE);
            this.grid[startY + 2][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_BOTTOM);
        } else if (depth === 4) {
            // 7 8 8 9
            this.grid[startY][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_TOP);
            this.grid[startY + 1][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_MIDDLE);
            this.grid[startY + 2][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_MIDDLE);
            this.grid[startY + 3][columnX] =
                this.templateGenerator.generateRoom(RoomType.SNAKE_PIT_BOTTOM);
        }
    }

    getGrid(): (Room | null)[][] {
        return this.grid;
    }

    getSolutionPath(): GridPosition[] {
        return this.solutionPath;
    }

    getRoom(x: number, y: number): Room | null {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            return null;
        }
        return this.grid[y][x];
    }
}

