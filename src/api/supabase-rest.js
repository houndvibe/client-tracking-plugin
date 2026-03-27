(function () {
  function createError(message, status, details) {
    const err = new Error(message);
    err.status = status || 0;
    err.details = details || null;
    return err;
  }

  function withTimeout(promise, timeoutMs) {
    let timerId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(createError("Таймаут запроса к API.", 408));
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
  }

  function encodeEq(value) {
    return "eq." + encodeURIComponent(String(value));
  }

  function createClient(config) {
    const baseUrl = String(config.apiUrl || "").replace(/\/+$/, "");
    const apiKey = String(config.apiKey || "");
    const table = config.table || "clients";
    const timeoutMs = Number(config.timeoutMs || 10000);

    if (!baseUrl || !apiKey) {
      throw createError("Не заполнены API URL или API Key.");
    }

    const restBase = `${baseUrl}/rest/v1/${table}`;
    const headers = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    async function request(path, init) {
      const response = await withTimeout(
        fetch(path, {
          ...init,
          headers: {
            ...headers,
            ...(init && init.headers ? init.headers : {})
          }
        }),
        timeoutMs
      );

      const text = await response.text();
      const data = text ? safeParseJson(text) : null;

      if (!response.ok) {
        const details = data && typeof data === "object" ? data : { raw: text };
        throw createError("Ошибка API Supabase.", response.status, details);
      }

      return data;
    }

    async function getByNickname(nickname) {
      const normalized = String(nickname || "").trim();
      if (!normalized) {
        return null;
      }
      const url = `${restBase}?select=nickname,deal_count,comment&nickname=${encodeEq(normalized)}&limit=1`;
      const rows = (await request(url, { method: "GET" })) || [];
      return rows[0] || null;
    }

    async function createClientRecord(payload) {
      const body = JSON.stringify({
        nickname: String(payload.nickname || "").trim(),
        deal_count: Number(payload.deal_count || 0),
        comment: String(payload.comment || "")
      });
      const rows = await request(restBase, { method: "POST", body });
      return Array.isArray(rows) ? rows[0] : rows;
    }

    async function updateClientRecord(payload) {
      const nickname = String(payload.nickname || "").trim();
      const url = `${restBase}?nickname=${encodeEq(nickname)}`;
      const body = JSON.stringify({
        deal_count: Number(payload.deal_count || 0),
        comment: String(payload.comment || "")
      });
      const rows = await request(url, { method: "PATCH", body });
      return Array.isArray(rows) ? rows[0] : rows;
    }

    return {
      getByNickname,
      createClientRecord,
      updateClientRecord
    };
  }

  function safeParseJson(value) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  window.ClientTrackerApi = {
    createClient
  };
})();
