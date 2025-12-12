import './styles.css';
import { Application, Ticker } from 'pixi.js';
import { Game } from './game/Game';

(async () => {
  const app = new Application();

  await app.init({
    background: '#07090f',
    resizeTo: window,
    antialias: true,
    powerPreference: 'high-performance',
  });

  const host = document.getElementById('app');
  if (!host) throw new Error('Missing #app');
  host.appendChild(app.canvas);

  const game = new Game(app);
  await game.init();

  app.ticker.add((ticker: Ticker) => {
    game.update(ticker.deltaMS / 1000);
  });
})();
