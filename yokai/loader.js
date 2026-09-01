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

    const script = document.createElement("script");
    script.textContent = source;
    document.body.appendChild(script);
  }).catch((error) => {
    console.error(error);
    const status = document.getElementById("status");
    if (status) status.textContent = "LOAD ERROR";
  });
})();
