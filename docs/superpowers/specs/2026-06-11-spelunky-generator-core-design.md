# Spelunky Generator Core Design

## Goal

Implement the level generator described in Darius Kazemi's "Spelunky Generator Lessons" as the first source of truth for BRUH's 4x4 room layout. This pass should prioritize faithful algorithm behavior over later readability or gameplay tuning.

## Current Problem

The existing generator mixes three concerns in one pass:

- choosing the solution path
- assigning room types
- rendering physical exits and tile paths

That makes the result hard to reason about. Type `0` side rooms are forced to have random exits even though Kazemi describes them as rooms with no exit guarantees. The debug path stores movement steps, not a clean generator trace. The room templates also carve broad left/right paths, so physical openings can look like the solution route continues into open rooms even when the algorithm has logically moved toward the exit.

## Design

Generation will become a two-stage pipeline.

Stage 1 creates an abstract 4x4 room-type grid:

- Pick a random top-row start room.
- Treat the start as a special start room with type-1 behavior.
- Each solution-path room begins as type `1` (`LEFT_RIGHT`).
- Roll `1..5` on each step: `1/2` moves left, `3/4` moves right, `5` moves down.
- If a horizontal move would leave the grid, force a downward move and reverse horizontal direction.
- When moving down above the bottom row, convert the current room to type `2` (`LEFT_RIGHT_BOTTOM`), move to the room below, and assign that room type `2` or `3` according to whether the vertical drop continues or terminates.
- When a downward move is selected on the bottom row, convert the current room to `EXIT` and stop.
- Fill untouched cells with type `0` (`SIDE_ROOM`).
- After the solution path is complete, detect vertical runs of three or four type-0 side rooms and optionally convert them to snake pit types `7/8/9`.

Stage 2 renders rooms from the abstract grid:

- Templates render rooms from assigned room types.
- Type `0` side rooms should not force at least one exit. They may remain closed or partially open according to template randomness, but they must not be treated as guaranteed route rooms.
- Start and exit remain special render templates layered on top of the abstract algorithm.

## Debuggability

The generator will expose a debug snapshot with:

- the room-type grid
- start and exit positions
- the ordered solution trace

This should make it easy to inspect generated layouts without reading the Phaser scene.

## Validation

The first validation target is algorithmic correctness:

- exactly one start and one exit
- every generated room has an expected type
- the exit is on the bottom row
- untouched cells are filled
- snake pits only replace eligible type-0 vertical runs

Physics-perfect platform validation is out of scope for this pass. The existing tile flood fill may remain as a smoke check, but it should not be considered proof of player reachability.

## Non-Goals

- Adding enemies, treasure, traps, ladders, or final room art
- Rebalancing platform physics
- Designing a custom graph generator beyond the Kazemi algorithm
- Making all optional side paths readable or fair in this pass
