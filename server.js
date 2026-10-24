const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
- Give practical disposal steps and recycling tips tailored to an Indian household (e.g., mention kabadiwala, dry waste collection centres, composting at home, rinsing milk pouches).

Respond ONLY with valid JSON in this exact structure:
{
  "status": "ok",
  "items": [
    {
      "name": "Item name (e.g., Banana Peel, Plastic Milk Pouch)",
      "category": "Wet / Organic | Dry / Recyclable | Hazardous | E-waste | Sanitary / Biomedical | Mixed / Unidentified",
      "bin": "Green Bin | Blue Bin | Red / Black Bin | E-waste Centre | Wrapped Paper",
      "disposal_steps_en": [
        "Step 1 in English",
        "Step 2 in English",
        "Step 3 in English"
      ],
      "disposal_steps_hi": [
        "कदम 1 हिंदी में",
        "कदम 2 हिंदी में",
        "कदम 3 हिंदी में"
      ],
      "recycling_tip": "Practical recycling, composting or upcycling tip",
      "safety_warning": "Safety advice (e.g., wash hands, do not touch barehanded, wrap securely). Empty string if none.",
      "environmental_benefit": "Specific environmental impact of diverting this item from landfills",
      "confidence": "high | medium | low"
    }
  ],
  "summary_hi": "कचरा वर्गीकरण का संक्षिप्त सारांश हिंदी में",
  "message": "Friendly guidance or request for clearer photo if unclear"
}`;

// Knowledge Base Dictionary for SWM 2016
const KNOWLEDGE_BASE = {
  "wet_organic": {
    name_en: "Wet / Organic Waste",
    name_hi: "गीला / जैविक कचरा",
    bin: "Green Bin (हरा डस्टबिन)",
    color: "#16a34a",
    examples: ["Vegetable & fruit peels", "Leftover cooked food", "Tea bags / tea leaves", "Fallen leaves & flowers", "Egg shells"],
    steps_en: [
      "Keep wet waste in a separate container without plastic liner.",
      "Drain excess liquids before disposing to avoid foul odor.",
      "Transfer to municipal green collection vehicle or home composting pot."
    ],
    steps_hi: [
      "गीले कचरे को बिना प्लास्टिक पॉलीथिन के अलग डब्बे में रखें।",
      "सड़न और बदबू से बचने के लिए अतिरिक्त पानी निकाल लें।",
      "नगर निगम की हरी कचरा गाड़ी या घरेलू खाद के गमले में डालें।"
    ],
    recycling_tip: "Home composting turns kitchen scraps into rich organic manure for plants in 30-45 days.",
    safety_warning: "Do not mix with plastics or glass. Empty daily to avoid mosquito/pest breeding.",
    environmental_benefit: "Prevents organic matter rotting in landfills, avoiding toxic methane and leachate generation."
  },
  "dry_recyclable": {
    name_en: "Dry / Recyclable Waste",
    name_hi: "सूखा / पुनर्चक्रण योग्य कचरा",
    bin: "Blue Bin (नीला डस्टबिन)",
    color: "#2563eb",
    examples: ["Clean paper & cardboard", "Plastic bottles & containers", "Milk pouches (rinsed)", "Glass bottles", "Metal cans & foil"],
    steps_en: [
      "Ensure items are clean and completely dry (rinse food residues).",
      "Flatten cardboard boxes and crush plastic bottles to save bin space.",
      "Place in blue bin or bundle together for the local scrap dealer (Kabadiwala)."
    ],
    steps_hi: [
      "सुनिश्चित करें कि सामान साफ और सूखा हो (दूध/खाने के अवशेष धो लें)।",
      "जगह बचाने के लिए गत्ते को चपटा करें और प्लास्टिक की बोतल को दबाएं।",
      "नीले डस्टबिन में डालें या स्थानीय कबाड़ीवाले को बेचें।"
    ],
    recycling_tip: "Selling segregated paper, metals, and hard plastics to your local Kabadiwala boosts circular economy livelihoods.",
    safety_warning: "Wrap any broken glass in newspaper and clearly label it before disposing.",
    environmental_benefit: "Recycling 1 ton of paper saves 17 trees, 7000 gallons of water, and 4000 KWh of electricity."
  },
  "hazardous": {
    name_en: "Domestic Hazardous Waste",
    name_hi: "घरेलू खतरनाक कचरा",
    bin: "Red / Black Bin (लाल / काला डस्टबिन)",
    color: "#dc2626",
    examples: ["Used AA/AAA batteries", "CFL bulbs & tube lights", "Paint & insecticide cans", "Expired medicines", "Broken thermometers"],
    steps_en: [
      "Do NOT mix with normal wet or dry household garbage.",
      "Store in a sturdy, child-safe container labeled 'Hazardous Waste'.",
      "Hand over separately to municipal sanitation workers or designated hazardous collection drives."
    ],
    steps_hi: [
      "इसे सामान्य गीले या सूखे कचरे के साथ कभी न मिलाएं।",
      "इसे बच्चों की पहुंच से दूर एक मजबूत डब्बे में 'खतरनाक कचरा' लिखकर रखें।",
      "कचरा उठाने वाले कर्मचारी को अलग से सौंपें।"
    ],
    recycling_tip: "Lead-acid and lithium batteries are reprocessed by authorized CPCB recyclers to recover toxic heavy metals.",
    safety_warning: "DANGER: Wear gloves. Avoid direct skin contact. Never crush mercury-containing CFL bulbs or thermometers.",
    environmental_benefit: "Prevents lethal heavy metals (mercury, lead, cadmium) from poisoning groundwater tables."
  },
  "e_waste": {
    name_en: "E-Waste (Electronic Waste)",
    name_hi: "ई-कचरा (इलेक्ट्रॉनिक कचरा)",
    bin: "Authorized E-Waste Collection Center",
    color: "#d97706",
    examples: ["Old smartphones & tablets", "Chargers & USB cables", "Power banks", "Computer components", "Headphones"],
    steps_en: [
      "Wipe all personal data and remove external batteries if detachable.",
      "Store all cables and electronic gadgets together in a dry box.",
      "Drop off at brand buyback centers, electronics showrooms, or certified e-waste aggregators."
    ],
    steps_hi: [
      "उपकरण से अपना व्यक्तिगत डेटा हटा दें।",
      "तारों और गैजेट्स को एक सूखे बॉक्स में सुरक्षित रखें।",
      "नजदीकी अधिकृत ई-कचरा ड्रॉप-बॉक्स या इलेक्ट्रॉनिक्स स्टोर में जमा करें।"
    ],
    recycling_tip: "Certified e-waste recyclers extract precious metals like gold, copper, and silver with zero open-flame burning.",
    safety_warning: "Never burn wires or dump in roadside trash; burning releases carcinogenic dioxins.",
    environmental_benefit: "Conserves finite virgin minerals and mitigates severe toxic electronic dumping in water bodies."
  },
  "sanitary": {
    name_en: "Sanitary / Biomedical Waste",
    name_hi: "सेनेटरी / बायोमेडिकल कचरा",
    bin: "Marked Paper Bag / Yellow Bin (पीला डस्टबिन)",
    color: "#9333ea",
    examples: ["Used sanitary pads", "Baby & adult diapers", "Bandages & cotton gauze", "Used face masks", "Syringes / lancets"],
    steps_en: [
      "Wrap securely in a newspaper or designated biodegradable disposal pouch.",
      "Mark the package with a red dot or 'X' to alert waste collectors.",
      "Hand over separately during doorstep collection."
    ],
    steps_hi: [
      "अखबार या विशेष कचरा थैली में अच्छी तरह लपेटें।",
      "सफाई कर्मचारियों की सुरक्षा के लिए पैकेट पर लाल बिंदु या 'X' का निशान लगाएं।",
      "कचरा गाड़ी में अलग से सुरक्षित रूप से दें।"
    ],
    recycling_tip: "Consider switching to reusable cloth pads or medical-grade silicone menstrual cups to eliminate non-biodegradable sanitary waste.",
    safety_warning: "BIOHAZARD: Never flush down toilets or throw in open drains. Wash hands thoroughly with soap after handling.",
    environmental_benefit: "Protects manual sanitation workers from fatal infections, hepatitis, and biohazard exposure."
  },
  "mixed": {
    name_en: "Mixed / Unidentified Waste",
    name_hi: "मिश्रित / अज्ञात कचरा",
    bin: "Sorting Station Required",
    color: "#4b5563",
    examples: ["Dust sweepings", "Multi-layered chip packets with food grease", "Composite packaging", "Unsorted waste bag"],
    steps_en: [
      "Unpack and separate organic parts into green bin and dry recyclables into blue bin.",
      "Inert sweepings/debris can be handed over for designated landfill transfer.",
      "Use our manual guide to classify individual contents."
    ],
    steps_hi: [
      "कचरे को अलग-अलग करें: गीला भाग हरे डस्टबिन में और सूखा नीले में।",
      "धूल और मिट्टी को अलग करके सौंपें।",
      "हर एक सामान को अलग करने के लिए हमारी गाइड देखें।"
    ],
    recycling_tip: "Avoid throwing unsegregated waste bags; 90% of mixed waste can be salvaged if separated at source.",
    safety_warning: "Check for hidden broken glass or sharp needles before sorting with bare hands.",
    environmental_benefit: "Segregated waste reduces landfill mass by up to 80% and supports Swachh Bharat goals."
  }
};

// API: Health Check
app.get('/api/health', (req, res) => {
  const isKeyConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    version: '1.0.0',
    ai_configured: isKeyConfigured,
    model: GEMINI_MODEL,
    message: isKeyConfigured ? 'Vision AI is active.' : 'Running in Demo/Rule-based mode. Add GEMINI_API_KEY in .env for live AI classification.'
  });
});

// API: Knowledge Base
app.get('/api/knowledge-base', (req, res) => {
  res.json({ status: 'ok', data: KNOWLEDGE_BASE });
});

// API: Classify Image via Gemini Vision
app.post('/api/classify', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        status: 'error',
        message: 'No image data provided. Please upload an image or take a photo.'
      });
    }

    // Extract Base64 data and mimeType
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    }

    // Validate size (max ~5MB base64 is ~7MB string)
    if (base64Data.length > 7 * 1024 * 1024) {
      return res.status(400).json({
        status: 'error',
        message: 'Image size exceeds 5MB limit. Please provide a smaller image.'
      });
    }

    const isKeyConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && GEMINI_API_KEY !== 'your_gemini_api_key_here');

    // If API Key is NOT configured, provide an intelligent demo analysis
    if (!isKeyConfigured) {
      return res.json(generateDemoResponse());
    }

    // Call Google Gemini Vision API via native REST fetch
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: SYSTEM_PROMPT
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Gemini API Error:', apiResponse.status, errText);
      return res.status(502).json({
        status: 'error',
        message: `AI Vision Service returned an error (${apiResponse.status}). Using offline fallback rules.`,
        fallback_available: true
      });
    }

    const data = await apiResponse.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      return res.status(502).json({
        status: 'error',
        message: 'Vision AI produced an empty response. Please try with another angle or clearer lighting.'
      });
    }

    // Sanitize JSON by removing markdown fences if present
    let cleaned = candidate.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', cleaned);
      return res.status(500).json({
        status: 'error',
        message: 'Could not parse AI output. Please try again.',
        raw: cleaned
      });
    }

    return res.json(parsedResult);

  } catch (error) {
    console.error('Server /classify Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing image. ' + error.message
    });
  }
});

// Helper for Demo / Simulated Classification (when API key is pending)
function generateDemoResponse() {
  return {
    status: "ok",
    is_demo: true,
    message: "Demo Mode Active: Set your GEMINI_API_KEY in .env for live camera scanning! Showing simulated segregation result.",
    items: [
      {
        name: "Plastic Water / Beverage Bottle",
        category: "Dry / Recyclable",
        bin: "Blue Bin (नीला डस्टबिन)",
        disposal_steps_en: [
          "Empty all residual water or liquid completely.",
          "Crush the bottle flat and put the cap back on (or recycle together).",
          "Place in the blue dry-waste bin or save for the local Kabadiwala."
        ],
        disposal_steps_hi: [
          "बोतल में बचा हुआ पानी या तरल पूरी तरह खाली करें।",
          "बोतल को दबाकर चपटा (crush) करें ताकि डस्टबिन में जगह बचे।",
          "नीले सूखे कचरे के डब्बे में डालें या कबाड़ीवाले को दें।"
        ],
        recycling_tip: "PET plastic bottles are shredded into flakes and spun into recycled polyester yarn for clothing.",
        safety_warning: "",
        environmental_benefit: "Recycling PET plastic prevents petroleum depletion and stops ocean microplastic contamination.",
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
          "इसे सीधे पौधों की खाद या कंपोस्ट पॉट में भी डाल सकते हैं।"
        ],
        recycling_tip: "Banana peels are rich in potassium and phosphorus, making exceptional organic fertilizer for home gardens.",
        safety_warning: "",
        environmental_benefit: "Diverting organic waste from landfills reduces methane gas emissions by over 95%.",
        confidence: "high"
      }
    ],
    summary_hi: "डेमो परिणाम: प्लास्टिक की बोतल को सूखे कचरे (नीला डस्टबिन) में और केले के छिलके को गीले कचरे (हरा डस्टबिन) में डालें।"
  };
}

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌱 EcoSort AI Server running at: http://localhost:${PORT}`);
  console.log(`🌿 Swachh Bharat & SWM 2016 Compliant Engine`);
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log(`⚠️  NOTE: GEMINI_API_KEY not configured in .env.`);
    console.log(`   Running in Interactive Demo & Rule-based fallback mode.`);
    console.log(`   Get a free Gemini API key at: https://aistudio.google.com/`);
  } else {
    console.log(`✅ Gemini Vision AI Model: ${GEMINI_MODEL} is ACTIVE.`);
  }
  console.log(`=======================================================`);
});
