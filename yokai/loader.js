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

    // 石灯籠は背景として沈ませ、敵弾と紛らわしい黄色い灯りを使わない。
    const lanternGlowAnchor = `      ctx.fillStyle = "rgba(255,183,60,.78)";
      ctx.fillRect(x - 4, y + 5, 8, 9);`;
    const lanternGlowCode = `      ctx.fillStyle = "#18201c";
      ctx.fillRect(x - 4, y + 5, 8, 9);`;

    if (!source.includes(lanternGlowAnchor)) {
      throw new Error("Lantern color patch target not found");
    }
    source = source.replace(lanternGlowAnchor, lanternGlowCode);

    // Stage2の通常敵は、B案の化け猫と大口アクションの2枚で描画する。
    const stage2SpriteAnchor = `const bossSprite = new Image();
  bossSprite.src = "images/kaganbo_boss.webp";`;
    const stage2SpriteCode = `const bossSprite = new Image();
  bossSprite.src = "images/kaganbo_boss.webp";
  const bakenekoIdleSprite = new Image();
  bakenekoIdleSprite.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAoCAYAAAC4h3lxAAAQl0lEQVR42tVZeZScVZX/3fe+76uv9q6u3tfsS3fSEDALBNJmR4MkBIJhMTojjoqAAUS2xIDDiOhw0FFnGGQ4Y0CUBFESAoxBISFBYAhMOiRkT2g6vS/VXeu3vHfnj+5o8CQqczgzzj2nqk69evXe7y7ffff+nsRHLzT8EZ8Xx8wvCBTt9zEnB+wjAIy/blknAMDC2XcuwA95NK7qWLECUoBAw3qJ/wtUBMD4g2XPPG8EZHEDvpJ7yGQ1E/d0A433QYYXADDoAx76SPb8UDHx5yxIDCYAgVp8+u21didvamR9T+VeXoh/50pa9iaQnHSqp84gEh8RcgGALCQnAeILwDoxYmF55r+skM1oNoDkxCQu3rY68pZ671J2dkxn52vUwdW0vAWAPazoCnkaO8mRPeKAcStQXTMy/j/SZ2SD4GNJmsSAtRPADDE8LE6z6MkQGnZTPezR+MrAhjGsu69P+78cze5irGfIwNzTOFcMv0kAuFQgfiiJyQwE7v8gltNb+UzjCghWh5BYdk30u/6loTXnx1Dzioa6SUDqkYwiTgHCDI5FMfsWE9PGoTPyt9U4O5IohY42CaoohzRgQ3BxZSkW/8bA1DnDazQbAPQ6sKGhvleJxqdXRr45bkV0nW8huCqOeNEwlg/nBUMMY7t2hrya55Xd6k6svdS9Pv4rNRmLGMCj5+JfzZNzRxavPZtufucc+jpH6LxjF+GnvL7e05knCzrzfd9/pCLNk3DTdkSRnEP361l09wkASQIhgnGlAP7jPLqGbyze5NXVzvcWJta6k+mTDOCyESzyQ4XPcOIzNjTbd+nP1lzmfi4xVhXXNqvVJc+7zXQdA3ihGDNiI2FDJVj86O3UydPE13LXYjdvGsu++7Sjck/m1TPj2b8YGzQEbilC8yO3iIP+Z+llBiKzwwiXAfKdpfIevr7yl06oeppaXTRBfbbqGmeG8VUN4OERBYy/NIQIgGKwGUNlU85yaXE4TfeHmijQcZjWx9cYY8tnuXPoS4v78eZzU/DJBECcQO1ZpSj3Z+EqWY9JasqSPJmjFKXfFXT4sEf1mMlL8dN//AKt//w4jJddOFIAVHEe6teXmGsbw5Ul3qOBu8y6jj66L9aIWZFe4VqSbBRP09DiTGEk/0Q+L4+g9rbSaNy+MZJFTTBCKgVsGWpFR+l+WWVP9rycO/oQ7/w4oH7qIySiVLlkCl0oXXZ5dHVQlE82YY7xUF2lUZotQWnPVD3AOX8bNuZ38ENPeXhv1QRzwdRgVcLfaW00nPd7+FvWGEyviEGQg815Q6QLXXAw8AiAwl+qgKDhB9TQInLzOUWhwOdMU+9JFTBGxKk1m0KLl4ZO5qQ2tDcxf379IPdPz2DvV/dgV8t7aJk4hS6q3HvkfX3oyA6a0dCIxGKTdEc7Nu3ejuN+m7FFXP0PcY7MnGQsOGegotsbCnYb7SdacY2fwLJINTqcAsYEA/QrL0NHs+15jaH7Aei/VAEGQAai13lwm5vjJYFlwTDe6fHwVj5NSdPGntwJLsgAmdGADJkJr4obJnR4B0gg1d2Dg9SHw5Of0bfaslDME6traO3P1/Cdz67Bu/k3ZTEmplv55VHnxVZOGyjqVjrsyb7eLq5KZ2ihVUUnHI/KRAATEjY2Ffppb7q1X8I6wHCPjChxpkP2A2McokRL3DCnzi8e6z1WXi3bUi6e6Uxhnb+PWGv0C4362iZoU3EYRXzixD6VLvQZxOgOJqJFthkL1OgEt/mdlPXBlmWC+pkKyPnRWMxMltWqAuWEn/XQ3rGXk7BIgPDtwFm4qCLMVVELizqP6Vf7jkjN2JvnVNPpisHTeUAKgDXJ6T+sbDh7ejiiE8qUR9IFVCJKWa3xO90LwYDjFRALlcFjh4QhZSbdRaFwSbSqvFG6hTx3ut1UUjIWkWAUXiEPVw7B8VIynqzUmkFQhK7Ow4BWlIOHL5pjMSdQxCn2ELAECuzppdGE3JLu3s5wN/AwXv6zWUgQ4HP2xZZCmpZESoiI0ZcjuiO7Bxn2EIUBDUY+18epVBc8VwEgXVo+QSeTtb7rZXUwFOXK0vEM1tBgSiQrURSvRiJRza5TIN9T6O9rg+9noQEkEMARzuDO7H4qOAKSGauL63DUc+Bw9kVBp4+Y0yiwghfwuAAQ3PZEqqM17eWMVE7pE34eWgBP+UcgosVcWTWByyvGgaEgJMEORhEOJUAE0lpBa4bvu2AwpDCglSbbjlCypA5FiQoiAdh2ADW1Daitb2COJ3iTfxRhYeCoV4DjEKdUznyk7/1OwNw6jOnPhtAKCWxUh9GvJEU3A6oaguzlyRq8nOrFz5zjJKSNaKIC4XCCpDQRCsUgBDFrDWYNrRkMBphBROT7HqQ0SAgBrRUcJwchBJlWgGw7BGYB0wzAsGywp3DM6aG5VinmlyVxd89+fjXb7yuY5x9CxyMnE8yZFBDAPg3Uza+kC748xEdSS+MVzXeWjvd2FfqNjbkutAaDKK0Yg6AVJiEEMpk0CvkcGYYBKSW5rktCCAJraB72gGGYZEiDHKeAfDYLwzDJtAJwnDxnhoZARLAtm6Q0KRQrIS0k+nODqA0YtCRepnY7uchBp+sHMXHOKJvHT3Aw4yDQKIB9fEoIrRPDKWrc5fNx29Yi1MwDjDVPpTre3JEdsExAPZPvRjRWCcESxzoOoys3hFi8CILAmfQQlFIQAijks2AGWDOYASkEXCfPhXyODdNgy7Y5lxnifDaDQMBCOBajjmwKxzsOMrsuSyvCr3IfVdom/2qo13p+qHVTlVz0X6N5wRMZpFyBjaoZDb8vseXwybudAVTNs+7YMsdeGXrKX/v3xB07GLFnnxp8vynlO+NShskqEKWBzCAmpdtRl+7BO2mGFUsgIAi+78EwLXiuC600CWkQmMEAua4HADAtC04hD2ZGIBCEQxY621oxc/A4bM+hDhGEYVlIaJ9b0r3ie32tLwD5ZSaPunoprZ3bhxOlvXi7+z28dBggBkACaJZEDKBs7oXJecnpY4v9ct18AxvGHKA3RxDyaWYyKsbzhFAQWcfFZ8o8vHJ3Do9dchC16TcwmCsgHI5CCgHDNKCUB60ViAR81wNIgJnhuS7soI1INIa+wQxGp3+Hny87gm135HBZscsZ18eUYAiqbAxvISIBilqoGtuPvVv24cXemyq+s/DKwIYXSrFsK8CJkRDaphUzhZF98bepzUeKy5T454YfNSzSD79kiynXgTAYZ8r1DPZRgxS4zrRglLnAqoux8sld9LuN52BZ7V60drXDsAIUtENg1vDcwvBzLAVr7UNrH+FIlKRl0/H2Vnxu3F7s/MUFdPmG3cA18xCMO1htWTjLEOgZ6qOo0jkGOQLIQ3Ts2ooHN+copb81f3n2EqyZH8K06wCwAMAE4qwVmr0zv7Xrue29dMnKQOHGiX8jxuqlqxhDy4eyPf9pGlICQs8xTORZAngTg6of9qKbUDtZI5FvRa7nMLMRpFA4DNfNg1mDSMAppBGJRqHIQqH7IBflT2DiTAFrwS086LcB1II0DCw0DXhCatsKyHSuby8jtaCA9t6YXvCTJXzvlXMvLoUxHkYSdbCouPZkjc2lYuGtTd5l32myLsCnv1ijeZQyeoY8FDC0D4yFyaLa2RRKqKDniOmRIG06YTOGOmDRQgaC2NsewMUXMlacdwxLH7C4uMQGaw8gYtYKWrnwfAeDHT387JpW/NPGIPb0GgA+DYtyQA9wqDOKmyuDeL6QFwE75pcmR3+su++dT5XT8iWfkd9dtXr1GBWa7PETtytjO/1bNiX3/IT8kaZ3On3j6EMBVu13sss7C+oXk1mdhXs6YWCmIZNdyWQTF8Une2Wj5qhtE+eq26hePX0DFLOtmA21qjmgvnZtQDEb6vYZpiKqUiUlTao43uiXJKb6pSVNSqBC3fdxc3j+JwLqtqtsxWwqZlv9+Aqob8ox6qVJ81RJ3QUqHp/kl5VMYxgWT8e92d+ezS6/nlbrR7F/Ph5VsLGSRs4tgUqQ5IgsLwaXjvMYBpFR6qMIZXapXnAHGA/09R05ICWkwcRfJomZTZPxm0crsXltgaB9LL3Cx2XLfAAaV0zwEGFAmzZyhoGsEORbISQAXDbVA6Bx9RUKFy3zgYKHJ79UQMumWkxtmogvkUEhw9JCsOjuPbwP2r/Fof700TaY6f0WNy5S1Gg2YaL75bsCSNQBG5VEBp6LQFnYaZoT6qiUOu3rhiamqmOzgun+6kl7eP0PbCv+qXC0LG4JwtgJo6jwsSlYvHAudh+sp13PD8GM5zHgCzz+UBj3vTAK+WAYxSTwybISagyH0JPPImtbeO5QMU60eogkGQNtJn798GikvBW4YPkSvFheBmiN/t4UAIMdJ+trde6VmcC7bxxP55bbr8+yLr7PoYZUvX94b3HlW/Ln24jzBwwA1I1nv/GYl+985rXq5U2vXdR81/lXui5D5jDQD+Lvm2ZklOs4cJ0sb/vty3zg3Rr0L5qNy69cymb+Utx86wM40N6N4vJRiJeYKJOCRG8bVjkWM4DXyaDyqslwFPjHG8ajv+c4ptRV44Hv3kQ56fETm7djx29eQ3tHK4LBiDRNGwErVu15b63PKutB2ypg/BhDOW8YdPgQrHfx4hCsvl3InyRywAQQI4KS83P3Hl8h7gq/5m/Fs/jG6zm0HCYKTmdoAVY1RYlq82PTzobjFKitcwBkCAgh0dv1HmzbhGkWwTDD5BuSO9v2AwyqrGsAOS60zrPr9MF1NUrK66GVD2hGdWkRTCvAb+3ejYFUuweINgEjrWjwl2fp1atuLL5/XHfoIPZ3HUWL99qxt/HEDcChLR9g+M7F35kEAWDC7Gn4+uYGuv6NAM69YeRnE4iskKKEg8FRDCS1NOpVWflMr6b2QjVm7DxVUnaOqqqsV69uf05NaTxXWUZU1csKVS8rlGWE1cyZF6hXXtqkiuIVqrxyuho9dp6qq7tQlVfMUkLU+ECSQ6FRLGUpA5FLT9p2Pj3Yfjl+wUDDOiAyG6WInNqM/Z6q2IWHveHBgzvfxnc+dUrhKgF4gPma0u4n8vm2HCF4RzgUXJzP9husizzfd2UsWsT9/UPUl2GqGJI8zi9Ho1UOEKPFaYfIBdCTBnl+kIsjceQyQ1BKac91dCgUsDKZ/h/lcoMbgGAYsFoYaQKIdvNznxdk3BcTwVczOrOTewQYawVwjz5DS7lOrMPduBtgwhUC2HiSzjilFk+slEL+TGn3QDhcNlEalrJtWwQCISW4V8QLwLVWHS53Y2ACHjdTeLzQhsGwgOYSLhSG2Pd8eF7OyOUGIITMKZWZDBRaz0QcJ3FJpA+BHLBRn4qFPiRJfQqVGL0a0M8DxoNSBq5i7btlFWOtwdSgN3POOLm8cQql/uXX7DMjuXoJPf7KDt7f0qdD4aDR3XUUhmHD87LrAX4BYANIPzYcqtAjL/5DpfxNfaa7kY+Gf0d0CaCzgLw3UVw3u7go5itJPOizINYUN4UiBTEwMCQHBt7fCvBLgGYg8+0/JhP+hPH4o1ZAnkJznFzcAoL3hILlt1uBCIpiCRCRTg0NiIKTQT7X+W0gvw6A+0fr8Okok/9NkR/s7sIrgdDPTLOy3bKqPCC0EbCvOPUe4GQv8td2SUYfJAqsSYA9+48U/asDfSbSWPyJ7/9vRHxYXv/Dyn8DY4WfjzvV9dIAAAAASUVORK5CYII=";
  const bakenekoRoarSprite = new Image();
  bakenekoRoarSprite.src = "data:image/png;base64,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";`;

    if (!source.includes(stage2SpriteAnchor)) {
      throw new Error("Stage2 sprite patch target not found");
    }
    source = source.replace(stage2SpriteAnchor, stage2SpriteCode);

    const stage2DrawAnchor = `  function drawEnemy(e, timestamp) {
    // 実際のゲームサイズで読めるよう、線を太くして要素を絞った目だま妖怪。`;
    const stage2DrawCode = `  function drawBakenekoEnemy(e, timestamp) {
    const bob = Math.sin(timestamp * 0.0036 + e.phase) * 2.5;
    const actionPhase = (timestamp * 0.001 + e.id * 0.41) % 3.2;
    const roaring = actionPhase > 2.72;
    const sprite = roaring ? bakenekoRoarSprite : bakenekoIdleSprite;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sprite, Math.round(e.x), Math.round(e.y + bob), e.w, e.h);
    ctx.restore();
  }

  function drawEnemy(e, timestamp) {
    if (
      currentStage === 2 &&
      flowState === FLOW.MINIONS &&
      bakenekoIdleSprite.complete && bakenekoIdleSprite.naturalWidth > 0 &&
      bakenekoRoarSprite.complete && bakenekoRoarSprite.naturalWidth > 0
    ) {
      drawBakenekoEnemy(e, timestamp);
      return;
    }

    // 実際のゲームサイズで読めるよう、線を太くして要素を絞った目だま妖怪。`;

    if (!source.includes(stage2DrawAnchor)) {
      throw new Error("Stage2 draw patch target not found");
    }
    source = source.replace(stage2DrawAnchor, stage2DrawCode);

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

    // ゲーム領域では右クリックを何の操作にも使わず、ブラウザメニューも出さない。
    const gameUnitElement = document.getElementById("gameUnit");
    if (gameUnitElement) {
      gameUnitElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
    }

    const script = document.createElement("script");
    script.textContent = source;
    document.body.appendChild(script);
  }).catch((error) => {
    console.error(error);
    const status = document.getElementById("status");
    if (status) status.textContent = "LOAD ERROR";
  });
})();
