(() => {
  const sensitivePatterns = [
    { label: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    // Loosened lengths to catch common/short demo JWTs too
    { label: "JWT/OAuth token", regex: /\b[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{3,}\.[A-Za-z0-9-_]{8,}\b/ },
    { label: "Private key block", regex: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/ },
    { label: "Generic API key or secret", regex: /\b(?:api[_-]?key|token|secret)[\s:=\-]{0,3}[A-Za-z0-9._\-]{16,}\b/i },
    { label: "Password assignment", regex: /\bpass(?:word)?\b\s*[:=]\s*[^\s]{6,}/i },
    { label: "Slack token", regex: /xox[baprs]-[A-Za-z0-9-]{10,48}/ },
    { label: "AWS Secret Access Key", regex: /\baws(.{0,20})?(secret|access)[-_ ]?key[^A-Za-z0-9]{0,5}[A-Za-z0-9\/+=]{30,}\b/i },
    { label: "Email address", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
    // Basic CC pattern (13-19 digits, allowing spaces or dashes)
    { label: "Credit card number", regex: /\b(?:\d[ -]*?){13,19}\b/ },
    { label: "GitHub token", regex: /\bgh[pous]_[A-Za-z0-9]{36}\b/ },
    { label: "GitLab token", regex: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
    { label: "Stripe secret key", regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
    { label: "Google API key", regex: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
    { label: "Bearer token", regex: /\bBearer\s+[A-Za-z0-9\-\._~\+\/]{20,}\b/i }
  ];

  let toastEl;
  let hideTimer;
  let lastMessage = "";
  let lastShownAt = 0;
  const COOLDOWN_MS = 3500;
  let modalEl;
  let pendingPaste = null;

  const detectSensitive = (text) => {
    const candidate = (text || "").trim().slice(0, 5000);
    if (!candidate) return [];
    const hits = sensitivePatterns
      .filter((pattern) => pattern.regex.test(candidate))
      .map((pattern) => pattern.label);
    return [...new Set(hits)];
  };

  const ensureToast = () => {
    if (toastEl) return toastEl;
    const container = document.createElement("div");
    container.className = "pasteguard-toast";

    const heading = document.createElement("div");
    heading.className = "pasteguard-heading";
    heading.textContent = "PasteGuard: copied text looks sensitive";

    const details = document.createElement("div");
    details.className = "pasteguard-details";
    details.textContent = "";

    container.appendChild(heading);
    container.appendChild(details);
    document.documentElement.appendChild(container);
    toastEl = container;
    return toastEl;
  };

  const hideToast = () => {
    if (!toastEl) return;
    toastEl.classList.remove("pg-visible");
  };

  const showToast = (messages) => {
    const now = Date.now();
    const key = messages.join(", ");
    if (now - lastShownAt < COOLDOWN_MS && key === lastMessage) return;

    const toast = ensureToast();
    const details = toast.querySelector(".pasteguard-details");
    details.textContent = messages.join(" · ");
    toast.classList.add("pg-visible");

    lastShownAt = now;
    lastMessage = key;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToast, 5000);
  };

  const ensureModal = () => {
    if (modalEl) return modalEl;
    const overlay = document.createElement("div");
    overlay.className = "pasteguard-modal";

    const dialog = document.createElement("div");
    dialog.className = "pasteguard-dialog";

    const title = document.createElement("div");
    title.className = "pasteguard-dialog-title";
    title.textContent = "Sensitive text detected";

    const body = document.createElement("div");
    body.className = "pasteguard-dialog-body";

    const actions = document.createElement("div");
    actions.className = "pasteguard-dialog-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "pasteguard-btn pg-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      pendingPaste = null;
      overlay.classList.remove("pg-visible");
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "pasteguard-btn pg-primary";
    confirmBtn.textContent = "Paste anyway";
    confirmBtn.addEventListener("click", () => {
      if (pendingPaste) {
        insertTextIntoTarget(pendingPaste.target, pendingPaste.text);
        showToast(["Paste allowed (sensitive)"]);
      }
      pendingPaste = null;
      overlay.classList.remove("pg-visible");
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(title);
    dialog.appendChild(body);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.documentElement.appendChild(overlay);
    modalEl = overlay;
    return modalEl;
  };

  const showModal = (messages, target, text) => {
    const overlay = ensureModal();
    const body = overlay.querySelector(".pasteguard-dialog-body");
    body.textContent = `Detected: ${messages.join(" · ")}`;
    pendingPaste = { target, text };
    overlay.classList.add("pg-visible");
  };

  const insertTextIntoTarget = (target, text) => {
    if (!target) return;
    const active = target;
    try {
      const isInput =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isInput) {
        const start = active.selectionStart ?? active.value.length;
        const end = active.selectionEnd ?? active.value.length;
        const value = active.value;
        const nextValue = value.slice(0, start) + text + value.slice(end);
        active.value = nextValue;
        const pos = start + text.length;
        if (typeof active.setSelectionRange === "function") {
          active.setSelectionRange(pos, pos);
        }
        active.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if (active.isContentEditable) {
        const sel = window.getSelection();
        if (sel && sel.getRangeAt && sel.rangeCount) {
          sel.deleteFromDocument();
          sel.getRangeAt(0).insertNode(document.createTextNode(text));
          sel.collapseToEnd();
          return;
        }
        document.execCommand("insertText", false, text);
        return;
      }
      document.execCommand("insertText", false, text);
    } catch (err) {
      // Swallow errors to avoid breaking the page.
    }
  };

  const handleCopy = (event) => {
    const clipboardText = event.clipboardData?.getData("text/plain") || "";
    const selectionText = window.getSelection()?.toString() || "";
    const text = clipboardText.trim() || selectionText.trim();
    if (!text) return;

    const matches = detectSensitive(text);
    if (matches.length > 0) {
      showToast(matches);
    }
  };

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData("text/plain")?.trim() || "";
    if (!text) return;

    const matches = detectSensitive(text);
    if (matches.length > 0) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      event.stopPropagation();
      showModal(matches, event.target, text);
    }
  };

  window.addEventListener("copy", handleCopy, true);
  window.addEventListener("cut", handleCopy, true);
  window.addEventListener("paste", handlePaste, true);
})();
