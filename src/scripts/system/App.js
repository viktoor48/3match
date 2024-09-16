import * as PIXI from 'pixi.js';
import { SceneManager } from './SceneManager';
import { Loader } from './Loader';

class Application {
    run(config) {
        this.config = config;

        this.app = new PIXI.Application({resizeTo: window});
        document.body.appendChild(this.app.view);

        this.scenes = new SceneManager();
        this.app.stage.addChild(this.scenes.container);

        this.loader = new Loader(this.app.loader, this.config);
        this.loader.preload().then(() => this.start());
    }

    start() {
        this.scenes.start("Game");
    }

    res(key) {
        return this.loader.resources[key].texture;
    }

    sprite(key) {
        return new PIXI.Sprite(this.res(key));
    }
}

export const App = new Application();