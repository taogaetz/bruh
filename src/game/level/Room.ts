import { RoomType } from './RoomType';
import { TileType } from './TileType';

// A room represents a fixed-size grid of tiles with specific exit patterns
export interface Room {
    type: RoomType;
    tiles: TileType[][];
    width: number;  // Width in tiles
    height: number; // Height in tiles
    hasExitLeft: boolean;
    hasExitRight: boolean;
    hasExitTop: boolean;
    hasExitBottom: boolean;
}

// Position in the 4x4 grid
export interface GridPosition {
    x: number; // 0-3
    y: number; // 0-3
}

// Direction for path generation
export enum Direction {
    LEFT = 'left',
    RIGHT = 'right',
    DOWN = 'down'
}

