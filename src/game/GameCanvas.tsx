import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { GameOptions, GameResult } from '../types';
import playerShipUrl from '../../assets/png/retina/ships/ship_1.png';
import blackPirateShipUrl from '../../assets/png/retina/ships/ship_2.png';
import redShipUrl from '../../assets/png/retina/ships/ship_3.png';
import blueShipUrl from '../../assets/png/retina/ships/ship_4.png';
import greenShipUrl from '../../assets/png/retina/ships/ship_5.png';
import goldShipUrl from '../../assets/png/retina/ships/ship_6.png';
import cannonBallUrl from '../../assets/png/retina/ship_parts/cannon_ball.png';
import explosionUrl from '../../assets/png/default/effects/explosion_1.png';
import explosionTwoUrl from '../../assets/png/default/effects/explosion_2.png';
import explosionThreeUrl from '../../assets/png/default/effects/explosion_3.png';
import tile1Url from '../../assets/png/default/tiles/tile_1.png';
import tile2Url from '../../assets/png/default/tiles/tile_2.png';
import tile3Url from '../../assets/png/default/tiles/tile_3.png';
import tile4Url from '../../assets/png/default/tiles/tile_4.png';
import tile5Url from '../../assets/png/default/tiles/tile_5.png';
import tile6Url from '../../assets/png/default/tiles/tile_6.png';
import tile7Url from '../../assets/png/default/tiles/tile_7.png';
import tile8Url from '../../assets/png/default/tiles/tile_8.png';
import tile9Url from '../../assets/png/default/tiles/tile_9.png';
import tile23Url from '../../assets/png/default/tiles/tile_23.png';
import tile24Url from '../../assets/png/default/tiles/tile_24.png';
import { uiAssets } from '../uiAssets';

interface Props {
  options: GameOptions;
  playerName: string;
  shipVariant: string;
  onFinish: (result: GameResult) => void;
  onExit: () => void;
}

interface Island { x: number; y: number; r: number; }
interface Ship {
  sprite: Sprite;
  healthBar: Graphics;
  x: number; y: number; angle: number; health: number; maxHealth: number; speed: number;
  type: 'player' | 'chaser' | 'shooter' | 'boss';
  fireTimer: number;
  hitFlash: number;
}
interface Shot {
  sprite: Sprite;
  x: number; y: number; vx: number; vy: number;
  life: number; owner: 'player' | 'enemy'; damage: number;
}
interface Effect { sprite: Sprite; x: number; y: number; life: number; maxLife: number; }

const ARENA_W = 960;
const ARENA_H = 600;
const SHIP_RADIUS = 16;
const MAX_CHASERS = 3;
const MAX_SHOOTERS = 2;
const BOSS_SCORE_INTERVAL = 5;
const PLAYER_SHIPS: Record<string, string> = {
  ivory: playerShipUrl,
  red: redShipUrl,
  blue: blueShipUrl,
  green: greenShipUrl,
  gold: goldShipUrl,
};

export default function GameCanvas({ options, playerName, shipVariant, onFinish, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  const exitRef = useRef(onExit);
  finishRef.current = onFinish;
  exitRef.current = onExit;

  useEffect(() => {
    let destroyed = false;
    let app: Application | null = null;
    let initPromise: Promise<void> | null = null;
    let ticker: ((ticker: { deltaMS: number }) => void) | null = null;
    const keys = new Set<string>();
    const ships: Ship[] = [];
    const shots: Shot[] = [];
    const effects: Effect[] = [];
    const islands: Island[] = [
      { x: 260, y: 200, r: 55 },
      { x: 680, y: 380, r: 72 },
      { x: 730, y: 120, r: 35 },
    ];
    let score = 0;
    let bossFights = 0;
    let nextBossScore = BOSS_SCORE_INTERVAL;
    let bossSpawnedAtScore = 0;
    let health = 5;
    let elapsed = 0;
    let spawnElapsed = 0;
    let paused = false;
    let ended = false;
    let lastFire = 0;
    let lastSideFire = 0;
    let hudText: Text | null = null;
    let bossFightText: Text | null = null;
    let pauseText: Text | null = null;
    let world: Container | null = null;
    let player: Ship | null = null;
    let touchControls: Container | null = null;
    let playerTexture: Texture | null = null;
    let pirateTexture: Texture | null = null;
    let explosionTextures: Texture[] = [];
    let islandTextures: Texture[] = [];
    let islandGrassTexture: Texture | null = null;
    let cannonBallTexture: Texture | null = null;
    let hudPanelTexture: Texture | null = null;
    let buttonRoundTexture: Texture | null = null;
    let heartTexture: Texture | null = null;
    let scoreTexture: Texture | null = null;
    let timeTexture: Texture | null = null;
    let controlTextures: Record<string, Texture> = {};
    let healthFillSprite: Sprite | null = null;
    let healthValueText: Text | null = null;
    let scoreValueText: Text | null = null;
    let timeValueText: Text | null = null;

    const setPaused = (value: boolean) => {
      if (ended) return;
      paused = value;
      if (pauseText) pauseText.visible = paused;
    };

    const collidesWithIsland = (x: number, y: number, radius = SHIP_RADIUS) =>
      islands.some((island) => Math.hypot(x - island.x, y - island.y) < island.r + radius);

    const slideAlongIslands = (x: number, y: number, dx: number, dy: number, radius = SHIP_RADIUS) => {
      // Quando o próximo ponto invade uma ilha, conserva apenas a componente tangencial do movimento.
      const nextX = x + dx;
      const nextY = y + dy;
      const blockingIsland = islands.find((island) => Math.hypot(nextX - island.x, nextY - island.y) < island.r + radius);
      if (!blockingIsland) return { x: nextX, y: nextY };
      const distance = Math.hypot(x - blockingIsland.x, y - blockingIsland.y);
      const normalX = (x - blockingIsland.x) / Math.max(distance, 1);
      const normalY = (y - blockingIsland.y) / Math.max(distance, 1);
      const tangentX = -normalY;
      const tangentY = normalX;
      const tangentDistance = dx * tangentX + dy * tangentY;
      const slideX = x + tangentX * tangentDistance;
      const slideY = y + tangentY * tangentDistance;
      if (!collidesWithIsland(slideX, slideY, radius)) return { x: slideX, y: slideY };
      return { x, y };
    };

    const addEffect = (container: Container, x: number, y: number, color?: number) => {
      const sprite = Sprite.from(explosionTextures[0] || explosionUrl);
      sprite.anchor.set(0.5);
      sprite.scale.set(0.7);
      if (color !== undefined) sprite.tint = color;
      sprite.position.set(x, y);
      container.addChild(sprite);
      effects.push({ sprite, x, y, life: 0.45, maxLife: 0.45 });
    };

    const updateHealthBar = (ship: Ship) => {
      ship.healthBar.clear();
      const width = ship.type === 'boss' ? 66 : 42;
      const y = ship.type === 'boss' ? -43 : -31;
      ship.healthBar.roundRect(-width / 2, y, width, 7, 2).fill({ color: 0x092b3a, alpha: 0.95 });
      ship.healthBar.roundRect(-width / 2 + 1, y + 1, (width - 2) * Math.max(0, ship.health / ship.maxHealth), 5, 1)
        .fill(ship.type === 'player' ? 0x5eead4 : ship.type === 'boss' ? 0xf6c453 : 0xfb7185);
      ship.healthBar.position.set(ship.x, ship.y);
    };

    const addShip = (container: Container, x: number, y: number, type: Ship['type']): Ship => {
      const texture = type === 'player' ? playerTexture : pirateTexture;
      const sprite = Sprite.from(texture || playerShipUrl);
      sprite.anchor.set(0.5);
      sprite.scale.set(type === 'player' ? 0.22 : type === 'boss' ? 0.32 : 0.18);
      sprite.position.set(x, y);
      const healthBar = new Graphics();
      container.addChild(sprite, healthBar);
      const maxHealth = type === 'player' ? 5 : type === 'boss' ? 10 : 2;
      const ship: Ship = {
        sprite, healthBar, x, y, angle: Math.PI / 2, health: maxHealth, maxHealth,
        speed: type === 'player' ? 110 : type === 'chaser' ? 75 : type === 'boss' ? 35 : 45, type, fireTimer: 0, hitFlash: 0,
      };
      ships.push(ship);
      updateHealthBar(ship);
      return ship;
    };

    const addShot = (
      container: Container,
      x: number,
      y: number,
      angle: number,
      owner: Shot['owner'],
      damage = 1,
      range = 2.2,
    ) => {
      // O alcance é controlado pela vida do projétil; o boss usa um valor menor e dano maior.
      const sprite = Sprite.from(cannonBallTexture || cannonBallUrl);
      sprite.anchor.set(0.5);
      sprite.scale.set(owner === 'player' ? 0.72 : 0.9);
      sprite.position.set(x, y);
      const speed = owner === 'player' ? 390 : 170;
      shots.push({ sprite, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: range, owner, damage });
      container.addChild(sprite);
    };

    const end = (reason: GameResult['reason']) => {
      if (ended) return;
      ended = true;
      finishRef.current({
        id: crypto.randomUUID(), playerName, score, durationSeconds: Math.max(0, Math.floor(elapsed)), reason,
        finishedAt: new Date().toISOString(),
        bossFights,
        config: { sessionSeconds: options.sessionSeconds, spawnSeconds: options.spawnSeconds, mode: options.mode },
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape' && !ended) setPaused(!paused);
      keys.add(event.code === 'Space' ? 'space' : event.key.toLowerCase());
    };
    const handleKeyUp = (event: KeyboardEvent) => keys.delete(event.code === 'Space' ? 'space' : event.key.toLowerCase());
    const handlePause = () => setPaused(true);
    const handleVisibility = () => { if (document.hidden) setPaused(true); };

    const boot = async () => {
      if (!hostRef.current) return;
      app = new Application();
      initPromise = app.init({
        width: ARENA_W, height: ARENA_H, background: 0x0b4050, antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
      });
      await initPromise;
      if (destroyed || !hostRef.current || !app) {
        app?.destroy(true);
        app = null;
        return;
      }
      const loadedTextures = await Promise.all([
        Assets.load<Texture>(PLAYER_SHIPS[shipVariant] || playerShipUrl),
        Assets.load<Texture>(blackPirateShipUrl),
        Assets.load<Texture>(explosionUrl),
        Assets.load<Texture>(explosionTwoUrl),
        Assets.load<Texture>(explosionThreeUrl),
        Assets.load<Texture>(cannonBallUrl),
        Assets.load<Texture>(tile1Url),
        Assets.load<Texture>(tile2Url),
        Assets.load<Texture>(tile3Url),
        Assets.load<Texture>(tile4Url),
        Assets.load<Texture>(tile5Url),
        Assets.load<Texture>(tile6Url),
        Assets.load<Texture>(tile7Url),
        Assets.load<Texture>(tile8Url),
        Assets.load<Texture>(tile9Url),
        Assets.load<Texture>(tile23Url),
        Assets.load<Texture>(tile24Url),
        Assets.load<Texture>(uiAssets.buttonRoundNormal),
        Assets.load<Texture>(uiAssets.counterPanel),
        Assets.load<Texture>(uiAssets.iconHeart),
        Assets.load<Texture>(uiAssets.iconScore),
        Assets.load<Texture>(uiAssets.iconTime),
        Assets.load<Texture>(uiAssets.healthFrame),
        Assets.load<Texture>(uiAssets.healthFillGreen),
        Assets.load<Texture>(uiAssets.iconForward),
        Assets.load<Texture>(uiAssets.iconTurnLeft),
        Assets.load<Texture>(uiAssets.iconTurnRight),
        Assets.load<Texture>(uiAssets.iconFireFront),
        Assets.load<Texture>(uiAssets.iconFireLeft),
        Assets.load<Texture>(uiAssets.iconFireRight),
      ]);
      [playerTexture, pirateTexture] = loadedTextures;
      explosionTextures = loadedTextures.slice(2, 5);
      cannonBallTexture = loadedTextures[5];
      islandTextures = loadedTextures.slice(6, 15);
      islandGrassTexture = loadedTextures[16];
      buttonRoundTexture = loadedTextures[17];
      [hudPanelTexture, heartTexture, scoreTexture, timeTexture] = loadedTextures.slice(18, 22);
      const healthFrameTexture = loadedTextures[22];
      const healthFillTexture = loadedTextures[23];
      controlTextures = {
        forward: loadedTextures[24],
        turnLeft: loadedTextures[25],
        turnRight: loadedTextures[26],
        fireFront: loadedTextures[27],
        fireLeft: loadedTextures[28],
        fireRight: loadedTextures[29],
      };
      if (destroyed || !hostRef.current || !app) {
        app?.destroy(true);
        app = null;
        return;
      }
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(app.canvas);
      app.canvas.setAttribute('aria-label', 'Pirate Battle game arena');
      app.canvas.style.width = '100%';
      app.canvas.style.height = 'auto';
      app.canvas.style.display = 'block';
      world = new Container();
      app.stage.addChild(world);

      const water = new Graphics();
      for (let x = 0; x < ARENA_W; x += 48) water.moveTo(x, 0).lineTo(x, ARENA_H);
      for (let y = 0; y < ARENA_H; y += 48) water.moveTo(0, y).lineTo(ARENA_W, y);
      water.stroke({ color: 0x155566, alpha: 0.65, width: 1 });
      world.addChild(water);
      for (const island of islands) {
        const islandGroup = new Container();
        islandGroup.position.set(island.x, island.y);
        const sand = new Graphics()
          .roundRect(-island.r - 18, -island.r - 18, (island.r + 18) * 2, (island.r + 18) * 2, 34)
          .fill({ color: 0xe9bd73 });
        islandGroup.addChild(sand);
        const grass = Sprite.from(islandGrassTexture || islandTextures[4]);
        grass.anchor.set(0.5);
        grass.width = island.r * 1.55;
        grass.height = island.r * 1.55;
        islandGroup.addChild(grass);
        const detail = Sprite.from(islandTextures[0]);
        detail.anchor.set(0.5);
        detail.alpha = 0.22;
        detail.width = island.r * 1.75;
        detail.height = island.r * 1.75;
        islandGroup.addChild(detail);
        world.addChild(islandGroup);
      }

      player = addShip(world, ARENA_W / 2, ARENA_H / 2, 'player');
      const hudTextStyle = { fill: '#fff4d1', fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold' as const, stroke: { color: '#092b3a', width: 3 } };
      const healthFrameSprite = Sprite.from(healthFrameTexture);
      healthFrameSprite.position.set(55, 25);
      healthFrameSprite.scale.set(0.60);
      app.stage.addChild(healthFrameSprite);
      healthFillSprite = Sprite.from(healthFillTexture);
      healthFillSprite.position.set(80, 29);
      healthFillSprite.scale.set(0.5);
      app.stage.addChild(healthFillSprite);
      const heartIcon = Sprite.from(heartTexture || uiAssets.iconHeart);
      heartIcon.position.set(18, 33);
      heartIcon.scale.set(0.45);
      app.stage.addChild(heartIcon);
      healthValueText = new Text({ text: '', style: hudTextStyle });
      healthValueText.position.set(55, 25);
      healthValueText.anchor.set(0.5);
      app.stage.addChild(healthValueText);

      const addCounter = (x: number, iconTexture: Texture | null) => {
        const panel = Sprite.from(hudPanelTexture || uiAssets.counterPanel);
        panel.position.set(x, 14);
        panel.scale.set(0.5);
        app!.stage.addChild(panel);
        const icon = Sprite.from(iconTexture || uiAssets.iconScore);
        icon.position.set(x + 24, 32);
        icon.scale.set(0.32);
        app!.stage.addChild(icon);
        const value = new Text({ text: '', style: hudTextStyle });
        value.position.set(x + 60, 30);
        app!.stage.addChild(value);
        return value;
      };
      scoreValueText = addCounter(620, scoreTexture);
      timeValueText = addCounter(790, timeTexture);
      bossFightText = new Text({
        text: 'BOSS FIGHT',
        style: {
          fill: '#ffe08a',
          fontFamily: 'Arial',
          fontSize: 25,
          fontWeight: 'bold',
          align: 'center',
          stroke: { color: '#5b1725', width: 6 },
        },
      });
      bossFightText.anchor.set(0.5);
      bossFightText.position.set(480, 31);
      bossFightText.visible = false;
      app.stage.addChild(bossFightText);
      hudText = new Text({ text: '', style: hudTextStyle });
      hudText.visible = false;
      app.stage.addChild(hudText);
      pauseText = new Text({ text: 'PAUSED — press ESC to resume', style: { fill: '#ffffff', fontFamily: 'Arial', fontSize: 32, fontWeight: 'bold', align: 'center', stroke: { color: '#092b3a', width: 6 } } });
      pauseText.anchor.set(0.5);
      pauseText.position.set(ARENA_W / 2, ARENA_H / 2);
      pauseText.visible = false;
      app.stage.addChild(pauseText);

      touchControls = new Container();
      const touchButton = (x: number, y: number, iconKey: string, code: string, scale = 0.72) => {
        const button = new Container();
        const background = Sprite.from(buttonRoundTexture || uiAssets.buttonRoundNormal);
        background.anchor.set(0.5);
        background.scale.set(scale);
        const icon = Sprite.from(controlTextures[iconKey]);
        icon.anchor.set(0.5);
        icon.scale.set(scale * 0.72);
        button.addChild(background, icon);
        button.position.set(x, y);
        button.eventMode = 'static';
        button.cursor = 'pointer';
        const press = (event: { stopPropagation: () => void }) => { event.stopPropagation(); keys.add(code); };
        const release = () => keys.delete(code);
        button.on('pointerdown', press).on('pointerup', release).on('pointerupoutside', release).on('pointercancel', release);
        touchControls!.addChild(button);
      };
      touchButton(96, ARENA_H - 148, 'forward', 'arrowup', 0.58);
      touchButton(42, ARENA_H - 86, 'turnLeft', 'arrowleft', 0.58);
      touchButton(150, ARENA_H - 86, 'turnRight', 'arrowright', 0.58);
      touchButton(864, ARENA_H - 148, 'fireFront', 'space', 0.62);
      touchButton(804, ARENA_H - 82, 'fireLeft', 'q', 0.58);
      touchButton(916, ARENA_H - 82, 'fireRight', 'e', 0.58);
      app.stage.addChild(touchControls);

      ticker = (currentTicker) => {
        if (paused || ended || !player || !world) return;
        const dt = Math.min(currentTicker.deltaMS / 1000, 0.05);
        elapsed += dt; spawnElapsed += dt; lastFire += dt; lastSideFire += dt;
        const oldX = player.x; const oldY = player.y;
        if (keys.has('w') || keys.has('arrowup')) { player.x += Math.cos(player.angle) * player.speed * dt; player.y += Math.sin(player.angle) * player.speed * dt; }
        if (keys.has('a') || keys.has('arrowleft')) player.angle -= 2.8 * dt;
        if (keys.has('d') || keys.has('arrowright')) player.angle += 2.8 * dt;
        player.x = Math.max(18, Math.min(ARENA_W - 18, player.x));
        player.y = Math.max(18, Math.min(ARENA_H - 18, player.y));
        if (collidesWithIsland(player.x, player.y)) {
          const slid = slideAlongIslands(oldX, oldY, player.x - oldX, player.y - oldY);
          player.x = slid.x;
          player.y = slid.y;
          if (player.x === oldX && player.y === oldY) addEffect(world, player.x, player.y);
        }
        player.sprite.position.set(player.x, player.y);
        player.sprite.rotation = player.angle - Math.PI / 2;
        player.health = health;
        updateHealthBar(player);

        if (keys.has('space') && lastFire >= 0.45) { addShot(world, player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20, player.angle, 'player'); lastFire = 0; }
        if (keys.has('q') && lastSideFire >= 0.8) { for (const offset of [-0.18, 0, 0.18]) addShot(world, player.x, player.y, player.angle - Math.PI / 2 + offset, 'player'); lastSideFire = 0; }
        if (keys.has('e') && lastSideFire >= 0.8) { for (const offset of [-0.18, 0, 0.18]) addShot(world, player.x, player.y, player.angle + Math.PI / 2 + offset, 'player'); lastSideFire = 0; }

        const bossActive = ships.some((ship) => ship.type === 'boss' && ship.health > 0);
        if (bossFightText) bossFightText.visible = bossActive;

        if (spawnElapsed >= options.spawnSeconds) {
          // No Arcade, o boss ocupa o fluxo de spawn até ser derrotado.
          const bossDue = options.mode === 'arcade' && score >= nextBossScore && bossSpawnedAtScore !== nextBossScore;

          if (bossDue && !bossActive) {
            const edge = Math.floor(Math.random() * 4);
            const x = edge === 0 ? 34 : edge === 1 ? ARENA_W - 34 : 80 + Math.random() * (ARENA_W - 160);
            const y = edge === 2 ? 34 : edge === 3 ? ARENA_H - 34 : 80 + Math.random() * (ARENA_H - 160);
            if (!collidesWithIsland(x, y, 28)) {
              addShip(world, x, y, 'boss');
              bossSpawnedAtScore = nextBossScore;
              nextBossScore += BOSS_SCORE_INTERVAL;
              spawnElapsed = 0;
            }
          }

          if (!bossDue && !bossActive) {
            const chaserCount = ships.filter((ship) => ship.type === 'chaser' && ship.health > 0).length;
            const shooterCount = ships.filter((ship) => ship.type === 'shooter' && ship.health > 0).length;
            const availableTypes: Ship['type'][] = [];
            if (chaserCount < MAX_CHASERS) availableTypes.push('chaser');
            if (shooterCount < MAX_SHOOTERS) availableTypes.push('shooter');

            if (availableTypes.length > 0) {
              const edge = Math.floor(Math.random() * 4);
              const x = edge === 0 ? 24 : edge === 1 ? ARENA_W - 24 : 60 + Math.random() * (ARENA_W - 120);
              const y = edge === 2 ? 24 : edge === 3 ? ARENA_H - 24 : 60 + Math.random() * (ARENA_H - 120);
              if (!collidesWithIsland(x, y)) {
                const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                addShip(world, x, y, type);
                spawnElapsed = 0;
              }
            }
          }
        }

        for (const ship of [...ships]) {
          if (ship.type === 'player' || ship.health <= 0) continue;
          const dx = player.x - ship.x; const dy = player.y - ship.y; const distance = Math.max(1, Math.hypot(dx, dy));
          ship.angle = Math.atan2(dy, dx);
          const oldShipX = ship.x; const oldShipY = ship.y;
          if (ship.type === 'chaser' || ship.type === 'boss' || distance > 230) {
            ship.x += (dx / distance) * ship.speed * dt;
            ship.y += (dy / distance) * ship.speed * dt;
          }
          if (ship.type === 'shooter') {
            ship.fireTimer += dt;
            if (ship.fireTimer >= 1.5) {
              addShot(world, ship.x, ship.y, ship.angle, 'enemy');
              ship.fireTimer = 0;
            }
          }
          if (ship.type === 'boss') {
            ship.fireTimer += dt;
            if (ship.fireTimer >= 1.25) {
              const bossShotRange = 1.15;
              addShot(world, ship.x + Math.cos(ship.angle) * 25, ship.y + Math.sin(ship.angle) * 25, ship.angle, 'enemy', 2, bossShotRange);
              for (const side of [-1, 1])
                addShot(world, ship.x, ship.y, ship.angle + side * Math.PI / 2, 'enemy', 2, bossShotRange);
              ship.fireTimer = 0;
            }
          }
          if (collidesWithIsland(ship.x, ship.y)) {
            const slid = slideAlongIslands(oldShipX, oldShipY, ship.x - oldShipX, ship.y - oldShipY);
            ship.x = slid.x;
            ship.y = slid.y;
          }
          ship.sprite.position.set(ship.x, ship.y); ship.sprite.rotation = ship.angle - Math.PI / 2; updateHealthBar(ship);
          if (distance < 24 && ship.type === 'chaser') { health -= 1; ship.health = 0; addEffect(world, player.x, player.y, 0xfb7185); }
        }

        for (const shot of [...shots]) {
          shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
          shot.sprite.position.set(shot.x, shot.y);
          let remove = shot.life <= 0 || shot.x < 0 || shot.y < 0 || shot.x > ARENA_W || shot.y > ARENA_H;
          if (collidesWithIsland(shot.x, shot.y, 5)) { remove = true; addEffect(world, shot.x, shot.y); }
          if (!remove && shot.owner === 'player') {
            for (const ship of ships) {
              if (ship.type === 'player' || ship.health <= 0 || Math.hypot(ship.x - shot.x, ship.y - shot.y) >= 19) continue;
              ship.health -= 1; ship.hitFlash = 0.12; remove = true; addEffect(world, ship.x, ship.y, 0xfef3c7); updateHealthBar(ship);
              if (ship.health <= 0) {
                score += 1;
                if (ship.type === 'boss') bossFights += 1;
                addEffect(world, ship.x, ship.y, 0xfb7185);
              }
              break;
            }
          } else if (!remove && player && Math.hypot(player.x - shot.x, player.y - shot.y) < 18) {
            health -= shot.damage; player.health = health; updateHealthBar(player); remove = true; player.hitFlash = 0.12; addEffect(world, player.x, player.y, 0xfb7185);
          }
          if (remove) { world.removeChild(shot.sprite); shots.splice(shots.indexOf(shot), 1); }
        }
        for (const ship of [...ships]) {
          if (ship.type !== 'player' && ship.health <= 0) { world.removeChild(ship.sprite); world.removeChild(ship.healthBar); ships.splice(ships.indexOf(ship), 1); }
          if (ship.hitFlash > 0) { ship.hitFlash -= dt; ship.sprite.alpha = ship.hitFlash % 0.04 < 0.02 ? 0.35 : 1; } else ship.sprite.alpha = 1;
        }
        for (const effect of [...effects]) {
          effect.life -= dt;
          const frame = Math.min(explosionTextures.length - 1, Math.floor((1 - effect.life / effect.maxLife) * explosionTextures.length));
          if (explosionTextures[frame]) effect.sprite.texture = explosionTextures[frame];
          effect.sprite.scale.set(0.7 + (1 - effect.life / effect.maxLife) * 0.4); effect.sprite.alpha = Math.max(0, effect.life / effect.maxLife);
          if (effect.life <= 0) { world.removeChild(effect.sprite); effects.splice(effects.indexOf(effect), 1); }
        }
        const currentHealth = Math.max(0, health);
        healthFillSprite!.width = 196 * (currentHealth / 5);
        healthValueText!.text = `${currentHealth * 20} / 100`;
        scoreValueText!.text = options.mode === 'arcade' ? `${bossFights}` : `${score}`;
        timeValueText!.text = `${Math.max(0, Math.ceil(options.sessionSeconds - elapsed))}s`;
        if (health <= 0) end('health'); else if (options.mode === 'timed' && elapsed >= options.sessionSeconds) end('time');
      };
      app.ticker.add(ticker);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handlePause);
    document.addEventListener('visibilitychange', handleVisibility);
    void boot();

    return () => {
      destroyed = true;
      keys.clear();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handlePause);
      document.removeEventListener('visibilitychange', handleVisibility);
      void (async () => {
        if (initPromise) {
          try { await initPromise; } catch (error) { console.error('Erro ao inicializar o PixiJS:', error); }
        }
        if (app) {
          if (ticker) app.ticker.remove(ticker);
          app.ticker?.stop();
          app.destroy({ removeView: true });
          app = null;
        }
      })();
    };
  }, [options, playerName, shipVariant]);

  return <div className="canvas-frame"><div className="canvas-host" ref={hostRef} /><p className="game-hint">W / ↑ move · A/D turn · Space fire · Q/E side cannons · Esc pause · Touch controls available</p></div>;
}
