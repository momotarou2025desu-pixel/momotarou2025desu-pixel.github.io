(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceOrThrow(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Kaganbo boss hit patch target not found: ${label}`);
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
        `  const KAGANBO_DAMAGE_SIZE = 216;
  const KAGANBO_ALPHA_HIT = 28;
  const KAGANBO_HIT_REACTION_MS = 170;
  const KAGANBO_SFX_DISPLAY_MS = 760;
  const KAGANBO_HIT_SFX = [
    "ボッ！",
    "バシュッ！",
    "ゴォッ！",
    "ジュワッ！",
    "バチッ！",
    "ギョロッ！",
    "グニュッ！",
    "ギュルッ！",
    "バチュッ！",
    "ゴォッ！ ギョロッ！"
  ];

  const kaganboBossDamageCanvas = document.createElement("canvas");
  kaganboBossDamageCanvas.width = KAGANBO_DAMAGE_SIZE;
  kaganboBossDamageCanvas.height = KAGANBO_DAMAGE_SIZE;
  const kaganboBossDamageCtx = kaganboBossDamageCanvas.getContext("2d", { willReadFrequently: true });

  let kaganboBossDamageReady = false;
  let kaganboBossDamageHits = [];
  let kaganboHitReactionStart = -1000;
  let kaganboHitReactionPush = 0;
  let kaganboLastSfxIndex = -1;

  function paintKaganboDamage(hit) {
    if (!kaganboBossDamageReady) return;

    const dc = kaganboBossDamageCtx;
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

  function syncKaganboDamageImage() {
    if (!bossSprite.complete || bossSprite.naturalWidth <= 0) {
      kaganboBossDamageReady = false;
      return false;
    }

    const dc = kaganboBossDamageCtx;
    dc.save();
    dc.globalCompositeOperation = "source-over";
    dc.clearRect(0, 0, KAGANBO_DAMAGE_SIZE, KAGANBO_DAMAGE_SIZE);
    dc.imageSmoothingEnabled = false;
    dc.drawImage(bossSprite, 0, 0, KAGANBO_DAMAGE_SIZE, KAGANBO_DAMAGE_SIZE);
    dc.restore();

    kaganboBossDamageReady = true;
    for (const hit of kaganboBossDamageHits) {
      paintKaganboDamage(hit);
    }
    return true;
  }

  function resetKaganboBossDamage() {
    kaganboBossDamageHits = [];
    kaganboBossDamageReady = false;
    kaganboHitReactionStart = -1000;
    kaganboHitReactionPush = 0;
    kaganboLastSfxIndex = -1;
    syncKaganboDamageImage();
  }

  function kaganboAlphaAt(x, y) {
    if (!kaganboBossDamageReady && !syncKaganboDamageImage()) return 0;
    if (x < 0 || y < 0 || x >= KAGANBO_DAMAGE_SIZE || y >= KAGANBO_DAMAGE_SIZE) return 0;
    return kaganboBossDamageCtx.getImageData(x, y, 1, 1).data[3];
  }

  function findKaganboVisiblePixel(localX, fromY) {
    if (!kaganboBossDamageReady && !syncKaganboDamageImage()) return null;

    const cx = Math.max(0, Math.min(215, Math.round(localX)));
    const sy = Math.max(0, Math.min(215, Math.round(fromY)));
    const image = kaganboBossDamageCtx.getImageData(
      0,
      0,
      KAGANBO_DAMAGE_SIZE,
      KAGANBO_DAMAGE_SIZE
    ).data;

    for (let y = sy; y >= 0; y--) {
      for (let dist = 0; dist <= 7; dist++) {
        const xs = dist === 0 ? [cx] : [cx - dist, cx + dist];
        for (const x of xs) {
          if (x < 0 || x > 215) continue;
          const alpha = image[(y * KAGANBO_DAMAGE_SIZE + x) * 4 + 3];
          if (alpha >= KAGANBO_ALPHA_HIT) return { x, y };
        }
      }
    }

    return null;
  }

  function kaganboImpactAtBullet(timestamp, bullet) {
    if (currentStage !== 1 || !boss || !bullet) return null;
    if (!kaganboBossDamageReady && !syncKaganboDamageImage()) return null;

    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const visualTop = boss.y - 2 + bob;
    const bulletCenterX = bullet.x + bullet.w / 2;
    const bulletCenterY = bullet.y + bullet.h / 2;
    const localX = (bulletCenterX - boss.x) * (KAGANBO_DAMAGE_SIZE / boss.w);
    const localY = (bulletCenterY - visualTop) * (KAGANBO_DAMAGE_SIZE / boss.h);

    if (
      localX < 0 || localX >= KAGANBO_DAMAGE_SIZE ||
      localY < 0 || localY >= KAGANBO_DAMAGE_SIZE
    ) {
      return null;
    }

    if (kaganboAlphaAt(Math.round(localX), Math.round(localY)) < KAGANBO_ALPHA_HIT) {
      return null;
    }

    return findKaganboVisiblePixel(localX, localY);
  }

  function makeKaganboNoiseBuffer(audio, duration) {
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.66 + white * 0.34;
      data[i] = last;
    }
    return buffer;
  }

  function kaganboTone(audio, start, duration, from, to, type, gain, peak, nodes) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    const end = start + duration;

    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(Math.max(40, from), start);
    if (peak !== null && peak !== undefined) {
      osc.frequency.linearRampToValueAtTime(Math.max(40, peak), start + duration * 0.35);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), end);
    } else {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), end);
    }

    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.006);
    g.gain.setValueAtTime(Math.max(0.001, gain), Math.max(start + 0.01, end - 0.035));
    g.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(g);
    g.connect(audio.destination);
    osc.start(start);
    osc.stop(end + 0.02);
    nodes.push(osc);
    return end + 0.02;
  }

  function kaganboNoise(audio, start, duration, filterType, frequency, gain, q, nodes) {
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const g = audio.createGain();
    const end = start + duration;

    source.buffer = makeKaganboNoiseBuffer(audio, duration);
    filter.type = filterType || "bandpass";
    filter.frequency.setValueAtTime(frequency || 1200, start);
    filter.Q.setValueAtTime(q || 0.8, start);

    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.004);
    g.gain.setValueAtTime(Math.max(0.001, gain), Math.max(start + 0.01, end - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(g);
    g.connect(audio.destination);
    source.start(start);
    source.stop(end + 0.02);
    nodes.push(source);
    return end + 0.02;
  }

  function kaganboCrackle(audio, start, count, spacing, nodes) {
    let endTime = start;
    for (let i = 0; i < count; i++) {
      endTime = Math.max(
        endTime,
        kaganboNoise(
          audio,
          start + i * spacing,
          0.025,
          "highpass",
          2500 + Math.random() * 2200,
          0.045 + Math.random() * 0.025,
          0.5,
          nodes
        )
      );
    }
    return endTime;
  }

  function kaganboWetPulse(audio, start, duration, base, nodes) {
    let endTime = start;
    endTime = Math.max(endTime, kaganboTone(audio, start, duration, base, Math.max(55, base * 0.52), "sine", 0.09, base * 1.35, nodes));
    endTime = Math.max(endTime, kaganboNoise(audio, start, duration * 0.85, "lowpass", 620, 0.035, 1.1, nodes));
    return endTime;
  }

  function playKaganboHitSound(index) {
    const audio = ensureAudio();
    if (!audio || audio.state !== "running") return;

    const nodes = [];
    const t = audio.currentTime + 0.005;
    const j = 0.95 + Math.random() * 0.10;
    let endTime = t;
    const tone = (start, duration, from, to, type = "triangle", gain = 0.12, peak = null) => {
      endTime = Math.max(endTime, kaganboTone(audio, start, duration, from, to, type, gain, peak, nodes));
    };
    const noise = (start, duration, filterType = "bandpass", frequency = 1200, gain = 0.10, q = 0.8) => {
      endTime = Math.max(endTime, kaganboNoise(audio, start, duration, filterType, frequency, gain, q, nodes));
    };
    const crackle = (start, count = 4, spacing = 0.025) => {
      endTime = Math.max(endTime, kaganboCrackle(audio, start, count, spacing, nodes));
    };
    const wetPulse = (start, duration = 0.12, base = 170) => {
      endTime = Math.max(endTime, kaganboWetPulse(audio, start, duration, base, nodes));
    };

    switch (index) {
      case 0:
        noise(t, 0.085, "lowpass", 760, 0.13, 0.7);
        tone(t, 0.095, 180 * j, 90 * j, "sine", 0.11);
        break;
      case 1:
        noise(t, 0.17, "highpass", 1800, 0.16, 0.55);
        tone(t, 0.12, 520 * j, 145 * j, "sawtooth", 0.08);
        break;
      case 2:
        noise(t, 0.24, "bandpass", 620, 0.10, 0.9);
        tone(t, 0.25, 150 * j, 82 * j, "sawtooth", 0.12, 255 * j);
        break;
      case 3:
        noise(t, 0.22, "bandpass", 1050, 0.09, 1.3);
        crackle(t + 0.02, 6, 0.028);
        tone(t, 0.18, 330 * j, 120 * j, "triangle", 0.07);
        break;
      case 4:
        crackle(t, 2, 0.035);
        tone(t, 0.065, 1250 * j, 300 * j, "square", 0.075);
        break;
      case 5:
        wetPulse(t, 0.14, 230 * j);
        tone(t + 0.025, 0.11, 390 * j, 210 * j, "triangle", 0.08, 520 * j);
        break;
      case 6:
        wetPulse(t, 0.18, 150 * j);
        tone(t, 0.18, 210 * j, 75 * j, "sawtooth", 0.07, 290 * j);
        break;
      case 7:
        tone(t, 0.19, 310 * j, 125 * j, "triangle", 0.09, 760 * j);
        noise(t + 0.025, 0.14, "bandpass", 900, 0.045, 1.5);
        break;
      case 8:
        crackle(t, 3, 0.022);
        wetPulse(t + 0.025, 0.13, 185 * j);
        noise(t, 0.09, "highpass", 2300, 0.08, 0.7);
        break;
      case 9:
      default:
        noise(t, 0.28, "lowpass", 650, 0.19, 1.0);
        noise(t + 0.01, 0.24, "bandpass", 980, 0.13, 0.8);
        tone(t, 0.27, 135 * j, 72 * j, "sawtooth", 0.14, 220 * j);
        crackle(t + 0.008, 6, 0.024);
        wetPulse(t + 0.20, 0.17, 220 * j);
        tone(t + 0.19, 0.18, 330 * j, 125 * j, "triangle", 0.11, 560 * j);
        noise(t + 0.21, 0.14, "bandpass", 520, 0.06, 1.15);
        break;
    }

    if (nodes.length) {
      activeScreamGroups.push({ nodes, endTime });
    }
  }

  function chooseKaganboSfxIndex() {
    let index = Math.floor(Math.random() * KAGANBO_HIT_SFX.length);
    if (KAGANBO_HIT_SFX.length > 1 && index === kaganboLastSfxIndex) {
      index = (index + 1 + Math.floor(Math.random() * (KAGANBO_HIT_SFX.length - 1))) % KAGANBO_HIT_SFX.length;
    }
    kaganboLastSfxIndex = index;
    return index;
  }

  function triggerKaganboHitSfx(timestamp, hit) {
    const index = chooseKaganboSfxIndex();
    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const visualTop = boss.y - 2 + bob;
    const textX = Math.max(78, Math.min(W - 78, boss.x + hit.x * (boss.w / KAGANBO_DAMAGE_SIZE)));
    const textY = Math.max(92, visualTop + hit.y * (boss.h / KAGANBO_DAMAGE_SIZE) - 18);

    floatingTexts.push({
      text: KAGANBO_HIT_SFX[index],
      x: textX,
      y: textY,
      born: timestamp,
      duration: KAGANBO_SFX_DISPLAY_MS
    });
    if (floatingTexts.length > 8) floatingTexts.shift();
    playKaganboHitSound(index);
  }

  function applyKaganboHit(timestamp, hit) {
    const damageHit = {
      x: hit.x,
      y: hit.y,
      seed: kaganboBossDamageHits.length + 1
    };
    kaganboBossDamageHits.push(damageHit);
    paintKaganboDamage(damageHit);

    kaganboHitReactionStart = timestamp;
    kaganboHitReactionPush = hit.x < 90 ? 1 : (hit.x > 126 ? -1 : 0);
    triggerKaganboHitSfx(timestamp, hit);
  }

  bossSprite.addEventListener("load", () => {
    if (currentStage === 1 && flowState === FLOW.BOSS) {
      syncKaganboDamageImage();
    }
  });

  function activeBossSprite() {
    if (currentStage === 1) {
      if (flowState === FLOW.BOSS && kaganboBossDamageReady) {
        return kaganboBossDamageCanvas;
      }
      return bossSprite;
    }
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
    if (currentStage === 2) {
      resetBakenekoBossDamage();
    }

    boss = {`,
        `  function createBoss(timestamp) {
    if (currentStage === 1) {
      resetKaganboBossDamage();
    }
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
        `        for (const b of bullets) {
          if (b.y > -50 && rectHit(b, boss)) {
            if (currentStage === 2) {
              const impact = bakenekoImpactAtBullet(timestamp, b);
              if (!impact) continue;
              hitBoss(timestamp, impact, null);
            } else if (currentStage === 1) {
              const impact = kaganboImpactAtBullet(timestamp, b);
              if (!impact) continue;
              hitBoss(timestamp, null, impact);
            } else {
              hitBoss(timestamp, null, null);
            }
            b.y = -100;
            if (!boss.alive) break;
          }
        }`,
        "boss bullet collision"
      );

      source = replaceOrThrow(
        source,
        `  function hitBoss(timestamp, bakenekoImpact = null) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    if (currentStage === 2) {
      if (!bakenekoImpact) return;
      applyBakenekoHit(timestamp, bakenekoImpact);
    }

    boss.hp -= 1;`,
        `  function hitBoss(timestamp, bakenekoImpact = null, kaganboImpact = null) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    if (currentStage === 1) {
      if (!kaganboImpact) return;
      applyKaganboHit(timestamp, kaganboImpact);
    }
    if (currentStage === 2) {
      if (!bakenekoImpact) return;
      applyBakenekoHit(timestamp, bakenekoImpact);
    }

    boss.hp -= 1;`,
        "boss hit"
      );

      source = replaceOrThrow(
        source,
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
        `      if (currentStage !== 1 && currentStage !== 2) {
        const scream = screamSounds[3];
        playScream(scream);
        floatingTexts.push({
          text: scream.text,
          x: boss.x + boss.w / 2,
          y: boss.y + boss.h / 2,
          born: timestamp,
          duration: 1200
        });
      }`,
        "stage1 death sound"
      );

      source = replaceOrThrow(
        source,
        `    } else {
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
    }`,
        `    } else {
      const elapsed = timestamp - kaganboHitReactionStart;
      const activeReaction = elapsed >= 0 && elapsed < KAGANBO_HIT_REACTION_MS;
      const t = activeReaction ? elapsed / KAGANBO_HIT_REACTION_MS : 1;
      const kick = activeReaction ? Math.sin(Math.PI * t) : 0;
      let recoilX = 0;
      let recoilY = 0;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;

      if (kaganboHitReactionPush !== 0) {
        recoilX = kaganboHitReactionPush * 16 * kick;
        recoilY = -4 * kick;
        rotation = kaganboHitReactionPush * 0.105 * kick;
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
