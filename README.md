# 🌿 EcoSort AI – Smart Waste Segregation Assistant
### *Inspiring Swachh Bharat Mission (Urban 2.0) & Solid Waste Management Rules, 2016*

EcoSort AI is an intelligent, bilingual (English & हिन्दी) computer-vision waste classification and disposal recommendation platform. It enables citizens, households, and waste handlers to instantly scan or snap garbage items, receive designated municipal bin instructions (Green, Blue, Red, Yellow), and access step-by-step recycling and composting advice tailored to Indian cities.

---

## 🌟 Key Highlights & Features

1. **Dual Input (Live Camera + Drag & Drop):**
   - High-performance WebRTC camera feed with live capture and camera-flip capabilities.
   - Drag-and-drop file upload supporting JPG, PNG, WEBP (up to 5 MB).
2. **Computer Vision AI (Gemini Vision):**
   - Detects single or multiple waste items in an image.
   - Categorizes waste according to Indian SWM Rules 2016:
     - 🍏 **Wet / Organic** *(Green Bin)*
     - 🧴 **Dry / Recyclable** *(Blue Bin)*
     - ☣️ **Domestic Hazardous** *(Red / Black Bin)*
     - 📱 **E-Waste** *(Authorized Drop-off)*
     - 🩹 **Sanitary / Biomedical** *(Marked Paper Wrap / Yellow Bin)*
     - 📦 **Mixed / Inert Waste**
3. **Rule-Based Knowledge Engine (Offline Fallback):**
   - Interactive search engine covering 30+ common Indian household items.
   - Functions autonomously even if the backend is offline or camera access is unavailable.
4. **Bilingual & Text-to-Speech Accessibility:**
   - Instant 1-click toggle between **English** and **हिन्दी**.
   - Built-in Web Speech API audio button (🔊) to read disposal instructions aloud in Hindi or English (ideal for domestic helpers and sanitation staff).
5. **Gamification & Impact Dashboard:**
   - +10 Eco-Points for every scan + streak tracker.
   - Dynamic HTML5 Canvas donut chart breaking down scanned waste categories.
   - Estimated kg of waste diverted from overflowing landfills.
6. **Privacy & Safety First:**
   - **Zero Storage Policy**: Images are processed strictly in memory and never written to disk.
   - High-visibility safety banners for toxic batteries, broken glass, needles, and sanitary biohazards.

---

## 🏗️ Project Architecture

```
AI Waste Segretion/
├── public/
│   ├── index.html       # Semantic, accessible UI with camera viewport and modal
│   ├── style.css        # Eco-modern CSS with category themes, animations & responsive layout
│   └── script.js        # Core frontend logic (WebRTC, TTS, I18N, Canvas Chart, Knowledge Base)
├── server.js            # Express server proxying Vision AI requests safely with .env
├── package.json         # Node.js dependencies (express, cors, dotenv)
├── .env.example         # Template for API keys and port configuration
├── .gitignore           # Git ignore list
└── README.md            # Documentation and 10 detailed test cases
```

---

## 🚀 Quick Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended; v24 tested)
- A modern web browser with camera support (Chrome, Edge, Firefox, Safari)

### 1. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```
*(On Windows PowerShell, use `npm.cmd install` if execution policy blocks scripts)*

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and insert your Google Gemini API key:
```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```
> 💡 **Where do I get a free API key?**  
> Visit [Google AI Studio](https://aistudio.google.com/), click **Get API Key**, and generate a free API key in seconds.
>
> *(Note: If you run the app without an API key, it automatically runs in **Interactive Demo Mode**, demonstrating realistic multi-item detection and full rule-based capabilities!)*

### 3. Start the Server
```bash
npm start
```
or with automatic file watching:
```bash
npm run dev
```

### 4. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 🧪 10 Comprehensive Test Cases

| # | Test Item | Test Photo Type | Expected Category | Expected Bin | Key Instruction & Safety Alert |
|---|---|---|---|---|---|
| **1** | Banana Peel | Kitchen food scrap | `Wet / Organic` | **Green Bin** | Do not put inside plastic polythene bag. Ideal for home composting. |
| **2** | Plastic Milk Pouch | Rinsed Amul/Mother Dairy packet | `Dry / Recyclable` | **Blue Bin** | Keep the cut corner attached to avoid microplastic loss; rinse before binning. |
| **3** | AA / AAA Battery | Remote battery | `Hazardous` | **Red / Black Bin** | ⚠️ **DANGER:** Never throw with kitchen garbage or incinerate. Hand over separately. |
| **4** | Broken CFL Bulb | Fluorescent tube / bulb | `Hazardous` | **Red Bin / Wrapped** | ⚠️ **WARNING:** Contains mercury vapor. Wrap in newspaper, label 'GLASS', handle with gloves. |
| **5** | Old Smartphone | Dead mobile phone & USB cable | `E-waste` | **E-waste Center** | Remove personal data/SIM. Deposit at authorized CPCB drop-off counter. |
| **6** | Used Sanitary Pad | Menstrual pad / Baby diaper | `Sanitary / Biomedical` | **Wrapped in Paper** | ⚠️ **BIOHAZARD:** Wrap securely in paper and mark with a visible RED DOT/CROSS. Never flush. |
| **7** | Corrugated Shipping Box | Amazon / Flipkart delivery carton | `Dry / Recyclable` | **Blue Bin** | Flatten to save space; sell to local Kabadiwala to support circular economy. |
| **8** | Half-Eaten Biryani / Curry | Oily leftover meal | `Wet / Organic` | **Green Bin** | Drain excess gravy/liquid before disposal to prevent foul odor and leachate. |
| **9** | Construction Dust / Sweepings | Broom floor dust & sand | `Mixed / Unidentified` | **Inert Waste** | Keep separate from compostable kitchen waste; transfer to municipal transport. |
| **10**| Blurry / Dark Photo | Camera covered or out of focus | Status: `unclear` | *N/A* | Displays friendly prompt asking user to provide better lighting or angle. |

---

## 🌐 Production Deployment

### Deploying to Render
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com/) and create a new **Web Service**.
3. Select your repository.
4. Set:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
   - `GEMINI_MODEL`: `gemini-1.5-flash`
6. Click **Deploy Web Service**.

### Deploying to Vercel
- For serverless deployment, wrap `server.js` as an API route in `/api/index.js` or configure `vercel.json` rewrites to point to `server.js`.

---

## 🏛️ Regulatory Compliance Reference
- **Ministry of Environment, Forest & Climate Change (MoEFCC)**: Solid Waste Management Rules, 2016
- **Central Pollution Control Board (CPCB)**: Guidelines on Domestic Hazardous Waste Management
- **Ministry of Housing and Urban Affairs (MoHUA)**: Swachh Bharat Mission (Urban 2.0) Star Rating for Garbage-Free Cities

---

## 📄 License
This project is released under the **MIT License**. Contributions and forks supporting Swachh Bharat initiatives are warmly welcomed!
