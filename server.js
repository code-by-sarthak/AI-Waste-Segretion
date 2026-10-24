const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Fallback Model Pool for maximum resilience
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite'
];

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Standard System Prompt complying with SWM Rules, 2016 & Swachh Bharat Mission
const SYSTEM_PROMPT = `You are an AI waste classification assistant inspired by the Swachh Bharat Mission and India's Solid Waste Management Rules, 2016.

Analyze the uploaded image. Identify every visible waste item and classify each into exactly one category:
1. Wet / Organic
2. Dry / Recyclable
3. Hazardous
4. E-waste
5. Sanitary / Biomedical
6. Mixed / Unidentified

Rules:
- If multiple items are visible, list each separately.
- If the image is blurry, pitch black, or contains no waste, set "status" to "unclear" and ask for a clearer photo in "message".
- Never claim certainty you don't have; lower the confidence to "medium" or "low" instead.
- For hazardous items, warn the user not to handle them directly without gloves or tongs.
- Mention that bin colours may differ slightly by municipality (e.g., Bengaluru 3-way, Indore door-to-door, Delhi, Mumbai).
- Give practical disposal steps and recycling tips tailored to an Indian household.

Respond ONLY with valid JSON in this exact structure:
{
  "status": "ok",
  "items": [
    {
      "name": "Item name (e.g., Banana Peel, Plastic Milk Pouch)",
      "category": "Wet / Organic | Dry / Recyclable | Hazardous | E-waste | Sanitary / Biomedical | Mixed / Unidentified",
      "bin": "Green Bin | Blue Bin | Red / Black Bin | E-waste Centre | Wrapped Paper",
      "disposal_steps_en": ["Step 1", "Step 2", "Step 3"],
      "disposal_steps_hi": ["कदम 1", "कदम 2", "कदम 3"],
      "recycling_tip": "Practical recycling, composting or upcycling tip",
      "safety_warning": "Safety advice (e.g., wash hands, do not touch barehanded). Empty string if none.",
      "environmental_benefit": "Specific environmental impact",
      "confidence": "high | medium | low"
    }
  ],
  "summary_hi": "कचरा वर्गीकरण का संक्षिप्त सारांश हिंदी में",
  "message": "Friendly guidance or request for clearer photo"
}`;

// Prompt for Rapid Live Captioning over Camera Feed
const LIVE_CAPTION_PROMPT = `You are a real-time AI waste identifier. In 1 concise sentence (max 20 words), state what waste item is visible, its category (Wet/Dry/Hazardous/E-waste/Sanitary), and designated municipal bin colour (Green/Blue/Red/Yellow).
If no clear waste is visible, return: {"caption": "Looking for waste items... Point camera closer.", "category": "None", "bin": "None"}.
Respond ONLY with raw JSON: {"caption": "string", "category": "string", "bin": "string"}`;

// Helper: Get active key (environment variable or request header)
function getActiveKey(req) {
  const headerKey = req.headers['x-gemini-key'];
  if (headerKey && headerKey.trim().length > 10) {
    return headerKey.trim();
  }
  return GEMINI_API_KEY;
}

// Resilient Gemini Invoker with automatic fallback across models
async function callGeminiWithFallback(apiKey, requestBody) {
  let lastError = null;
  const uniqueModels = [...new Set(CANDIDATE_MODELS.filter(Boolean))];

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data, model };
      }

      const errText = await response.text();
      console.warn(`Model ${model} returned ${response.status}: ${errText.substring(0, 100)}`);
      lastError = { status: response.status, message: errText };

      // If model is retired (404) or busy (503/429), try next available model in candidate pool
      if (response.status === 404 || response.status === 503 || response.status === 429) {
        continue;
      } else {
        break;
      }
    } catch (err) {
      console.warn(`Network error with model ${model}:`, err.message);
      lastError = { status: 500, message: err.message };
    }
  }

  return { success: false, error: lastError };
}

// API: Health Check
app.get('/api/health', (req, res) => {
  const isKeyConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    version: '1.2.0',
    ai_configured: isKeyConfigured,
    model: GEMINI_MODEL,
    message: isKeyConfigured ? 'Vision AI is active.' : 'Demo Mode: Add GEMINI_API_KEY in .env or via settings.'
  });
});

// API: Save API Key dynamically to .env
app.post('/api/save-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || apiKey.trim().length < 10) {
      return res.status(400).json({ status: 'error', message: 'Invalid API key provided.' });
    }

    const cleanKey = apiKey.trim();
    GEMINI_API_KEY = cleanKey;

    const envPath = path.join(__dirname, '.env');
    let envContent = `PORT=${PORT}\nGEMINI_API_KEY=${cleanKey}\nGEMINI_MODEL=${GEMINI_MODEL}\n`;
    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log(`✅ Gemini API Key successfully saved and activated.`);
    return res.json({ status: 'ok', message: 'Gemini API Key saved and activated successfully!' });
  } catch (err) {
    console.error('Error saving API key:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to write .env: ' + err.message });
  }
});

// API: Rapid Live Caption Endpoint
app.post('/api/live-caption', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ status: 'error', message: 'No frame provided.' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = image;
    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

    const activeKey = getActiveKey(req);
    const isKeyConfigured = Boolean(activeKey && activeKey.length > 10 && activeKey !== 'your_gemini_api_key_here');

    if (!isKeyConfigured) {
      return res.json({
        caption: "Demo Mode: Add Gemini API key for live real-time captions!",
        category: "Demo",
        bin: "Green / Blue Bin"
      });
    }

    const requestBody = {
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: LIVE_CAPTION_PROMPT }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 150
      }
    };

    const callResult = await callGeminiWithFallback(activeKey, requestBody);
    if (!callResult.success) {
      return res.status(502).json({ status: 'error', caption: 'Live caption temporarily unavailable.' });
    }

    const candidate = callResult.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) return res.json({ caption: "Scanning for waste...", category: "None", bin: "None" });

    let cleaned = candidate.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);

  } catch (err) {
    return res.json({ caption: "Scanning...", category: "Scanning", bin: "..." });
  }
});

// API: Full Classification via Gemini Vision
app.post('/api/classify', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ status: 'error', message: 'No image data provided.' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = image;
    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

    if (base64Data.length > 7 * 1024 * 1024) {
      return res.status(400).json({ status: 'error', message: 'Image size exceeds 5MB limit.' });
    }

    const activeKey = getActiveKey(req);
    const isKeyConfigured = Boolean(activeKey && activeKey.length > 10 && activeKey !== 'your_gemini_api_key_here');

    if (!isKeyConfigured) {
      return res.json(generateDemoResponse());
    }

    const requestBody = {
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: SYSTEM_PROMPT }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const callResult = await callGeminiWithFallback(activeKey, requestBody);

    if (!callResult.success) {
      console.error('All candidate Gemini models failed:', callResult.error);
      return res.status(502).json({
        status: 'error',
        message: `Gemini API returned error (${callResult.error?.status || 502}). Please check your API key or quota.`
      });
    }

    const candidate = callResult.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      return res.status(502).json({
        status: 'error',
        message: 'Vision AI produced an empty response. Please try with clearer lighting.'
      });
    }

    let cleaned = candidate.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    let parsedResult = JSON.parse(cleaned);

    return res.json(parsedResult);

  } catch (error) {
    console.error('Server /classify Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing image. ' + error.message
    });
  }
});

// Helper for Demo / Simulated Classification
function generateDemoResponse() {
  return {
    status: "ok",
    is_demo: true,
    message: "Demo Mode Active: Set your GEMINI_API_KEY in .env or via Settings for live AI scanning!",
    items: [
      {
        name: "Plastic Water / Beverage Bottle",
        category: "Dry / Recyclable",
        bin: "Blue Bin (नीला डस्टबिन)",
        disposal_steps_en: [
          "Empty all residual water or liquid completely.",
          "Crush the bottle flat and put the cap back on.",
          "Place in the blue dry-waste bin or save for the local Kabadiwala."
        ],
        disposal_steps_hi: [
          "बोतल में बचा हुआ पानी पूरी तरह खाली करें।",
          "बोतल को दबाकर चपटा (crush) करें ताकि जगह बचे।",
          "नीले सूखे कचरे के डब्बे में डालें या कबाड़ीवाले को दें।"
        ],
        recycling_tip: "PET plastic bottles are shredded into flakes and spun into recycled polyester yarn.",
        safety_warning: "",
        environmental_benefit: "Recycling PET plastic prevents petroleum depletion and stops microplastic pollution.",
        confidence: "high"
      },
      {
        name: "Banana / Fruit Peel",
        category: "Wet / Organic",
        bin: "Green Bin (हरा डस्टबिन)",
        disposal_steps_en: [
          "Do not wrap inside plastic or polythene carry bags.",
          "Place directly into your kitchen green wet-waste bin.",
          "Can be deposited into your society compost pit or garden soil."
        ],
        disposal_steps_hi: [
          "इसे कभी भी प्लास्टिक की पॉलीथिन में बंद न करें।",
          "सीधे अपनी रसोई के हरे गीले कचरे के डब्बे में डालें।",
          "पौधों की खाद या कंपोस्ट पॉट में भी डाल सकते हैं।"
        ],
        recycling_tip: "Banana peels are rich in potassium and phosphorus for home gardens.",
        safety_warning: "",
        environmental_benefit: "Diverting organic waste from landfills reduces methane gas emissions by over 95%.",
        confidence: "high"
      }
    ],
    summary_hi: "डेमो परिणाम: प्लास्टिक की बोतल को सूखे कचरे (नीला) में और केले के छिलके को गीले कचरे (हरा) में डालें।"
  };
}

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌱 EcoSort AI Server running at: http://localhost:${PORT}`);
  console.log(`🌿 Resilient Vision AI Model: ${GEMINI_MODEL} is ACTIVE.`);
  console.log(`=======================================================`);
});
