(() => {
  const gameUnit = document.getElementById("gameUnit");
  if (!gameUnit) return;

  const mobileLayout = window.matchMedia("(max-width: 600px), (pointer: coarse)");
  let fitFrame = 0;

  function fitDesktopGameToViewport() {
    // スマホ側は既存の縦画面フィット処理に任せる。
    if (mobileLayout.matches) {
      gameUnit.style.width = "";
      return;
    }

    // Chrome等ではブラウザUIを除いた、実際に見えている領域を優先する。
    const viewportHeight =
      window.visualViewport && window.visualViewport.height
        ? window.visualViewport.height
        : window.innerHeight;

    const viewportWidth =
      window.visualViewport && window.visualViewport.width
        ? window.visualViewport.width
        : window.innerWidth;

    const unitTop = gameUnit.getBoundingClientRect().top;
    const parentWidth = gameUnit.parentElement
      ? gameUnit.parentElement.clientWidth
      : viewportWidth;

    // 上部のLIFE・タイトル・SCOREはそのまま残し、ゲーム画面の下端だけを
    // ブラウザの見える下端より8px上へ収める。
    const availableHeight = Math.floor(viewportHeight - unitTop - 8);
    const availableWidth = Math.floor(Math.min(parentWidth, viewportWidth - 16));
    const size = Math.max(1, Math.min(720, availableHeight, availableWidth));

    // ゲーム内部の論理解像度720×720は変えず、CSS表示サイズだけ縮小する。
    gameUnit.style.width = `${size}px`;
  }

  function scheduleDesktopFit() {
    if (fitFrame) cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      fitDesktopGameToViewport();
    });
  }

  window.addEventListener("resize", scheduleDesktopFit);
  window.addEventListener("orientationchange", scheduleDesktopFit);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleDesktopFit);
    window.visualViewport.addEventListener("scroll", scheduleDesktopFit);
  }

  if (typeof mobileLayout.addEventListener === "function") {
    mobileLayout.addEventListener("change", scheduleDesktopFit);
  }

  requestAnimationFrame(scheduleDesktopFit);
})();
