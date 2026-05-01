// ===== CODE AGENT =====

const Agent = (() => {

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL    = 'llama-3.1-8b-instant'; // Fast, token-efficient model for chat

  let _code = '', _lang = '', _summary = '';

  function setContext(code, lang, summary) {
    _code = code || ''; _lang = lang || ''; _summary = summary || '';
  }
  function clearContext() { _code = ''; _lang = ''; _summary = ''; }

  async function ask(question, apiKey) {
    if (!_code.trim()) return { outOfScope: true, message: 'No code analyzed yet. Paste code and click Analyze first.' };
    if (!apiKey)       return { error: true, message: 'No Groq API key set. Click ⚙ to add it.' };

    // Inject explicit line numbers into the code so the AI doesn't have to guess or count blindly.
    const numberedCode = _code.split('\n').map((line, idx) => `${idx + 1} | ${line}`).join('\n');

    const system = `You are a precise code Q&A agent. Answer ONLY from the ${_lang} code provided.
If the answer is NOT in the code, reply with exactly: OUT_OF_SCOPE: <reason>
Otherwise be specific — cite variable names, line logic, algorithm used.
Use backticks for code references.

Summary: ${_summary}

Code with line numbers:
\`\`\`${_lang}
${numberedCode}
\`\`\``;

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL, max_tokens: 500, temperature: 0.1,
        messages: [{ role: 'system', content: system }, { role: 'user', content: question }]
      })
    });

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error?.message || `API error ${resp.status}`);
    }

    const data = await resp.json();
    const text = data.choices[0].message.content.trim();

    if (text.startsWith('OUT_OF_SCOPE:')) {
      return { outOfScope: true, message: `Not found in the code.\n\n${text.replace('OUT_OF_SCOPE:', '').trim()}` };
    }
    return { answer: text };
  }

  // ── DOM helpers ───────────────────────────────────────────────────────
  function addMessage(role, content, cls = '') {
    const container = document.getElementById('agentMessages');
    const row = document.createElement('div');
    row.className = `agent-row ${role === 'user' ? 'agent-row--user' : ''}`;

    if (role === 'bot') {
      const av = document.createElement('div');
      av.className = 'bot-avatar'; av.textContent = '✦'; 
      row.appendChild(av);
    }

    const bubble = document.createElement('div');
    bubble.className = `agent-bubble ${cls}`;
    bubble.innerHTML = formatText(content);
    row.appendChild(bubble);

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return row;
  }

  function addTyping() {
    const container = document.getElementById('agentMessages');
    const row = document.createElement('div');
    row.className = 'agent-row';
    row.id = 'typingRow';

    const av = document.createElement('div');
    av.className = 'bot-avatar'; av.textContent = '✦';

    const bubble = document.createElement('div');
    bubble.className = 'agent-bubble';
    bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

    row.appendChild(av); row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('typingRow');
    if (el) el.remove();
  }

  function formatText(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { setContext, clearContext, ask, addMessage, addTyping, removeTyping };
})();

window.Agent = Agent;