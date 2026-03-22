import { CONFIG } from '../config.js';

export class DayNight {
  constructor(scene) {
    this.scene      = scene;
    this.elapsed    = 0;
    this.cycleSecs  = CONFIG.DAY_CYCLE_SECONDS;
    this.weather    = 'CLEAR';
    this.weatherTimer = 0;

    const { width: W, height: H } = scene.cameras.main;

    // Main overlay — darkens at night
    this.overlay = scene.add.rectangle(W/2, H/2, W*4, H*4, 0x000033, 0)
      .setDepth(80).setScrollFactor(0).setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Rain particles (pool of rects)
    this.rainDrops = [];
    for (let i = 0; i < 120; i++) {
      const d = scene.add.rectangle(
        Math.random() * W, Math.random() * H,
        1, Phaser.Math.Between(8, 18), 0xaaccff, 0
      ).setDepth(82).setScrollFactor(0);
      this.rainDrops.push(d);
    }

    // Fog overlay
    this.fog = scene.add.rectangle(W/2, H/2, W*4, H*4, 0xccddee, 0)
      .setDepth(81).setScrollFactor(0);

    // Clock text
    this.clockText = scene.add.text(W - 10, 10, '', {
      fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa',
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    // Pick initial weather
    this._pickWeather();
  }

  update(delta) {
    this.elapsed += delta / 1000;
    if (this.elapsed > this.cycleSecs) this.elapsed -= this.cycleSecs;

    const t      = this.elapsed / this.cycleSecs; // 0..1
    const angle  = t * Math.PI * 2;
    const sunY   = Math.sin(angle);              // -1 = midnight, +1 = noon

    // Night alpha: dark when sunY < 0
    const nightAlpha = Phaser.Math.Clamp((-sunY + 0.2) * 0.7, 0, 0.72);
    this.overlay.setAlpha(nightAlpha);

    // Clock
    const hour  = Math.floor(t * 24);
    const min   = Math.floor((t * 24 - hour) * 60);
    const ampm  = hour < 12 ? 'AM' : 'PM';
    const h12   = ((hour % 12) || 12);
    this.clockText.setText(`${h12}:${String(min).padStart(2,'0')} ${ampm}`);

    // Weather timer
    this.weatherTimer -= delta / 1000;
    if (this.weatherTimer <= 0) this._pickWeather();

    // Rain animation
    if (this.weather === 'RAIN' || this.weather === 'STORM') {
      const { width: W, height: H } = this.scene.cameras.main;
      const spd = this.weather === 'STORM' ? 18 : 10;
      this.rainDrops.forEach(d => {
        d.y += spd;
        d.x -= 1.5;
        if (d.y > H + 20) { d.y = -10; d.x = Math.random() * W; }
        d.setAlpha(this.weather === 'STORM' ? 0.55 : 0.28);
      });
    }
  }

  _pickWeather() {
    const prev = this.weather;
    this.weather = CONFIG.WEATHER_TYPES[Math.floor(Math.random() * CONFIG.WEATHER_TYPES.length)];
    this.weatherTimer = Phaser.Math.Between(45, 120);

    // Fade rain in/out
    const rainAlpha = (this.weather === 'RAIN' || this.weather === 'STORM') ? 1 : 0;
    this.rainDrops.forEach(d => d.setAlpha(rainAlpha > 0 ? 0.25 : 0));

    // Fog
    const fogAlpha = this.weather === 'FOG' ? 0.22 : 0;
    this.fog.setAlpha(fogAlpha);

    if (this.weather !== prev) this.scene.events.emit('weatherChanged', this.weather);
  }

  isNight() {
    const t = this.elapsed / this.cycleSecs;
    const hour = t * 24;
    return hour < 6 || hour > 20;
  }

  destroy() {
    this.overlay?.destroy();
    this.fog?.destroy();
    this.clockText?.destroy();
    this.rainDrops?.forEach(d => d.destroy());
  }
}
