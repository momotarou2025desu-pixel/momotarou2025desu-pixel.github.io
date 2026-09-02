(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceRequired(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Stage title patch target not found: ${label}`);
    }
    return source.replace(before, after);
  }

  function replaceIfPresent(source, before, after) {
    return source.includes(before) ? source.replace(before, after) : source;
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

      source = replaceRequired(
        source,
        `    // タイトル画面中央に火眼坊系の妖怪を1体表示
    const sample = {
      x: W / 2 - 42,
      y: 245,
      w: 84,
      h: 70,
      id: 0,
      phase: 0,
      alive: true
    };
    drawEnemy(sample, timestamp);`,
        `    // 現在のステージを代表する妖怪を中央に表示する。
    const sample = {
      x: W / 2 - 42,
      y: 245,
      w: 84,
      h: 70,
      id: 0,
      phase: 0,
      alive: true
    };

    if (currentStage === 2) {
      if (
        bakenekoIdleSprite.complete && bakenekoIdleSprite.naturalWidth > 0 &&
        bakenekoRoarSprite.complete && bakenekoRoarSprite.naturalWidth > 0
      ) {
        drawBakenekoEnemy(sample, timestamp);
      }
    } else {
      drawEnemy(sample, timestamp);
    }`,
        "title enemy sample"
      );

      source = replaceRequired(
        source,
        `    ctx.strokeText("妖怪退治", W / 2, 125);
    ctx.fillText("妖怪退治", W / 2, 125);

    ctx.font = '800 27px "Yu Gothic", sans-serif';`,
        `    ctx.strokeText("妖怪退治", W / 2, 125);
    ctx.fillText("妖怪退治", W / 2, 125);

    // ステージ番号を常時見せ、どこまで進んでいるか一目で分かるようにする。
    ctx.font = '900 23px "Yu Gothic", sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,.78)";
    ctx.fillStyle = currentStage === 2 ? "#dca6ff" : "#8feaff";
    ctx.strokeText("STAGE " + currentStage, W / 2, 188);
    ctx.fillText("STAGE " + currentStage, W / 2, 188);

    ctx.font = '800 27px "Yu Gothic", sans-serif';`,
        "stage label"
      );

      // stage2-boss-patch.js 適用後のHUDにステージ番号を追加する。
      source = replaceIfPresent(
        source,
        `    if (flowState === FLOW.MINIONS) statusEl.textContent = bossDisplayName() + "退治中";
    if (flowState === FLOW.BOSS_READY) statusEl.textContent = bossDisplayName() + "戦 READY";`,
        `    if (flowState === FLOW.MINIONS) statusEl.textContent = "STAGE " + currentStage + "  " + bossDisplayName() + "退治中";
    if (flowState === FLOW.BOSS_READY) statusEl.textContent = "STAGE " + currentStage + "  " + bossDisplayName() + "戦 READY";`
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
