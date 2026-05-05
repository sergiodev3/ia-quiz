import Phaser from 'phaser';
import { SESSIONS } from '../data/sessions.js';

// ---- Layout constants ----
const W        = 800;
const H        = 600;
const UI_H     = 195;     // question panel height
const GROUND_Y = 558;     // top surface of the floor
const BOX_Y    = 365;     // y-center of answer boxes (floating)
const BOX_SCALE = 0.13;   // 512 * 0.13 ≈ 67 px
const BOX_HALF  = (512 * BOX_SCALE) / 2;  // ~33 px

// Sprite scale – 32×32 source frames → 80px on screen
const ROBOT_SCALE  = 2.5;
const ROBOT_FRAME  = 32;
// Physics body offset so VISUAL FEET land exactly on GROUND_Y
//   body.bottom = sprite.y + (ROBOT_FRAME/2 * ROBOT_SCALE)
//   we shift body DOWN so its bottom = scaled visual bottom
const BODY_OFFSET_Y = ROBOT_FRAME * 0.75; // = 24 — shifts body to feet

const BOX_X    = [160, 400, 640];
const LETTERS  = ['A', 'B', 'C'];
const BADGE_COLORS = [0x3498DB, 0xF39C12, 0xE74C3C];

// Enemy patrol config per question index
const ENEMY_WAVES = [
  [{ x: 500, dir: -1, speed: 85  }],
  [{ x: 280, dir:  1, speed: 110 }],
  [{ x: 200, dir:  1, speed: 130 }, { x: 620, dir: -1, speed: 130 }],
];

const MAX_LIVES = 2; // wrong answers / enemy touches before game over

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ------------------------------------------------------------------ INIT
  init() {
    this.session       = SESSIONS[this.registry.get('sessionId') || 'sesion1'];
    this.qIndex        = 0;
    this.score         = 0;
    this.lives         = MAX_LIVES;
    this.busy          = false;
    this.gameOverShown = false;
    this.winShown      = false;
    this.enemyInvincible = false;
    this.enemyGroup    = null;
    this.enemyColliders = null;
    this._animKey      = '';
  }

  // --------------------------------------------------------------- PRELOAD
  preload() {
    // Assets are already cached by MenuScene.
    // Declaring them here again is safe — Phaser skips re-downloading.
    // (If somehow the game is launched directly without MenuScene, this
    //  acts as a fallback.)
  }

  // ---------------------------------------------------------------- CREATE
  create() {
    this._buildBackground();
    this._buildGround();
    this._buildBoxes();
    this._buildPlayer();
    this._buildUI();
    this._setupPhysics();
    this._setupInput();
    this._loadQuestion(0);

    // Fade in from menu
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ---------------------------------------------------------------- UPDATE
  update() {
    if (this.gameOverShown || this.winShown) return;
    this._handleMovement();
    this._updateEnemies();
  }

  // ==================================================================
  //  BACKGROUND & ENVIRONMENT
  // ==================================================================

  _buildBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x1F2D5C); g.fillRect(0, 0, W, H);
    g.fillStyle(0x18264A); g.fillRect(0, UI_H, W, H - UI_H);

    // Chalkboard
    for (let i = 0; i < 6; i++) {
      const key = i % 2 === 0 ? 'chalkL' : 'chalkR';
      this.add.image(100 + i * 64, UI_H + 48, key).setScale(2).setDepth(1);
    }
    // Bookshelves
    for (let r = 0; r < 4; r++) {
      const y = UI_H + 48 + r * 32;
      this.add.image(16,     y, r % 2 === 0 ? 'bshelfL1' : 'bshelfL2').setDepth(1);
      this.add.image(W - 16, y, r % 2 === 0 ? 'bshelfR1' : 'bshelfR2').setDepth(1);
    }
    // Grid lines
    g.lineStyle(1, 0xFFFFFF, 0.03);
    for (let x = 0; x < W; x += 64) g.lineBetween(x, UI_H, x, H);
  }

  _buildGround() {
    this.groundGroup = this.physics.add.staticGroup();
    for (let x = 0; x < W; x += 32) {
      const tile = this.groundGroup.create(x + 16, GROUND_Y + 16, 'floor');
      tile.setDepth(2).refreshBody();
    }
    // Ledge glow
    const ledge = this.add.graphics().setDepth(2);
    ledge.fillStyle(0x3498DB, 0.2);
    ledge.fillRect(0, GROUND_Y - 2, W, 4);
  }

  // ==================================================================
  //  BOXES
  // ==================================================================

  _buildBoxes() {
    this.boxes      = [];
    this.badgeGfx   = [];
    this.badgeLabels = [];

    LETTERS.forEach((letter, i) => {
      const x = BOX_X[i];

      const box = this.physics.add.staticImage(x, BOX_Y, 'box');
      box.setScale(BOX_SCALE).setDepth(5).refreshBody();
      box.setData('letter', letter);
      box.setData('hit', false);
      box.setData('wrongHit', false);
      this.boxes.push(box);

      // Colored badge above box
      const badgeY = BOX_Y - BOX_HALF - 20;
      const bg = this.add.graphics().setDepth(9);
      bg.fillStyle(BADGE_COLORS[i]);
      bg.fillCircle(x, badgeY, 16);
      this.badgeGfx.push(bg);

      const lbl = this.add.text(x, badgeY, letter, {
        fontSize: '20px',
        fontFamily: '"Courier New", monospace',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10);
      this.badgeLabels.push(lbl);
    });
  }

  // ==================================================================
  //  PLAYER (OrangeRobot)
  // ==================================================================

  _buildPlayer() {
    // Without body offset: body.bottom = sprite.y + displayHeight/2 = startY + 40
    // So startY = GROUND_Y - 40 ensures body.bottom = GROUND_Y (no floor embedding)
    const startY = GROUND_Y - ROBOT_FRAME * ROBOT_SCALE / 2; // 558 - 40 = 518
    this.robot = this.physics.add.sprite(100, startY, 'robot_idle');
    this.robot.setScale(ROBOT_SCALE);
    this.robot.setDepth(8);
    this.robot.setCollideWorldBounds(true);

    this.physics.world.setBounds(0, 0, W, H);

    this.robot.play('robot_idle');
    this._animKey = 'robot_idle';
  }

  // ==================================================================
  //  UI PANEL
  // ==================================================================

  _buildUI() {
    // Panel background
    const panel = this.add.graphics().setDepth(20);
    panel.fillStyle(0x0D1B3E, 0.94); panel.fillRect(0, 0, W, UI_H);
    panel.fillStyle(0x1E3A6E);       panel.fillRect(0, UI_H - 3, W, 3);

    // Session + question label
    this.sessionLabel = this.add.text(10, 6, '', {
      fontSize: '12px', fontFamily: '"Courier New", monospace', color: '#7F8C8D',
    }).setDepth(25);

    // Hearts (lives)
    this.heartTexts = [];
    for (let i = 0; i < MAX_LIVES; i++) {
      const h = this.add.text(W - 30 - i * 28, 5, '❤️', { fontSize: '18px' })
        .setDepth(25);
      this.heartTexts.push(h);
    }

    // Question text
    this.questionText = this.add.text(10, 22, '', {
      fontSize: '15px', fontFamily: '"Courier New", monospace', color: '#ECF0F1',
      wordWrap: { width: W - 20 }, lineSpacing: 3,
    }).setDepth(25);

    // Answer options
    this.optTexts = [];
    const colors = ['#5DADE2', '#F0B27A', '#EC7063'];
    for (let i = 0; i < 3; i++) {
      this.optTexts.push(
        this.add.text(10, 92 + i * 26, '', {
          fontSize: '13px', fontFamily: '"Courier New", monospace', color: colors[i],
          wordWrap: { width: W - 20 },
        }).setDepth(25)
      );
    }

    // Progress stars
    this.stars = [];
    for (let i = 0; i < 3; i++) {
      this.stars.push(
        this.add.text(10 + i * 24, UI_H - 28, '☆', { fontSize: '18px', color: '#2C3E50' })
          .setDepth(25)
      );
    }

    // Hint
    this.add.text(W / 2, UI_H - 12,
      '⬆ Salta y golpea la caja de tu respuesta desde ABAJO · Esquiva los robots enemigos', {
        fontSize: '10px', fontFamily: '"Courier New", monospace', color: '#566573',
      }).setOrigin(0.5, 0.5).setDepth(25);
  }

  // ==================================================================
  //  PHYSICS & INPUT
  // ==================================================================

  _setupPhysics() {
    this.physics.add.collider(this.robot, this.groundGroup);

    // Overlap: robot hits box from below while moving upward
    this.physics.add.overlap(
      this.robot, this.boxes,
      this._onBoxHit,
      (robot, box) =>
        !this.busy &&
        !box.getData('hit') &&
        !box.getData('wrongHit') &&
        robot.body.velocity.y < -60 &&
        robot.body.center.y > box.body.center.y,
      this
    );
  }

  _setupInput() {
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.wasd     = {
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ==================================================================
  //  ENEMY MANAGEMENT
  // ==================================================================

  _spawnEnemies(qIndex) {
    // Destroy previous colliders first, then enemies
    if (this.enemyColliders) {
      this.enemyColliders.forEach(c => c.destroy());
      this.enemyColliders = [];
    }
    if (this.enemyOverlap) { this.enemyOverlap.destroy(); this.enemyOverlap = null; }
    if (this.enemyGroup)   { this.enemyGroup.clear(true, true); }
    else                   { this.enemyGroup = this.physics.add.group(); }

    this.enemyColliders = [];

    // Same formula as robot: body.bottom = spawnY + displayHeight/2 = GROUND_Y
    const spawnY = GROUND_Y - ROBOT_FRAME * ROBOT_SCALE / 2;

    const wave = ENEMY_WAVES[Math.min(qIndex, ENEMY_WAVES.length - 1)];
    wave.forEach(({ x, dir, speed }) => {
      const enemy = this.physics.add.sprite(x, spawnY, 'enemy_run');
      enemy.setScale(ROBOT_SCALE);
      enemy.setDepth(7);
      // No body offset — body naturally sits on floor at this spawnY
      enemy.setFlipX(dir < 0);
      enemy.setData('dir', dir);
      enemy.setData('speed', speed);
      enemy.setVelocityX(dir * speed);
      enemy.play('enemy_run');
      this.enemyGroup.add(enemy);
      // Individual collider per enemy — more reliable than group collider in Phaser 4
      this.enemyColliders.push(this.physics.add.collider(enemy, this.groundGroup));
    });

    this.enemyOverlap = this.physics.add.overlap(
      this.robot, this.enemyGroup,
      this._onEnemyHit,
      () => !this.enemyInvincible && !this.gameOverShown && !this.winShown,
      this
    );
  }

  _updateEnemies() {
    if (!this.enemyGroup) return;
    this.enemyGroup.getChildren().forEach(enemy => {
      if (!enemy.active) return;
      const speed = enemy.getData('speed');
      let   dir   = enemy.getData('dir');

      if (enemy.x < 50)  { dir =  1; }
      if (enemy.x > 750) { dir = -1; }
      enemy.setData('dir', dir);
      enemy.setVelocityX(dir * speed);
      enemy.setFlipX(dir < 0);
    });
  }

  // ==================================================================
  //  MOVEMENT & ANIMATION
  // ==================================================================

  _handleMovement() {
    const onGround = this.robot.body.blocked.down;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump  = Phaser.Input.Keyboard.JustDown(this.cursors.up)  ||
                  Phaser.Input.Keyboard.JustDown(this.wasd.up)     ||
                  Phaser.Input.Keyboard.JustDown(this.spaceKey);

    if (left)  { this.robot.setVelocityX(-220); this.robot.setFlipX(true);  }
    else if (right) { this.robot.setVelocityX(220); this.robot.setFlipX(false); }
    else       { this.robot.setVelocityX(0); }

    if (jump && onGround) {
      this.robot.setVelocityY(-570);
      this._sound('jump');
    }

    // Animation state machine — only switch key when it changes to prevent flicker
    const isHurt = this.robot.anims.currentAnim?.key === 'robot_hurt' &&
                   this.robot.anims.isPlaying;
    if (!isHurt) {
      const newKey = !onGround ? 'robot_jump' :
                     (Math.abs(this.robot.body.velocity.x) > 10 ? 'robot_run' : 'robot_idle');
      if (this._animKey !== newKey) {
        this.robot.play(newKey);
        this._animKey = newKey;
      }
    }
  }

  // ==================================================================
  //  QUESTION MANAGEMENT
  // ==================================================================

  _loadQuestion(index) {
    this.qIndex = index;
    this.busy   = false;
    const q = this.session.questions[index];

    this.sessionLabel.setText(
      `${this.session.title}  ·  Pregunta ${index + 1} / ${this.session.questions.length}`
    );
    this.questionText.setText(q.text);
    LETTERS.forEach((l, i) => this.optTexts[i].setText(`${l})  ${q.options[l]}`));

    // Reset boxes
    this.boxes.forEach(box => {
      box.setData('hit', false).setData('wrongHit', false);
      box.clearTint().setAlpha(1).setScale(BOX_SCALE).refreshBody();
    });

    // Spawn enemies for this question
    this._spawnEnemies(index);
  }

  // ==================================================================
  //  BOX HIT CALLBACKS
  // ==================================================================

  _onBoxHit(robot, box) {
    const isCorrect = box.getData('letter') === this.session.questions[this.qIndex].correct;
    if (isCorrect) this._handleCorrect(box);
    else           this._handleWrong(box);
  }

  _handleCorrect(box) {
    this.busy = true;
    box.setData('hit', true);
    this.score++;

    // Light up star
    const s = this.stars[this.score - 1];
    if (s) s.setText('⭐').setStyle({ color: '#F1C40F' });

    box.setTint(0x00FF88);
    const oy = box.y;
    this.tweens.add({
      targets: box, y: oy - 18, duration: 90, yoyo: true,
      ease: 'Quad.easeOut', onComplete: () => { box.y = oy; },
    });

    this._spawnFlash(box.x, box.y, 0x00FF88);
    this._spawnPopup(box.x, box.y - 54, '¡CORRECTO! ⭐', '#00FF88');
    this._sound('correct');

    this.time.delayedCall(1500, () => {
      const next = this.qIndex + 1;
      if (next < this.session.questions.length) {
        this._loadQuestion(next);
      } else {
        this._showWinScreen();
      }
    });
  }

  _handleWrong(box) {
    if (box.getData('wrongHit')) return;
    box.setData('wrongHit', true);
    box.setTint(0xFF4444);

    const ox = box.x;
    this.tweens.add({
      targets: box, x: ox + 8, duration: 55, yoyo: true, repeat: 3, ease: 'Linear',
      onComplete: () => {
        box.x = ox; box.clearTint();
        this.time.delayedCall(700, () => box.setData('wrongHit', false));
      },
    });

    this._spawnPopup(box.x, box.y - 54, '❌  Intenta otra caja', '#FF6666');
    this._sound('wrong');
    this._loseLife();
  }

  // ==================================================================
  //  ENEMY HIT
  // ==================================================================

  _onEnemyHit(robot, enemy) {
    // Visual knockback on enemy
    const pushDir = robot.x < enemy.x ? 1 : -1;
    const savedSpeed = enemy.getData('speed');
    const savedDir   = enemy.getData('dir');
    enemy.setVelocityX(pushDir * 280);
    this.time.delayedCall(320, () => {
      if (enemy.active) enemy.setVelocityX(savedDir * savedSpeed);
    });

    this._sound('hurt');
    this._loseLife();

    // 2-second invincibility window against enemies
    this.enemyInvincible = true;
    this.time.delayedCall(2000, () => { this.enemyInvincible = false; });

    // Flash robot
    this.robot.play('robot_hurt', true);
    this._animKey = 'robot_hurt';
    this.tweens.add({
      targets: this.robot, alpha: 0.2,
      duration: 100, yoyo: true, repeat: 9,
      onComplete: () => this.robot.setAlpha(1),
    });
  }

  // ==================================================================
  //  LIVES SYSTEM
  // ==================================================================

  _loseLife() {
    if (this.gameOverShown) return;
    this.lives = Math.max(0, this.lives - 1);
    this._updateHeartsDisplay();

    if (this.lives <= 0) {
      this.time.delayedCall(500, () => this._showGameOverScreen());
    }
  }

  _updateHeartsDisplay() {
    this.heartTexts.forEach((h, i) => {
      h.setText(i < this.lives ? '❤️' : '🖤');
    });
  }

  // ==================================================================
  //  VISUAL HELPERS
  // ==================================================================

  _spawnFlash(x, y, color) {
    const f = this.add.graphics().setDepth(40);
    f.fillStyle(color, 0.7); f.fillCircle(x, y, 28);
    this.tweens.add({
      targets: f, scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 450, ease: 'Quad.easeOut', onComplete: () => f.destroy(),
    });
  }

  _spawnPopup(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontSize: '17px', fontFamily: '"Courier New", monospace',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: t, y: t.y - 55, alpha: 0, duration: 1200,
      ease: 'Quad.easeOut', onComplete: () => t.destroy(),
    });
  }

  // ==================================================================
  //  WIN SCREEN
  // ==================================================================

  _showWinScreen() {
    this.winShown = true;
    this.robot.setVelocityX(0);
    if (this.enemyGroup) {
      this.enemyGroup.getChildren().forEach(e => { if (e.active) e.setVelocityX(0); });
    }
    this._sound('win');

    const overlay = this.add.graphics().setDepth(60).setAlpha(0);
    overlay.fillStyle(0x000000, 0.72); overlay.fillRect(0, 0, W, H);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 450 });

    const panel = this.add.graphics().setDepth(65).setAlpha(0);
    panel.lineStyle(4, 0x27AE60);
    panel.strokeRoundedRect(150, 145, 500, 310, 18);
    panel.fillStyle(0x0D1B3E, 0.97);
    panel.fillRoundedRect(152, 147, 496, 306, 16);
    this.tweens.add({ targets: panel, alpha: 1, duration: 500, delay: 150 });

    const trophy = this.add.text(W / 2, 205, '🏆', { fontSize: '64px' })
      .setOrigin(0.5).setDepth(70).setAlpha(0).setScale(0.1);
    this.tweens.add({ targets: trophy, alpha: 1, scaleX: 1, scaleY: 1, duration: 650, delay: 350, ease: 'Back.easeOut' });

    this.add.text(W / 2, 300, '¡SESIÓN COMPLETADA!', {
      fontSize: '26px', fontFamily: '"Courier New", monospace',
      color: '#27AE60', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(70).setAlpha(0);

    this.add.text(W / 2, 348, '⭐  ⭐  ⭐', { fontSize: '38px' })
      .setOrigin(0.5).setDepth(70).setAlpha(0);

    this.add.text(W / 2, 398, `"${this.session.title}"`, {
      fontSize: '17px', fontFamily: '"Courier New", monospace', color: '#85929E',
    }).setOrigin(0.5).setDepth(70).setAlpha(0);

    // Fade in text items
    this.children.list
      .filter(c => c.depth === 70 && c.alpha === 0)
      .forEach((c, i) => {
        this.tweens.add({ targets: c, alpha: 1, duration: 400, delay: 700 + i * 200 });
      });

    this._addOverlayButton(W / 2, 442, '[  JUGAR DE NUEVO  ]', '#1ABC9C', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });

    this._addOverlayButton(W / 2, 478, '[  MENÚ PRINCIPAL  ]', '#5DADE2', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    });
  }

  // ==================================================================
  //  GAME OVER SCREEN
  // ==================================================================

  _showGameOverScreen() {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    this.robot.setVelocityX(0);
    this.robot.play('robot_hurt', true);
    this._sound('gameover');

    const overlay = this.add.graphics().setDepth(60).setAlpha(0);
    overlay.fillStyle(0x000000, 0.78); overlay.fillRect(0, 0, W, H);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

    const panel = this.add.graphics().setDepth(65).setAlpha(0);
    panel.lineStyle(4, 0xE74C3C);
    panel.strokeRoundedRect(175, 155, 450, 285, 18);
    panel.fillStyle(0x0D1B3E, 0.97);
    panel.fillRoundedRect(177, 157, 446, 281, 16);
    this.tweens.add({ targets: panel, alpha: 1, duration: 500, delay: 100 });

    const skull = this.add.text(W / 2, 210, '💀', { fontSize: '60px' })
      .setOrigin(0.5).setDepth(70).setAlpha(0).setScale(0.1);
    this.tweens.add({ targets: skull, alpha: 1, scaleX: 1, scaleY: 1, duration: 600, delay: 300, ease: 'Back.easeOut' });

    const go = this.add.text(W / 2, 295, 'GAME OVER', {
      fontSize: '36px', fontFamily: '"Courier New", monospace',
      color: '#E74C3C', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: go, alpha: 1, duration: 400, delay: 600 });

    const sub = this.add.text(W / 2, 345,
      `Respondiste ${this.score} de ${this.session.questions.length} preguntas`, {
        fontSize: '15px', fontFamily: '"Courier New", monospace', color: '#95A5A6',
      }).setOrigin(0.5).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 800 });

    this._addOverlayButton(W / 2, 390, '[  REINTENTAR  ]', '#E74C3C', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });

    this._addOverlayButton(W / 2, 426, '[  MENÚ PRINCIPAL  ]', '#5DADE2', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    });
  }

  // ---- Reusable interactive text button ----
  _addOverlayButton(x, y, label, color, onClick) {
    const btn = this.add.text(x, y, label, {
      fontSize: '19px', fontFamily: '"Courier New", monospace',
      color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(70).setAlpha(0).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: btn, alpha: 1, duration: 400, delay: 1000 });

    btn.on('pointerover', () => btn.setStyle({ color: '#FFFFFF' }));
    btn.on('pointerout',  () => btn.setStyle({ color }));
    btn.on('pointerdown', onClick);

    this.time.delayedCall(1500, () => {
      if (btn.active) {
        this.tweens.add({
          targets: btn, scaleX: 1.05, scaleY: 1.05,
          yoyo: true, repeat: -1, duration: 750, ease: 'Sine.easeInOut',
        });
      }
    });
    return btn;
  }

  // ==================================================================
  //  SOUND SYNTHESIS (Web Audio API – no audio files needed)
  // ==================================================================

  _sound(type) {
    try {
      const ctx = this.sound?.context;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume(); return; }
      const t = ctx.currentTime;

      // Helper: single note with linear release
      const note = (freq, start, dur, vol = 0.22, wave = 'square') => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = wave;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t + start);
        g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + start);
        o.stop(t + start + dur + 0.05);
      };

      switch (type) {
        case 'jump':
          { // Rising chirp
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(200, t);
            o.frequency.exponentialRampToValueAtTime(560, t + 0.12);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.18);
            break;
          }

        case 'correct':
          // 3-note ascending
          note(523, 0,    0.14);
          note(659, 0.13, 0.14);
          note(784, 0.26, 0.26);
          break;

        case 'wrong':
          { // Buzzer
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(220, t);
            o.frequency.exponentialRampToValueAtTime(80, t + 0.32);
            g.gain.setValueAtTime(0.32, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.36);
            break;
          }

        case 'hurt':
          { // Thud
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = 140;
            g.gain.setValueAtTime(0.28, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.25);
            break;
          }

        case 'win':
          // 4-note fanfare
          note(523,  0,    0.18);
          note(659,  0.16, 0.18);
          note(784,  0.32, 0.18);
          note(1047, 0.48, 0.40);
          break;

        case 'gameover':
          { // Descending sad tone
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = 320;
            o.frequency.exponentialRampToValueAtTime(70, t + 0.85);
            g.gain.setValueAtTime(0.28, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.9);
            break;
          }
      }
    } catch (_) { /* audio unavailable */ }
  }
}