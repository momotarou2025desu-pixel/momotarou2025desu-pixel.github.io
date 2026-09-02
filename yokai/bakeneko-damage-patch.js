(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceOrThrow(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Bakeneko boss hit patch target not found: ${label}`);
    }
    return source.replace(before, after);
  }

  body.appendChild = function(node) {
    const isGameScript =
      node instanceof HTMLScriptElement &&
      typeof node.textContent === "string" &&
      node.textContent.includes('const canvas = document.getElementById("game");');

    if (!isGameScript) {
      return originalAppendChild.call(this, node);
    }

    const originalSource = node.textContent;

    try {
      let source = originalSource;

      source = replaceOrThrow(
        source,
        `  function activeBossSprite() {
    if (
      currentStage === 2 &&
      bakenekoBossSprite.complete &&
      bakenekoBossSprite.naturalWidth > 0
    ) {
      return bakenekoBossSprite;
    }
    return bossSprite;
  }`,
        `  const BAKENEKO_DAMAGE_SIZE = 216;
  const BAKENEKO_ALPHA_HIT = 28;
  const BAKENEKO_HIT_REACTION_MS = 170;
  const BAKENEKO_CRY_DISPLAY_MS = 720;
  const BAKENEKO_HIT_CRIES = [
    "シャーッ！",
    "シャギャッ！",
    "シャニャッ！",
    "フギャッ！",
    "ニャギャッ！",
    "ギャニャッ！",
    "フシャーッ！",
    "シャウッ！",
    "ギニャァッ！",
    "シャギャァッ！"
  ];

  const bakenekoBossDamageCanvas = document.createElement("canvas");
  bakenekoBossDamageCanvas.width = BAKENEKO_DAMAGE_SIZE;
  bakenekoBossDamageCanvas.height = BAKENEKO_DAMAGE_SIZE;
  const bakenekoBossDamageCtx = bakenekoBossDamageCanvas.getContext("2d", { willReadFrequently: true });

  let bakenekoBossDamageReady = false;
  let bakenekoBossDamageHits = [];
  let bakenekoHitReactionStart = -1000;
  let bakenekoHitReactionPush = 0;
  let bakenekoLastCryIndex = -1;

  function paintBakenekoDamage(hit) {
    if (!bakenekoBossDamageReady) return;

    const dc = bakenekoBossDamageCtx;
    const seed = hit.seed;
    dc.save();
    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "#000";

    const mainRadius = 15.6 + (seed % 3) * 2.0;
    const pieces = 6;

    for (let i = 0; i < pieces; i++) {
      const angle = seed * 1.37 + i * (Math.PI * 2 / (pieces - 1));
      const distance = i === 0 ? 0 : 7.8 + ((seed + i * 3) % 5) * 0.9;
      const radius = i === 0
        ? mainRadius
        : 7.4 + ((seed * 5 + i * 7) % 4) * 1.3;
      const x = hit.x + Math.cos(angle) * distance;
      const y = hit.y + Math.sin(angle) * distance;

      dc.beginPath();
      dc.arc(x, y, radius, 0, Math.PI * 2);
      dc.fill();
    }

    dc.restore();
  }

  function syncBakenekoDamageImage() {
    if (
      !bakenekoBossSprite.complete ||
      bakenekoBossSprite.naturalWidth <= 0
    ) {
      bakenekoBossDamageReady = false;
      return false;
    }

    const dc = bakenekoBossDamageCtx;
    dc.save();
    dc.globalCompositeOperation = "source-over";
    dc.clearRect(0, 0, BAKENEKO_DAMAGE_SIZE, BAKENEKO_DAMAGE_SIZE);
    dc.imageSmoothingEnabled = false;
    dc.drawImage(
      bakenekoBossSprite,
      0,
      0,
      BAKENEKO_DAMAGE_SIZE,
      BAKENEKO_DAMAGE_SIZE
    );
    dc.restore();

    bakenekoBossDamageReady = true;
    for (const hit of bakenekoBossDamageHits) {
      paintBakenekoDamage(hit);
    }
    return true;
  }

  function resetBakenekoBossDamage() {
    bakenekoBossDamageHits = [];
    bakenekoBossDamageReady = false;
    bakenekoHitReactionStart = -1000;
    bakenekoHitReactionPush = 0;
    bakenekoLastCryIndex = -1;
    syncBakenekoDamageImage();
  }

  function bakenekoAlphaAt(x, y) {
    if (!bakenekoBossDamageReady && !syncBakenekoDamageImage()) return 0;
    if (x < 0 || y < 0 || x >= BAKENEKO_DAMAGE_SIZE || y >= BAKENEKO_DAMAGE_SIZE) return 0;
    return bakenekoBossDamageCtx.getImageData(x, y, 1, 1).data[3];
  }

  function findBakenekoVisiblePixel(localX, fromY) {
    if (!bakenekoBossDamageReady && !syncBakenekoDamageImage()) return null;

    const cx = Math.max(0, Math.min(215, Math.round(localX)));
    const sy = Math.max(0, Math.min(215, Math.round(fromY)));
    const image = bakenekoBossDamageCtx.getImageData(
      0,
      0,
      BAKENEKO_DAMAGE_SIZE,
      BAKENEKO_DAMAGE_SIZE
    ).data;

    for (let y = sy; y >= 0; y--) {
      for (let dist = 0; dist <= 7; dist++) {
        const xs = dist === 0 ? [cx] : [cx - dist, cx + dist];
        for (const x of xs) {
          if (x < 0 || x > 215) continue;
          const alpha = image[(y * BAKENEKO_DAMAGE_SIZE + x) * 4 + 3];
          if (alpha >= BAKENEKO_ALPHA_HIT) return { x, y };
        }
      }
    }

    return null;
  }

  function bakenekoImpactAtBullet(timestamp, bullet) {
    if (currentStage !== 2 || !boss || !bullet) return null;
    if (!bakenekoBossDamageReady && !syncBakenekoDamageImage()) return null;

    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const visualTop = boss.y - 2 + bob;
    const bulletCenterX = bullet.x + bullet.w / 2;
    const bulletCenterY = bullet.y + bullet.h / 2;
    const localX = (bulletCenterX - boss.x) * (BAKENEKO_DAMAGE_SIZE / boss.w);
    const localY = (bulletCenterY - visualTop) * (BAKENEKO_DAMAGE_SIZE / boss.h);

    if (
      localX < 0 || localX >= BAKENEKO_DAMAGE_SIZE ||
      localY < 0 || localY >= BAKENEKO_DAMAGE_SIZE
    ) {
      return null;
    }

    if (bakenekoAlphaAt(Math.round(localX), Math.round(localY)) < BAKENEKO_ALPHA_HIT) {
      return null;
    }

    return findBakenekoVisiblePixel(localX, localY);
  }

  function makeBakenekoNoiseBuffer(audio, duration) {
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (0.65 + Math.random() * 0.35);
    }
    return buffer;
  }

  function bakenekoTone(audio, start, duration, options, nodes) {
    const type = options.type || "triangle";
    const from = options.from || 440;
    const peak = options.peak === undefined ? null : options.peak;
    const to = options.to || 240;
    const gain = options.gain || 0.12;
    const attack = options.attack || 0.008;
    const peakAt = options.peakAt || 0.35;
    const vibratoRate = options.vibratoRate || 0;
    const vibratoDepth = options.vibratoDepth || 0;
    const end = start + duration;

    const voiceGain = audio.createGain();
    voiceGain.gain.setValueAtTime(0.0001, start);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + attack);
    voiceGain.gain.setValueAtTime(Math.max(0.001, gain), Math.max(start + attack, end - 0.035));
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, end);
    voiceGain.connect(audio.destination);

    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, from), start);
    if (peak !== null) {
      osc.frequency.linearRampToValueAtTime(Math.max(40, peak), start + duration * peakAt);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), end);
    } else {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), end);
    }

    if (vibratoRate > 0 && vibratoDepth > 0) {
      const lfo = audio.createOscillator();
      const lfoGain = audio.createGain();
      lfo.frequency.setValueAtTime(vibratoRate, start);
      lfoGain.gain.setValueAtTime(vibratoDepth, start);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(start);
      lfo.stop(end + 0.02);
      nodes.push(lfo);
    }

    osc.connect(voiceGain);
    osc.start(start);
    osc.stop(end + 0.02);
    nodes.push(osc);
    return end + 0.02;
  }

  function bakenekoNoise(audio, start, duration, options, nodes) {
    const filterType = options.filterType || "highpass";
    const frequency = options.frequency || 1800;
    const gain = options.gain || 0.13;
    const attack = options.attack || 0.004;
    const q = options.q || 0.7;
    const end = start + duration;

    const noise = audio.createBufferSource();
    noise.buffer = makeBakenekoNoiseBuffer(audio, duration);

    const filter = audio.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);

    const noiseGain = audio.createGain();
    noiseGain.gain.setValueAtTime(0.0001, start);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + attack);
    noiseGain.gain.setValueAtTime(Math.max(0.001, gain), Math.max(start + attack, end - 0.035));
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, end);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audio.destination);
    noise.start(start);
    noise.stop(end + 0.02);
    nodes.push(noise);
    return end + 0.02;
  }

  function playBakenekoCry(index) {
    const audio = ensureAudio();
    if (!audio || audio.state !== "running") return;

    const nodes = [];
    const now = audio.currentTime + 0.004;
    const jitter = 0.96 + Math.random() * 0.08;
    let endTime = now;
    const tone = (start, duration, options) => {
      endTime = Math.max(endTime, bakenekoTone(audio, start, duration, options, nodes));
    };
    const noise = (start, duration, options) => {
      endTime = Math.max(endTime, bakenekoNoise(audio, start, duration, options, nodes));
    };

    switch (index) {
      case 0:
        noise(now, 0.34, { filterType: "highpass", frequency: 2400, gain: 0.19, q: 0.5 });
        noise(now + 0.015, 0.27, { filterType: "bandpass", frequency: 4300, gain: 0.055, q: 1.6 });
        break;
      case 1:
        noise(now, 0.12, { filterType: "highpass", frequency: 2200, gain: 0.15 });
        tone(now + 0.072, 0.16, { type: "sawtooth", from: 330 * jitter, peak: 790 * jitter, to: 190 * jitter, gain: 0.14, peakAt: 0.28 });
        break;
      case 2:
        noise(now, 0.10, { filterType: "highpass", frequency: 2700, gain: 0.13 });
        tone(now + 0.055, 0.18, { type: "triangle", from: 610 * jitter, peak: 1080 * jitter, to: 470 * jitter, gain: 0.15, peakAt: 0.34 });
        break;
      case 3:
        noise(now, 0.055, { filterType: "lowpass", frequency: 900, gain: 0.07 });
        tone(now + 0.025, 0.15, { type: "sawtooth", from: 230 * jitter, peak: 920 * jitter, to: 250 * jitter, gain: 0.17, peakAt: 0.52 });
        break;
      case 4:
        tone(now, 0.105, { type: "triangle", from: 520 * jitter, peak: 760 * jitter, to: 470 * jitter, gain: 0.13, peakAt: 0.42 });
        tone(now + 0.092, 0.145, { type: "sawtooth", from: 350 * jitter, peak: 930 * jitter, to: 220 * jitter, gain: 0.16, peakAt: 0.28 });
        break;
      case 5:
        tone(now, 0.115, { type: "square", from: 930 * jitter, peak: 1080 * jitter, to: 370 * jitter, gain: 0.10, peakAt: 0.18 });
        tone(now + 0.09, 0.15, { type: "triangle", from: 430 * jitter, peak: 690 * jitter, to: 390 * jitter, gain: 0.14, peakAt: 0.45 });
        break;
      case 6:
        noise(now, 0.07, { filterType: "lowpass", frequency: 760, gain: 0.09 });
        tone(now, 0.07, { type: "sine", from: 190 * jitter, to: 125 * jitter, gain: 0.055 });
        noise(now + 0.05, 0.34, { filterType: "highpass", frequency: 2100, gain: 0.18, q: 0.55 });
        break;
      case 7:
        noise(now, 0.14, { filterType: "highpass", frequency: 2350, gain: 0.15 });
        tone(now + 0.09, 0.14, { type: "triangle", from: 510 * jitter, peak: 570 * jitter, to: 145 * jitter, gain: 0.14, peakAt: 0.18 });
        break;
      case 8:
        tone(now, 0.36, { type: "triangle", from: 650 * jitter, peak: 930 * jitter, to: 350 * jitter, gain: 0.16, peakAt: 0.26, vibratoRate: 17, vibratoDepth: 52 });
        noise(now + 0.015, 0.13, { filterType: "bandpass", frequency: 1500, gain: 0.045, q: 1.2 });
        break;
      case 9:
      default:
        noise(now, 0.14, { filterType: "highpass", frequency: 2500, gain: 0.17 });
        tone(now + 0.075, 0.37, { type: "sawtooth", from: 500 * jitter, peak: 1040 * jitter, to: 165 * jitter, gain: 0.15, peakAt: 0.30, vibratoRate: 11, vibratoDepth: 28 });
        break;
    }

    if (nodes.length) {
      activeScreamGroups.push({ nodes, endTime });
    }
  }

  function chooseBakenekoCryIndex() {
    let index = Math.floor(Math.random() * BAKENEKO_HIT_CRIES.length);
    if (BAKENEKO_HIT_CRIES.length > 1 && index === bakenekoLastCryIndex) {
      index = (index + 1 + Math.floor(Math.random() * (BAKENEKO_HIT_CRIES.length - 1))) % BAKENEKO_HIT_CRIES.length;
    }
    bakenekoLastCryIndex = index;
    return index;
  }

  function triggerBakenekoHitCry(timestamp, hit) {
    const index = chooseBakenekoCryIndex();
    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const visualTop = boss.y - 2 + bob;
    const textX = Math.max(78, Math.min(W - 78, boss.x + hit.x * (boss.w / BAKENEKO_DAMAGE_SIZE)));
    const textY = Math.max(92, visualTop + hit.y * (boss.h / BAKENEKO_DAMAGE_SIZE) - 18);

    floatingTexts.push({
      text: BAKENEKO_HIT_CRIES[index],
      x: textX,
      y: textY,
      born: timestamp,
      duration: BAKENEKO_CRY_DISPLAY_MS
    });
    if (floatingTexts.length > 8) floatingTexts.shift();
    playBakenekoCry(index);
  }

  function applyBakenekoHit(timestamp, hit) {
    const damageHit = {
      x: hit.x,
      y: hit.y,
      seed: bakenekoBossDamageHits.length + 1
    };
    bakenekoBossDamageHits.push(damageHit);
    paintBakenekoDamage(damageHit);

    bakenekoHitReactionStart = timestamp;
    bakenekoHitReactionPush = hit.x < 90 ? 1 : (hit.x > 126 ? -1 : 0);
    triggerBakenekoHitCry(timestamp, hit);
  }

  bakenekoBossSprite.addEventListener("load", () => {
    if (currentStage === 2 && flowState === FLOW.BOSS) {
      syncBakenekoDamageImage();
    }
  });

  function activeBossSprite() {
    if (currentStage === 2) {
      if (flowState === FLOW.BOSS && bakenekoBossDamageReady) {
        return bakenekoBossDamageCanvas;
      }
      if (
        bakenekoBossSprite.complete &&
        bakenekoBossSprite.naturalWidth > 0
      ) {
        return bakenekoBossSprite;
      }
    }
    return bossSprite;
  }`,
        "boss hit state"
      );

      source = replaceOrThrow(
        source,
        `  function createBoss(timestamp) {
    boss = {`,
        `  function createBoss(timestamp) {
    if (currentStage === 2) {
      resetBakenekoBossDamage();
    }

    boss = {`,
        "boss reset"
      );

      source = replaceOrThrow(
        source,
        `        for (const b of bullets) {
          if (b.y > -50 && rectHit(b, boss)) {
            hitBoss(timestamp);
            b.y = -100;
            if (!boss.alive) break;
          }
        }`,
        `        for (const b of bullets) {
          if (b.y > -50 && rectHit(b, boss)) {
            if (currentStage === 2) {
              const impact = bakenekoImpactAtBullet(timestamp, b);
              if (!impact) continue;
              hitBoss(timestamp, impact);
            } else {
              hitBoss(timestamp, null);
            }
            b.y = -100;
            if (!boss.alive) break;
          }
        }`,
        "boss bullet collision"
      );

      source = replaceOrThrow(
        source,
        `  function hitBoss(timestamp) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    boss.hp -= 1;`,
        `  function hitBoss(timestamp, bakenekoImpact = null) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    if (currentStage === 2) {
      if (!bakenekoImpact) return;
      applyBakenekoHit(timestamp, bakenekoImpact);
    }

    boss.hp -= 1;`,
        "boss hit"
      );

      source = replaceOrThrow(
        source,
        `      const scream = screamSounds[3]; // 長めの「ギャアァ……！」
      playScream(scream);
      floatingTexts.push({
        text: scream.text,
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h / 2,
        born: timestamp,
        duration: 1200
      });`,
        `      if (currentStage !== 2) {
        const scream = screamSounds[3]; // 長めの「ギャアァ……！」
        playScream(scream);
        floatingTexts.push({
          text: scream.text,
          x: boss.x + boss.w / 2,
          y: boss.y + boss.h / 2,
          born: timestamp,
          duration: 1200
        });
      }`,
        "stage2 death cry"
      );

      source = replaceOrThrow(
        source,
        `  function drawBoss(timestamp) {
    if (!boss || !boss.alive) return;

    const cx = boss.x + boss.w / 2;
    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const cy = boss.y + boss.h / 2 - 2 + bob;
    const flash = timestamp < boss.hitFlashUntil;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (flash) {
      ctx.filter = "brightness(1.22) saturate(1.12)";
    }

    // 透過化したボス画像を中央基準で描画
    ctx.drawImage(
      activeBossSprite(),
      Math.round(cx - boss.w / 2),
      Math.round(cy - boss.h / 2),
      boss.w,
      boss.h
    );

    // 被弾時の見やすさを少し上げるため、うっすら白フラッシュを重ねる
    if (flash) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        Math.round(cx - boss.w / 2),
        Math.round(cy - boss.h / 2),
        boss.w,
        boss.h
      );
    }

    ctx.restore();
  }`,
        `  function drawBoss(timestamp) {
    if (!boss || !boss.alive) return;

    const cx = boss.x + boss.w / 2;
    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const cy = boss.y + boss.h / 2 - 2 + bob;
    const flash = timestamp < boss.hitFlashUntil;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (flash) {
      ctx.filter = "brightness(1.22) saturate(1.12)";
    }

    if (currentStage === 2) {
      const elapsed = timestamp - bakenekoHitReactionStart;
      const activeReaction = elapsed >= 0 && elapsed < BAKENEKO_HIT_REACTION_MS;
      const t = activeReaction ? elapsed / BAKENEKO_HIT_REACTION_MS : 1;
      const kick = activeReaction ? Math.sin(Math.PI * t) : 0;
      let recoilX = 0;
      let recoilY = 0;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;

      if (bakenekoHitReactionPush !== 0) {
        recoilX = bakenekoHitReactionPush * 16 * kick;
        recoilY = -4 * kick;
        rotation = bakenekoHitReactionPush * 0.105 * kick;
      } else if (activeReaction) {
        recoilY = -11 * kick;
        scaleX = 1 + 0.10 * kick;
        scaleY = 1 - 0.10 * kick;
      }

      ctx.translate(cx + recoilX, cy + recoilY);
      ctx.rotate(rotation);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(activeBossSprite(), -boss.w / 2, -boss.h / 2, boss.w, boss.h);

      if (flash) {
        const flashAlpha = 0.42 * Math.max(0, Math.min(1, (boss.hitFlashUntil - timestamp) / 90));
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = flashAlpha;
        ctx.drawImage(activeBossSprite(), -boss.w / 2, -boss.h / 2, boss.w, boss.h);
      }
    } else {
      ctx.drawImage(
        activeBossSprite(),
        Math.round(cx - boss.w / 2),
        Math.round(cy - boss.h / 2),
        boss.w,
        boss.h
      );

      if (flash) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          Math.round(cx - boss.w / 2),
          Math.round(cy - boss.h / 2),
          boss.w,
          boss.h
        );
      }
    }

    ctx.restore();
  }`,
        "boss draw reaction"
      );

      node.textContent = source;
    } catch (error) {
      console.error(error);
      node.textContent = originalSource;
      const status = document.getElementById("status");
      if (status) status.textContent = "LOAD ERROR";
    } finally {
      body.appendChild = originalAppendChild;
    }

    return originalAppendChild.call(this, node);
  };
})();
