# ⬡ VisuaCode — v2.0

A production-grade code visualization, simulation, and explanation environment. Built with a Claymorphic design system and secured via a Vercel Serverless backend.[cite: 3]

## ✨ Features & Panels
| Feature | Description |
|---|---|
| **Code Editor** | Auto-detects 18+ languages.[cite: 3] |
| **Code Runner** | **[NEW]** Simulates exact runtime execution via AI, including robust Standard Input (`stdin`) support. |
| **Explanation** | Line-by-line logic breakdown with semantic type tags and time/space complexity analysis.[cite: 3] |
| **2D Visualization** | Structure-aware SVG diagrams (linked lists, trees, arrays, stacks, queues, graphs, hashmaps) with step-by-step animation.[cite: 3] |
| **3D Visualization** | Interactive Three.js 3D diagrams — drag to rotate, scroll to zoom, step animation.[cite: 3] |
| **Code Agent** | Code-scoped Q&A — strictly answers questions based only on the provided code context.[cite: 3] |

## 🔒 Security & Architecture
* **Serverless Backend:** Uses Vercel Serverless Functions (`/api/groq.js`) to securely proxy requests to the Groq API, protecting the default API key from frontend exposure.
* **Bring Your Own Key (BYOK):** Features a dynamic, blurred modal that prompts users to input their own free Groq API key if the public rate limit is reached (or to bypass limits entirely).
* **Local Caching:** Zero-token re-renders. Analyzed code and `stdin` combinations are hashed and cached directly in the browser's `localStorage`.

## 🚀 Setup & Deployment

### Local Development
1. Clone the repository.
2. Open `index.html` in Chrome/Firefox.[cite: 3]
3. Click ⚙ (Settings), paste your [Groq API Key](https://console.groq.com), and click Save.
4. Paste your code and click **⚡ Analyze**.[cite: 3]

### Vercel Deployment (Recommended)
1. Push the code to your GitHub repository.
2. Import the repository into Vercel.
3. In the Vercel Dashboard, navigate to **Settings → Environment Variables**.
4. Add a new variable named `GROQ_API_KEY` and paste your secure key.
5. Deploy the project.

## 📂 Structure
\`\`\`text
VisuaCode/
├── index.html
├── style.css           — Claymorphic/Neumorphic UI tokens[cite: 1]
├── api/
│   └── groq.js         — Secure Vercel Serverless proxy backend
├── js/
│   ├── detector.js     — 18+ language auto-detection[cite: 3]
│   ├── analyzer.js     — Groq API: structure data + stdin context[cite: 3]
│   ├── explainer.js    — Renders explanation cards[cite: 3]
│   ├── visualizer2d.js — SVG renderer[cite: 3]
│   ├── visualizer3d.js — Three.js interactive renderer[cite: 3]
│   ├── agent.js        — Code-scoped Q&A via Llama 3.1 8B[cite: 3]
│   ├── runner.js       — AI Execution Simulator
│   ├── theme.js        — Theme and UI manager
│   └── app.js          — Main controller & state management[cite: 3]
└── README.md
\`\`\`

## 🛠 Tech Stack
- **Frontend:** Pure HTML / CSS / Vanilla JS (No build tools required)[cite: 3]
- **Backend:** Vercel Serverless (Node.js)
- **3D Graphics:** Three.js r128 (CDN)[cite: 3]
- **AI Models:** Groq `llama-3.3-70b-versatile` (Analysis) & `llama-3.1-8b-instant` (Agent & Runner)[cite: 3]
- **Typography:** Cabinet Grotesk & JetBrains Mono[cite: 1]

---
**Author:** Dasarath Mali