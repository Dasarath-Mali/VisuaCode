// ===== CODE RUNNER (AI SIMULATOR) =====
// The public Piston API is now whitelist-only. 
// This runner uses the Groq LLM to predict and simulate code execution output.

const Runner = (() => {

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL    = 'llama-3.1-8b-instant';

  async function run(code, detectedLang) {
    const apiKey = localStorage.getItem('vc_groq');
    if (!apiKey) {
      throw new Error("Groq API key required. Please set it in Settings to simulate execution.");
    }

    const start = performance.now();

    const systemPrompt = `You are a strict, precise code execution engine simulator.
Analyze the provided ${detectedLang} code and predict its EXACT terminal output.

Return ONLY valid JSON. No markdown, no conversational text.
If the code has syntax errors or runtime exceptions, place that in "stderr" and set a non-zero exitCode.

Format:
{
  "stdout": "the exact standard output...",
  "stderr": "error messages if any, otherwise empty string",
  "exitCode": 0
}`;

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.1,
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
      stdout:   parsed.stdout || '',
      stderr:   parsed.stderr || '',
      exitCode: parsed.exitCode ?? 0,
      time:     Math.round(end - start),
      language: detectedLang,
      version:  'AI-Simulated',
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

  // ── RENDER ─────────────────────────────────────────────────────────────
  function renderRunning() {
    const shell = document.getElementById('outputShell');
    shell.innerHTML = `
      <div class="loading-clay">
        <div class="spin"></div>
        <span>Simulating execution…</span>
      </div>`;
    document.getElementById('runStatus').textContent = 'Running…';
    document.getElementById('runStatus').style.color = '';
    document.getElementById('execTime').textContent  = '';
  }

  function renderResult(result) {
    const shell  = document.getElementById('outputShell');
    const status = document.getElementById('runStatus');
    const time   = document.getElementById('execTime');

    shell.innerHTML = '';

    const hasOut = result.stdout.trim();
    const hasErr = result.stderr.trim();

    if (!hasOut && !hasErr) {
      const empty = document.createElement('span');
      empty.className = 'output-line output-success';
      empty.textContent = '✓ Program exited with no output (exit code 0)';
      shell.appendChild(empty);
    }

    if (hasOut) {
      result.stdout.split('\n').forEach(line => {
        const el = document.createElement('span');
        el.className = 'output-line';
        el.textContent = line;
        shell.appendChild(el);
      });
    }

    if (hasErr) {
      const sep = document.createElement('span');
      sep.className = 'output-line output-error';
      sep.textContent = '── STDERR ─────────────────';
      shell.appendChild(sep);
      result.stderr.split('\n').forEach(line => {
        if (!line.trim()) return;
        const el = document.createElement('span');
        el.className = 'output-line output-error';
        el.textContent = line;
        shell.appendChild(el);
      });
    }

    // Meta line
    const meta = document.createElement('span');
    meta.className = 'output-line output-meta';
    meta.textContent = `${result.language} (${result.version})  ·  exit ${result.exitCode}  ·  ${result.time}ms`;
    shell.appendChild(meta);

    status.textContent  = result.exitCode === 0 ? '✓ Success' : `✗ Exit ${result.exitCode}`;
    status.style.color  = result.exitCode === 0 ? 'var(--green)' : 'var(--red)';
    time.textContent    = result.time + 'ms';
  }

  function renderError(msg) {
    const shell = document.getElementById('outputShell');
    shell.innerHTML = `<span class="output-line output-error">✗ ${msg}</span>`;
    document.getElementById('runStatus').textContent = 'Error';
    document.getElementById('runStatus').style.color = 'var(--red)';
  }

  return { run, renderRunning, renderResult, renderError };
})();

window.Runner = Runner;