import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const iterations = 250;
const outDir = mkdtempSync(join(tmpdir(), 'bruh-levelgen-check-'));

const compileResult = spawnSync('npx', [
    'tsc',
    '--outDir',
    outDir,
    '--module',
    'ES2022',
    '--target',
    'ES2022',
    '--moduleResolution',
    'bundler',
    '--skipLibCheck',
    'src/game/level/RoomLevelGenerator.ts',
    'src/game/level/RoomType.ts',
    'src/game/level/Room.ts',
    'src/game/level/TileType.ts',
    'src/game/level/roomTemplates/RoomTemplate.ts'
], {
    stdio: 'inherit'
});

if (compileResult.status !== 0) {
    rmSync(outDir, { recursive: true, force: true });
    process.exit(compileResult.status ?? 1);
}

const emittedFiles = [
    join(outDir, 'RoomLevelGenerator.js'),
    join(outDir, 'Room.js'),
    join(outDir, 'roomTemplates', 'RoomTemplate.js')
];

for (const filePath of emittedFiles) {
    const source = readFileSync(filePath, 'utf8')
        .replaceAll("from './Room'", "from './Room.js'")
        .replaceAll("from './RoomType'", "from './RoomType.js'")
        .replaceAll("from './TileType'", "from './TileType.js'")
        .replaceAll("from './roomTemplates/RoomTemplate'", "from './roomTemplates/RoomTemplate.js'")
        .replaceAll("from '../Room'", "from '../Room.js'")
        .replaceAll("from '../RoomType'", "from '../RoomType.js'")
        .replaceAll("from '../TileType'", "from '../TileType.js'");
    writeFileSync(filePath, source);
}

const { RoomLevelGenerator } = await import(`file://${join(outDir, 'RoomLevelGenerator.js')}`);
const { RoomType, GRID_WIDTH, GRID_HEIGHT } = await import(`file://${join(outDir, 'RoomType.js')}`);

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

try {
    const originalLog = console.log;
    console.log = (...args) => {
        if (args[0] !== 'Level validation successful: Path confirmed.') {
            originalLog(...args);
        }
    };

    for (let i = 0; i < iterations; i++) {
        const generator = new RoomLevelGenerator();
        generator.generate();
        const grid = generator.getGrid();
        const snapshot = generator.getDebugSnapshot();
        const flat = snapshot.roomTypes.flat();
        const lastStep = snapshot.solutionTrace.at(-1);

        assert(grid.length === GRID_HEIGHT, 'raw room grid has wrong height');
        assert(grid.every((row) => row.length === GRID_WIDTH), 'raw room grid has wrong width');
        assert(grid.every((row) => row.every((room) => room !== null)), 'all raw grid cells must be assigned');
        assert(snapshot.roomTypes.length === GRID_HEIGHT, 'room grid has wrong height');
        assert(snapshot.roomTypes.every((row) => row.length === GRID_WIDTH), 'room grid has wrong width');
        assert(flat.filter((type) => type === RoomType.EXIT).length === 1, 'expected exactly one exit');
        assert(snapshot.exit.y === GRID_HEIGHT - 1, 'exit must be on bottom row');
        assert(snapshot.solutionTrace.length >= GRID_HEIGHT, 'solution trace should descend through the level');
        assert(snapshot.solutionTrace[0].x === snapshot.start.x && snapshot.solutionTrace[0].y === snapshot.start.y, 'trace must start at start position');
        assert(lastStep?.x === snapshot.exit.x && lastStep?.y === snapshot.exit.y, 'trace must end at exit position');
        assert(lastStep?.roomType === RoomType.EXIT, 'last trace step must be exit');

        for (const row of snapshot.roomTypes) {
            for (const type of row) {
                assert(type !== undefined && type !== null, 'all cells must be assigned');
            }
        }
    }

    console.log = originalLog;
    console.log(`Spelunky generator invariant check passed for ${iterations} generated levels.`);
} finally {
    rmSync(outDir, { recursive: true, force: true });
}
