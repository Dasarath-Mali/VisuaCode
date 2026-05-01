// ===== ANALYZER =====
// Calls Groq to get structure-aware visualization data AND explanation

const Analyzer = (() => {

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL    = 'llama-3.3-70b-versatile';

  // ── EXPLAIN ─────────────────────────────────────────────────────────
  async function explain(code, language, apiKey) {
    const prompt = `You are an expert code explainer. Analyze this ${language} code.

Return ONLY valid JSON — no markdown, no extra text:
{
  "summary": "2-3 sentence overview of what this code does",
  "complexity": {"time": "O(?)", "space": "O(?)"},
  "lines": [
    {
      "lineNum": "1",
      "code": "exact snippet (max 55 chars)",
      "type": "declaration|logic|function|loop|condition|return|import|class|comment|other",
      "explanation": "What this line does and WHY — mention algorithm/pattern if applicable"
    }
  ]
}

Rules:
- Group blank lines and closing braces together with prior lines
- lineNum can be "3", "5-7", "10-12" for grouped lines
- Explanations must be clear and logic-focused (1-2 sentences)

Code:
\`\`\`${language}
${code}
\`\`\``;

    const data = await groqPost(prompt, apiKey, 4000);
    return parseJSON(data.choices[0].message.content);
  }

  // ── VISUALIZE ────────────────────────────────────────────────────────
  // NEW: Added stdinText as the 4th parameter
  async function visualize(code, language, apiKey, stdinText = '') {
    const prompt = `You are a code visualization expert. Analyze this ${language} code and determine what data structure or algorithm it represents. Return ONLY valid JSON — no markdown, no extra text.

USER STDIN PROVIDED:
"""
${stdinText}
"""

CRITICAL INSTRUCTIONS FOR NODE VALUES:
If the code takes user input (stdin) to build the data structure, you MUST use the exact values from the USER STDIN above for the node "value" fields. 
DO NOT use generic placeholder names like "user_input_1" or "item_1". If the user provided 5 numbers, you must generate 5 nodes containing those exact numbers in order.

IMPORTANT: Choose the vizType that best matches the code:
- "linked_list"        → singly linked list
- "doubly_linked_list" → doubly linked list  
- "binary_tree"        → general binary tree
- "bst"                → binary search tree
- "array"              → array/list operations
- "stack"              → stack (push/pop)
- "queue"              → queue (enqueue/dequeue)
- "graph"              → general graph with edges
- "hash_map"           → hash table/dictionary
- "sorting"            → sorting algorithm (show array)
- "flowchart"          → general program flow (default if nothing else fits)

Return this JSON structure:

{
  "vizType": "one of the types above",
  "title": "Short descriptive title e.g. 'Singly Linked List Traversal'",
  "description": "One sentence what this code does at runtime",
  "nodes": [],
  "edges": [],
  "root": null,
  "animationSteps": [],
  "complexity": {"time": "O(n)", "space": "O(1)"}
}

NODE FORMAT per vizType:

linked_list / doubly_linked_list:
  nodes: [
    {"id":"n1","value":"2","next":"n2","prev":null},
    {"id":"n2","value":"4","next":"n3","prev":"n1"}
  ]
  CRITICAL: Show ALL realistic example nodes the code creates based on the stdin, up to 25 nodes.

binary_tree / bst:
  root: "n1"
  nodes: [
    {"id":"n1","value":"8","left":"n2","right":"n3"}
  ]
  CRITICAL: Show ALL nodes generated based on stdin, up to 25 nodes.

array / sorting:
  nodes: [
    {"id":"i0","index":0,"value":"64"}
  ]
  CRITICAL: Extract and show all elements, up to 25 elements.

stack:
  nodes: [
    {"id":"s0","value":"10","position":"bottom"}
  ]
  CRITICAL: Show all elements pushed to the stack, up to 20 elements.

queue:
  nodes: [
    {"id":"q0","value":"A","label":"FRONT"}
  ]
  CRITICAL: Show all elements enqueued, up to 20 elements.

graph:
  nodes: [{"id":"n1","label":"A"}]
  edges: [{"from":"n1","to":"n2","directed":true,"weight":"5"}]
  CRITICAL: Extract all distinct nodes and edges, up to 20 nodes.

hash_map:
  nodes: [
    {"id":"h0","key":"name","value":"Alice","hash":0}
  ]
  CRITICAL: Extract all map entries or buckets, up to 20 elements.

flowchart:
  nodes: [
    {"id":"f1","label":"Start","type":"start"}
  ]
  edges: [
    {"from":"f1","to":"f2","label":""}
  ]

ANIMATION STEPS (up to 10 steps showing how the algorithm runs step-by-step):
[
  {"step":1,"description":"Initialize: head points to first node (value=10)","activeNodes":["n1"],"activeEdges":[]}
]

EDGE IDs in activeEdges should be "fromId-toId" e.g. "n1-n2".

Code:
\`\`\`${language}
${code}
\`\`\``;

    const data = await groqPost(prompt, apiKey, 6000);
    return parseJSON(data.choices[0].message.content);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────
  async function groqPost(prompt, apiKey, maxTokens) {
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature: 0.05, // Lowered temperature to force strict adherence to your inputs
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }
    return resp.json();
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
      throw new Error('Could not parse API response as JSON');
    }
  }

  return { explain, visualize };
})();

window.Analyzer = Analyzer;