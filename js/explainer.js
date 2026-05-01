// ===== EXPLAINER =====

const Explainer = (() => {

  function renderLoading() {
    const el = document.getElementById('explainOutput');
    el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Analyzing code…</span></div>`;
  }

  function renderExplanation(data) {
    const el = document.getElementById('explainOutput');
    el.innerHTML = '';

    // Complexity badge
    if (data.complexity) {
      const badge = document.getElementById('complexityBadge');
      if (badge) {
        badge.textContent = `T: ${data.complexity.time || '?'}  S: ${data.complexity.space || '?'}`;
        badge.style.display = 'inline';
      }
    }

    // Summary card
    if (data.summary) {
      const card = document.createElement('div');
      card.className = 'explain-summary-card';
      card.innerHTML = `<h3>Overview</h3><p>${esc(data.summary)}</p>`;
      el.appendChild(card);
    }

    // Line cards
    (data.lines || []).forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'explain-line-card';
      card.style.animationDelay = `${idx * 35}ms`;

      const type = item.type || 'other';
      card.innerHTML = `
        <div class="line-card-top">
          <span class="line-num-tag">L${esc(String(item.lineNum))}</span>
          <span class="line-code-snip">${esc(item.code || '')}</span>
          <span class="type-tag type-${type}">${type.toUpperCase()}</span>
        </div>
        <div class="line-explain-text">${esc(item.explanation || '')}</div>
      `;
      el.appendChild(card);
    });
  }

  function renderError(msg) {
    const el = document.getElementById('explainOutput');
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-glyph" style="color:var(--red)">✕</div>
        <p style="color:var(--red)">${esc(msg)}</p>
      </div>`;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { renderLoading, renderExplanation, renderError };
})();

window.Explainer = Explainer;
