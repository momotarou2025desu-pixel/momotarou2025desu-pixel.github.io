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

  // Stage2では、通常隊列から2体ずつが5段目へ降りて前衛になる。
  let stage2FrontDir = 1;
  let stage2FrontLineY = 0;

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
    enemyDir = 1;
    enemySpeed = 0.65;
    lastEnemyShot = 0;
    bossCheckpointScore = 0;`;

    if (!source.includes(startNormalAnchor)) {
      throw new Error("Stage start patch target not found");
    }
    source = source.replace(startNormalAnchor, startNormalCode);

    // Stage2専用の前衛2体移動。
    const stage2FunctionAnchor = `  function normalStartLife() {
    return 1 + Math.floor(normalLossCount / 2);
  }`;
    const stage2FunctionCode = `  function deployStage2FrontPair() {
    if (currentStage !== 2) return;
    if (enemies.some(e => e.alive && e.stage2FrontState)) return;

    const candidates = enemies.filter(e => e.alive && !e.stage2FrontState);
    if (!candidates.length) return;

    const topY = Math.min(...candidates.map(e => e.y));
    const topRow = candidates
      .filter(e => Math.abs(e.y - topY) < 0.5)
      .sort((a, b) => a.x - b.x);

    const picks = [];

    if (topRow.length >= 2) {
      let leftIndex = Math.floor((topRow.length - 1) / 3);
      let rightIndex = Math.ceil((topRow.length - 1) * 2 / 3);
      if (rightIndex === leftIndex) rightIndex = Math.min(topRow.length - 1, leftIndex + 1);
      picks.push(topRow[leftIndex], topRow[rightIndex]);
    } else {
      picks.push(topRow[0]);

      const remaining = candidates.filter(e => e !== topRow[0]);
      if (remaining.length) {
        const nextY = Math.min(...remaining.map(e => e.y));
        const nextRow = remaining
          .filter(e => Math.abs(e.y - nextY) < 0.5)
          .sort((a, b) => a.x - b.x);
        picks.push(nextRow[Math.floor((nextRow.length - 1) / 2)]);
      }
    }

    for (const e of picks) {
      e.stage2FrontState = "descending";
    }
  }

  function initializeStage2Formation() {
    stage2FrontDir = 1;

    // 初期4段の最下段から、ちょうど1段分(40+22)下を前衛ラインにする。
    const bottomY = Math.max(...enemies.map(e => e.y));
    stage2FrontLineY = bottomY + 62;

    enemies.forEach(e => {
      e.stage2FrontState = "";
    });

    deployStage2FrontPair();
  }

  function updateStage2Enemies(aliveEnemies) {
    const formationEnemies = aliveEnemies.filter(e => !e.stage2FrontState);

    // 通常隊列はStage1と同じ、左右移動＋端で下降。
    if (formationEnemies.length) {
      let shouldDrop = false;
      for (const e of formationEnemies) {
        const nextX = e.x + enemyDir * enemySpeed;
        if (nextX <= 8 || nextX + e.w >= W - 8) {
          shouldDrop = true;
          break;
        }
      }

      if (shouldDrop) {
        enemyDir *= -1;
        formationEnemies.forEach(e => e.y += 18);
        stage2FrontLineY += 18;
      } else {
        formationEnemies.forEach(e => e.x += enemyDir * enemySpeed);
      }
    }

    // 選ばれた2体は隊列から外れ、5段目まで縦に降りる。
    for (const e of aliveEnemies) {
      if (e.stage2FrontState !== "descending") continue;

      e.y = Math.min(stage2FrontLineY, e.y + 2.2);
      if (e.y >= stage2FrontLineY - 0.01) {
        e.y = stage2FrontLineY;
        e.stage2FrontState = "front";
      }
    }

    // 5段目へ着いた前衛は、残っている前衛同士で左右へ往復する。
    const frontEnemies = aliveEnemies.filter(e => e.stage2FrontState === "front");
    if (frontEnemies.length) {
      let shouldReverse = false;
      for (const e of frontEnemies) {
        const nextX = e.x + stage2FrontDir * enemySpeed;
        if (nextX <= 8 || nextX + e.w >= W - 8) {
          shouldReverse = true;
          break;
        }
      }

      if (shouldReverse) stage2FrontDir *= -1;

      for (const e of frontEnemies) {
        e.x += stage2FrontDir * enemySpeed;
        e.y = stage2FrontLineY;
      }
    }
  }

  function normalStartLife() {
    return 1 + Math.floor(normalLossCount / 2);
  }`;

    if (!source.includes(stage2FunctionAnchor)) {
      throw new Error("Stage2 function patch target not found");
    }
    source = source.replace(stage2FunctionAnchor, stage2FunctionCode);

    // Stage2だけ前衛2体の状態を初期化する。Stage1は元のまま。
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

    // LIFEを失って敵を上へ戻す処理。Stage2では前衛ラインも同じだけ戻す。
    const respawnAnchor = `    if (source === "enemyLine" && flowState === FLOW.MINIONS) {
      enemies.forEach(e => {
        if (e.alive) e.y = Math.max(16, e.y - 72);
      });
    }`;
    const respawnCode = `    if (source === "enemyLine" && flowState === FLOW.MINIONS) {
      if (currentStage === 2) {
        stage2FrontLineY -= 72;
      }

      enemies.forEach(e => {
        if (e.alive) e.y = Math.max(16, e.y - 72);
      });
    }`;

    if (!source.includes(respawnAnchor)) {
      throw new Error("Stage respawn patch target not found");
    }
    source = source.replace(respawnAnchor, respawnCode);

    // Stage1は元の動き。Stage2だけ前衛2体方式へ切り替える。
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
        updateStage2Enemies(aliveEnemies);
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
      throw new Error("Stage movement patch target not found");
    }
    source = source.replace(movementAnchor, movementCode);

    // Stage2の前衛2体が両方いなくなったら、その時点の最上段から次の2体を降ろす。
    const frontRefreshAnchor = `      bullets = bullets.filter(b => b.y > -50);

      if (enemies.every(e => !e.alive)) {`;
    const frontRefreshCode = `      bullets = bullets.filter(b => b.y > -50);

      if (currentStage === 2) {
        const hasFront = enemies.some(e => e.alive && e.stage2FrontState);
        if (!hasFront) deployStage2FrontPair();
      }

      if (enemies.every(e => !e.alive)) {`;

    if (!source.includes(frontRefreshAnchor)) {
      throw new Error("Stage2 front refresh patch target not found");
    }
    source = source.replace(frontRefreshAnchor, frontRefreshCode);

    const script = document.createElement("script");
    script.textContent = source;
    document.body.appendChild(script);
  }).catch((error) => {
    console.error(error);
    const status = document.getElementById("status");
    if (status) status.textContent = "LOAD ERROR";
  });
})();
