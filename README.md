# ⬡ VisuaCode — v2.0

A complete code visualization + explanation tool. Pure HTML/CSS/JS.

## 5 Panels
| Panel | What it does |
|---|---|
| **Code Editor** | Paste/type/upload code — auto-detects language |
| **Explanation** | Line-by-line logic breakdown with type tags & complexity |
| **2D Visualization** | Structure-aware SVG diagram (linked list, tree, array, stack, queue, graph, hashmap, flowchart) with step-by-step animation |
| **3D Visualization** | Interactive Three.js 3D diagram — drag to rotate, scroll to zoom, step animation |
| **Agent** | Code-scoped Q&A — only answers from the provided code |

## Setup
1. Get a free Groq key at [console.groq.com](https://console.groq.com)
2. Open `index.html` in Chrome/Firefox
3. Click ⚙ → paste key → Save
4. Paste code → **⚡ Analyze**

## Structure
```
VisuaCode/
├── index.html
├── style.css
├── js/
│   ├── detector.js     — 18+ language auto-detection
│   ├── analyzer.js     — Groq API: explanation + viz data
│   ├── explainer.js    — Renders explanation cards
│   ├── visualizer2d.js — SVG renderer (8 structure types)
│   ├── visualizer3d.js — Three.js 3D renderer (8 structure types)
│   ├── agent.js        — Code-scoped Q&A via Groq
│   └── app.js          — Main controller
└── README.md
```

## Tech
- Pure HTML/CSS/JS — no build tools
- Three.js r128 (CDN)
- Groq llama-3.3-70b-versatile (free)
- Google Fonts: Syne + Space Mono
