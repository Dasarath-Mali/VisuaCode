// ===== SECURE BACKEND PROXY (api/groq.js) =====
// This code runs exclusively on Vercel's backend servers.
// It is completely hidden from the user's browser.

export default async function handler(req, res) {
  // 1. Handle CORS preflight (Allows your local dev server to talk to Vercel)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Block anything that isn't a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // 3. Determine which API key to use
    // Look for a key sent by the frontend (if the user saved one in settings)
    const authHeader = req.headers.authorization || '';
    let activeKey = authHeader.replace('Bearer ', '').trim();

    // If the frontend didn't send a key, use your secure Vercel Environment Variable
    if (!activeKey || activeKey === 'null' || activeKey === 'undefined') {
      activeKey = process.env.GROQ_API_KEY;
    }

    // Safety check: Make sure a key actually exists
    if (!activeKey) {
      return res.status(500).json({ 
        error: { message: "Server configuration error: Missing GROQ_API_KEY in Vercel." } 
      });
    }

    // 4. Forward the exact request from the frontend directly to Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify(req.body) // Pass along the prompt, model, and temp
    });

    const data = await groqResponse.json();

    // 5. If Groq throws an error (like Rate Limit 429), pass that exact error back to app.js
    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json(data);
    }

    // 6. Send the successful AI response back to the frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ 
      error: { message: "Internal Server Error communicating with Groq." } 
    });
  }
}