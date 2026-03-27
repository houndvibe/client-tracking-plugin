(function () {
  function createDomObserver(config) {
    const modalSelector = String(config.modalSelector || "").trim();
    const onModalDetected = config.onModalDetected;
    const debounceMs = Number(config.debounceMs || 250);
    let timerId = null;

    if (!modalSelector) {
      throw new Error("Не задан селектор модального окна.");
    }
    if (typeof onModalDetected !== "function") {
      throw new Error("Не передан обработчик onModalDetected.");
    }

    function scheduleScan() {
      clearTimeout(timerId);
      timerId = setTimeout(scan, debounceMs);
    }

    function scan() {
      const modals = document.querySelectorAll(modalSelector);
      modals.forEach((modal) => onModalDetected(modal));
    }

    const observer = new MutationObserver(scheduleScan);

    function start() {
      scan();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    function stop() {
      clearTimeout(timerId);
      observer.disconnect();
    }

    return { start, stop, scan };
  }

  window.ClientTrackerObserver = {
    createDomObserver
  };
})();
