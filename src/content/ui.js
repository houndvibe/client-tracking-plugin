(function () {
  const ROOT_ATTR = "data-client-tracker-root";
  const MODAL_ATTR = "data-client-tracker-editor";
  const TOOLTIP_ATTR = "data-client-tracker-tooltip";
  const ICON_PLUS = `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 4.25v11.5M4.25 10h11.5" />
    </svg>
  `;
  const ICON_INFO = `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 13.75V9.5M10 6.5h.01M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  `;

  function ensureAnchorElement(nicknameElement) {
    let anchor = nicknameElement.parentElement.querySelector(`[${ROOT_ATTR}]`);
    if (!anchor) {
      anchor = document.createElement("span");
      anchor.className = "ctp-anchor";
      anchor.setAttribute(ROOT_ATTR, "1");
      nicknameElement.insertAdjacentElement("afterend", anchor);
    }
    return anchor;
  }

  function clearAnchor(anchor) {
    anchor.replaceChildren();
  }

  function renderLoading(anchor) {
    clearAnchor(anchor);
    const loading = document.createElement("span");
    loading.className = "ctp-loading";
    loading.textContent = "Проверка...";
    anchor.appendChild(loading);
  }

  function renderError(anchor, message, onRetry) {
    clearAnchor(anchor);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctp-btn ctp-btn-error";
    btn.title = message || "Ошибка API";
    btn.textContent = "!";
    btn.addEventListener("click", onRetry);
    anchor.appendChild(btn);
  }

  function renderMissingClient(anchor, onClick) {
    clearAnchor(anchor);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctp-btn ctp-btn-plus";
    btn.title = "Клиент не найден. Добавить запись.";
    btn.setAttribute("aria-label", "Добавить клиента");
    btn.innerHTML = ICON_PLUS;
    btn.addEventListener("click", onClick);
    anchor.appendChild(btn);
  }

  function renderFoundClient(anchor, client, options) {
    clearAnchor(anchor);
    const wrapper = document.createElement("span");
    wrapper.className = "ctp-wrapper";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctp-btn ctp-btn-info";
    btn.setAttribute("aria-label", "Открыть карточку клиента");
    btn.innerHTML = ICON_INFO;
    btn.title = "Клиент найден. Нажмите для редактирования.";
    btn.addEventListener("click", options.onClick);

    const tooltip = document.createElement("div");
    tooltip.className = "ctp-tooltip";
    tooltip.setAttribute(TOOLTIP_ATTR, "1");
    tooltip.innerHTML = [
      `<div><strong>Сделок:</strong> ${Number(client.deal_count || 0)}</div>`,
      `<div class="ctp-comment">${escapeHtml(String(client.comment || "Нет комментария"))}</div>`
    ].join("");

    wrapper.appendChild(btn);
    wrapper.appendChild(tooltip);
    anchor.appendChild(wrapper);
  }

  function openEditorModal(state) {
    const existing = document.querySelector(`[${MODAL_ATTR}]`);
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "ctp-modal-overlay";
    overlay.setAttribute(MODAL_ATTR, "1");

    const modal = document.createElement("div");
    modal.className = "ctp-modal";

    const header = document.createElement("div");
    header.className = "ctp-modal-header";
    header.innerHTML = `<strong>Клиент: ${escapeHtml(state.nickname)}</strong>`;

    const controls = document.createElement("div");
    controls.className = "ctp-modal-controls";

    const btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "ctp-control-btn";
    btnClose.textContent = "x";
    btnClose.title = "Закрыть";

    controls.appendChild(btnClose);
    header.appendChild(controls);

    const body = document.createElement("div");
    body.className = "ctp-modal-body";
    body.innerHTML = `
      <label class="ctp-label">
        Количество сделок
        <input class="ctp-input" type="number" min="0" step="1" value="${Number(
          state.dealCount || 0
        )}" data-role="dealCount" />
      </label>
      <label class="ctp-label">
        Комментарий
        <textarea class="ctp-textarea" rows="5" data-role="comment">${escapeHtml(
          String(state.comment || "")
        )}</textarea>
      </label>
      <div class="ctp-footer">
        <span class="ctp-status" data-role="status"></span>
        <button class="ctp-save-btn" type="button" data-role="save">Сохранить</button>
      </div>
    `;

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const statusEl = body.querySelector('[data-role="status"]');
    const saveBtn = body.querySelector('[data-role="save"]');
    const dealInput = body.querySelector('[data-role="dealCount"]');
    const commentInput = body.querySelector('[data-role="comment"]');

    btnClose.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    saveBtn.addEventListener("click", async () => {
      const dealCount = Number(dealInput.value || 0);
      const comment = String(commentInput.value || "");
      statusEl.textContent = "Сохраняем...";
      saveBtn.disabled = true;
      try {
        await state.onSave({ deal_count: dealCount, comment });
        statusEl.textContent = "Сохранено";
        setTimeout(() => overlay.remove(), 350);
      } catch (_error) {
        statusEl.textContent = "Не удалось сохранить. Повторите попытку.";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.ClientTrackerUi = {
    ensureAnchorElement,
    renderLoading,
    renderError,
    renderMissingClient,
    renderFoundClient,
    openEditorModal
  };
})();
