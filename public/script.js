/* ==========================================================================
   EcoSort AI - Main Application Logic
   Compliant with Swachh Bharat Mission (Urban 2.0) & SWM Rules 2016
   ========================================================================== */

// --- State Management ---
const state = {
  lang: localStorage.getItem('ecosort_lang') || 'en',
  currentImageBase64: null,
  cameraStream: null,
  facingMode: 'environment', // Start with back camera on mobile
  ecoPoints: parseInt(localStorage.getItem('ecosort_points') || '0', 10),
  totalScans: parseInt(localStorage.getItem('ecosort_scans') || '0', 10),
  history: JSON.parse(localStorage.getItem('ecosort_history') || '[]'),
  categoryStats: JSON.parse(localStorage.getItem('ecosort_category_stats') || JSON.stringify({
    wet: 0,
    dry: 0,
    hazardous: 0,
    ewaste: 0,
    sanitary: 0,
    mixed: 0
  })),
  currentResults: null,
  geminiApiKey: localStorage.getItem('ecosort_gemini_key') || '',
  liveCaptionActive: false,
  liveCaptionInterval: null,
  liveCaptionInProgress: false
};

// --- Bilingual UI Translations ---
const I18N = {
  en: {
    nav_scan: "Scan Waste",
    nav_guide: "Waste Guide",
    nav_impact: "My Impact",
    nav_history: "History",
    hero_badge: "🇮🇳 Segregate at Source • Swachh Bharat Mission",
    hero_title: "Smart Waste Classification with Vision AI",
    hero_desc: "Snap or upload a photo of household garbage. Our AI identifies each item, pinpoints the exact municipal bin (Wet, Dry, Hazardous, E-waste, Sanitary), and gives step-by-step disposal guidance suited for Indian households.",
    scanner_header: "Identify Waste Item",
    scanner_sub: "Upload a clear photo or snap live using your device camera",
    btn_open_camera: "Use Live Camera",
    btn_upload_photo: "Upload Photo",
    btn_cancel: "Cancel",
    btn_capture: "Capture",
    drop_zone_title: "Drag & drop your waste image here",
    drop_zone_sub: "Supports JPG, PNG, WEBP (Max 5 MB)",
    btn_analyze: "Analyze Waste with AI",
    loading_title: "Analyzing waste image with Vision AI...",
    results_title: "Segregation Recommendations",
    btn_scan_another: "Scan Another Item",
    municipal_disclaimer: "Bin colours and segregation protocols may vary slightly across Indian municipalities (e.g. Bengaluru, Indore, Delhi, Mumbai). Always verify with your local Nagar Nigam / Urban Local Body.",
    guide_tag: "Rule-Based Knowledge Engine",
    guide_title: "Standard Indian SWM 2016 Waste Guide",
    guide_desc: "Browse or search items directly. This built-in knowledge base backs up our AI model to ensure reliable disposal advice even without camera access.",
    filter_all: "All Categories",
    filter_wet: "Wet / Organic (Green)",
    filter_dry: "Dry / Recyclable (Blue)",
    filter_hazard: "Hazardous (Red)",
    filter_ewaste: "E-Waste",
    filter_sanitary: "Sanitary / Biomedical",
    dos_donts_title: "Golden Segregation Rules (Do's & Don'ts)",
    do_1: "Rinse milk pouches and food plastic containers before dropping into the dry waste bin.",
    do_2: "Wrap sanitary pads & diapers in paper marked with a red cross or dot.",
    do_3: "Sell clean paper, cardboard, and metals to your local scrap dealer (Kabadiwala).",
    do_4: "Compost fruit/vegetable peels at home to create organic fertilizer for house plants.",
    dont_1: "Never tie wet kitchen garbage in single-use plastic carry bags.",
    dont_2: "Never flush diapers, sanitary napkins, or wipes into toilets.",
    dont_3: "Never dump toxic batteries or tube lights with regular kitchen trash.",
    dont_4: "Never burn plastic, rubber, or tangled e-waste wires openly.",
    impact_tag: "Gamification & Swachhta Stats",
    impact_title: "Your Swachh Bharat Impact",
    impact_desc: "Track your segregation habits, earn eco-points, and see how much waste you help divert from overflowing landfills.",
    stat_scans: "Items Analyzed",
    stat_points: "Eco-Points Earned",
    stat_landfill: "Est. Waste Diverted",
    stat_badge: "Current Rank",
    chart_title: "Your Waste Stream Breakdown",
    chart_sub: "Category distribution of scanned waste",
    history_tag: "Local Logs",
    history_title: "Recent Scan History",
    btn_clear_history: "Clear History",
    empty_history: "No scans recorded yet. Upload or snap your first waste item above!",
    conclusion_title: "The Swachhta Revolution: Segregation at Source",
    pillar1_title: "The Challenge",
    pillar1_desc: "Indian cities generate over 150,000 tonnes of municipal solid waste daily. When wet and dry waste mix, organic decomposition generates toxic methane gas, foul fires, and leachate that pollutes underground water tables.",
    pillar2_title: "The AI Solution",
    pillar2_desc: "EcoSort AI removes ambiguity at the kitchen counter. Instant vision models identify composite packaging, tell citizens the exact bin colour, and protect sanitation workers from dangerous biohazards and broken glass.",
    pillar3_title: "The Circular Economy",
    pillar3_desc: "Segregated dry waste flows directly to Kabadiwalas and authorized recycling plants. Organic waste becomes nutrient-dense compost for agriculture. Together, we move towards a zero-landfill India.",
    footer_mission: "Dedicated to Swachh Bharat Mission (Urban 2.0) and SWM Rules 2016. Building citizen-driven sustainable waste habits across Indian homes."
  },
  hi: {
    nav_scan: "कचरा स्कैन करें",
    nav_guide: "कचरा गाइड",
    nav_impact: "मेरा प्रभाव",
    nav_history: "इतिहास",
    hero_badge: "🇮🇳 स्रोत पर कचरा अलग करें • स्वच्छ भारत मिशन",
    hero_title: "एआई विजन द्वारा स्मार्ट कचरा वर्गीकरण",
    hero_desc: "कचरे की फोटो खींचें या अपलोड करें। हमारा AI मॉडल हर वस्तु की पहचान कर सही नगर निगम डस्टबिन (गीला, सूखा, खतरनाक, ई-कचरा, सेनेटरी) और भारतीय घरों के अनुकूल चरणबद्ध निपटान सलाह बताता है।",
    scanner_header: "कचरा पहचानें",
    scanner_sub: "स्पष्ट फोटो अपलोड करें या सीधे कैमरे से फोटो लें",
    btn_open_camera: "लाइव कैमरा खोलें",
    btn_upload_photo: "फोटो अपलोड करें",
    btn_cancel: "रद्द करें",
    btn_capture: "फोटो लें",
    drop_zone_title: "अपनी कचरे की फोटो यहाँ खींचकर लाएँ",
    drop_zone_sub: "JPG, PNG, WEBP समर्थित (अधिकतम 5 MB)",
    btn_analyze: "AI से कचरे का विश्लेषण करें",
    loading_title: "AI कचरे की फोटो का विश्लेषण कर रहा है...",
    results_title: "कचरा निपटान और वर्गीकरण सलाह",
    btn_scan_another: "दूसरी वस्तु स्कैन करें",
    municipal_disclaimer: "नगर निगम के नियम और डस्टबिन के रंग शहरों (जैसे इंदौर, बेंगलुरु, दिल्ली, मुंबई) के अनुसार थोड़े भिन्न हो सकते हैं। अपने स्थानीय नगर निगम के नियमों का पालन करें।",
    guide_tag: "नियम आधारित नॉलेज इंजन",
    guide_title: "भारतीय ठोस अपशिष्ट प्रबंधन (SWM 2016) गाइड",
    guide_desc: "सामानों को सीधे खोजें या ब्राउज़ करें। कैमरा न होने पर भी यह नियम-आधारित प्रणाली सटीक निपटान निर्देश देती है।",
    filter_all: "सभी श्रेणियां",
    filter_wet: "गीला / जैविक (हरा)",
    filter_dry: "सूखा / पुनर्चक्रण (नीला)",
    filter_hazard: "खतरनाक (लाल)",
    filter_ewaste: "ई-कचरा",
    filter_sanitary: "सेनेटरी / बायोमेडिकल",
    dos_donts_title: "कचरा अलग करने के स्वर्णिम नियम (क्या करें और क्या न करें)",
    do_1: "दूध के पैकेट और प्लास्टिक डिब्बों को पानी से धोकर ही सूखे कचरे में डालें।",
    do_2: "सेनेटरी पैड और डायपर को कागज में लपेटकर उस पर लाल निशान या 'X' लगाएं।",
    do_3: "साफ कागज, गत्ते और धातु को स्थानीय कबाड़ीवाले को बेचें।",
    do_4: "फलों और सब्जियों के छिलकों से घर पर ही पौधों के लिए प्राकृतिक खाद बनाएं।",
    dont_1: "गीले रसोई के कचरे को कभी भी प्लास्टिक की पॉलीथिन में बांधकर न फेंकें।",
    dont_2: "डायपर, सेनेटरी नैपकिन या वाइप्स को शौचालय में कभी फ्लश न करें।",
    dont_3: "खतरनाक बैटरी या ट्यूबलाइट को सामान्य घरेलू कचरे के साथ कभी न फेंके।",
    dont_4: "प्लास्टिक, रबर या ई-कचरे के तारों को खुले में कभी न जलाएं।",
    impact_tag: "गेमिफिकेशन और स्वच्छता आंकड़े",
    impact_title: "आपका स्वच्छ भारत में योगदान",
    impact_desc: "अपनी कचरा पृथक्करण की आदतों को ट्रैक करें, इको-पॉइंट्स कमाएं और लैंडफिल से कचरा कम करने में मदद करें।",
    stat_scans: "कुल विश्लेषण",
    stat_points: "अर्जित इको-अंक",
    stat_landfill: "अनुमानित कचरा निवारण",
    stat_badge: "वर्तमान रैंक",
    chart_title: "आपके कचरे का वितरण",
    chart_sub: "स्कैन की गई श्रेणियों का प्रतिशत",
    history_tag: "लोकल लॉग्स",
    history_title: "हालिया स्कैन इतिहास",
    btn_clear_history: "इतिहास मिटाएं",
    empty_history: "अभी तक कोई स्कैन नहीं हुआ। ऊपर अपनी पहली कचरे की तस्वीर अपलोड करें!",
    conclusion_title: "स्वच्छता क्रांति: स्रोत पर कचरा पृथक्करण",
    pillar1_title: "चुनौती",
    pillar1_desc: "भारतीय शहरों में प्रतिदिन 1,50,000 टन से अधिक ठोस कचरा निकलता है। गीला और सूखा कचरा मिलने पर मीथेन गैस और जहरीला रिसाव बनता है जो भूजल को दूषित करता है।",
    pillar2_title: "AI समाधान",
    pillar2_desc: "EcoSort AI रसोई में ही कचरे का सटीक डस्टबिन बताता है और सफाई कर्मचारियों को खतरनाक बायोमेडिकल और कांच के कचरे से सुरक्षित रखता है।",
    pillar3_title: "चक्रीय अर्थव्यवस्था",
    pillar3_desc: "अलग किया गया सूखा कचरा सीधे कबाड़ीवालों और रीसाइक्लिंग यूनिट्स तक पहुंचता है। जैविक कचरा जैविक खाद बनता है। मिलकर कचरा-मुक्त भारत बनाएं।",
    footer_mission: "स्वच्छ भारत मिशन (शहरी 2.0) और SWM नियम 2016 को समर्पित। भारतीय परिवारों में टिकाऊ आदतें विकसित करना।"
  }
};

// --- Educational Rotating Facts during Loading ---
const SWACHHTA_FACTS = [
  "Did you know? Segregating waste at source can divert up to 80% of waste from landfills.",
  "Indore has been awarded India's cleanest city 7 times in a row through strict 6-way source segregation!",
  "Composting your wet organic waste at home reduces toxic methane emissions by 95%.",
  "Rinsing milk packets before recycling helps prevent bacterial rot and supports Kabadiwalas.",
  "Never flush sanitary waste; it chokes sewer lines and causes hazardous manual scavenging."
];

// --- Rule-Based Knowledge Engine (SWM Rules, 2016) ---
const KNOWLEDGE_ITEMS = [
  {
    categoryKey: "wet_organic",
    name_en: "Vegetable & Fruit Peels",
    name_hi: "सब्जी और फलों के छिलके",
    bin_en: "Green Bin (Hara Dustbin)",
    bin_hi: "हरा डस्टबिन",
    color: "#16a34a",
    badgeClass: "cat-wet",
    examples: ["Banana peel", "Potato skins", "Apple core", "Tomato seeds"],
    steps_en: ["Collect in kitchen wet bin without polythene bag.", "Do not mix with plastics.", "Deposit in compost pit or green municipal vehicle."],
    steps_hi: ["बिना पॉलीथिन के सीधे हरे डब्बे में रखें।", "प्लास्टिक के साथ कभी न मिलाएं।", "खाद के गमले या नगर निगम की हरी गाड़ी में डालें।"],
    tip_en: "Rich in potassium; ideal for house plants composting.",
    tip_hi: "पोटेशियम से भरपूर; घरेलू पौधों की खाद के लिए सर्वोत्तम।"
  },
  {
    categoryKey: "dry_recyclable",
    name_en: "Plastic Milk Pouches & Bottles",
    name_hi: "दूध की थैली और प्लास्टिक की बोतलें",
    bin_en: "Blue Bin (Neela Dustbin)",
    bin_hi: "नीला डस्टबिन",
    color: "#2563eb",
    badgeClass: "cat-dry",
    examples: ["Amul/Mother Dairy pouch", "Mineral water bottle", "Shampoo container"],
    steps_en: ["Cut the corner partially so micro-plastic corner does not get lost.", "Rinse inside and dry completely.", "Drop into dry waste bin or save for Kabadiwala."],
    steps_hi: ["पैकेट का कोना अलग न काटें (जुड़ा रहने दें)।", "अंदर से धोकर पूरी तरह सुखा लें।", "नीले डस्टबिन में डालें या कबाड़ीवाले को बेचें।"],
    tip_en: "Recycled into polyester fibers, t-shirts, and park benches.",
    tip_hi: "पुनर्चक्रित कर टी-शर्ट और धागों में बदला जाता है।"
  },
  {
    categoryKey: "dry_recyclable",
    name_en: "Cardboard, Newspapers & Paper",
    name_hi: "गत्ता, अखबार और रद्दी कागज",
    bin_en: "Blue Bin (Neela Dustbin)",
    bin_hi: "नीला डस्टबिन",
    color: "#2563eb",
    badgeClass: "cat-dry",
    examples: ["Amazon/Flipkart shipping box", "Old newspapers", "Notebooks", "Cartons"],
    steps_en: ["Flatten all boxes to save space.", "Keep free from oil and food stains.", "Bundle neatly for local scrap dealer (Kabadiwala)."],
    steps_hi: ["गत्ते के बक्सों को चपटा करें।", "तेल या खाने के दाग से दूर रखें।", "कबाड़ीवाले को देने के लिए बंडल बनाकर रखें।"],
    tip_en: "1 ton of recycled paper saves 17 mature trees and 7,000 gallons of water.",
    tip_hi: "1 टन कागज रीसायकल करने से 17 पेड़ बचते हैं।"
  },
  {
    categoryKey: "hazardous",
    name_en: "AA/AAA Batteries & Button Cells",
    name_hi: "बैटरी और बटन सेल",
    bin_en: "Red / Black Bin (Hazardous)",
    bin_hi: "लाल / काला डस्टबिन (खतरनाक)",
    color: "#dc2626",
    badgeClass: "cat-hazard",
    examples: ["Remote batteries", "Clock cells", "Torch batteries"],
    steps_en: ["Store in a separate dry plastic box out of reach of children.", "Never throw in wet or dry bins.", "Hand over separately during municipal hazardous waste drives."],
    steps_hi: ["बच्चों से दूर एक अलग सूखे डिब्बे में रखें।", "गीले या सूखे डस्टबिन में कभी न डालें।", "सफाई कर्मचारी को अलग से खतरनाक कचरे के रूप में दें।"],
    tip_en: "Heavy metals (cadmium, lead, lithium) are chemically extracted by CPCB-authorized facilities.",
    tip_hi: "जहरीली धातुओं को अधिकृत रीसाइक्लिंग केंद्र सुरक्षित निकालते हैं।"
  },
  {
    categoryKey: "hazardous",
    name_en: "CFL Bulbs, Tube Lights & Glassware",
    name_hi: "सीएफएल बल्ब, ट्यूबलाइट और कांच",
    bin_en: "Red Bin / Marked Carton",
    bin_hi: "लाल डस्टबिन / सुरक्षित रैपिंग",
    color: "#dc2626",
    badgeClass: "cat-hazard",
    examples: ["Fluorescent tube", "Broken glass mirror", "CFL bulb", "Medicine vial"],
    steps_en: ["Handle with care to prevent breakage.", "If broken, wrap securely in newspaper and clearly label 'BROKEN GLASS'.", "Hand over separately to protect sanitation workers from cuts."],
    steps_hi: ["टूटे नहीं इसका विशेष ध्यान रखें।", "टूटने पर अखबार में लपेटकर 'कांच' लिख दें।", "सफाईकर्मी के हाथ कटने से बचाने हेतु अलग से दें।"],
    tip_en: "CFLs contain hazardous mercury vapor. Never break them open indoors.",
    tip_hi: "सीएफएल में जहरीला पारा होता है, इसे कभी न फोड़ें।"
  },
  {
    categoryKey: "e_waste",
    name_en: "Old Smartphones, Chargers & Wires",
    name_hi: "पुराने फोन, चार्जर और केबल",
    bin_en: "Authorized E-Waste Collection Box",
    bin_hi: "अधिकृत ई-कचरा केंद्र",
    color: "#d97706",
    badgeClass: "cat-ewaste",
    examples: ["Dead mobile phone", "Tangled USB cords", "Power bank", "Headphones"],
    steps_en: ["Delete personal data and remove memory cards.", "Do not incinerate or cut open wires.", "Drop off at electronics retail store buyback counters or CPCB dropboxes."],
    steps_hi: ["अपना निजी डेटा और सिम कार्ड निकाल लें।", "तारों को कभी आग में न जलाएं।", "नजदीकी इलेक्ट्रॉनिक्स स्टोर के ई-कचरा बॉक्स में डालें।"],
    tip_en: "Contains recoverable copper, silver, and gold circuits.",
    tip_hi: "इनमें तांबा, चांदी जैसी कीमती धातुएं होती हैं।"
  },
  {
    categoryKey: "sanitary",
    name_en: "Sanitary Napkins, Diapers & Masks",
    name_hi: "सेनेटरी पैड, डायपर और मास्क",
    bin_en: "Marked Paper Bag / Yellow Bin",
    bin_hi: "लाल निशान वाला कागज / पीला डस्टबिन",
    color: "#9333ea",
    badgeClass: "cat-sanitary",
    examples: ["Baby diaper", "Adult incontinence pads", "Used surgical masks", "Cotton bandages"],
    steps_en: ["Wrap securely in old newspaper or opaque paper envelope.", "Mark clearly with a RED DOT or CROSS (X).", "Hand over separately to waste collectors."],
    steps_hi: ["अखबार में कसकर लपेटें।", "पैकेट पर लाल बिंदी या क्रॉस (X) का निशान लगाएं।", "कचरा गाड़ी में अलग से सुरक्षित सौंपें।"],
    tip_en: "Prevents hepatitis and bacterial infections among manual waste handlers.",
    tip_hi: "सफाई कर्मियों को संक्रामक बीमारियों से बचाता है।"
  }
];

// --- DOM References ---
const langToggleBtn = document.getElementById('langToggleBtn');
const langLabel = document.getElementById('langLabel');
const statusBanner = document.getElementById('statusBanner');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

const cameraOpenBtn = document.getElementById('cameraOpenBtn');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');

const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraSnapBtn = document.getElementById('cameraSnapBtn');
const cameraCloseBtn = document.getElementById('cameraCloseBtn');
const cameraFlipBtn = document.getElementById('cameraFlipBtn');

const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

const loadingState = document.getElementById('loadingState');
const funFact = document.getElementById('funFact');

const resultsSection = document.getElementById('resultsSection');
const resultsCountBadge = document.getElementById('resultsCountBadge');
const summaryCard = document.getElementById('summaryCard');
const summaryText = document.getElementById('summaryText');
const itemsContainer = document.getElementById('itemsContainer');
const scanAnotherBtn = document.getElementById('scanAnotherBtn');

const guideSearchInput = document.getElementById('guideSearchInput');
const categoryFilters = document.getElementById('categoryFilters');
const knowledgeGrid = document.getElementById('knowledgeGrid');

const ecoPointsPill = document.getElementById('ecoPointsPill');
const ecoPointsText = document.getElementById('ecoPointsText');
const userTier = document.getElementById('userTier');
const totalScansCount = document.getElementById('totalScansCount');
const dashboardEcoPoints = document.getElementById('dashboardEcoPoints');
const landfillDiverted = document.getElementById('landfillDiverted');
const badgeTitle = document.getElementById('badgeTitle');

const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const wasteChart = document.getElementById('wasteChart');
const chartLegend = document.getElementById('chartLegend');

// Settings & Live Caption Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const apiKeyBtnText = document.getElementById('apiKeyBtnText');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const removeKeyBtn = document.getElementById('removeKeyBtn');
const settingsAlert = document.getElementById('settingsAlert');

const liveCaptionHUD = document.getElementById('liveCaptionHUD');
const liveCaptionText = document.getElementById('liveCaptionText');
const toggleLiveCaptionBtn = document.getElementById('toggleLiveCaptionBtn');
const liveCaptionToggleLabel = document.getElementById('liveCaptionToggleLabel');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  checkServerHealth();
  renderKnowledgeGrid();
  updateGamificationUI();
  renderHistoryUI();
  drawWasteChart();
  setupEventListeners();
});

// --- Server Health Check ---
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check non-200');
    const data = await res.json();
    
    if (data.ai_configured) {
      statusBanner.className = 'status-banner active';
      statusText.innerHTML = `🟢 <strong>Live Vision AI Active:</strong> ${data.model} model ready for scanning.`;
    } else {
      statusBanner.className = 'status-banner demo';
      statusText.innerHTML = `🟡 <strong>Interactive Demo Mode:</strong> Add your <code>GEMINI_API_KEY</code> in <code>.env</code> for live image classification.`;
    }
  } catch (err) {
    statusBanner.className = 'status-banner demo';
    statusText.innerHTML = `⚡ <strong>Offline / Standalone Mode:</strong> Built-in Rule-Based Disposal Engine active.`;
  }
}

// --- Language Management ---
function initLanguage() {
  setLanguage(state.lang);
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('ecosort_lang', lang);
  langLabel.textContent = lang === 'en' ? 'हिन्दी' : 'English';
  
  // Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[lang] && I18N[lang][key]) {
      el.textContent = I18N[lang][key];
    }
  });

  // Re-render dynamic elements in new language
  renderKnowledgeGrid(guideSearchInput.value);
  if (state.currentResults) {
    renderResults(state.currentResults);
  }
}

langToggleBtn.addEventListener('click', () => {
  const nextLang = state.lang === 'en' ? 'hi' : 'en';
  setLanguage(nextLang);
});

// --- Event Listeners Setup ---
function setupEventListeners() {
  // File Upload via Button
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Remove Image
  removeImageBtn.addEventListener('click', resetImageState);

  // Analyze Button
  analyzeBtn.addEventListener('click', performAnalysis);

  // Scan Another
  scanAnotherBtn.addEventListener('click', () => {
    resetImageState();
    window.location.hash = '#scannerSection';
  });

  // Camera Open
  cameraOpenBtn.addEventListener('click', startCamera);

  // Camera Snap
  cameraSnapBtn.addEventListener('click', captureCameraSnapshot);

  // Camera Close
  cameraCloseBtn.addEventListener('click', stopCamera);

  // Camera Flip (Front/Back)
  cameraFlipBtn.addEventListener('click', toggleCameraFacing);

  // Guide Search
  guideSearchInput.addEventListener('input', (e) => {
    renderKnowledgeGrid(e.target.value);
  });

  // Filter Buttons
  categoryFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-pill')) {
      document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      const filter = e.target.getAttribute('data-filter');
      renderKnowledgeGrid(guideSearchInput.value, filter);
    }
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm(state.lang === 'hi' ? 'क्या आप सारा इतिहास मिटाना चाहते हैं?' : 'Are you sure you want to clear your scan history?')) {
      state.history = [];
      localStorage.setItem('ecosort_history', '[]');
      renderHistoryUI();
    }
  });

  // Settings Modal Controls
  openSettingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
  toggleApiKeyVisibility.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });
  saveKeyBtn.addEventListener('click', handleSaveApiKey);
  removeKeyBtn.addEventListener('click', handleRemoveApiKey);

  // Live Caption Toggle
  toggleLiveCaptionBtn.addEventListener('click', toggleLiveCaptioning);

  // Initial key status check
  if (state.geminiApiKey) {
    updateApiKeyStatusUI(true);
  }
}

// --- Image Handling ---
function handleFileSelected(file) {
  // Validate type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    alert(state.lang === 'hi' ? 'कृपया JPG, PNG या WEBP इमेज ही चुनें।' : 'Please select a valid image (JPG, PNG, or WEBP).');
    return;
  }

  // Validate size (max 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    alert(state.lang === 'hi' ? 'फोटो का साइज 5 MB से कम होना चाहिए।' : 'Image size must be less than 5 MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    state.currentImageBase64 = event.target.result;
    displayImagePreview(state.currentImageBase64);
  };
  reader.readAsDataURL(file);
}

function displayImagePreview(dataUrl) {
  imagePreview.src = dataUrl;
  previewContainer.classList.remove('hidden');
  dropZone.classList.add('hidden');
  resultsSection.classList.add('hidden');
}

function resetImageState() {
  state.currentImageBase64 = null;
  fileInput.value = '';
  imagePreview.src = '';
  previewContainer.classList.add('hidden');
  dropZone.classList.remove('hidden');
  loadingState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  stopCamera();
}

// --- WebRTC Camera Handling ---
async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(state.lang === 'hi' ? 'आपके ब्राउज़र में कैमरा समर्थित नहीं है।' : 'Camera is not supported on this browser.');
      return;
    }

    cameraModal.classList.remove('hidden');
    dropZone.classList.add('hidden');
    previewContainer.classList.add('hidden');

    const constraints = {
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = state.cameraStream;
  } catch (err) {
    console.error('Camera access error:', err);
    alert(state.lang === 'hi' 
      ? 'कैमरा खोलने में समस्या हुई। कृपया अनुमति (permission) जांचें।' 
      : 'Could not access device camera. Please check permissions or use file upload.');
    stopCamera();
  }
}

function stopCamera() {
  stopLiveCaptioning();
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  cameraModal.classList.add('hidden');
  if (!state.currentImageBase64) {
    dropZone.classList.remove('hidden');
  }
}

// --- Live Captioning (Real-Time Camera Overlay) ---
function toggleLiveCaptioning() {
  if (state.liveCaptionActive) {
    stopLiveCaptioning();
  } else {
    startLiveCaptioning();
  }
}

function startLiveCaptioning() {
  state.liveCaptionActive = true;
  toggleLiveCaptionBtn.classList.add('active');
  liveCaptionToggleLabel.textContent = 'Live Caption: ON';
  liveCaptionHUD.classList.remove('hidden');
  liveCaptionText.textContent = state.lang === 'hi' ? 'कचरे पर कैमरा स्थिर रखें...' : 'Scanning waste in real time...';

  // Run immediately, then every 3.2 seconds
  runSingleLiveCaption();
  state.liveCaptionInterval = setInterval(runSingleLiveCaption, 3200);
}

function stopLiveCaptioning() {
  state.liveCaptionActive = false;
  if (state.liveCaptionInterval) {
    clearInterval(state.liveCaptionInterval);
    state.liveCaptionInterval = null;
  }
  toggleLiveCaptionBtn.classList.remove('active');
  liveCaptionToggleLabel.textContent = 'Live Caption: OFF';
  liveCaptionHUD.classList.add('hidden');
}

async function runSingleLiveCaption() {
  if (!cameraVideo || !cameraVideo.videoWidth || state.liveCaptionInProgress) return;
  state.liveCaptionInProgress = true;

  try {
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = 480;
    snapCanvas.height = 320;
    const ctx = snapCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, 480, 320);
    const frameDataUrl = snapCanvas.toDataURL('image/jpeg', 0.6);

    const headers = { 'Content-Type': 'application/json' };
    if (state.geminiApiKey) {
      headers['x-gemini-key'] = state.geminiApiKey;
    }

    const res = await fetch('/api/live-caption', {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: frameDataUrl })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.caption) {
        liveCaptionText.innerHTML = `<strong>${data.caption}</strong> ${data.bin && data.bin !== 'None' ? `• <em>${data.bin}</em>` : ''}`;
      }
    }
  } catch (err) {
    console.debug('Live caption frame skipped:', err);
  } finally {
    state.liveCaptionInProgress = false;
  }
}

function toggleCameraFacing() {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  stopCamera();
  startCamera();
}

function captureCameraSnapshot() {
  if (!cameraVideo || !cameraVideo.videoWidth) return;

  const canvas = cameraCanvas;
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  state.currentImageBase64 = dataUrl;

  stopCamera();
  displayImagePreview(dataUrl);
}

// --- Settings Modal Handlers ---
function openSettingsModal() {
  apiKeyInput.value = state.geminiApiKey;
  settingsAlert.className = 'settings-alert hidden';
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

async function handleSaveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key || key.length < 10) {
    showSettingsAlert('Please enter a valid Gemini API key.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/save-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });

    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      state.geminiApiKey = key;
      localStorage.setItem('ecosort_gemini_key', key);
      updateApiKeyStatusUI(true);
      showSettingsAlert('✅ API key saved and activated on server!', 'success');
      setTimeout(closeSettingsModal, 1500);
      checkServerHealth();
    } else {
      showSettingsAlert(data.message || 'Failed to save key.', 'error');
    }
  } catch (err) {
    state.geminiApiKey = key;
    localStorage.setItem('ecosort_gemini_key', key);
    updateApiKeyStatusUI(true);
    showSettingsAlert('✅ API key saved locally in browser!', 'success');
    setTimeout(closeSettingsModal, 1500);
  }
}

function handleRemoveApiKey() {
  state.geminiApiKey = '';
  localStorage.removeItem('ecosort_gemini_key');
  apiKeyInput.value = '';
  updateApiKeyStatusUI(false);
  showSettingsAlert('API key removed. Running in demo mode.', 'success');
  setTimeout(closeSettingsModal, 1000);
  checkServerHealth();
}

function updateApiKeyStatusUI(hasKey) {
  if (hasKey) {
    apiKeyBtnText.textContent = 'API Key: Active';
    apiKeyBtnText.style.color = '#15803d';
  } else {
    apiKeyBtnText.textContent = 'API Key';
    apiKeyBtnText.style.color = '';
  }
}

function showSettingsAlert(msg, type) {
  settingsAlert.textContent = msg;
  settingsAlert.className = `settings-alert ${type}`;
}

// --- Vision AI Analysis ---
async function performAnalysis() {
  if (!state.currentImageBase64) return;

  // Show loading state with rotating fact
  loadingState.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  resultsSection.classList.add('hidden');

  let factIdx = 0;
  const factInterval = setInterval(() => {
    factIdx = (factIdx + 1) % SWACHHTA_FACTS.length;
    funFact.textContent = SWACHHTA_FACTS[factIdx];
  }, 2200);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.geminiApiKey) {
      headers['x-gemini-key'] = state.geminiApiKey;
    }

    const response = await fetch('/api/classify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: state.currentImageBase64 })
    });

    clearInterval(factInterval);
    loadingState.classList.add('hidden');

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server returned error (${response.status})`);
    }

    const result = await response.json();
    state.currentResults = result;

    if (result.status === 'unclear') {
      renderUnclearResult(result.message || 'Image is blurry or contains no recognizable waste.');
      return;
    }

    // Award eco points and update stats
    recordSuccessfulScan(result);
    renderResults(result);

  } catch (error) {
    clearInterval(factInterval);
    loadingState.classList.add('hidden');
    previewContainer.classList.remove('hidden');

    console.warn('API Error, using rule-based fallback:', error);
    alert(state.lang === 'hi' 
      ? `AI विश्लेषण में समस्या: ${error.message}\nकृपया नीचे दी गई गाइड से अपनी वस्तु का चयन करें।` 
      : `AI Analysis note: ${error.message}\nYou can also explore the Rule-Based Guide below.`);
  }
}

// --- Gamification & Record Scan ---
function recordSuccessfulScan(result) {
  state.totalScans += 1;
  state.ecoPoints += 10;
  localStorage.setItem('ecosort_scans', state.totalScans.toString());
  localStorage.setItem('ecosort_points', state.ecoPoints.toString());

  // Record category stats
  if (result.items && Array.isArray(result.items)) {
    result.items.forEach(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('wet') || cat.includes('organic')) state.categoryStats.wet += 1;
      else if (cat.includes('dry') || cat.includes('recyclable')) state.categoryStats.dry += 1;
      else if (cat.includes('hazard')) state.categoryStats.hazardous += 1;
      else if (cat.includes('e-waste')) state.categoryStats.ewaste += 1;
      else if (cat.includes('sanitary') || cat.includes('biomedical')) state.categoryStats.sanitary += 1;
      else state.categoryStats.mixed += 1;
    });
    localStorage.setItem('ecosort_category_stats', JSON.stringify(state.categoryStats));
  }

  // Save to History (max 10 items)
  const firstItem = result.items?.[0];
  const historyItem = {
    id: Date.now(),
    name: firstItem?.name || 'Waste Item',
    category: firstItem?.category || 'General Waste',
    bin: firstItem?.bin || 'Designated Bin',
    date: new Date().toLocaleDateString(state.lang === 'hi' ? 'hi-IN' : 'en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    thumb: state.currentImageBase64
  };

  state.history.unshift(historyItem);
  if (state.history.length > 10) state.history.pop();
  localStorage.setItem('ecosort_history', JSON.stringify(state.history));

  updateGamificationUI();
  renderHistoryUI();
  drawWasteChart();
}

function updateGamificationUI() {
  ecoPointsText.textContent = `${state.ecoPoints} pts`;
  dashboardEcoPoints.textContent = state.ecoPoints;
  totalScansCount.textContent = state.totalScans;

  // Waste diverted estimate (approx 0.25 kg per segregated item)
  const divertedKg = (state.totalScans * 0.25).toFixed(1);
  landfillDiverted.textContent = `${divertedKg} kg`;

  // Tier calculation
  let rank = 'Swachhta Cadet';
  let badgeLabel = 'Cadet';
  if (state.ecoPoints >= 200) {
    rank = 'Swachhta Warrior 🏆';
    badgeLabel = 'Warrior';
  } else if (state.ecoPoints >= 100) {
    rank = 'Eco Champion ⭐';
    badgeLabel = 'Champion';
  } else if (state.ecoPoints >= 40) {
    rank = 'Green Citizen 🌿';
    badgeLabel = 'Citizen';
  }

  userTier.textContent = badgeLabel;
  badgeTitle.textContent = rank;
}

// --- Render Classification Results ---
function renderResults(data) {
  resultsSection.classList.remove('hidden');
  previewContainer.classList.remove('hidden');

  const items = data.items || [];
  resultsCountBadge.textContent = `${items.length} ${state.lang === 'hi' ? 'वस्तुएं पाई गईं' : 'Item(s) Detected'}`;

  // Summary
  if (state.lang === 'hi' && data.summary_hi) {
    summaryText.innerHTML = `<strong>सारांश:</strong> ${data.summary_hi}`;
  } else {
    summaryText.innerHTML = `<strong>Summary:</strong> ${data.message || 'Waste classified successfully as per SWM Rules, 2016.'}`;
  }

  // Render items
  itemsContainer.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    // Category badge color
    const catLower = (item.category || '').toLowerCase();
    let badgeBg = 'var(--cat-mixed-bg)';
    let badgeColor = 'var(--cat-mixed)';
    let dotColor = '#64748b';

    if (catLower.includes('wet') || catLower.includes('organic')) {
      badgeBg = 'var(--cat-wet-bg)';
      badgeColor = 'var(--cat-wet)';
      dotColor = '#16a34a';
    } else if (catLower.includes('dry') || catLower.includes('recyclable')) {
      badgeBg = 'var(--cat-dry-bg)';
      badgeColor = 'var(--cat-dry)';
      dotColor = '#2563eb';
    } else if (catLower.includes('hazard')) {
      badgeBg = 'var(--cat-hazard-bg)';
      badgeColor = 'var(--cat-hazard)';
      dotColor = '#dc2626';
    } else if (catLower.includes('e-waste')) {
      badgeBg = 'var(--cat-ewaste-bg)';
      badgeColor = 'var(--cat-ewaste)';
      dotColor = '#d97706';
    } else if (catLower.includes('sanitary') || catLower.includes('biomedical')) {
      badgeBg = 'var(--cat-sanitary-bg)';
      badgeColor = 'var(--cat-sanitary)';
      dotColor = '#9333ea';
    }

    // Steps based on active language
    const steps = (state.lang === 'hi' && item.disposal_steps_hi && item.disposal_steps_hi.length) 
      ? item.disposal_steps_hi 
      : (item.disposal_steps_en || []);

    const stepsHtml = steps.map(s => `<li>${s}</li>`).join('');

    // Safety Warning
    const safetyHtml = item.safety_warning 
      ? `<div class="safety-warning-banner">⚠️ <span>${item.safety_warning}</span></div>` 
      : '';

    // Recycling Tip
    const tipHtml = item.recycling_tip 
      ? `<div class="recycling-tip-box">💡 <strong>${state.lang === 'hi' ? 'सुझाव' : 'Eco Tip'}:</strong> ${item.recycling_tip}</div>` 
      : '';

    // Environmental Benefit
    const benefitHtml = item.environmental_benefit 
      ? `<div class="benefit-box">🌍 <strong>${state.lang === 'hi' ? 'पर्यावरण लाभ' : 'Impact'}:</strong> ${item.environmental_benefit}</div>` 
      : '';

    card.innerHTML = `
      <div class="item-card-top">
        <h4 class="item-name">${item.name}</h4>
        <span class="confidence-badge confidence-${item.confidence || 'high'}">${item.confidence || 'verified'}</span>
      </div>

      <div class="category-badge-pill" style="background:${badgeBg}; color:${badgeColor};">
        <span>🏷️</span>
        <span>${item.category}</span>
      </div>

      <div class="bin-badge">
        <span class="bin-color-dot" style="background:${dotColor}"></span>
        <span>${item.bin || 'Designated Municipal Bin'}</span>
      </div>

      ${safetyHtml}

      <div class="disposal-steps-box">
        <div class="steps-title">
          <span>${state.lang === 'hi' ? 'निपटान के चरण' : 'Disposal Steps'}</span>
          <button class="btn-tts" data-speech="${encodeURIComponent(item.name + '. ' + steps.join('. '))}">
            🔊 <span>${state.lang === 'hi' ? 'सुनें' : 'Listen'}</span>
          </button>
        </div>
        <ol class="disposal-steps-list">
          ${stepsHtml}
        </ol>
      </div>

      ${tipHtml}
      ${benefitHtml}

      <div class="card-feedback">
        <span>${state.lang === 'hi' ? 'क्या यह सही था?' : 'Was this accurate?'}</span>
        <div class="feedback-btns">
          <button class="btn-feedback" onclick="handleFeedback(this, true)">👍 Yes</button>
          <button class="btn-feedback" onclick="handleFeedback(this, false)">👎 Report</button>
        </div>
      </div>
    `;

    itemsContainer.appendChild(card);
  });

  // Attach Text to Speech listener
  document.querySelectorAll('.btn-tts').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const textToSpeak = decodeURIComponent(e.currentTarget.getAttribute('data-speech'));
      speakInstructions(textToSpeak);
    });
  });

  // Smooth scroll down to results
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderUnclearResult(msg) {
  resultsSection.classList.remove('hidden');
  itemsContainer.innerHTML = `
    <div style="grid-column: 1 / -1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; text-align: center;">
      <span style="font-size: 2.5rem;">🔍</span>
      <h4 style="margin: 8px 0; color: #92400e;">${state.lang === 'hi' ? 'तस्वीर स्पष्ट नहीं है' : 'Photo is Unclear'}</h4>
      <p style="color: #78350f; max-width: 500px; margin: 0 auto 16px;">${msg}</p>
      <button class="btn btn-primary" onclick="fileInput.click()">${state.lang === 'hi' ? 'दूसरी फोटो लें' : 'Upload Clearer Photo'}</button>
    </div>
  `;
}

// --- Text-to-Speech (Web Speech API) ---
function speakInstructions(text) {
  if (!('speechSynthesis' in window)) {
    alert('Text-to-speech is not supported on this browser.');
    return;
  }

  window.speechSynthesis.cancel(); // Stop any ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

// --- Feedback Handler ---
window.handleFeedback = function(btn, isPositive) {
  const parent = btn.parentElement;
  parent.innerHTML = isPositive 
    ? `<span style="color:#16a34a; font-weight:700;">✓ Thanks! (+2 pts)</span>` 
    : `<span style="color:#dc2626; font-weight:700;">Reported. We'll improve!</span>`;

  if (isPositive) {
    state.ecoPoints += 2;
    localStorage.setItem('ecosort_points', state.ecoPoints.toString());
    updateGamificationUI();
  }
};

// --- Rule-Based Knowledge Grid Rendering ---
function renderKnowledgeGrid(query = '', categoryFilter = 'all') {
  knowledgeGrid.innerHTML = '';
  const q = query.trim().toLowerCase();

  const filtered = KNOWLEDGE_ITEMS.filter(item => {
    const matchesCategory = (categoryFilter === 'all') || (item.categoryKey === categoryFilter);
    const matchesSearch = !q || 
      item.name_en.toLowerCase().includes(q) || 
      item.name_hi.toLowerCase().includes(q) || 
      item.examples.some(ex => ex.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    knowledgeGrid.innerHTML = `
      <p class="empty-state">
        ${state.lang === 'hi' ? 'कोई मेल खाने वाली वस्तु नहीं मिली।' : 'No matching waste item found in the guide.'}
      </p>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'knowledge-card';
    const name = state.lang === 'hi' ? item.name_hi : item.name_en;
    const bin = state.lang === 'hi' ? item.bin_hi : item.bin_en;
    const steps = state.lang === 'hi' ? item.steps_hi : item.steps_en;
    const tip = state.lang === 'hi' ? item.tip_hi : item.tip_en;

    const examplesHtml = item.examples.map(ex => `<span class="example-tag">${ex}</span>`).join('');
    const stepsHtml = steps.map(s => `<li>${s}</li>`).join('');

    card.innerHTML = `
      <div class="knowledge-card-header">
        <h4 class="knowledge-category-title" style="color: ${item.color}">${name}</h4>
        <span class="bin-color-dot" style="background:${item.color}"></span>
      </div>

      <div class="bin-badge">
        <span>🗑️ ${bin}</span>
      </div>

      <div class="examples-tags">
        ${examplesHtml}
      </div>

      <ol class="disposal-steps-list" style="margin-top:6px;">
        ${stepsHtml}
      </ol>

      <div class="recycling-tip-box" style="margin-top:8px;">
        💡 ${tip}
      </div>
    `;

    knowledgeGrid.appendChild(card);
  });
}

// --- History UI ---
function renderHistoryUI() {
  if (!state.history || state.history.length === 0) {
    historyList.innerHTML = `
      <p class="empty-state" data-i18n="empty_history">
        ${state.lang === 'hi' ? 'अभी तक कोई स्कैन नहीं हुआ। ऊपर अपनी पहली कचरे की तस्वीर अपलोड करें!' : 'No scans recorded yet. Upload or snap your first waste item above!'}
      </p>
    `;
    return;
  }

  historyList.innerHTML = '';
  state.history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <img src="${item.thumb || ''}" alt="scan thumbnail" class="history-thumb" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%23e2e8f0\\'/></svg>'">
      <div class="history-info">
        <div class="history-name">${item.name}</div>
        <div class="history-cat">${item.category} • ${item.bin}</div>
        <div class="history-date">${item.date}</div>
      </div>
    `;
    historyList.appendChild(card);
  });
}

// --- Waste Stream HTML5 Canvas Chart ---
function drawWasteChart() {
  const canvas = wasteChart;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const stats = state.categoryStats;
  const data = [
    { label: state.lang === 'hi' ? 'गीला कचरा' : 'Wet / Organic', value: stats.wet || 1, color: '#16a34a' },
    { label: state.lang === 'hi' ? 'सूखा कचरा' : 'Dry / Recyclable', value: stats.dry || 1, color: '#2563eb' },
    { label: state.lang === 'hi' ? 'खतरनाक' : 'Hazardous', value: stats.hazardous || 0, color: '#dc2626' },
    { label: state.lang === 'hi' ? 'ई-कचरा' : 'E-Waste', value: stats.ewaste || 0, color: '#d97706' },
    { label: state.lang === 'hi' ? 'सेनेटरी' : 'Sanitary', value: stats.sanitary || 0, color: '#9333ea' }
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = -0.5 * Math.PI;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;
  const innerRadius = radius * 0.55; // Donut style

  data.forEach(slice => {
    if (slice.value <= 0) return;
    const sliceAngle = (slice.value / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();

    startAngle += sliceAngle;
  });

  // Center circle hole for clean donut look
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Render Legend
  chartLegend.innerHTML = '';
  data.forEach(slice => {
    const count = slice.value;
    const percentage = Math.round((count / total) * 100);
    const itemEl = document.createElement('div');
    itemEl.className = 'legend-item';
    itemEl.innerHTML = `
      <span class="legend-color" style="background:${slice.color}"></span>
      <span>${slice.label}: <strong>${percentage}%</strong> (${count})</span>
    `;
    chartLegend.appendChild(itemEl);
  });
}
