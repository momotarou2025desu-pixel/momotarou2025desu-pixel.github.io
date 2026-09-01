(() => {
  const parts = [
    "game/part0.txt", "game/part1.txt", "game/part2.txt",
    "game/part3.txt", "game/part4.txt", "game/part5.txt"
  ];

  Promise.all(parts.map(async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.text();
  })).then((chunks) => {
    let source = chunks.join("");

    const oldDesktopSize = `  function syncCanvasLogicalSize() {
    if (!isMobileGameLayout()) {
      if (canvas.width !== 540 || canvas.height !== 960) {
        canvas.width = 540;
        canvas.height = 960;
        W = 540;
        H = 960;
      }
      return;
    }`;

    const newDesktopSize = `  function syncCanvasLogicalSize() {
    if (!isMobileGameLayout()) {
      const nextW = 720;
      const nextH = 720;

      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
        W = nextW;
        H = nextH;

        if (player) {
          player.x = Math.max(0, Math.min(W - player.w, player.x));
          player.y = H - 82;
        }
      }
      return;
    }`;

    if (!source.includes(oldDesktopSize)) {
      throw new Error("PC layout patch target not found");
    }
    source = source.replace(oldDesktopSize, newDesktopSize);

    const collectionStateAnchor = `  const TOUCH_RELEASE_GRACE_MS = 1000;`;
    const collectionStateCode = `  const TOUCH_RELEASE_GRACE_MS = 1000;

  // ボス撃破で解放される妖怪コレクションを、このブラウザに保存する。
  const COLLECTION_STORAGE_KEY = "yokai_taiji_collection_v1";
  let unlockedYokai = new Set();

  // ステージ進行はコレクションをそのままクリア記録として使う。
  let currentStage = 1;
  let stageStartedAt = 0;

  function loadUnlockedYokai() {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        unlockedYokai = new Set(saved.filter(id => typeof id === "string"));
      }
    } catch (_) {
      unlockedYokai = new Set();
    }
  }

  function refreshCollectionAvailability() {
    if (collectionBtn) {
      collectionBtn.hidden = !unlockedYokai.has("kaganbo");
    }
  }

  function unlockYokai(id) {
    unlockedYokai.add(id);
    try {
      localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify([...unlockedYokai]));
    } catch (_) {}
    refreshCollectionAvailability();
  }

  loadUnlockedYokai();
  refreshCollectionAvailability();`;

    if (!source.includes(collectionStateAnchor)) {
      throw new Error("Collection storage patch target not found");
    }
    source = source.replace(collectionStateAnchor, collectionStateCode);

    const openCollectionAnchor = `  function openCollection() {
    if (collectionOpen) return;`;
    const openCollectionCode = `  function openCollection() {
    if (collectionOpen || !unlockedYokai.has("kaganbo")) return;`;

    if (!source.includes(openCollectionAnchor)) {
      throw new Error("Collection open patch target not found");
    }
    source = source.replace(openCollectionAnchor, openCollectionCode);

    const clearAnchor = `  function setClear() {
    if (flowState !== FLOW.BOSS) return;`;
    const clearCode = `  function setClear() {
    if (flowState !== FLOW.BOSS) return;

    // 火眼坊を倒したらコレクションを永続解放する。
    unlockYokai("kaganbo");`;

    if (!source.includes(clearAnchor)) {
      throw new Error("Boss clear patch target not found");
    }
    source = source.replace(clearAnchor, clearCode);

    // 火眼坊がコレクションにあればStage1クリア済みとしてStage2から始める。
    const startNormalAnchor = `    flowState = FLOW.MINIONS;
    enemyDir = 1;
    enemySpeed = 0.65;
    lastEnemyShot = 0;
    bossCheckpointScore = 0;`;
    const startNormalCode = `    flowState = FLOW.MINIONS;
    currentStage = unlockedYokai.has("kaganbo") ? 2 : 1;
    stageStartedAt = performance.now();
    enemyDir = 1;
    enemySpeed = 0.65;
    lastEnemyShot = 0;
    bossCheckpointScore = 0;`;

    if (!source.includes(startNormalAnchor)) {
      throw new Error("Stage start patch target not found");
    }
    source = source.replace(startNormalAnchor, startNormalCode);

    // Stage2は敵数・攻撃・当たり判定を変えず、移動だけ八の字＋下降にする。
    const stage2FunctionAnchor = `  function normalStartLife() {
    return 1 + Math.floor(normalLossCount / 2);
  }`;
    const stage2FunctionCode = `  function initializeStage2Formation() {
    enemies.forEach(e => {
      e.baseX = e.x;
      e.baseY = e.y;
      e.stageOffsetY = 0;
    });
  }

  function updateStage2Enemies(aliveEnemies, timestamp) {
    const t = Math.max(0, (timestamp - stageStartedAt) / 1000);

    for (const e of aliveEnemies) {
      const phase = e.phase || 0;
      const waveX = Math.sin(t * 1.75 + phase) * 30;
      const waveY = Math.sin(t * 3.50 + phase) * 14;
      const driftY = t * 7.0;

      const minX = 8;
      const maxX = W - e.w - 8;
      e.x = Math.max(minX, Math.min(maxX, e.baseX + waveX));
      e.y = e.baseY + driftY + waveY + (e.stageOffsetY || 0);
    }
  }

  function normalStartLife() {
    return 1 + Math.floor(normalLossCount / 2);
  }`;

    if (!source.includes(stage2FunctionAnchor)) {
      throw new Error("Stage2 function patch target not found");
    }
    source = source.replace(stage2FunctionAnchor, stage2FunctionCode);

    // Stage2を直接開始する場合だけ、生成した隊列の基準座標を保存する。
    const formationAnchor = `    // 通常戦の開始ライフ。2敗ごとに上限なく1ずつ増える。
    life = normalStartLife();
    createMinionFormation();

    startGameLoop();`;
    const formationCode = `    // 通常戦の開始ライフ。2敗ごとに上限なく1ずつ増える。
    life = normalStartLife();
    createMinionFormation();

    if (currentStage === 2) {
      initializeStage2Formation();
    }

    startGameLoop();`;

    if (!source.includes(formationAnchor)) {
      throw new Error("Stage2 formation patch target not found");
    }
    source = source.replace(formationAnchor, formationCode);

    // LIFEを失って敵を上へ戻す処理は、Stage2の基準オフセットにも反映する。
    const respawnAnchor = `    if (source === "enemyLine" && flowState === FLOW.MINIONS) {
      enemies.forEach(e => {
        if (e.alive) e.y = Math.max(16, e.y - 72);
      });
    }`;
    const respawnCode = `    if (source === "enemyLine" && flowState === FLOW.MINIONS) {
      enemies.forEach(e => {
        if (!e.alive) return;
        if (currentStage === 2) {
          e.stageOffsetY = (e.stageOffsetY || 0) - 72;
        }
        e.y = Math.max(16, e.y - 72);
      });
    }`;

    if (!source.includes(respawnAnchor)) {
      throw new Error("Stage2 respawn patch target not found");
    }
    source = source.replace(respawnAnchor, respawnCode);

    // 既存のStage1移動はそのまま。Stage2だけ八の字移動へ切り替える。
    const movementAnchor = `      let shouldDrop = false;
      for (const e of aliveEnemies) {
        const nextX = e.x + enemyDir * enemySpeed;
        if (nextX <= 8 || nextX + e.w >= W - 8) {
          shouldDrop = true;
          break;
        }
      }

      if (shouldDrop) {
        enemyDir *= -1;
        aliveEnemies.forEach(e => e.y += 18);
      } else {
        aliveEnemies.forEach(e => e.x += enemyDir * enemySpeed);
      }`;
    const movementCode = `      if (currentStage === 2) {
        updateStage2Enemies(aliveEnemies, timestamp);
      } else {
        let shouldDrop = false;
        for (const e of aliveEnemies) {
          const nextX = e.x + enemyDir * enemySpeed;
          if (nextX <= 8 || nextX + e.w >= W - 8) {
            shouldDrop = true;
            break;
          }
        }

        if (shouldDrop) {
          enemyDir *= -1;
          aliveEnemies.forEach(e => e.y += 18);
        } else {
          aliveEnemies.forEach(e => e.x += enemyDir * enemySpeed);
        }
      }`;

    if (!source.includes(movementAnchor)) {
      throw new Error("Stage2 movement patch target not found");
    }
    source = source.replace(movementAnchor, movementCode);

    const script = document.createElement("script");
    script.textContent = source;
    document.body.appendChild(script);
  }).catch((error) => {
    console.error(error);
    const status = document.getElementById("status");
    if (status) status.textContent = "LOAD ERROR";
  });
})();
