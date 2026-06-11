import type { Room, GridPosition, RoomLevelDebugSnapshot, SolutionTraceStep } from './Room';
import { Direction } from './Room';
import { RoomType, GRID_WIDTH, GRID_HEIGHT } from './RoomType';
import { RoomTemplateGenerator } from './roomTemplates/RoomTemplate';

export class RoomLevelGenerator {
    private static readonly MAX_GENERATION_STEPS = 100;

    private grid: (Room | null)[][];
    private solutionPath: GridPosition[] = [];
    private solutionTrace: SolutionTraceStep[] = [];
    private templateGenerator: RoomTemplateGenerator;
    private startPos: GridPosition = { x: 0, y: 0 };
    private exitPos: GridPosition = { x: 0, y: GRID_HEIGHT - 1 };
    private horizontalDirection: Direction.LEFT | Direction.RIGHT = Direction.RIGHT;

    constructor() {
        this.templateGenerator = new RoomTemplateGenerator();
        this.grid = [];
        this.reset();
    }

    private reset(): void {
        this.grid = [];
        this.solutionPath = [];
        this.solutionTrace = [];

        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    generate(): void {
        this.reset();

        const startX = Math.floor(Math.random() * GRID_WIDTH);
        this.startPos = { x: startX, y: 0 };
        this.horizontalDirection = Math.random() > 0.5 ? Direction.RIGHT : Direction.LEFT;

        let currentPos: GridPosition = { ...this.startPos };
        this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.START, {
            gridX: currentPos.x,
            gridY: currentPos.y,
            hasBottomExit: false
        });
        this.grid[currentPos.y][currentPos.x]!.type = RoomType.START;
        this.solutionPath.push({ ...currentPos });
        this.solutionTrace.push({
            ...currentPos,
            roomType: RoomType.START,
            directionFromPrevious: 'start'
        });

        let exitPlaced = false;
        let stepCount = 0;

        while (!exitPlaced) {
            const direction = stepCount >= RoomLevelGenerator.MAX_GENERATION_STEPS
                ? Direction.DOWN
                : this.chooseKazemiDirection(currentPos);
            stepCount++;

            if (direction === Direction.DOWN) {
                if (currentPos.y === GRID_HEIGHT - 1) {
                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.EXIT, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: this.hasTopEntry(currentPos)
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = RoomType.EXIT;
                    this.exitPos = { ...currentPos };
                    this.updateTraceRoomTypeAt(currentPos, RoomType.EXIT);
                    exitPlaced = true;
                } else {
                    this.convertCurrentRoomForDrop(currentPos);
                    currentPos = { x: currentPos.x, y: currentPos.y + 1 };
                    this.solutionPath.push({ ...currentPos });

                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.LEFT_RIGHT_TOP, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: true,
                        hasBottomExit: false
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = RoomType.LEFT_RIGHT_TOP;
                    this.solutionTrace.push({
                        ...currentPos,
                        roomType: RoomType.LEFT_RIGHT_TOP,
                        directionFromPrevious: Direction.DOWN
                    });
                }
            } else {
                currentPos = {
                    x: currentPos.x + (direction === Direction.LEFT ? -1 : 1),
                    y: currentPos.y
                };
                this.solutionPath.push({ ...currentPos });

                if (!this.grid[currentPos.y][currentPos.x]) {
                    this.grid[currentPos.y][currentPos.x] = this.templateGenerator.generateRoom(RoomType.LEFT_RIGHT, {
                        gridX: currentPos.x,
                        gridY: currentPos.y,
                        hasTopEntry: false,
                        hasBottomExit: false
                    });
                    this.grid[currentPos.y][currentPos.x]!.type = RoomType.LEFT_RIGHT;
                }

                this.solutionTrace.push({
                    ...currentPos,
                    roomType: this.grid[currentPos.y][currentPos.x]!.type,
                    directionFromPrevious: direction
                });
            }
        }

        this.fillSideRooms();
        this.createSnakePits();
        this.validatePath();
    }

    private chooseKazemiDirection(currentPos: GridPosition): Direction {
        const roll = Math.floor(Math.random() * 5) + 1;
        let direction: Direction = Direction.DOWN;

        if (roll <= 2) {
            direction = this.horizontalDirection;
        } else if (roll <= 4) {
            direction = this.oppositeDirection(this.horizontalDirection);
        }

        if (direction === Direction.LEFT && currentPos.x === 0) {
            this.horizontalDirection = Direction.RIGHT;
            direction = Direction.DOWN;
        } else if (direction === Direction.RIGHT && currentPos.x === GRID_WIDTH - 1) {
            this.horizontalDirection = Direction.LEFT;
            direction = Direction.DOWN;
        } else if (direction === Direction.LEFT || direction === Direction.RIGHT) {
            this.horizontalDirection = direction;
        }

        return direction;
    }

    private oppositeDirection(direction: Direction.LEFT | Direction.RIGHT): Direction.LEFT | Direction.RIGHT {
        return direction === Direction.LEFT ? Direction.RIGHT : Direction.LEFT;
    }

    private convertCurrentRoomForDrop(pos: GridPosition): void {
        const currentRoom = this.grid[pos.y][pos.x];
        const type = currentRoom?.type === RoomType.START ? RoomType.START : RoomType.LEFT_RIGHT_BOTTOM;

        this.grid[pos.y][pos.x] = this.templateGenerator.generateRoom(type, {
            gridX: pos.x,
            gridY: pos.y,
            hasTopEntry: this.hasTopEntry(pos),
            hasBottomExit: true
        });
        this.grid[pos.y][pos.x]!.type = type;
        this.updateTraceRoomTypeAt(pos, type);
    }

    private hasTopEntry(pos: GridPosition): boolean {
        if (pos.y === 0) {
            return false;
        }
        return this.grid[pos.y - 1][pos.x]?.hasExitBottom ?? false;
    }

    private updateTraceRoomTypeAt(pos: GridPosition, roomType: RoomType): void {
        for (const step of this.solutionTrace) {
            if (step.x === pos.x && step.y === pos.y) {
                step.roomType = roomType;
            }
        }
    }

    private getSolutionRoute(): SolutionTraceStep[] {
        const route: SolutionTraceStep[] = [];

        for (const step of this.solutionTrace) {
            const existingIndex = route.findIndex((routeStep) => routeStep.x === step.x && routeStep.y === step.y);

            if (existingIndex >= 0) {
                route.splice(existingIndex + 1);
                route[existingIndex] = { ...step };
            } else {
                route.push({ ...step });
            }
        }

        return route.map((step) => ({
            ...step,
            roomType: this.grid[step.y][step.x]?.type ?? step.roomType
        }));
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

    getDebugSnapshot(): RoomLevelDebugSnapshot {
        return {
            roomTypes: this.grid.map((row) => row.map((room) => room?.type ?? RoomType.SIDE_ROOM)),
            start: { ...this.startPos },
            exit: { ...this.exitPos },
            solutionTrace: this.solutionTrace.map((step) => ({
                ...step,
                roomType: this.grid[step.y][step.x]?.type ?? step.roomType
            })),
            solutionRoute: this.getSolutionRoute()
        };
    }

    getRoom(x: number, y: number): Room | null {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            return null;
        }
        return this.grid[y][x];
    }
}
