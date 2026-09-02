(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceRequired(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Stage2 speed patch target not found: ${label}`);
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

      // Stage1は従来速度。Stage2だけ通常敵の横移動を少し速くする。
      source = replaceRequired(
        source,
        `      if (aliveEnemies.length <= 7) {
        enemySpeed = 0.95;
      } else if (aliveEnemies.length <= 14) {
        enemySpeed = 0.80;
      } else {
        enemySpeed = 0.65;
      }`,
        `      if (aliveEnemies.length <= 7) {
        enemySpeed = currentStage === 2 ? 1.10 : 0.95;
      } else if (aliveEnemies.length <= 14) {
        enemySpeed = currentStage === 2 ? 0.92 : 0.80;
      } else {
        enemySpeed = currentStage === 2 ? 0.75 : 0.65;
      }`,
        "normal enemy speed"
      );

      // ボスもStage2だけ横移動を約16％速くする。登場下降速度や攻撃間隔は変更しない。
      source = replaceRequired(
        source,
        `      dir: 1,
      speed: 1.85,
      spawnedAt: timestamp,`,
        `      dir: 1,
      speed: currentStage === 2 ? 2.15 : 1.85,
      spawnedAt: timestamp,`,
        "boss speed"
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
