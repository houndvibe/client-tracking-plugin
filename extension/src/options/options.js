(function () {
  const form = document.getElementById("settingsForm");
  const statusEl = document.getElementById("status");
  const testConnectionBtn = document.getElementById("testConnection");
  const toggleApiKeyVisibilityBtn = document.getElementById("toggleApiKeyVisibility");

  const fields = {
    apiUrl: document.getElementById("apiUrl"),
    apiKey: document.getElementById("apiKey"),
    targetDomain: document.getElementById("targetDomain"),
    modalSelector: document.getElementById("modalSelector"),
    nicknameSelector: document.getElementById("nicknameSelector"),
    debug: document.getElementById("debug")
  };
  let isApiKeyVisible = false;

  function setApiKeyVisibility(nextVisible) {
    isApiKeyVisible = Boolean(nextVisible);
    fields.apiKey.type = isApiKeyVisible ? "text" : "password";

    if (!toggleApiKeyVisibilityBtn) {
      return;
    }

    const actionLabel = isApiKeyVisible ? "Скрыть API Key" : "Показать API Key";
    toggleApiKeyVisibilityBtn.setAttribute("aria-pressed", String(isApiKeyVisible));
    toggleApiKeyVisibilityBtn.setAttribute("aria-label", actionLabel);
    toggleApiKeyVisibilityBtn.setAttribute("title", actionLabel);
  }

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

  function normalizeApiUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function withTimeout(promise, timeoutMs) {
    let timerId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
  }

  function parseJwtPayload(value) {
    const token = String(value || "").trim();
    if (token.split(".").length !== 3) {
      return null;
    }

    try {
      return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch (_error) {
      return null;
    }
  }

  function getReadableError(error, status, details) {
    if (error && error.message === "timeout") {
      return "Таймаут запроса. Проверьте API URL и интернет-соединение.";
    }
    if (status === 401 || status === 403) {
      return "Ключ отклонен сервером. Проверьте, что указан publishable/anon key.";
    }
    if (status === 404) {
      return "API URL не найден. Проверьте адрес проекта Supabase.";
    }
    if (status >= 500) {
      return "Сервер Supabase временно недоступен. Повторите попытку позже.";
    }
    if (details && typeof details.message === "string" && details.message.trim()) {
      return `Ошибка проверки: ${details.message.trim()}`;
    }
    return "Не удалось выполнить проверочный запрос.";
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

  testConnectionBtn.addEventListener("click", async () => {
    const values = readFormValues();
    const apiUrl = normalizeApiUrl(values.apiUrl);
    const apiKey = String(values.apiKey || "").trim();

    if (!apiUrl || !apiKey) {
      setStatus("Заполните API URL и API Key перед проверкой.", "error");
      return;
    }

    if (isUnsafeApiKey(apiKey)) {
      setStatus("Обнаружен service/secret ключ. Используйте только publishable/anon key.", "error");
      return;
    }

    let roleLabel = "publishable/anon";
    const payload = parseJwtPayload(apiKey);
    if (payload && payload.role === "authenticated") {
      roleLabel = "authenticated";
    } else if (payload && payload.role === "anon") {
      roleLabel = "anon";
    }

    testConnectionBtn.disabled = true;
    setStatus("Проверяем подключение...");

    const testUrl = `${apiUrl}/rest/v1/clients?select=nickname&limit=1`;
    try {
      const response = await withTimeout(
        fetch(testUrl, {
          method: "GET",
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`
          }
        }),
        10000
      );

      const raw = await response.text();
      let details = null;
      try {
        details = raw ? JSON.parse(raw) : null;
      } catch (_error) {
        details = null;
      }

      if (!response.ok) {
        setStatus(getReadableError(null, response.status, details), "error");
        return;
      }

      setStatus(`Подключение успешно: API URL доступен, ключ валиден (${roleLabel}).`, "ok");
    } catch (error) {
      setStatus(getReadableError(error, 0, null), "error");
    } finally {
      testConnectionBtn.disabled = false;
    }
  });

  if (toggleApiKeyVisibilityBtn) {
    setApiKeyVisibility(false);
    toggleApiKeyVisibilityBtn.addEventListener("click", () => {
      setApiKeyVisibility(!isApiKeyVisible);
    });
  }

  loadSettings();
})();
