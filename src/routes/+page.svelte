<script lang="ts">

    import type { Scene } from "phaser";
    import type { MainMenu } from "../game/scenes/MainMenu";
    import PhaserGame, { type TPhaserRef } from "../PhaserGame.svelte";
    import { fade } from 'svelte/transition';

    //  References to the PhaserGame component (game and scene are exposed)
    let phaserRef: TPhaserRef = { game: null, scene: null};
    let currentSceneKey: string = "Boot";
    let showMainMenu = false;

    const startGame = () => {
        const scene = phaserRef.scene as MainMenu;
        if (scene) {
            scene.changeScene();
        }
    }

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Scene) => {
        currentSceneKey = scene.scene.key;
        showMainMenu = scene.scene.key === "MainMenu";
    }
    
</script>

<div id="app">
    <div class="game-wrapper">
        <PhaserGame bind:phaserRef={phaserRef} currentActiveScene={currentScene} />
        
        {#if showMainMenu}
            <div class="main-menu-overlay" transition:fade>
                <div class="menu-container">
                    <div class="title-container">
                        <h1 class="game-title">BRUH MOMENT</h1>
                        <div class="title-subtitle">TOTAL SWAG</div>
                    </div>
                    
                    <div class="menu-buttons">
                        <button class="menu-button primary" on:click={startGame}>
                            <span class="button-text">START GAME</span>
                        </button>
                    </div>
                    
                    <div class="controls-hint">
                        <div class="hint-title">CONTROLS</div>
                        <div class="hint-text">
                            <div class="control-row">
                                <span class="key">←</span><span class="key">→</span> / <span class="key">A</span><span class="key">D</span> MOVE
                            </div>
                            <div class="control-row">
                                <span class="key">↑</span> / <span class="key">W</span> JUMP
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background-color: #2C211B;
        font-family: 'Press Start 2P', cursive;
        overflow: hidden;
    }

    #app {
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #2C211B;
        background-image: 
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233e2f26' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    
    .game-wrapper {
        position: relative;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
        border: 8px solid #5D4037;
        border-radius: 4px;
        background-color: #000;
        /* Ensure it fits the game size */
        width: 1024px;
        height: 768px;
    }

    .main-menu-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
        backdrop-filter: blur(4px);
    }
    
    .menu-container {
        text-align: center;
        padding: 40px;
        background-color: #8B7355; /* Stone color */
        border: 4px solid #4E342E;
        box-shadow: 
            inset 0 0 0 4px #A1887F,
            0 10px 20px rgba(0,0,0,0.5);
        image-rendering: pixelated;
        min-width: 500px;
    }
    
    .title-container {
        margin-bottom: 50px;
    }
    
    .game-title {
        font-family: 'Press Start 2P', cursive;
        font-size: 48px;
        margin: 0;
        color: #FFD700; /* Gold */
        text-shadow: 
            4px 4px 0 #8B4513,
            -2px -2px 0 #FFFFE0;
        line-height: 1.5;
    }
    
    .title-subtitle {
        font-family: 'Press Start 2P', cursive;
        font-size: 16px;
        color: #FFECB3;
        margin-top: 10px;
        text-shadow: 2px 2px 0 #5D4037;
    }
    
    .menu-buttons {
        margin-bottom: 40px;
    }
    
    .menu-button {
        background-color: #D32F2F; /* Red */
        border: 4px solid #8B0000;
        color: #FFFFFF;
        font-family: 'Press Start 2P', cursive;
        font-size: 20px;
        padding: 20px 40px;
        cursor: pointer;
        box-shadow: 
            inset 4px 4px 0 rgba(255,255,255,0.2),
            inset -4px -4px 0 rgba(0,0,0,0.2),
            0 6px 0 #5D4037;
        transition: transform 0.1s, box-shadow 0.1s;
        text-transform: uppercase;
    }
    
    .menu-button:hover {
        background-color: #F44336;
        transform: translateY(-2px);
        box-shadow: 
            inset 4px 4px 0 rgba(255,255,255,0.2),
            inset -4px -4px 0 rgba(0,0,0,0.2),
            0 8px 0 #5D4037;
    }
    
    .menu-button:active {
        transform: translateY(4px);
        box-shadow: 
            inset 4px 4px 0 rgba(255,255,255,0.2),
            inset -4px -4px 0 rgba(0,0,0,0.2),
            0 2px 0 #5D4037;
    }
    
    .controls-hint {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 2px dashed #5D4037;
    }
    
    .hint-title {
        font-size: 14px;
        color: #3E2723;
        margin-bottom: 15px;
        text-decoration: underline;
    }
    
    .hint-text {
        font-size: 12px;
        color: #3E2723;
        line-height: 2;
    }

    .control-row {
        margin-bottom: 10px;
    }
    
    .key {
        display: inline-block;
        background-color: #D7CCC8;
        border: 2px solid #5D4037;
        border-radius: 4px;
        padding: 4px 8px;
        margin: 0 4px;
        box-shadow: 0 2px 0 #5D4037;
        color: #3E2723;
    }
</style>
