(function () {
  const form = document.getElementById("settingsForm");
  const statusEl = document.getElementById("status");

  const fields = {
    apiUrl: document.getElementById("apiUrl"),
    apiKey: document.getElementById("apiKey"),
    targetDomain: document.getElementById("targetDomain"),
    modalSelector: document.getElementById("modalSelector"),
    nicknameSelector: document.getElementById("nicknameSelector"),
    debug: document.getElementById("debug")
  };

  function isUnsafeApiKey(apiKey) {
    const value = String(apiKey || "").trim();
    if (!value) return true;
    if (value.startsWith("sb_secret_")) return true;

    if (value.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload && payload.role === "service_role";
      } catch (_error) {
        return false;
      }
    }

    return false;
  }

  function setStatus(message, type) {
    statusEl.textContent = message || "";
    statusEl.classList.remove("error", "ok");
    if (type) {
      statusEl.classList.add(type);
    }
  }

  function readFormValues() {
    return {
      apiUrl: fields.apiUrl.value,
      apiKey: fields.apiKey.value,
      targetDomain: fields.targetDomain.value,
      modalSelector: fields.modalSelector.value,
      nicknameSelector: fields.nicknameSelector.value,
      debug: fields.debug.checked
    };
  }

  function writeFormValues(settings) {
    fields.apiUrl.value = settings.apiUrl || "";
    fields.apiKey.value = settings.apiKey || "";
    fields.targetDomain.value = settings.targetDomain || "";
    fields.modalSelector.value = settings.modalSelector || "";
    fields.nicknameSelector.value = settings.nicknameSelector || "";
    fields.debug.checked = Boolean(settings.debug);
  }

  async function loadSettings() {
    setStatus("Загрузка настроек...");
    try {
      const settings = await window.ClientTrackerStorage.getSettings();
      writeFormValues(settings);
      setStatus("Настройки загружены.", "ok");
    } catch (_error) {
      setStatus("Не удалось прочитать настройки.", "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = readFormValues();

    if (isUnsafeApiKey(values.apiKey)) {
      setStatus("Обнаружен service/secret ключ. Используйте только publishable/anon key.", "error");
      return;
    }

    setStatus("Сохраняем...");
    try {
      await window.ClientTrackerStorage.saveSettings(values);
      setStatus("Сохранено.", "ok");
    } catch (_error) {
      setStatus("Ошибка сохранения настроек.", "error");
    }
  });

  loadSettings();
})();
