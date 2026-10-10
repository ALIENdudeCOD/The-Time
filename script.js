(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = {
    time: $("time"), toggle: $("settingsToggle"), panel: $("settingsPanel"),
    close: $("closeSettings"), theme: $("themeSelect"), font: $("fontSelect"),
    color: $("colorPicker"), hex: $("colorHex"), format: $("formatSelect"),
    seconds: $("secondsToggle"), milliseconds: $("millisecondsToggle"),
    size: $("sizeRange"), sizeValue: $("sizeValue"),
    reset: $("resetSettings"), preview: $("fontPreview")
  };

  const defaults = { theme: "black", font: "mono", color: "#8bd49c", format: "24", seconds: true, milliseconds: false, size: 100 };
  const storageKey = "chronoterm-settings-v2";
  const fonts = {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    terminal: '"Courier New", "Lucida Console", monospace',
    sans: 'Arial, Helvetica, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    rounded: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif'
  };

  function validHex(value) { return /^#[0-9a-fA-F]{6}$/.test(value); }

  function readControls() {
    return {
      theme: el.theme.value,
      font: el.font.value,
      color: el.color.value.toLowerCase(),
      format: el.format.value,
      seconds: el.seconds.checked,
      milliseconds: el.milliseconds.checked,
      size: Number(el.size.value)
    };
  }

  function applySettings(settings, persist = true) {
    const safe = { ...defaults, ...settings };
    if (!["light", "dark", "black"].includes(safe.theme)) safe.theme = defaults.theme;
    if (!Object.hasOwn(fonts, safe.font)) safe.font = defaults.font;
    if (!validHex(safe.color)) safe.color = defaults.color;
    if (!["12", "24"].includes(safe.format)) safe.format = defaults.format;
    safe.size = Number.isFinite(Number(safe.size)) ? Math.min(240, Math.max(40, Number(safe.size))) : defaults.size;

    document.body.dataset.theme = safe.theme;
    document.documentElement.style.setProperty("--accent", safe.color);
    document.documentElement.style.setProperty("--clock-font", fonts[safe.font]);
    document.documentElement.style.setProperty("--clock-size", `clamp(2rem, ${safe.size * 0.15}vw, ${safe.size * 1.92}px)`);
    el.theme.value = safe.theme;
    el.font.value = safe.font;
    el.color.value = safe.color;
    el.hex.value = safe.color.toUpperCase();
    el.format.value = safe.format;
    el.seconds.checked = Boolean(safe.seconds);
    el.milliseconds.checked = Boolean(safe.milliseconds);
    el.size.value = String(safe.size);
    el.sizeValue.textContent = safe.size === 100 ? "100% · Default" : `${safe.size}%`;
    el.preview.style.fontFamily = fonts[safe.font];
    renderTime();

    if (persist) {
      try { localStorage.setItem(storageKey, JSON.stringify(safe)); } catch { /* Optional persistence. */ }
    }
  }

  function renderTime() {
    const now = new Date();
    const options = { hour: "2-digit", minute: "2-digit", hour12: el.format.value === "12" };
    if (el.seconds.checked || el.milliseconds.checked) options.second = "2-digit";
    el.time.dateTime = now.toISOString();
    let display = new Intl.DateTimeFormat(undefined, options).format(now);
    if (el.milliseconds.checked) {
      const millis = String(now.getMilliseconds()).padStart(3, "0");
      display += `.${millis}`;
    }
    el.time.textContent = display;
  }

  function openSettings() {
    el.panel.hidden = false;
    el.toggle.setAttribute("aria-expanded", "true");
  }
  function closeSettings() {
    el.panel.hidden = true;
    el.toggle.setAttribute("aria-expanded", "false");
  }

  el.toggle.addEventListener("click", () => el.panel.hidden ? openSettings() : closeSettings());
  el.close.addEventListener("click", closeSettings);
  el.theme.addEventListener("change", () => applySettings(readControls()));
  el.font.addEventListener("change", () => applySettings(readControls()));
  el.format.addEventListener("change", () => applySettings(readControls()));
  el.seconds.addEventListener("change", () => applySettings(readControls()));
  el.milliseconds.addEventListener("change", () => applySettings(readControls()));
  el.size.addEventListener("input", () => applySettings(readControls()));

  el.color.addEventListener("input", () => {
    el.hex.value = el.color.value.toUpperCase();
    applySettings(readControls());
  });
  el.hex.addEventListener("change", () => {
    const value = el.hex.value.trim();
    if (validHex(value)) applySettings({ ...readControls(), color: value.toLowerCase() });
    else el.hex.value = el.color.value.toUpperCase();
  });
  document.querySelectorAll(".swatch").forEach(button => {
    button.addEventListener("click", () => applySettings({ ...readControls(), color: button.dataset.color }));
  });
  el.reset.addEventListener("click", () => applySettings({ ...defaults }));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSettings();
    if (event.key === "f" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    }
  });
  document.addEventListener("click", event => {
    if (!el.panel.hidden && !el.panel.contains(event.target) && !el.toggle.contains(event.target)) closeSettings();
  });

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { /* Use defaults. */ }
  applySettings({ ...defaults, ...saved }, false);
  renderTime();

  // Use the display's animation frames for a stopwatch-style rapidly changing readout.
  // The digits come from the system clock, not from accumulated timer increments.
  let animationFrame = null;
  let timeoutId = null;

  function scheduleTick() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (el.milliseconds.checked) {
      const frameTick = () => {
        renderTime();
        if (el.milliseconds.checked) {
          animationFrame = requestAnimationFrame(frameTick);
        } else {
          animationFrame = null;
          scheduleTick();
        }
      };
      animationFrame = requestAnimationFrame(frameTick);
    } else {
      const secondTick = () => {
        renderTime();
        timeoutId = setTimeout(secondTick, 1000 - (Date.now() % 1000));
      };
      timeoutId = setTimeout(secondTick, 1000 - (Date.now() % 1000));
    }
  }

  el.milliseconds.addEventListener("change", scheduleTick);
  scheduleTick();
})();
