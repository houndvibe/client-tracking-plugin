(function () {
  const DEFAULT_SETTINGS = {
    apiUrl: "https://oybluliumjrhyizmuuyd.supabase.co",
    apiKey: "",
    targetDomain: "localhost",
    modalSelector: ".sandbox-client-modal",
    nicknameSelector: ".sandbox-nickname",
    debug: false
  };

  function normalizeApiUrl(value) {
    const trimmed = String(value || "").trim();
    return trimmed.replace(/\/+$/, "");
  }

  function sanitizeSettings(input) {
    return {
      apiUrl: normalizeApiUrl(input.apiUrl || DEFAULT_SETTINGS.apiUrl),
      apiKey: String(input.apiKey || "").trim(),
      targetDomain: String(input.targetDomain || "").trim().toLowerCase(),
      modalSelector: String(input.modalSelector || "").trim(),
      nicknameSelector: String(input.nicknameSelector || "").trim(),
      debug: Boolean(input.debug)
    };
  }

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });
  }

  function storageSet(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  async function getSettings() {
    const raw = await storageGet(Object.keys(DEFAULT_SETTINGS));
    return sanitizeSettings({ ...DEFAULT_SETTINGS, ...raw });
  }

  async function saveSettings(nextSettings) {
    const sanitized = sanitizeSettings({ ...DEFAULT_SETTINGS, ...nextSettings });
    await storageSet(sanitized);
    return sanitized;
  }

  window.ClientTrackerStorage = {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings
  };
})();
