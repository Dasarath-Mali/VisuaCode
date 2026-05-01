// ===== VISUACODE — MAIN APP CONTROLLER =====

const App = (() => {

  // ── State ─────────────────────────────────────────────────────────────
  // WARNING: Do not push this default key to a public GitHub repository!
  const DEFAULT_API_KEY = 'gsk_your_default_key_here'; 
  
  let userApiKey   = localStorage.getItem('vc_groq') || '';
  let explainData  = null;
  let vizData      = null;
  let detectedLang = { lang: 'Unknown', color: '#888' };
  let stepIdx2D    = 0;
  let stepIdx3D    = 0;
  let viz3DStarted = false;

  // ── DOM refs ──────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const codeInput      = $('codeInput');
  const lineNums       = $('lineGutter');
  const langBadge      = $('langChip');
  const lineCount      = $('lineCount');
  const charCount      = $('charCountEl');
  const analyzeBtn     = $('analyzeBtn');
  const clearBtn       = $('clearBtn');
  const fileUpload     = $('fileUpload');
  const statusDot      = $('statusDot');
  const statusText     = $('statusText');
  
  const runBtn         = $('runBtn');
  const clearOutputBtn = $('clearOutputBtn');
  const stdinInput     = $('stdinInput');

  const svg2D          = $('svg2D');
  const empty2D        = $('empty2D');
  const stepControls2D = $('stepRow2D');
  const prevStep2D     = $('prev2D');
  const nextStep2D     = $('next2D');
  const stepInd2D      = $('stepCounter2D');
  const stepBar2D      = $('stepBar2D');
  const stepNumLbl2D   = $('stepTag2D');
  const stepDescTxt2D  = $('stepDesc2D');
  const reset2D        = $('reset2DBtn');
  const complexityBadge= $('complexityTag');

  const canvas3D       = $('canvas3D');
  const empty3D        = $('empty3D');
  const stepControls3D = $('stepRow3D');
  const prevStep3D     = $('prev3D');
  const nextStep3D     = $('next3D');
  const stepInd3D      = $('stepCounter3D');
  const stepBar3D      = $('stepBar3D');
  const stepNumLbl3D   = $('stepTag3D');
  const stepDescTxt3D  = $('stepDesc3D');
  const reset3D        = $('reset3DBtn');

  const agentInput     = $('agentInput');
  const agentSend      = $('agentSend');
  const agentMessages  = $('agentMessages');
  const saveKeyBtn     = $('saveKeyBtn');
  const groqKeyInput   = $('groqKeyInput');
  const apiBanner      = $('apiBanner');
  const openSettingsBtn= $('openSettingsBtn');

  function getActiveKey() {
    return userApiKey || DEFAULT_API_KEY;
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    updateBanner();
    if (userApiKey) groqKeyInput.value = userApiKey;

    if (window.ThemeManager) ThemeManager.initControls();

    initNavigation();
    if (Runner.initStdinToggle) Runner.initStdinToggle();

    codeInput.addEventListener('input', onCodeChange);
    codeInput.addEventListener('scroll', () => { lineNums.scrollTop = codeInput.scrollTop; });
    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = codeInput.selectionStart, en = codeInput.selectionEnd;
        codeInput.value = codeInput.value.slice(0, s) + '  ' + codeInput.value.slice(en);
        codeInput.selectionStart = codeInput.selectionEnd = s + 2;
        onCodeChange();
      }
    });

    analyzeBtn.addEventListener('click', analyze);
    clearBtn.addEventListener('click', clearAll);
    fileUpload.addEventListener('change', loadFile);

    runBtn.addEventListener('click', runCode);
    clearOutputBtn.addEventListener('click', clearOutput);

    prevStep2D.addEventListener('click', () => goStep2D(stepIdx2D - 1));
    nextStep2D.addEventListener('click', () => goStep2D(stepIdx2D + 1));
    reset2D.addEventListener('click', () => {
      if (vizData) { Visualizer2D.render(vizData); goStep2D(0); }
    });

    prevStep3D.addEventListener('click', () => goStep3D(stepIdx3D - 1));
    nextStep3D.addEventListener('click', () => goStep3D(stepIdx3D + 1));
    reset3D.addEventListener('click', () => { Visualizer3D.resetView(); });

    agentSend.addEventListener('click', sendAgent);
    agentInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgent(); }
    });

    openSettingsBtn.addEventListener('click', () => {
      switchView('settings');
      groqKeyInput.focus();
    });
    saveKeyBtn.addEventListener('click', saveApiKey);

    window.addEventListener('resize', () => {
      if (viz3DStarted) Visualizer3D.resize();
    });
  }

  function initNavigation() {
    document.querySelectorAll('.nav-item[data-view], .quick-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navBtn) navBtn.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    if (viewId === 'viz3d') {
      if (vizData && !viz3DStarted) show3D(vizData);
      else if (viz3DStarted) Visualizer3D.resize();
    }
  }

  function onCodeChange() {
    const lines = codeInput.value.split('\n');
    lineNums.textContent = lines.map((_, i) => i + 1).join('\n');
    lineCount.textContent = `${lines.length} line${lines.length !== 1 ? 's' : ''}`;
    
    if (charCount) charCount.textContent = `${codeInput.value.length} chars`;

    const code = codeInput.value.trim();
    if (code.length > 8) {
      detectedLang = LanguageDetector.detect(code);
      langBadge.textContent = detectedLang.lang;
      langBadge.style.color = detectedLang.color;
      langBadge.style.borderColor = detectedLang.color;
      langBadge.style.background = detectedLang.color + '18';
      
      if (Runner.updateStdinPanel) Runner.updateStdinPanel(code, detectedLang.lang);
    } else {
      langBadge.textContent = 'Auto-Detect';
      langBadge.style.color = '';
      langBadge.style.borderColor = '';
      langBadge.style.background = '';
    }
  }

  function loadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      codeInput.value = ev.target.result;
      onCodeChange();
      toast(`Loaded: ${file.name}`, 'info');
    };
    reader.onerror = () => toast('Failed to read file', 'error');
    reader.readAsText(file);
    fileUpload.value = '';
  }

  // ── RUNNER ────────────────────────────────────────────────────────────
  async function runCode() {
    const code = codeInput.value.trim();
    if (!code) { toast('Paste some code first', 'error'); return; }

    const activeKey = getActiveKey();
    if (!activeKey) {
      showApiKeyModal(true);
      return;
    }

    const userStdin = stdinInput ? stdinInput.value.trim() : '';

    Runner.renderRunning();
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';

    try {
      const res = await Runner.run(code, detectedLang.lang, userStdin, activeKey);
      Runner.renderResult(res);
    } catch (err) {
      const errorMsg = err.message.toLowerCase();
      if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        Runner.renderError("API Limit reached. Please update your key.");
        showApiKeyModal(!userApiKey); // Trigger Modal
      } else {
        Runner.renderError(err.message);
      }
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '▶ Run Code';
    }
  }

  function clearOutput() {
    const shell = document.getElementById('outputShell');
    shell.innerHTML = `
      <div class="output-placeholder">
        <div class="out-icon">▶</div>
        <p>Run your code to see output here</p>
        <p class="out-sub">Powered by Groq AI Simulation</p>
      </div>`;
    document.getElementById('runStatus').textContent = 'Not run yet';
    document.getElementById('runStatus').style.color = '';
    document.getElementById('execTime').textContent = '';
  }

  function hashCodeString(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; 
    }
    return hash.toString();
  }

  // ── ANALYZE ───────────────────────────────────────────────────────────
  async function analyze() {
    const code = codeInput.value.trim();
    if (!code) { toast('Paste some code first', 'error'); return; }
    
    const activeKey = getActiveKey();
    if (!activeKey) { 
      showApiKeyModal(true);
      return; 
    }

    const userStdin = stdinInput ? stdinInput.value.trim() : '';

    detectedLang = LanguageDetector.detect(code);
    langBadge.textContent = detectedLang.lang;
    langBadge.style.color = detectedLang.color;

    setStatus('running', 'Analyzing…');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '⏳ Analyzing…';
    Explainer.renderLoading();

    resetVizPanels();

    const cacheKey = 'vc_cache_' + hashCodeString(code + userStdin);
    const cachedData = localStorage.getItem(cacheKey);

    try {
      if (cachedData) {
        setStatus('running', 'Loading from cache...');
        const parsedCache = JSON.parse(cachedData);
        explainData = parsedCache.exp;
        vizData     = parsedCache.viz;
        toast('Loaded from cache (0 tokens used!)', 'success');
      } else {
        setStatus('running', 'Fetching explanation + visualization…');
        
        const [exp, viz] = await Promise.all([
          Analyzer.explain(code, detectedLang.lang, activeKey),
          Analyzer.visualize(code, detectedLang.lang, activeKey, userStdin)
        ]);

        explainData = exp;
        vizData     = viz;

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ exp, viz }));
        } catch (e) {
          console.warn("Storage full. Clearing old cache...");
          Object.keys(localStorage).forEach(k => {
             if (k.startsWith('vc_cache_')) localStorage.removeItem(k);
          });
          localStorage.setItem(cacheKey, JSON.stringify({ exp, viz }));
        }
      }

      Explainer.renderExplanation(explainData);
      Agent.setContext(code, detectedLang.lang, explainData.summary || '');
      show2D(vizData);

      const activeView = document.querySelector('.view.active').id;
      if (activeView === 'view-viz3d') show3D(vizData);
      else viz3DStarted = false;

      setStatus('done', `Done — ${detectedLang.lang} · ${vizData.vizType}`);
      if (!cachedData) toast('Analysis complete!', 'success');
      if (activeView === 'view-home') switchView('explain');

    } catch (err) {
      const errorMsg = err.message.toLowerCase();
      if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        Explainer.renderError("API Limit reached. Please update your key.");
        showApiKeyModal(!userApiKey); // Trigger Modal
      } else {
        Explainer.renderError(`Error: ${err.message}`);
        toast(err.message, 'error');
      }
      setStatus('error', 'Analysis failed');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<span class="btn-glow"></span> ⚡ Analyze';
    }
  }

  // ── 2D & 3D ───────────────────────────────────────────────────────────
  function show2D(vd) {
    empty2D.style.display = 'none';
    svg2D.style.display   = 'block';
    Visualizer2D.render(vd);

    const steps = vd.animationSteps || [];
    if (steps.length > 0) {
      stepControls2D.style.display = 'flex';
      stepBar2D.style.display      = 'flex';
      reset2D.style.display        = 'inline-flex';
      stepIdx2D = 0;
      applyStep2D(steps[0]);
      updateStepUI2D(steps);
    } else {
      stepControls2D.style.display = 'none';
      stepBar2D.style.display      = 'none';
      reset2D.style.display        = 'none';
    }
  }

  function goStep2D(idx) {
    if (!vizData || !vizData.animationSteps) return;
    const steps = vizData.animationSteps;
    stepIdx2D = Math.max(0, Math.min(steps.length - 1, idx));
    applyStep2D(steps[stepIdx2D]);
    updateStepUI2D(steps);
  }

  function applyStep2D(step) {
    Visualizer2D.highlight(step.activeNodes || [], step.activeEdges || []);
    stepNumLbl2D.textContent  = `Step ${step.step}`;
    stepDescTxt2D.textContent = step.description || '';
  }

  function updateStepUI2D(steps) {
    stepInd2D.textContent      = `${stepIdx2D + 1} / ${steps.length}`;
    prevStep2D.disabled        = stepIdx2D === 0;
    nextStep2D.disabled        = stepIdx2D === steps.length - 1;
  }

  function show3D(vd) {
    empty3D.style.display   = 'none';
    canvas3D.style.display  = 'block';
    viz3DStarted            = true;

    requestAnimationFrame(() => {
      Visualizer3D.start(canvas3D, vd);

      const steps = vd.animationSteps || [];
      if (steps.length > 0) {
        stepControls3D.style.display = 'flex';
        stepBar3D.style.display      = 'flex';
        reset3D.style.display        = 'inline-flex';
        stepIdx3D = 0;
        applyStep3D(steps[0]);
        updateStepUI3D(steps);
      } else {
        stepControls3D.style.display = 'none';
        stepBar3D.style.display      = 'none';
        reset3D.style.display        = 'none';
      }
    });
  }

  function goStep3D(idx) {
    if (!vizData || !vizData.animationSteps) return;
    const steps = vizData.animationSteps;
    stepIdx3D = Math.max(0, Math.min(steps.length - 1, idx));
    applyStep3D(steps[stepIdx3D]);
    updateStepUI3D(steps);
  }

  function applyStep3D(step) {
    Visualizer3D.highlight(step.activeNodes || [], step.activeEdges || []);
    stepNumLbl3D.textContent  = `Step ${step.step}`;
    stepDescTxt3D.textContent = step.description || '';
  }

  function updateStepUI3D(steps) {
    stepInd3D.textContent  = `${stepIdx3D + 1} / ${steps.length}`;
    prevStep3D.disabled    = stepIdx3D === 0;
    nextStep3D.disabled    = stepIdx3D === steps.length - 1;
  }

  // ── AGENT ─────────────────────────────────────────────────────────────
  async function sendAgent() {
    const q = agentInput.value.trim();
    if (!q) return;
    agentInput.value = '';
    agentSend.disabled = true;

    Agent.addMessage('user', q);
    Agent.addTyping();

    const activeKey = getActiveKey();

    try {
      const res = await Agent.ask(q, activeKey);
      Agent.removeTyping();
      if (res.error)       Agent.addMessage('bot', res.message, 'is-error');
      else if (res.outOfScope) Agent.addMessage('bot', res.message, 'out-of-scope');
      else                 Agent.addMessage('bot', res.answer);
    } catch (err) {
      Agent.removeTyping();
      const errorMsg = err.message.toLowerCase();
      if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
         Agent.addMessage('bot', "API limit reached! Please update your key.", 'is-error');
         showApiKeyModal(!userApiKey); // Trigger Modal
      } else {
        Agent.addMessage('bot', `Error: ${err.message}`, 'is-error');
      }
    } finally {
      agentSend.disabled = false;
    }
  }

  // ── CLEAR & STATUS ────────────────────────────────────────────────────
  function clearAll() {
    codeInput.value = '';
    onCodeChange();
    clearOutput();
    explainData = null;
    vizData     = null;
    Agent.clearContext();
    Visualizer2D.clear();
    Visualizer3D.stop();
    viz3DStarted = false;
    resetVizPanels();
    document.getElementById('explainOutput').innerHTML = `
      <div class="empty-clay">
        <div class="empty-blob">◈</div>
        <p>Analyze code to see explanation</p>
      </div>`;
    if (complexityBadge) complexityBadge.style.display = 'none';
    setStatus('', 'Ready — paste code and analyze');
    toast('Cleared', 'info');
  }

  function resetVizPanels() {
    svg2D.style.display          = 'none';
    canvas3D.style.display       = 'none';
    empty2D.style.display        = 'flex';
    empty3D.style.display        = 'flex';
    stepControls2D.style.display = 'none';
    stepControls3D.style.display = 'none';
    stepBar2D.style.display      = 'none';
    stepBar3D.style.display      = 'none';
    reset2D.style.display        = 'none';
    reset3D.style.display        = 'none';
  }

  function setStatus(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = text;
  }

  // ── SETTINGS & MODAL ──────────────────────────────────────────────────
  function saveApiKey() {
    const k = groqKeyInput.value.trim();
    if (!k) { toast('Enter a valid key', 'error'); return; }
    userApiKey = k;
    localStorage.setItem('vc_groq', k);
    updateBanner();
    toast('API key saved!', 'success');
  }

  function updateBanner() {
    apiBanner.style.display = (userApiKey || DEFAULT_API_KEY) ? 'none' : 'flex';
  }

  function toast(msg, type = 'info') {
    const wrap = $('toastStack');
    if (!wrap) return;
    const t    = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  // ✨ NEW: Dynamic Pop-up Modal for Rate Limits
  function showApiKeyModal(isDemoLimit) {
    if (document.getElementById('apiModalOverlay')) return; // Prevent duplicates

    const overlay = document.createElement('div');
    overlay.id = 'apiModalOverlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '3000', opacity: '0', transition: 'opacity 0.3s ease'
    });

    const card = document.createElement('div');
    card.className = 'clay-card';
    Object.assign(card.style, {
      width: '420px', maxWidth: '90%', padding: '24px', 
      display: 'flex', flexDirection: 'column', gap: '16px',
      transform: 'translateY(30px)', transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });

    const title = isDemoLimit ? "🚀 Demo Limit Reached" : "⏳ API Limit Reached";
    const desc  = isDemoLimit 
      ? "The public demo key has run out of tokens. Enter your own free Groq API key to continue instantly!" 
      : "Your personal API key has hit its daily limit. You can use a different key or wait for the reset.";

    card.innerHTML = `
      <h3 style="font-size: 20px; font-weight: 800; color: var(--yellow); margin:0;">${title}</h3>
      <p style="font-size: 13.5px; color: var(--text2); line-height: 1.5; margin:0;">${desc}</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <input type="password" id="modalKeyInput" class="settings-input" placeholder="gsk_..." style="width:100%;" autocomplete="off">
        <span style="font-size: 11px; color: var(--text3);">Get a free key at <a href="https://console.groq.com" target="_blank" style="color: var(--accent3); text-decoration:none;">console.groq.com</a></span>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
        <button id="modalCancelBtn" class="chip-btn" style="padding: 8px 16px; font-size:12px;">Cancel</button>
        <button id="modalSaveBtn" class="run-btn" style="padding: 8px 16px; font-size:12px;">Save & Continue</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Trigger animations
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });

    const input = card.querySelector('#modalKeyInput');
    input.focus();

    const closeModal = () => {
      overlay.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => overlay.remove(), 300);
    };

    card.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
    
    card.querySelector('#modalSaveBtn').addEventListener('click', () => {
      const k = input.value.trim();
      if(!k) { toast('Enter a valid key', 'error'); return; }
      
      userApiKey = k;
      localStorage.setItem('vc_groq', k);
      groqKeyInput.value = k; // Update the settings page input too
      updateBanner();
      toast('API key saved! You can run your code now.', 'success');
      closeModal();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
