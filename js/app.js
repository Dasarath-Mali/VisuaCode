// ===== VISUACODE — MAIN APP CONTROLLER =====

const App = (() => {

  // ── State ─────────────────────────────────────────────────────────────
  let apiKey       = localStorage.getItem('vc_groq') || '';
  let explainData  = null;
  let vizData      = null;
  let detectedLang = { lang: 'Unknown', color: '#888' };
  let stepIdx2D    = 0;
  let stepIdx3D    = 0;
  let viz3DStarted = false;

  // ── DOM refs ──────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // Editor & Main
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
  
  // Runner Outputs
  const runBtn         = $('runBtn');
  const clearOutputBtn = $('clearOutputBtn');

  // 2D Viz
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

  // 3D Viz
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

  // Agent
  const agentInput     = $('agentInput');
  const agentSend      = $('agentSend');
  const agentMessages  = $('agentMessages');

  // Settings
  const saveKeyBtn     = $('saveKeyBtn');
  const groqKeyInput   = $('groqKeyInput');
  const apiBanner      = $('apiBanner');
  const openSettingsBtn= $('openSettingsBtn');

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    updateBanner();
    if (apiKey) groqKeyInput.value = apiKey;

    // Initialize Theme Controls
    if (window.ThemeManager) ThemeManager.initControls();

    // Setup Sidebar Navigation
    initNavigation();

    // Editor
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

    // Runner Integration
    runBtn.addEventListener('click', runCode);
    clearOutputBtn.addEventListener('click', clearOutput);

    // 2D steps
    prevStep2D.addEventListener('click', () => goStep2D(stepIdx2D - 1));
    nextStep2D.addEventListener('click', () => goStep2D(stepIdx2D + 1));
    reset2D.addEventListener('click', () => {
      if (vizData) { Visualizer2D.render(vizData); goStep2D(0); }
    });

    // 3D steps
    prevStep3D.addEventListener('click', () => goStep3D(stepIdx3D - 1));
    nextStep3D.addEventListener('click', () => goStep3D(stepIdx3D + 1));
    reset3D.addEventListener('click', () => { Visualizer3D.resetView(); });

    // Agent
    agentSend.addEventListener('click', sendAgent);
    agentInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgent(); }
    });

    // Settings
    openSettingsBtn.addEventListener('click', () => {
      switchView('settings');
      groqKeyInput.focus();
    });
    saveKeyBtn.addEventListener('click', saveApiKey);

    // Resize
    window.addEventListener('resize', () => {
      if (viz3DStarted) Visualizer3D.resize();
    });
  }

  // ── NAVIGATION (SIDEBAR) ──────────────────────────────────────────────
  function initNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    document.querySelectorAll('.quick-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  function switchView(viewId) {
    // Update sidebar active states
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Update main view panels
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    // Handle 3D Canvas initialization on view switch
    if (viewId === 'viz3d') {
      if (vizData && !viz3DStarted) {
        show3D(vizData);
      } else if (viz3DStarted) {
        Visualizer3D.resize();
      }
    }
  }

  // ── CODE EDITOR ───────────────────────────────────────────────────────
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

    Runner.renderRunning();
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';

    try {
      const res = await Runner.run(code, detectedLang.lang);
      Runner.renderResult(res);
    } catch (err) {
      Runner.renderError(err.message);
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
        <p class="out-sub">Powered by Piston — free, no key needed</p>
      </div>`;
    document.getElementById('runStatus').textContent = 'Not run yet';
    document.getElementById('runStatus').style.color = '';
    document.getElementById('execTime').textContent = '';
  }

  // ── CACHE HELPER ──────────────────────────────────────────────────────
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
    if (!apiKey) { 
      toast('Set your Groq API key first ⚙', 'error'); 
      switchView('settings');
      groqKeyInput.focus();
      return; 
    }

    detectedLang = LanguageDetector.detect(code);
    langBadge.textContent = detectedLang.lang;
    langBadge.style.color = detectedLang.color;

    setStatus('running', 'Analyzing…');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '⏳ Analyzing…';
    Explainer.renderLoading();

    // Reset viz panels
    resetVizPanels();

    // Generate unique ID for this exact code snippet
    const cacheKey = 'vc_cache_' + hashCodeString(code);
    const cachedData = localStorage.getItem(cacheKey);

    try {
      if (cachedData) {
        // LOAD FROM CACHE (Instant, 0 tokens)
        setStatus('running', 'Loading from cache...');
        const parsedCache = JSON.parse(cachedData);
        explainData = parsedCache.exp;
        vizData     = parsedCache.viz;
        toast('Loaded from cache (0 tokens used!)', 'success');
        
      } else {
        // FETCH FROM API
        setStatus('running', 'Fetching explanation + visualization…');
        const [exp, viz] = await Promise.all([
          Analyzer.explain(code, detectedLang.lang, apiKey),
          Analyzer.visualize(code, detectedLang.lang, apiKey)
        ]);

        explainData = exp;
        vizData     = viz;

        // Save to cache for next time
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ exp, viz }));
        } catch (e) {
          // If storage is full, clear old VisuaCode caches and try saving again
          console.warn("Storage full. Clearing old cache...");
          Object.keys(localStorage).forEach(k => {
             if (k.startsWith('vc_cache_')) localStorage.removeItem(k);
          });
          localStorage.setItem(cacheKey, JSON.stringify({ exp, viz }));
        }
      }

      // Render the fetched or cached data
      Explainer.renderExplanation(explainData);
      Agent.setContext(code, detectedLang.lang, explainData.summary || '');

      // 2D visualization
      show2D(vizData);

      // If user is already on 3D view, start it immediately
      const activeView = document.querySelector('.view.active').id;
      if (activeView === 'view-viz3d') {
        show3D(vizData);
      } else {
        viz3DStarted = false; // Will trigger show3D when view is switched
      }

      setStatus('done', `Done — ${detectedLang.lang} · ${vizData.vizType}`);
      if (!cachedData) toast('Analysis complete!', 'success');
      
      // Auto-switch to Explain view after analysis
      if (activeView === 'view-home') switchView('explain');

    } catch (err) {
      Explainer.renderError(`Error: ${err.message}`);
      setStatus('error', 'Analysis failed');
      toast(err.message, 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<span class="btn-glow"></span> ⚡ Analyze';
    }
  }

  // ── 2D ────────────────────────────────────────────────────────────────
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

  // ── 3D ────────────────────────────────────────────────────────────────
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

    try {
      const res = await Agent.ask(q, apiKey);
      Agent.removeTyping();
      if (res.error)       Agent.addMessage('bot', res.message, 'is-error');
      else if (res.outOfScope) Agent.addMessage('bot', res.message, 'out-of-scope');
      else                 Agent.addMessage('bot', res.answer);
    } catch (err) {
      Agent.removeTyping();
      Agent.addMessage('bot', `Error: ${err.message}`, 'is-error');
    } finally {
      agentSend.disabled = false;
    }
  }

  // ── CLEAR ─────────────────────────────────────────────────────────────
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

  // ── STATUS ────────────────────────────────────────────────────────────
  function setStatus(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = text;
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────
  function saveApiKey() {
    const k = groqKeyInput.value.trim();
    if (!k) { toast('Enter a valid key', 'error'); return; }
    apiKey = k;
    localStorage.setItem('vc_groq', k);
    updateBanner();
    toast('API key saved!', 'success');
  }

  function updateBanner() {
    apiBanner.style.display = apiKey ? 'none' : 'flex';
  }

  // ── TOAST ─────────────────────────────────────────────────────────────
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

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());