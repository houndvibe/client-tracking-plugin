(function () {
  function findNicknameElement(modalRoot, nicknameSelector) {
    if (!modalRoot || !nicknameSelector) {
      return null;
    }
    return modalRoot.querySelector(nicknameSelector);
  }

  function extractNickname(modalRoot, nicknameSelector) {
    const el = findNicknameElement(modalRoot, nicknameSelector);
    if (!el) {
      return "";
    }
    return String(el.textContent || "").trim();
  }

  window.ClientTrackerParser = {
    findNicknameElement,
    extractNickname
  };
})();
