(function () {
  const stateByModal = new WeakMap();

  function isKeyUnsafe(key) {
    const raw = String(key || "").trim();
    if (!raw) return true;
    if (raw.startsWith("sb_secret_")) return true;

    // Legacy service_role is a JWT key where payload contains role=service_role.
    if (raw.split(".").length === 3) {
      const payload = decodeJwtPayload(raw);
      if (payload && payload.role === "service_role") return true;
    }
    return false;
  }

  function decodeJwtPayload(jwt) {
    try {
      const payloadBase64 = jwt.split(".")[1];
      const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(normalized));
    } catch (_error) {
      return null;
    }
  }

  function hostnameMatches(hostname, expectedDomain) {
    const domain = String(expectedDomain || "").trim().toLowerCase();
    if (!domain) return false;
    const current = String(hostname || "").toLowerCase();
    return current === domain || current.endsWith(`.${domain}`);
  }

  async function bootstrap() {
    const settings = await window.ClientTrackerStorage.getSettings();
    if (!hostnameMatches(location.hostname, settings.targetDomain)) {
      return;
    }
    if (!settings.modalSelector || !settings.nicknameSelector) {
      return;
    }
    if (isKeyUnsafe(settings.apiKey)) {
      return;
    }

    const api = window.ClientTrackerApi.createClient({
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey
    });

    const observer = window.ClientTrackerObserver.createDomObserver({
      modalSelector: settings.modalSelector,
      onModalDetected: (modal) => {
        processModal(modal, settings, api).catch(() => {
          // Умышленно не выбрасываем ошибку в консоль при каждом обновлении DOM.
        });
      }
    });

    observer.start();
  }

  async function processModal(modal, settings, api) {
    const nicknameEl = window.ClientTrackerParser.findNicknameElement(modal, settings.nicknameSelector);
    const nickname = window.ClientTrackerParser.extractNickname(modal, settings.nicknameSelector);

    if (!nicknameEl || !nickname) {
      return;
    }

    const oldState = stateByModal.get(modal) || {};
    if (oldState.nickname === nickname && oldState.rendered) {
      return;
    }

    const anchor = window.ClientTrackerUi.ensureAnchorElement(nicknameEl);
    window.ClientTrackerUi.renderLoading(anchor);

    try {
      const client = await api.getByNickname(nickname);
      if (!client) {
        window.ClientTrackerUi.renderMissingClient(anchor, () => {
          window.ClientTrackerUi.openEditorModal({
            nickname,
            dealCount: 0,
            comment: "",
            onSave: async (payload) => {
              await api.createClientRecord({ nickname, ...payload });
              await refreshModalState(anchor, nickname, api);
            }
          });
        });
      } else {
        renderExistingClient(anchor, nickname, client, api);
      }

      stateByModal.set(modal, { nickname, rendered: true });
    } catch (_error) {
      window.ClientTrackerUi.renderError(anchor, "Ошибка загрузки данных клиента.", () => {
        processModal(modal, settings, api);
      });
    }
  }

  function renderExistingClient(anchor, nickname, client, api) {
    window.ClientTrackerUi.renderFoundClient(anchor, client, {
      onClick: () => {
        window.ClientTrackerUi.openEditorModal({
          nickname,
          dealCount: Number(client.deal_count || 0),
          comment: String(client.comment || ""),
          onSave: async (payload) => {
            await api.updateClientRecord({ nickname, ...payload });
            await refreshModalState(anchor, nickname, api);
          }
        });
      }
    });
  }

  async function refreshModalState(anchor, nickname, api) {
    const client = await api.getByNickname(nickname);
    if (!client) {
      window.ClientTrackerUi.renderMissingClient(anchor, () => {});
      return;
    }
    renderExistingClient(anchor, nickname, client, api);
  }

  bootstrap().catch(() => {
    // Любая нештатная ошибка не должна ломать страницу сайта.
  });
})();
