# ⬡ VisuaCode — v2.0

A production-grade code visualization, simulation, and explanation environment. Built with a Claymorphic design system and secured via a Vercel Serverless backend.

## ✨ Features & Panels
| Feature | Description |
|---|---|
| **Code Editor** | Auto-detects 18+ languages. |
| **Code Runner** | **[NEW]** Simulates exact runtime execution via AI, including robust Standard Input (`stdin`) support. |
| **Explanation** | Line-by-line logic breakdown with semantic type tags and time/space complexity analysis. |
| **2D Visualization** | Structure-aware SVG diagrams (linked lists, trees, arrays, stacks, queues, graphs, hashmaps) with step-by-step animation. |
| **3D Visualization** | Interactive Three.js 3D diagrams — drag to rotate, scroll to zoom, step animation. |
| **Code Agent** | Code-scoped Q&A — strictly answers questions based only on the provided code context. |

## 🔒 Security & Architecture
* **Serverless Backend:** Uses Vercel Serverless Functions (`/api/groq.js`) to securely proxy requests to the Groq API, protecting the default API key from frontend exposure.
* **Bring Your Own Key (BYOK):** Features a dynamic, blurred modal that prompts users to input their own free Groq API key if the public rate limit is reached (or to bypass limits entirely).
* **Local Caching:** Zero-token re-renders. Analyzed code and `stdin` combinations are hashed and cached directly in the browser's `localStorage`.

## 🚀 Setup & Deployment

### Local Development
1. Clone the repository.
2. Open `index.html` in Chrome/Firefox.
3. Click ⚙ (Settings), paste your [Groq API Key](https://console.groq.com), and click Save.
4. Paste your code and click **⚡ Analyze**.

### Vercel Deployment (Recommended)
1. Push the code to your GitHub repository.
2. Import the repository into Vercel.
3. In the Vercel Dashboard, navigate to **Settings → Environment Variables**.
4. Add a new variable named `GROQ_API_KEY` and paste your secure key.
5. Deploy the project.

## 📂 Structure
```text
VisuaCode/
├── index.html
├── style.css           — Claymorphic/Neumorphic UI tokens
├── api/
│   └── groq.js         — Secure Vercel Serverless proxy backend
├── js/
│   ├── detector.js     — 18+ language auto-detection
│   ├── analyzer.js     — Groq API: structure data + stdin context
│   ├── explainer.js    — Renders explanation cards
│   ├── visualizer2d.js — SVG renderer
│   ├── visualizer3d.js — Three.js interactive renderer
│   ├── agent.js        — Code-scoped Q&A via Llama 3.1 8B
│   ├── runner.js       — AI Execution Simulator
│   ├── theme.js        — Theme and UI manager
│   └── app.js          — Main controller & state management
└── README.md
--

*Author:** Dasarath Mali