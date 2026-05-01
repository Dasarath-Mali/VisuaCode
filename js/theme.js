// ===== THEME MANAGER =====

const ThemeManager = (() => {

  const defaults = { theme: 'dark', accent: 'purple', brightness: 100, fontSize: 13 };

  function load() {
    const saved = JSON.parse(localStorage.getItem('vc_theme') || '{}');
    const cfg   = { ...defaults, ...saved };
    apply(cfg);
    return cfg;
  }

  function apply(cfg) {
    const root = document.documentElement;
    root.setAttribute('data-theme', cfg.theme);
    root.setAttribute('data-accent', cfg.accent);
    document.body.style.filter = `brightness(${cfg.brightness}%)`;
    // Font size for code editor
    const ta = document.getElementById('codeInput');
    if (ta) ta.style.fontSize = cfg.fontSize + 'px';
    const gutter = document.getElementById('lineGutter');
    if (gutter) gutter.style.fontSize = cfg.fontSize + 'px';
  }

  function save(cfg) {
    localStorage.setItem('vc_theme', JSON.stringify(cfg));
    apply(cfg);
  }

  function initControls() {
    const cfg = load();

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === cfg.theme);
      btn.addEventListener('click', () => {
        cfg.theme = btn.dataset.theme;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        save(cfg);
      });
    });

    // Accent swatches
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.accent === cfg.accent);
      sw.addEventListener('click', () => {
        cfg.accent = sw.dataset.accent;
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        save(cfg);
      });
    });

    // Brightness slider
    const bSlider = document.getElementById('brightnessSlider');
    const bVal    = document.getElementById('brightnessVal');
    if (bSlider) {
      bSlider.value = cfg.brightness;
      bVal.textContent = cfg.brightness + '%';
      bSlider.addEventListener('input', () => {
        cfg.brightness = parseInt(bSlider.value);
        bVal.textContent = cfg.brightness + '%';
        save(cfg);
      });
    }

    // Font size slider
    const fSlider = document.getElementById('fontSizeSlider');
    const fVal    = document.getElementById('fontSizeVal');
    if (fSlider) {
      fSlider.value = cfg.fontSize;
      fVal.textContent = cfg.fontSize + 'px';
      fSlider.addEventListener('input', () => {
        cfg.fontSize = parseInt(fSlider.value);
        fVal.textContent = cfg.fontSize + 'px';
        save(cfg);
      });
    }
  }

  return { load, apply, save, initControls };
})();

window.ThemeManager = ThemeManager;