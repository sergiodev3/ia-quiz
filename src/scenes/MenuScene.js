import Phaser from 'phaser';
import { SESSIONS } from '../data/sessions.js';

// ---- Asset imports (loaded here so GameScene finds them cached) ----
import boxImg        from '../assets/diferentes/classic box .png';
import floorImg      from '../assets/16 Bit School Asset Pack/Floor Tiles 32x32/Wood Tile Pattern 1.png';
import chalkLImg     from '../assets/16 Bit School Asset Pack/Classroom 32x32/Chalkboard (Left Side).png';
import chalkRImg     from '../assets/16 Bit School Asset Pack/Classroom 32x32/Chalkboard (Right Side).png';
import bshelfL1      from '../assets/16 Bit School Asset Pack/Classroom 32x32/Bookshelf L1.png';
import bshelfL2      from '../assets/16 Bit School Asset Pack/Classroom 32x32/Bookshelf L2.png';
import bshelfR1      from '../assets/16 Bit School Asset Pack/Classroom 32x32/Bookshelf R1.png';
import bshelfR2      from '../assets/16 Bit School Asset Pack/Classroom 32x32/Bookshelf R2.png';

import robotIdleImg  from '../assets/Robot Platform Pack/OrangeRobot/Spritesheets/OrangeRobot_Idle.png';
import robotRunImg   from '../assets/Robot Platform Pack/OrangeRobot/Spritesheets/OrangeRobot_Run.png';
import robotJumpImg  from '../assets/Robot Platform Pack/OrangeRobot/Spritesheets/OrangeRobot_Jump.png';
import robotHurtImg  from '../assets/Robot Platform Pack/OrangeRobot/Spritesheets/OrangeRobot_Hurt.png';
import robotDeathImg from '../assets/Robot Platform Pack/OrangeRobot/Spritesheets/OrangeRobot_Death.png';
import enemyRunImg   from '../assets/Robot Platform Pack/EnemyRobot/EnemyRobot_Run.png';
import enemyIdleImg  from '../assets/Robot Platform Pack/EnemyRobot/EnemyRobot_Idle.png';
import enemyDeathImg from '../assets/Robot Platform Pack/EnemyRobot/EnemyRobot_Death.png';

const W = 800;
const H = 600;
const SESSION_KEYS = ['sesion1', 'sesion2', 'sesion3'];
const BTN_COLORS   = [0x1ABC9C, 0xF39C12, 0xE74C3C];
const BTN_HOVER    = [0x27AE60, 0xD68910, 0xC0392B];

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  // ---- preload ALL game assets so GameScene can skip loading ----
  preload() {
    this.load.image('box',       boxImg);
    this.load.image('floor',     floorImg);
    this.load.image('chalkL',    chalkLImg);
    this.load.image('chalkR',    chalkRImg);
    this.load.image('bshelfL1',  bshelfL1);
    this.load.image('bshelfL2',  bshelfL2);
    this.load.image('bshelfR1',  bshelfR1);
    this.load.image('bshelfR2',  bshelfR2);

    this.load.spritesheet('robot_idle',  robotIdleImg,  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('robot_run',   robotRunImg,   { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('robot_jump',  robotJumpImg,  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('robot_hurt',  robotHurtImg,  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('robot_death', robotDeathImg, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy_run',   enemyRunImg,   { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy_idle',  enemyIdleImg,  { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy_death', enemyDeathImg, { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this._buildBackground();
    this._buildAnimations();
    this._buildTitle();
    this._buildRobotDisplay();
    this._buildSessionButtons();
    this._buildFooter();
    this._resumeAudio();
  }

  // ---- Background ----
  _buildBackground() {
    const g = this.add.graphics();
    // Deep space-classroom gradient via layered rects
    g.fillStyle(0x0D1B3E); g.fillRect(0, 0, W, H);
    g.fillStyle(0x16213E); g.fillRect(0, H * 0.5, W, H * 0.5);

    // Subtle grid
    g.lineStyle(1, 0x1E3A6E, 0.4);
    for (let x = 0; x < W; x += 64) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 64) g.lineBetween(0, y, W, y);

    // Floor strip
    g.fillStyle(0x1F3566, 0.8); g.fillRect(0, H - 60, W, 60);
    g.lineStyle(2, 0x3498DB, 0.6); g.lineBetween(0, H - 60, W, H - 60);

    // Floating particles (purely decorative lines)
    g.lineStyle(1, 0x3498DB, 0.3);
    const rng = Phaser.Math.RND;
    for (let i = 0; i < 12; i++) {
      const px = rng.between(0, W);
      const py = rng.between(0, H - 80);
      g.strokeRect(px, py, rng.between(2, 8), rng.between(2, 8));
    }
  }

  // ---- Shared animations (reused by GameScene via cache) ----
  _buildAnimations() {
    const anims = this.anims;
    if (!anims.exists('robot_idle'))
      anims.create({ key: 'robot_idle',  frames: anims.generateFrameNumbers('robot_idle',  { start: 0, end: 5 }), frameRate: 8,  repeat: -1 });
    if (!anims.exists('robot_run'))
      anims.create({ key: 'robot_run',   frames: anims.generateFrameNumbers('robot_run',   { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
    if (!anims.exists('robot_jump'))
      anims.create({ key: 'robot_jump',  frames: anims.generateFrameNumbers('robot_jump',  { start: 0, end: 4 }), frameRate: 8,  repeat: 0  });
    if (!anims.exists('robot_hurt'))
      anims.create({ key: 'robot_hurt',  frames: anims.generateFrameNumbers('robot_hurt',  { start: 0, end: 1 }), frameRate: 10, repeat: 0  });
    if (!anims.exists('robot_death'))
      anims.create({ key: 'robot_death', frames: anims.generateFrameNumbers('robot_death', { start: 0, end: 5 }), frameRate: 8,  repeat: 0  });
    if (!anims.exists('enemy_run'))
      anims.create({ key: 'enemy_run',   frames: anims.generateFrameNumbers('enemy_run',   { start: 0, end: 3 }), frameRate: 8,  repeat: -1 });
    if (!anims.exists('enemy_idle'))
      anims.create({ key: 'enemy_idle',  frames: anims.generateFrameNumbers('enemy_idle',  { start: 0, end: 3 }), frameRate: 6,  repeat: -1 });
  }

  // ---- Title ----
  _buildTitle() {
    // Glow ring behind logo
    const glow = this.add.graphics();
    glow.fillStyle(0x3498DB, 0.08); glow.fillCircle(W / 2, 95, 120);
    glow.fillStyle(0x3498DB, 0.05); glow.fillCircle(W / 2, 95, 160);

    // Main title
    const title = this.add.text(W / 2, 70, 'IA QUIZ SECU 129', {
      fontSize: '64px',
      fontFamily: '"Courier New", monospace',
      color: '#ECF0F1',
      stroke: '#1ABC9C',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Animate title glow
    this.tweens.add({
      targets: title,
      strokeThickness: 10,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 128, 'El Juego Interactivo de Inteligencia Artificial by Prof. Sergio', {
      fontSize: '14px',
      fontFamily: '"Courier New", monospace',
      color: '#7FB3D3',
    }).setOrigin(0.5);

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(2, 0x1ABC9C, 0.7);
    sep.lineBetween(100, 152, 700, 152);
  }

  // ---- Decorative robot display ----
  _buildRobotDisplay() {
    const robot = this.add.sprite(680, 380, 'robot_idle').setScale(4);
    robot.play('robot_idle');

    // Bob tween
    this.tweens.add({
      targets: robot,
      y: 385,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(680, 430, '< TÚ', {
      fontSize: '13px',
      fontFamily: '"Courier New", monospace',
      color: '#1ABC9C',
    }).setOrigin(0.5);
  }

  // ---- Session selection buttons ----
  _buildSessionButtons() {
    this.add.text(W / 2, 172, 'ELIGE TU SESIÓN:', {
      fontSize: '17px',
      fontFamily: '"Courier New", monospace',
      color: '#BDC3C7',
    }).setOrigin(0.5);

    SESSION_KEYS.forEach((key, i) => {
      const session = SESSIONS[key];
      const y       = 215 + i * 90;

      // Button background
      const btnGfx = this.add.graphics();
      btnGfx.fillStyle(BTN_COLORS[i], 0.85);
      btnGfx.fillRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);
      btnGfx.lineStyle(2, 0xFFFFFF, 0.15);
      btnGfx.strokeRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);

      // Session number badge
      this.add.text(W / 2 - 220, y - 9, `0${i + 1}`, {
        fontSize: '28px',
        fontFamily: '"Courier New", monospace',
        color: 'rgba(255,255,255,0.5)',
        fontStyle: 'bold',
      });

      // Session title
      this.add.text(W / 2 - 175, y - 12, session.title, {
        fontSize: '18px',
        fontFamily: '"Courier New", monospace',
        color: '#FFFFFF',
        fontStyle: 'bold',
      });

      // Session subtitle
      this.add.text(W / 2 - 175, y + 10, session.subtitle, {
        fontSize: '12px',
        fontFamily: '"Courier New", monospace',
        color: 'rgba(255,255,255,0.75)',
      });

      // Arrow
      this.add.text(W / 2 + 210, y - 5, '▶', {
        fontSize: '20px', color: 'rgba(255,255,255,0.6)',
      });

      // Invisible hit area
      const zone = this.add.zone(W / 2, y + 1, 520, 58).setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        btnGfx.clear();
        btnGfx.fillStyle(BTN_HOVER[i]);
        btnGfx.fillRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);
        btnGfx.lineStyle(2, 0xFFFFFF, 0.4);
        btnGfx.strokeRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);
        this.tweens.add({ targets: zone, scaleX: 1.02, scaleY: 1.02, duration: 80 });
      });

      zone.on('pointerout', () => {
        btnGfx.clear();
        btnGfx.fillStyle(BTN_COLORS[i], 0.85);
        btnGfx.fillRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);
        btnGfx.lineStyle(2, 0xFFFFFF, 0.15);
        btnGfx.strokeRoundedRect(W / 2 - 260, y - 28, 520, 58, 10);
        this.tweens.add({ targets: zone, scaleX: 1, scaleY: 1, duration: 80 });
      });

      zone.on('pointerdown', () => {
        this._selectSession(key);
      });

      // Keyboard shortcut: 1, 2, 3
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE + i)
        .on('down', () => this._selectSession(SESSION_KEYS[i]));
    });
  }

  // ---- Footer ----
  _buildFooter() {
    this.add.text(W / 2, 488, '[ Teclas: ← → para moverse  |  ↑ / Espacio para saltar ]', {
      fontSize: '14px',
      fontFamily: '"Courier New", monospace',
      color: '#566573',
    }).setOrigin(0.5);

    this.add.text(W / 2, 510, '💡 Salta y golpea la caja de tu respuesta desde ABAJO', {
      fontSize: '14px',
      fontFamily: '"Courier New", monospace',
      color: '#566573',
    }).setOrigin(0.5);

    // Pulsing call to action
    const cta = this.add.text(W / 2, 545, '▲  ELIGE UNA SESIÓN PARA COMENZAR  ▲', {
      fontSize: '18px',
      fontFamily: '"Courier New", monospace',
      color: '#1ABC9C',
    }).setOrigin(0.5);
    this.tweens.add({ targets: cta, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  }

  // ---- Session selection ----
  _selectSession(sessionId) {
    this._clickSound();
    this.registry.set('sessionId', sessionId);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }

  // ---- Resume Web Audio on first interaction ----
  _resumeAudio() {
    const unlock = () => {
      const ctx = this.sound?.context;
      if (ctx?.state === 'suspended') ctx.resume();
      this.input.off('pointerdown', unlock);
    };
    this.input.on('pointerdown', unlock);
  }

  _clickSound() {
    try {
      const ctx = this.sound?.context;
      if (!ctx || ctx.state === 'suspended') { ctx?.resume(); return; }
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.1);
    } catch (_) {}
  }
}