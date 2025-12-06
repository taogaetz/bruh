// Room types for Spelunky-style generation
export enum RoomType {
    SIDE_ROOM = 0,        // Side room, not on solution path, no exit guarantees
    LEFT_RIGHT = 1,       // Guaranteed left and right exits
    LEFT_RIGHT_BOTTOM = 2, // Guaranteed left, right, and bottom exits
    LEFT_RIGHT_TOP = 3,   // Guaranteed left, right, and top exits
    // Special types for snake pits
    SNAKE_PIT_TOP = 7,
    SNAKE_PIT_MIDDLE = 8,
    SNAKE_PIT_BOTTOM = 9,
    START = 10,           // Special start room
    EXIT = 11            // Special exit room
}

export const GRID_WIDTH = 4;
export const GRID_HEIGHT = 4;
export const TOTAL_ROOMS = GRID_WIDTH * GRID_HEIGHT;

