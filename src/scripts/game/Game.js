import * as PIXI from "pixi.js";
import { App } from "../system/App";
import { Scene } from "../system/Scene";
import { Board } from "./Board";
import { CombinationManager } from "./CombinationManager";
import { ScoreTimerManager } from "./ScoreTimerManager";

export class Game extends Scene {
    constructor() {
        super();
        this.gameStatus = {
            gameOver: false,
            victory: false,
        }
        this.initGame();
    }

    initGame() {
        this.container = new PIXI.Container();
        
        this.createBackground();

        this.board = new Board();
        this.container.addChild(this.board.container);

        this.scoreTimerManager = new ScoreTimerManager(
            this.endGame.bind(this),
            this.updateHUD.bind(this),
            60,
            100
        );

        this.createHUD();

        this.board.container.on('tile-touch-start', this.onTileClick.bind(this));

        this.combinationManager = new CombinationManager(this.board);
        this.removeStartMatches();

        this.scoreTimerManager.startTimer();
    }

    resetGame() {
        this.gameStatus = {
            gameOver: false,
            victory: false,
        }
        this.disabled = true;
        this.board.resetBoard();
        this.board.createTiles();
        this.removeStartMatches();
        this.scoreTimerManager.reset(60);
        this.scoreTimerManager.startTimer();
        this.disabled = false;
    }

    createHUD() {
        this.scoreText = new PIXI.Text('Счет: 0', {fontSize: 24, fill: '#ffffff'});
        this.scoreText.x = 20;
        this.scoreText.y = 20;
        this.container.addChild(this.scoreText);

        this.timeText = new PIXI.Text('Время: 60', {fontSize: 24, fill: '#ffffff'});
        this.timeText.y = 20;
        this.timeText.x = this.scoreText.x + this.scoreText.width + 50;
        this.container.addChild(this.timeText);

        this.contentText = new PIXI.Text(`Набери ${this.scoreTimerManager.targetScore} очков`, {fontSize: 24, fill: '#ffffff'});
        this.contentText.y = 20;
        this.contentText.x = this.timeText.width + this.timeText.x + 50;
        this.container.addChild(this.contentText);
    }

    updateHUD(score, time) {
        this.scoreText.text = `Счет: ${score}`;
        this.timeText.text = `Время: ${time}`;
    }

    onTileClick(tile) {
        console.log(this.disabled)
        if (this.disabled) {
            return;
        }

        if (this.selectedTile) {
            if (!this.selectedTile.isNeighbour(tile)) {
                this.clearSelection();
                this.selectTile(tile);
            }
            else {
                this.swap(this.selectedTile, tile);
            }
        } else {
            this.selectTile(tile);
        }
    }

    swap(selectedTile, tile, reverse) {
        this.disabled = true; //блокируем доску пока идет анимация свапа
        selectedTile.sprite.zIndex = 2;

        selectedTile.moveTo(tile.field.position, 0.2);

        this.clearSelection();

        tile.moveTo(selectedTile.field.position, 0.2).then(() => {
            this.board.swap(selectedTile, tile);

            if (!reverse) {
                const matches = this.combinationManager.getMatches();

                if (matches.length) {
                    this.processMatches(matches).then(() => {
                        if (this.gameStatus.gameOver) {
                            this.showResultMessage();
                            this.resetGame();
                            console.log('игра завершена');
                        }
                    });
                } else {
                    this.swap(tile, selectedTile, true);
                }
            } else {
                this.disabled = false;
            }
        })
    }

    processFallDown() {
        return new Promise((resolve) => {
            let completed = 0;
            let started = 0;

            for(let row = this.board.rows - 1; row >= 0; row--) {
                for(let col = this.board.cols - 1; col >= 0; col--) {
                    const field = this.board.getField(row, col);

                    if(!field.tile) {
                        ++started;
                        
                        this.fallDownTo(field).then(() => {
                            ++completed;
                            if(completed >= started) {
                                resolve();
                            }
                        })
                    }
                }
            }
        })
    }

    fallDownTo(emptyField) {
        for(let row = emptyField.row - 1; row >= 0; row--) {
            let fallingField = this.board.getField(row, emptyField.col);

            if (fallingField.tile) {
                const fallingTile = fallingField.tile;
                fallingTile.field = emptyField;
                emptyField.tile = fallingTile;
                fallingField.tile = null;

                return fallingTile.fallDownTo(emptyField.position);
            }
        }

        return Promise.resolve();
    }

    processMatches(matches) {
        return new Promise((resolve) => {
            this.scoreTimerManager.addPoints(matches.length * 10);
            this.removeMatches(matches);
            this.processFallDown()
                .then(() => this.addTiles())
                .then(() => this.onFallDownOver())
                .then(() => resolve());
        })
    }

    endGame(won = false) {
        this.gameStatus.gameOver = true;
        if (won) {
            this.gameStatus.victory = won;

        } else {
            this.gameStatus.gameOver = won;
        }
    }

    showResultMessage() {
        if (this.gameStatus.victory) {
            alert(`Вы победили! Ваш счет: ${this.scoreTimerManager.score}`);
        } else {
            alert(`Время вышло! Ваш счет: ${this.scoreTimerManager.score}`)
        }
    }

    onFallDownOver() {
        return new Promise((resolve) => {
            const matches = this.combinationManager.getMatches();

            if (matches.length) {
                this.processMatches(matches).then(() => resolve());
            } else {
                this.disabled = false;
                resolve();
            }
        })
    }

    removeStartMatches() {
        let matches = this.combinationManager.getMatches();

        while(matches.length) {
            this.removeMatches(matches);
            const fields = this.board.fields.filter((field) => field.tile === null);
            fields.forEach((field) => {
                this.board.createTile(field);
            })

            matches = this.combinationManager.getMatches();
        }
    }

    addTiles() {
        return new Promise((resolve) => {
            const fields = this.board.fields.filter((field) => field.tile === null);
            let total = fields.length;
            let completed = 0;

            fields.forEach((field) => {
                const tile = this.board.createTile(field);

                tile.sprite.y = -500;
                const delay = Math.random() * 2 / 10 + 0.3 / (field.row + 1);

                tile.fallDownTo(field.position, delay).then(() => {
                    ++completed;
                    if (completed >= total) {
                        resolve();
                    }
                })
            })
        })
    }

    removeMatches(matches) {
        matches.forEach(matche => {
            matche.forEach(tile => {
                tile.remove();
            })
        });
    }

    clearSelection() {
        if (this.selectedTile) {
            this.selectedTile.field.unselect();
            this.selectedTile = null;
        }
    }

    selectTile(tile) {
        this.selectedTile = tile;
        this.selectedTile.field.select();
    }

    createBackground() {
        this.bg = App.sprite('bg');
        this.bg.width = window.innerWidth;
        this.bg.height = window.innerHeight;
        this.container.addChild(this.bg);
    }
}