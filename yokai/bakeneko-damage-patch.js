(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceOrThrow(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Bakeneko damage patch target not found: ${label}`);
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

      // Stage2ボスだけ、216x216の作業Canvasへ画像をコピーして命中箇所を透明に削る。
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
  const bakenekoBossDamageCanvas = document.createElement("canvas");
  bakenekoBossDamageCanvas.width = BAKENEKO_DAMAGE_SIZE;
  bakenekoBossDamageCanvas.height = BAKENEKO_DAMAGE_SIZE;
  const bakenekoBossDamageCtx = bakenekoBossDamageCanvas.getContext("2d");
  let bakenekoBossDamageReady = false;
  let bakenekoBossDamageHits = [];

  function paintBakenekoDamage(hit) {
    if (!bakenekoBossDamageReady) return;

    const dc = bakenekoBossDamageCtx;
    dc.save();
    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "rgba(0,0,0,1)";

    // 真円一個ではなく、小円を重ねてギザギザに欠けさせる。
    const mainRadius = 8.5 + (hit.seed % 3) * 1.25;
    const pieces = 5;

    for (let i = 0; i < pieces; i++) {
      const angle = hit.seed * 1.37 + i * (Math.PI * 2 / (pieces - 1));
      const distance = i === 0 ? 0 : 4.5 + ((hit.seed + i * 3) % 4);
      const radius = i === 0
        ? mainRadius
        : 4.5 + ((hit.seed * 5 + i * 7) % 4) * 0.8;

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

    // 読み込み前に命中していた場合も、記録済みの傷を再現する。
    for (const hit of bakenekoBossDamageHits) {
      paintBakenekoDamage(hit);
    }

    return true;
  }

  function resetBakenekoBossDamage() {
    bakenekoBossDamageHits = [];
    bakenekoBossDamageReady = false;
    syncBakenekoDamageImage();
  }

  function chipBakenekoBoss(timestamp, bullet) {
    if (currentStage !== 2 || !boss || !bullet) return;

    // drawBoss() と同じ上下の揺れを使って、見えている画像上の命中位置へ変換する。
    const bob = boss.y >= boss.baseY ? Math.sin(timestamp * 0.0027) * 5 : 0;
    const visualTop = boss.y - 2 + bob;
    const bulletCenterX = bullet.x + bullet.w / 2;
    const bulletCenterY = bullet.y + bullet.h / 2;

    const localX = (bulletCenterX - boss.x) * (BAKENEKO_DAMAGE_SIZE / boss.w);
    const localY = (bulletCenterY - visualTop) * (BAKENEKO_DAMAGE_SIZE / boss.h);

    const hit = {
      x: Math.max(0, Math.min(BAKENEKO_DAMAGE_SIZE, localX)),
      y: Math.max(0, Math.min(BAKENEKO_DAMAGE_SIZE, localY)),
      seed: bakenekoBossDamageHits.length + 1
    };

    bakenekoBossDamageHits.push(hit);

    if (!bakenekoBossDamageReady) {
      // ここで同期できた場合、上のhitも含め全履歴が描き直される。
      syncBakenekoDamageImage();
      return;
    }

    paintBakenekoDamage(hit);
  }

  bakenekoBossSprite.addEventListener("load", () => {
    if (currentStage === 2 && flowState === FLOW.BOSS) {
      syncBakenekoDamageImage();
    }
  });

  function activeBossSprite() {
    if (currentStage === 2) {
      // 戦闘中だけ破損Canvasを使う。READY画面では無傷の画像を見せる。
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
        "damage canvas"
      );

      // 新しいボス戦を始める時だけ傷を全消去する。
      // LIFEが残っている途中復帰ではcreateBossを呼ばないので傷は維持される。
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

      // 弾そのものをhitBossへ渡し、画面座標から画像内の命中位置を求められるようにする。
      source = replaceOrThrow(
        source,
        `            hitBoss(timestamp);
            b.y = -100;`,
        `            hitBoss(timestamp, b);
            b.y = -100;`,
        "bullet hit call"
      );

      source = replaceOrThrow(
        source,
        `  function hitBoss(timestamp) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    boss.hp -= 1;`,
        `  function hitBoss(timestamp, bullet) {
    if (!boss || !boss.alive) return;
    if (timestamp < boss.invulnerableUntil) return;

    if (currentStage === 2 && bullet) {
      chipBakenekoBoss(timestamp, bullet);
    }

    boss.hp -= 1;`,
        "boss damage hit"
      );

      // 化け猫の被弾フラッシュは画像の透明部分まで白い四角で埋めず、
      // 欠けた輪郭を保ったまま同じスプライトをscreen合成する。
      source = replaceOrThrow(
        source,
        `    // 被弾時の見やすさを少し上げるため、うっすら白フラッシュを重ねる
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
    }`,
        `    // 被弾時の見やすさを少し上げる。
    if (flash) {
      ctx.globalCompositeOperation = "screen";

      if (currentStage === 2) {
        // 化け猫は欠けた透明部分を保ったまま発光させる。
        ctx.globalAlpha = 0.24;
        ctx.drawImage(
          activeBossSprite(),
          Math.round(cx - boss.w / 2),
          Math.round(cy - boss.h / 2),
          boss.w,
          boss.h
        );
      } else {
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
        "damage flash"
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
