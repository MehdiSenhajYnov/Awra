import './styles.css';
import { Application, Container, Graphics, Texture } from 'pixi.js';
import { TerrainMesh } from './render/terrain';
import { buildRoom } from './world/room';

async function boot() {
  const app = new Application();
  await app.init({ resizeTo: window, background: '#05060c', preference: 'webgl', antialias: false });
  document.getElementById('game')!.appendChild(app.canvas);
  const world = new Container();
  app.stage.addChild(world);
  const room = buildRoom({ id: 't', zone: 'z', at: [0, 0], size: [1, 1], solid: [[0, 22, 48, 5], [0, 0, 6, 27], [14, 16, 8, 2], [30, 12, 6, 10], [40, 0, 8, 8]], exits: { r: [[18, 21]] } }, {});
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(225,25%,${10 + Math.random() * 20}%)`; g.fillRect(Math.random() * 256, Math.random() * 256, 6, 6); }
  const rock = Texture.from(c).source;
  const t = new TerrainMesh(room, { rock, rim: [0.45, 0.55, 0.85], deep: [0.02, 0.02, 0.05], top: [0.9, 0.8, 0.5], rockScale: 256 });
  world.addChild(new Graphics().rect(0, 0, 1920, 1080).fill(0x101830));
  world.addChild(t.mesh);
  const fit = () => { const s = Math.min(app.screen.width / 1920, app.screen.height / 1080); world.scale.set(s); };
  fit();
  window.addEventListener('resize', fit);
}
boot();
