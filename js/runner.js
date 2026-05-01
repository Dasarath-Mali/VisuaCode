// ===== CODE RUNNER (AI SIMULATOR) =====
// Uses secure Vercel backend (/api/groq) to simulate execution.
// Supports stdin, detects input() calls, animates output

const Runner = (() => {

  // 🔒 Pointing to your new secure Vercel backend instead of Groq directly!
  const GROQ_URL = '/api/groq';
  const MODEL    = 'llama-3.1-8b-instant'; // Fast, cheap model for simulation

  // ── INPUT DETECTION PATTERNS per language ──────────────────────────────
  const INPUT_PATTERNS = {
    'Python':     [/\binput\s*\(/,         /sys\.stdin/,        /raw_input\s*\(/],
    'JavaScript': [/readline\s*\(/,        /process\.stdin/,    /prompt\s*\(/],
    'TypeScript': [/readline\s*\(/,        /process\.stdin/],
    'Java':       [/Scanner\s*\(/,         /\.nextLine\(/,      /\.nextInt\(/,      /BufferedReader/],
    'C++':        [/cin\s*>>/,             /getline\s*\(/,      /scanf\s*\(/],
    'C':          [/scanf\s*\(/,           /fgets\s*\(/,        /getchar\s*\(/,     /gets\s*\(/],
    'C#':         [/Console\.Read/,        /ReadLine\s*\(/,     /ReadKey\s*\(/],
    'Go':         [/fmt\.Scan/,            /bufio\.NewScanner/, /os\.Stdin/],
    'Rust':       [/stdin\(\)/,            /read_line\s*\(/,    /BufRead/],
    'Ruby':       [/gets\s*(\.|\.chomp)?/, /STDIN\.gets/,       /readline/],
    'PHP':        [/fgets\s*\(STDIN/,      /readline\s*\(/,     /fread\s*\(STDIN/],
    'Swift':      [/readLine\s*\(/],
    'Kotlin':     [/readLine\s*\(/,        /Scanner\s*\(/,      /System\.`in`/],
    'Shell':      [/\bread\b/,             /\$\{.*\}/],
    'Dart':       [/stdin\.readLineSync/,  /io\.stdin/],
  };

  // ── TIPS per language ──────────────────────────────────────────────────
  const INPUT_TIPS = {
    'Python':     'input() detected — one value per line',
    'JavaScript': 'readline() detected — one value per line',
    'TypeScript': 'readline() detected — one value per line',
    'Java':       'Scanner detected — one value per line',
    'C++':        'cin >> detected — space/newline separated values',
    'C':          'scanf detected — space/newline separated values',
    'C#':         'Console.ReadLine detected — one value per line',
    'Go':         'fmt.Scan detected — space/newline separated values',
    'Rust':       'stdin read_line detected — one value per line',
    'Ruby':       'gets detected — one value per line',
    'PHP':        'STDIN detected — one value per line',
    'Swift':      'readLine() detected — one value per line',
    'Kotlin':     'readLine() detected — one value per line',
    'Shell':      'read detected — one value per line',
    'Dart':       'stdin.readLineSync detected — one value per line',
  };

  // ── DETECT if code needs input ─────────────────────────────────────────
  function detectsInput(code, lang) {
    const patterns = INPUT_PATTERNS[lang] || [];
    return patterns.some(p => p.test(code));
  }

  // ── MAIN RUN (AI SIMULATION) ──────────────────────────────────────────
  async function run(code, detectedLang, stdinText = '', apiKey = '') {
    const start = performance.now();

    const systemPrompt = `You are a deterministic, strict code execution engine.
Analyze the provided ${detectedLang} code and simulate its exact runtime execution step-by-step.

USER STDIN PROVIDED:
"""
${stdinText}
"""

CRITICAL INSTRUCTIONS:
1. You MUST use the exact values from the USER STDIN when the code asks for input (e.g., scanf, cin, input()).
2. DO NOT hallucinate, guess, or output generic placeholder data. 
3. If the user provides numbers or specific strings, the standard output MUST reflect the processing of those exact inputs in the correct order.
4. If the code loops until a specific word (like "done"), process the inputs until you hit that word, then simulate the exit.
5. Return ONLY valid JSON.

Format:
{
  "stdout": "the exact standard output based strictly on the stdin...",
  "stderr": "error messages if any",
  "exitCode": 0
}`;

    // Set up headers. If the user has a personal key, send it.
    // If not, our Vercel backend will automatically use the hidden default key.
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.05, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: code }
        ]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }

    const data = await resp.json();
    const parsed = parseJSON(data.choices[0].message.content);
    
    const end = performance.now();

    return {
      stdout:    parsed.stdout || '',
      stderr:    parsed.stderr || '',
      exitCode:  parsed.exitCode ?? 0,
      time:      Math.round(end - start),
      language:  detectedLang,
      version:   'AI-Sim',
      stdinUsed: stdinText,
    };
  }

  function parseJSON(raw) {
    const clean = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      return { stdout: '', stderr: 'Failed to simulate execution output.', exitCode: 1 };
    }
  }

  // ── UI: update stdin panel based on code ──────────────────────────────
  function updateStdinPanel(code, lang) {
    const needs   = detectsInput(code, lang);
    const hint    = document.getElementById('stdinHint');
    const tips    = document.getElementById('tipDetected');
    const panel   = document.getElementById('stdinPanel');

    if (!hint || !tips || !panel) return;

    if (needs) {
      hint.textContent = '• Input detected';
      hint.classList.add('visible');
      tips.textContent = INPUT_TIPS[lang] || 'Provide one input value per line';
      // Auto-expand if collapsed
      const body = document.getElementById('stdinBody');
      const btn  = document.getElementById('stdinToggle');
      if (body && body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        if (btn) btn.classList.remove('collapsed');
      }
    } else {
      hint.textContent = '';
      hint.classList.remove('visible');
      tips.textContent = 'No input() calls detected — you can still provide stdin if needed';
    }
  }

  // ── RENDER: loading ───────────────────────────────────────────────────
  function renderRunning() {
    const shell = document.getElementById('outputShell');
    shell.innerHTML = `<div class="loading-clay"><div class="spin"></div><span>Simulating execution…</span></div>`;
    const status = document.getElementById('runStatus');
    const time   = document.getElementById('execTime');
    if (status) { status.textContent = 'Running…'; status.style.color = 'var(--yellow)'; }
    if (time)   time.textContent = '';
  }

  // ── RENDER: result ────────────────────────────────────────────────────
  function renderResult(result) {
    const shell  = document.getElementById('outputShell');
    const status = document.getElementById('runStatus');
    const time   = document.getElementById('execTime');
    shell.innerHTML = '';

    const hasOut = result.stdout.trim();
    const hasErr = result.stderr.trim();
    const hasIn  = result.stdinUsed && result.stdinUsed.trim();

    // ── Show stdin echo if used ──
    if (hasIn) {
      const lbl = mk('span', 'output-section-label is-stdin');
      lbl.textContent = '⌨ stdin provided';
      shell.appendChild(lbl);
      result.stdinUsed.split('\n').forEach((line, i) => {
        if (!line && i === result.stdinUsed.split('\n').length - 1) return;
        const el = mk('span', 'output-line output-stdin-echo');
        el.style.animationDelay = `${i * 30}ms`;
        el.textContent = `  ${line}`;
        shell.appendChild(el);
      });
    }

    // ── Stdout ──
    if (hasOut) {
      const lbl = mk('span', 'output-section-label is-stdout');
      lbl.textContent = '▶ output';
      shell.appendChild(lbl);
      result.stdout.split('\n').forEach((line, i) => {
        const el = mk('span', 'output-line');
        el.style.animationDelay = `${i * 25}ms`;
        el.textContent = line;
        shell.appendChild(el);
      });
    }

    // ── Stderr ──
    if (hasErr) {
      const lbl = mk('span', 'output-section-label is-stderr');
      lbl.textContent = '⚠ stderr / compile error';
      shell.appendChild(lbl);
      result.stderr.split('\n').forEach((line, i) => {
        if (!line.trim()) return;
        const el = mk('span', 'output-line output-error');
        el.style.animationDelay = `${i * 25}ms`;
        el.textContent = line;
        shell.appendChild(el);
      });
    }

    // ── No output at all ──
    if (!hasOut && !hasErr) {
      const el = mk('span', 'output-line output-success');
      el.textContent = '✓ Exited cleanly with no output';
      shell.appendChild(el);
    }

    // ── Meta bar ──
    const meta = mk('span', 'output-line output-meta');
    const exitOk = result.exitCode === 0;
    const exitLabel = exitOk ? '✓ exit 0' : `✗ exit ${result.exitCode}`;
    meta.textContent = `${result.language} ${result.version}  ·  ${exitLabel}  ·  ${result.time}ms`;
    shell.appendChild(meta);

    // ── Status bar ──
    if (status) {
      status.textContent = exitOk ? '✓ Success' : `✗ Exit ${result.exitCode}`;
      status.style.color = exitOk ? 'var(--green)' : 'var(--red)';
    }
    if (time) time.textContent = result.time + 'ms';
  }

  // ── RENDER: error ─────────────────────────────────────────────────────
  function renderError(msg) {
    const shell  = document.getElementById('outputShell');
    const status = document.getElementById('runStatus');
    shell.innerHTML = '';
    const lbl = mk('span', 'output-section-label is-stderr');
    lbl.textContent = '⚠ execution error';
    shell.appendChild(lbl);
    const el = mk('span', 'output-line output-error');
    el.textContent = msg;
    shell.appendChild(el);
    if (status) { status.textContent = '✗ Error'; status.style.color = 'var(--red)'; }
  }

  // ── Helper ────────────────────────────────────────────────────────────
  function mk(tag, cls) {
    const el = document.createElement(tag);
    el.className = cls;
    return el;
  }

  // ── STDIN toggle wiring (called from app.js init) ─────────────────────
  function initStdinToggle() {
    const header = document.querySelector('.stdin-header');
    const body   = document.getElementById('stdinBody');
    const btn    = document.getElementById('stdinToggle');
    if (!header || !body || !btn) return;

    header.addEventListener('click', () => {
      const hidden = body.classList.toggle('hidden');
      btn.classList.toggle('collapsed', hidden);
    });
  }

  return { run, detectsInput, updateStdinPanel, renderRunning, renderResult, renderError, initStdinToggle };
})();

window.Runner = Runner;