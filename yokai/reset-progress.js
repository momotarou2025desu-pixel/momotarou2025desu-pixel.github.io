(() => {
  const button = document.getElementById("resetProgressBtn");
  if (!button) return;

  const COLLECTION_STORAGE_KEY = "yokai_taiji_collection_v1";

  button.addEventListener("click", () => {
    const ok = window.confirm(
      "コレクションを含む進行データをすべて消して、Stage1から最初から始めます。よろしいですか？"
    );
    if (!ok) return;

    try {
      localStorage.removeItem(COLLECTION_STORAGE_KEY);
    } catch (_) {}

    location.reload();
  });
})();
