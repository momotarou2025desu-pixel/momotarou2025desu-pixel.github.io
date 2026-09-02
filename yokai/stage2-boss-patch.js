(() => {
  const body = document.body;
  if (!body) return;

  const originalAppendChild = body.appendChild;

  function replaceOrThrow(source, before, after, label) {
    if (!source.includes(before)) {
      throw new Error(`Stage2 boss patch target not found: ${label}`);
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
        `  const kaganboCollectionItem = document.getElementById("kaganboCollectionItem");
  const kaganboCollectionCard = document.getElementById("kaganboCollectionCard");`,
        `  const kaganboCollectionItem = document.getElementById("kaganboCollectionItem");
  const kaganboCollectionCard = document.getElementById("kaganboCollectionCard");
  const bakenekoCollectionItem = document.getElementById("bakenekoCollectionItem");
  const bakenekoCollectionCard = document.getElementById("bakenekoCollectionCard");`,
        "collection refs"
      );

      source = replaceOrThrow(
        source,
        `const bossSprite = new Image();
  bossSprite.src = "images/kaganbo_boss.webp";`,
        `const bossSprite = new Image();
  bossSprite.src = "images/kaganbo_boss.webp";
  const bakenekoBossSprite = new Image();
  bakenekoBossSprite.src = "images/bakeneko_boss.png";

  function bossDisplayName() {
    return currentStage === 2 ? "化け猫" : "火眼坊";
  }

  function bossDisplayNameWithReading() {
    return currentStage === 2 ? "化け猫（ばけねこ）" : "火眼坊（かがんぼう）";
  }

  function activeBossSprite() {
    if (
      currentStage === 2 &&
      bakenekoBossSprite.complete &&
      bakenekoBossSprite.naturalWidth > 0
    ) {
      return bakenekoBossSprite;
    }
    return bossSprite;
  }`,
        "boss sprite"
      );

      source = replaceOrThrow(
        source,
        `  function refreshCollectionAvailability() {
    if (collectionBtn) {
      collectionBtn.hidden = !unlockedYokai.has("kaganbo");
    }
  }`,
        `  function refreshCollectionAvailability() {
    const hasKaganbo = unlockedYokai.has("kaganbo");

    if (collectionBtn) {
      collectionBtn.hidden = !hasKaganbo;
    }

    if (bakenekoCollectionItem) {
      const cardReady =
        bakenekoCollectionCard &&
        bakenekoCollectionCard.complete &&
        bakenekoCollectionCard.naturalWidth > 0;

      bakenekoCollectionItem.hidden =
        !unlockedYokai.has("bakeneko") || !cardReady;
    }
  }`,
        "collection availability"
      );

      source = replaceOrThrow(
        source,
        `  function openCardDetail() {
    if (!collectionOpen || cardDetailOpen) return;

    cardDetailOpen = true;
    cardDetailImage.src = kaganboCollectionCard.src;
    cardDetailOverlay.hidden = false;
    cardDetailOverlay.setAttribute("aria-hidden", "false");
  }`,
        `  function openCardDetail(cardImage) {
    if (!collectionOpen || cardDetailOpen || !cardImage) return;

    cardDetailOpen = true;
    cardDetailImage.src = cardImage.src;
    cardDetailImage.alt = cardImage.alt + " 拡大表示";
    cardDetailOverlay.hidden = false;
    cardDetailOverlay.setAttribute("aria-hidden", "false");
  }`,
        "card detail"
      );

      source = replaceOrThrow(
        source,
        `    flowState = FLOW.TITLE;
    resetResultPresentation();`,
        `    flowState = FLOW.TITLE;
    currentStage = unlockedYokai.has("kaganbo") ? 2 : 1;
    resetResultPresentation();`,
        "title stage"
      );

      source = replaceOrThrow(
        source,
        `  function updateTitleActions() {
    if (!titleActions) return;
    titleActions.hidden = flowState !== FLOW.TITLE;
  }`,
        `  function updateTitleActions() {
    if (!titleActions) return;
    titleActions.hidden = flowState !== FLOW.TITLE;

    if (bossTestBtn) {
      bossTestBtn.textContent = currentStage === 2
        ? "クリア確認（化け猫出現）"
        : "クリア確認（火眼坊出現）";
    }
  }`,
        "title actions"
      );

      source = replaceOrThrow(
        source,
        `  function updateHud() {
    scoreEl.textContent = \`SCORE: \${score}\`;
    lifeDisplay.textContent = \`LIFE \${Math.max(0, life)}\`;
    if (flowState === FLOW.TITLE) statusEl.textContent = "READY";
    if (flowState === FLOW.MINIONS) statusEl.textContent = "火眼坊退治中";
    if (flowState === FLOW.BOSS_READY) statusEl.textContent = "火眼坊戦 READY";
    if (flowState === FLOW.BOSS && boss) {
      statusEl.textContent = boss.alive
        ? \`火眼坊（かがんぼう） HP \${boss.hp}/\${boss.maxHp}\`
        : "火眼坊撃破！";
    }
    if (flowState === FLOW.CLEAR) statusEl.textContent = "CLEAR!";
    if (flowState === FLOW.GAMEOVER_MINIONS || flowState === FLOW.GAMEOVER_BOSS) statusEl.textContent = "GAME OVER";
    updateTitleActions();
  }`,
        `  function updateHud() {
    scoreEl.textContent = "SCORE: " + score;
    lifeDisplay.textContent = "LIFE " + Math.max(0, life);
    if (flowState === FLOW.TITLE) statusEl.textContent = "READY";
    if (flowState === FLOW.MINIONS) statusEl.textContent = bossDisplayName() + "退治中";
    if (flowState === FLOW.BOSS_READY) statusEl.textContent = bossDisplayName() + "戦 READY";
    if (flowState === FLOW.BOSS && boss) {
      statusEl.textContent = boss.alive
        ? bossDisplayNameWithReading() + " HP " + boss.hp + "/" + boss.maxHp
        : bossDisplayName() + "撃破！";
    }
    if (flowState === FLOW.CLEAR) statusEl.textContent = "CLEAR!";
    if (flowState === FLOW.GAMEOVER_MINIONS || flowState === FLOW.GAMEOVER_BOSS) statusEl.textContent = "GAME OVER";
    updateTitleActions();
  }`,
        "hud"
      );

      source = replaceOrThrow(
        source,
        `    // 火眼坊を倒したらコレクションを永続解放する。
    unlockYokai("kaganbo");`,
        `    // 既存のコレクション記録を、そのままステージクリア記録として使う。
    if (currentStage === 2) {
      unlockYokai("bakeneko");
    } else {
      unlockYokai("kaganbo");
    }`,
        "boss clear unlock"
      );

      source = replaceOrThrow(
        source,
        `      bossSprite,
      Math.round(cx - boss.w / 2),`,
        `      activeBossSprite(),
      Math.round(cx - boss.w / 2),`,
        "boss battle image"
      );

      source = replaceOrThrow(
        source,
        `    ctx.strokeText("火眼坊（かがんぼう）を退治せよ！", W / 2, 410);
    ctx.fillText("火眼坊（かがんぼう）を退治せよ！", W / 2, 410);`,
        `    ctx.strokeText(bossDisplayNameWithReading() + "を退治せよ！", W / 2, 410);
    ctx.fillText(bossDisplayNameWithReading() + "を退治せよ！", W / 2, 410);`,
        "title boss name"
      );

      source = replaceOrThrow(
        source,
        `    ctx.strokeText("火眼坊戦", W / 2, 108);
    ctx.fillText("火眼坊戦", W / 2, 108);`,
        `    ctx.strokeText(bossDisplayName() + "戦", W / 2, 108);
    ctx.fillText(bossDisplayName() + "戦", W / 2, 108);`,
        "boss ready title"
      );

      source = replaceOrThrow(
        source,
        `    ctx.drawImage(bossSprite, Math.round(x), Math.round(y), Math.round(size), Math.round(size));`,
        `    ctx.drawImage(activeBossSprite(), Math.round(x), Math.round(y), Math.round(size), Math.round(size));`,
        "boss ready image"
      );

      source = replaceOrThrow(
        source,
        `  kaganboCollectionItem.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCardDetail();
  });

  kaganboCollectionItem.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCardDetail();
    }
  });`,
        `  kaganboCollectionItem.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCardDetail(kaganboCollectionCard);
  });

  kaganboCollectionItem.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openCardDetail(kaganboCollectionCard);
    }
  });

  if (bakenekoCollectionCard) {
    bakenekoCollectionCard.addEventListener("load", refreshCollectionAvailability);
  }

  if (bakenekoCollectionItem && bakenekoCollectionCard) {
    bakenekoCollectionItem.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCardDetail(bakenekoCollectionCard);
    });

    bakenekoCollectionItem.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCardDetail(bakenekoCollectionCard);
      }
    });
  }`,
        "collection events"
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
