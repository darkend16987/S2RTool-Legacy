# S2RTool - How It Works

**Version:** 4.0
**Last Updated:** 2025-01-23
**AI Models:** Gemini 2.5 & 3.0

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Render Modes](#render-modes)
4. [AI Workflow](#ai-workflow)
5. [Key Technologies](#key-technologies)
6. [Model Usage](#model-usage)
7. [Critical Design Principles](#critical-design-principles)
8. [API Endpoints](#api-endpoints)
9. [Prompt Engineering Strategy](#prompt-engineering-strategy)
10. [Performance & Cost](#performance--cost)

---

## 🎯 System Overview

**S2RTool** (Sketch to Render Tool) là ứng dụng AI-powered chuyển đổi sketch kiến trúc thành ảnh render photorealistic. Hệ thống sử dụng Google Gemini AI với 3 render modes chuyên biệt cho các mục đích khác nhau.

### Core Capabilities

✅ **AI-Powered Analysis** - Tự động phân tích sketch và trích xuất thông tin kiến trúc
✅ **Multi-Modal Rendering** - 3 modes: Building, Planning, Planning Detail
✅ **Vietnamese-First** - Hỗ trợ tiếng Việt native, auto-translate sang English
✅ **High Fidelity** - Bảo toàn structure 90-95%+ từ sketch gốc
✅ **Anti-Hallucination** - Prompt engineering đặc biệt để tránh AI thêm elements không có
✅ **Reference System** - Hỗ trợ upload ảnh tham khảo cho style consistency
✅ **Inpainting** - Chỉnh sửa vùng cụ thể sau render

### Use Cases

| Render Mode | Use Case | Target User |
|-------------|----------|-------------|
| **Building Render** | Render công trình đơn lẻ (nhà phố, biệt thự, cao ốc) | Kiến trúc sư, designer |
| **Planning Render** | Render quy hoạch tổng thể nhiều lô | Quy hoạch viên, developer |
| **Planning Detail Render** | Render quy hoạch chi tiết từ sketch có công trình | Kiến trúc sư quy hoạch |

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐      │
│  │ Building │  │ Planning │  │ Planning Detail      │      │
│  │ Render   │  │ Render   │  │ Render               │      │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘      │
│       │             │                    │                   │
└───────┼─────────────┼────────────────────┼───────────────────┘
        │             │                    │
        ├─────────────┴────────────────────┤
        │                                  │
┌───────▼──────────────────────────────────▼───────────────────┐
│                    FLASK BACKEND API                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐       │
│  │ analyze  │  │ planning │  │ render               │       │
│  │ .py      │  │ .py      │  │ .py                  │       │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘       │
│       │             │                    │                   │
│  ┌────▼─────────────▼────────────────────▼───────────┐      │
│  │           CORE MODULES                             │      │
│  │  • prompt_builder.py (Prompt Engineering)         │      │
│  │  • gemini_client.py (AI Communication)            │      │
│  │  • image_processor.py (Image Processing)          │      │
│  │  • translator.py (Vietnamese ↔ English)           │      │
│  └────────────────────────────┬───────────────────────┘      │
└────────────────────────────────┼──────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   GOOGLE GEMINI API     │
                    │                         │
                    │  • gemini-2.5-pro       │
                    │  • gemini-2.5-flash     │
                    │  • gemini-3-pro-image   │
                    └─────────────────────────┘
```

### Directory Structure

```
S2RTool/
├── frontend/                          # Static HTML/CSS/JS
│   ├── index.html                    # Landing page (mode selector)
│   ├── building-render.html          # Building Render UI
│   ├── planning-render.html          # Planning Render UI
│   ├── planning-detail-render.html   # Planning Detail UI
│   ├── style.css                     # Shared styles
│   └── *.js                          # JavaScript logic
│
├── backend/                          # Python Flask API
│   ├── api/                         # API Endpoints
│   │   ├── analyze.py               # Sketch analysis (Vietnamese)
│   │   ├── render.py                # Building render endpoint
│   │   ├── planning.py              # Planning render endpoints
│   │   ├── translate.py             # Vietnamese → English translation
│   │   ├── inpaint.py               # Image inpainting
│   │   └── references.py            # Reference image management
│   │
│   ├── core/                        # Core Logic
│   │   ├── gemini_client.py         # Gemini API wrapper
│   │   ├── prompt_builder.py        # Prompt engineering templates
│   │   ├── image_processor.py       # Image preprocessing
│   │   ├── translator.py            # Translation logic
│   │   └── thread_local.py          # Thread-safe instances
│   │
│   ├── config.py                    # Configuration (models, settings)
│   └── app.py                       # Flask application entry
│
├── docker-compose.yaml              # Docker orchestration
├── .env                             # Environment variables (API key)
└── README.md                        # Project documentation
```

---

## 🎨 Render Modes

### 1. Building Render

**Mục đích:** Render công trình đơn lẻ với chi tiết kiến trúc cao

**Input:**
- Sketch công trình (line drawing, shaded, colored)
- Vietnamese description (optional - có AI auto-analyze)
- Reference images (optional - style guidance)

**Workflow:**

```
1. User uploads sketch
   ↓
2. AI analyzes sketch (gemini-2.5-pro)
   → Extract: building type, floor count, facade style, materials, etc.
   → Output: Vietnamese JSON
   ↓
3. User reviews & edits description
   ↓
4. System translates Vietnamese → English (gemini-2.5-flash)
   → English is "source of truth" for rendering
   → Ensures better quality & consistency
   ↓
5. Build render prompt from English description
   → Add anti-hallucination rules
   → Add camera angle, lighting, quality settings
   ↓
6. Generate image (gemini-3-pro-image-preview)
   → Input: [prompt, sketch, reference_images]
   → Resolution: up to 2048x2048
   ↓
7. Output: Photorealistic render
```

**Key Features:**
- ✅ Auto-analyze với gemini-2.5-pro
- ✅ Vietnamese → English translation (source of truth)
- ✅ Reference image support
- ✅ Multi camera angles (match sketch, 3/4, aerial, etc.)
- ✅ Inpainting support (chỉnh sửa vùng cụ thể)
- ✅ Floor count preservation (CRITICAL constraint)

**Anti-Hallucination Rules:**
- Preserve EXACT floor count from sketch
- Do NOT add windows/doors not in sketch
- Do NOT change proportions
- Maintain structural accuracy >95%

---

### 2. Planning Render

**Mục đích:** Render quy hoạch tổng thể với nhiều lô đất

**Input:**
- Site plan sketch (mặt bằng phân lô)
- Lot map (bản đồ đánh số lô)
- Lot descriptions (mô tả từng lô: high-rise/low-rise/green space)

**Workflow:**

```
1. User uploads:
   - Site plan sketch (lot boundaries)
   - Lot map with numbers (1, 2, 3...)
   ↓
2. User describes each lot:
   Lot 1: 3 high-rise buildings, 25-30 floors, modern glass
   Lot 2: Low-rise villas, 3-4 floors, neoclassical
   Lot 3: Green park with trees
   ↓
3. Build planning prompt
   → Focus: LOT BOUNDARIES (95% fidelity)
   → Focus: Building massing (NOT details)
   → Camera: Aerial (drone 45° or bird's eye)
   ↓
4. Generate image (gemini-3-pro-image-preview)
   → Input: [prompt, site_plan, lot_map]
   → Resolution: typically 16:9 (2048x1152)
   ↓
5. Output: Aerial planning render
```

**Key Features:**
- ✅ Multi-lot support (3-50+ lots)
- ✅ Lot boundary fidelity >90%
- ✅ Aerial camera angles (drone, bird's eye)
- ✅ Time of day (golden hour, day, night)
- ✅ Simple building massing (not architectural details)

**Prompt Strategy:**
- **PRIORITY 1:** Lot shapes & boundaries (ABSOLUTE)
- **PRIORITY 2:** Building massing & height tiers
- **PRIORITY 3:** Aerial perspective
- Do NOT over-detail buildings (waste computation)
- Focus on overall layout & relationships

---

### 3. Planning Detail Render

**Mục đích:** Render quy hoạch chi tiết từ sketch có sẵn công trình

**Input:**
- Planning sketch (sketch quy hoạch với công trình đã vẽ)
- Planning description (Vietnamese - manual hoặc AI-generated)
- Quality presets (GI, shadows, reflections, etc.)

**Workflow:**

```
1. User uploads planning sketch (có công trình)
   ↓
2. OPTION A: Auto-analyze
   → Click "Analyze Sketch" button
   → AI extracts (gemini-2.5-flash, Vietnamese output):
      • Scale (1:500, 1:200, 1:150, 1:100)
      • Project type (mixed-use, residential, resort, etc.)
      • High-rise zone (count, floors, style, colors)
      • Low-rise zone (floors, style, colors)
      • Landscape (green spaces, trees, roads)
   → Auto-fill structured form
   ↓
   OPTION B: Manual input
   → User fills structured form directly
   ↓
3. System builds Vietnamese description from form
   → OR user provides custom description (override)
   ↓
4. Build planning detail prompt (Vietnamese - NO TRANSLATION)
   → Add anti-hallucination rules (CRITICAL)
   → Add quality presets (GI, soft shadows, reflections)
   → Add camera angle (match sketch, drone 45°, etc.)
   ↓
5. Generate image (gemini-3-pro-image-preview)
   → Input: [prompt, sketch]
   → Resolution: up to 2048x2048
   ↓
6. Output: Planning detail render
```

**Key Features:**
- ✅ AI-powered analyze (gemini-2.5-flash, Vietnamese)
- ✅ Structured form (auto-fill from analysis)
- ✅ Scale-aware rendering (1:500 vs 1:100 → different detail levels)
- ✅ Quality presets (Standard, High Fidelity, Ultra Realism)
- ✅ Vietnamese descriptions (NO translation - simpler workflow)
- ✅ Custom override textarea (full control)

**CRITICAL Anti-Hallucination Rules:**
```
🚨 ABSOLUTELY DO NOT add buildings to empty spaces
✓ ONLY render buildings CLEARLY DRAWN in sketch
✓ Empty spaces → green areas, plazas, parking, playgrounds
✗ NEVER imagine additional high-rise/low-rise buildings
✓ Preserve shapes & proportions 95%+
```

**Why Vietnamese (No Translation)?**
- Planning descriptions simpler than building descriptions
- Prompt instructions already in English (most critical)
- Gemini 2.5/3.0 has strong Vietnamese support
- Fewer error points, faster, cheaper
- Anti-hallucination rules in English (core logic)

---

## 🤖 AI Workflow

### Analysis Workflow (Building Render)

```
┌──────────────────┐
│  Upload Sketch   │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Image Preprocessing                       │
│  • Resize to 1024px max                    │
│  • Detect sketch type (line/shaded/colored)│
│  • Detect detail level (simple/detailed)   │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Gemini Analysis (gemini-2.5-pro)          │
│  • Temperature: 0.3 (factual)              │
│  • Prompt: ANALYSIS_SYSTEM_PROMPT_VI       │
│  • Output: Vietnamese JSON                 │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Analysis Result (Vietnamese JSON)         │
│  {                                         │
│    "building_type": "Nhà phố",            │
│    "floor_count": 3,                      │
│    "facade_style": "Hiện đại",            │
│    "critical_elements": [...],            │
│    "materials_precise": [...],            │
│    "environment": [...],                  │
│    "technical_specs": {...}               │
│  }                                         │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  User Review & Edit                        │
│  • Edit description as needed              │
│  • Add custom details                      │
│  • Adjust materials, colors                │
└────────┬───────────────────────────────────┘
         │
         ▼
      [RENDER]
```

### Translation Workflow (Building Render)

```
┌────────────────────────────────────────────┐
│  Vietnamese Description (from analysis)    │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Gemini Translation (gemini-2.5-flash)     │
│  • Temperature: 0.4 (balanced)             │
│  • Prompt: RESTRUCTURE_AND_TRANSLATE       │
│  • Output: English JSON                    │
│  • CRITICAL: Preserve floor count exactly  │
│  • Enhance materials with photorealistic   │
│    details (e.g., "glass" → "smooth        │
│    tempered glass with subtle reflections")│
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  English Description (Source of Truth)     │
│  {                                         │
│    "building_type": "Townhouse",          │
│    "floor_count": 3,  ← MUST MATCH        │
│    "facade_style": "Modern",              │
│    "critical_elements": [...],  ← Enhanced│
│    "materials_precise": [...],  ← Enhanced│
│    "environment": [...],                  │
│    "technical_specs": {...}               │
│  }                                         │
└────────┬───────────────────────────────────┘
         │
         ▼
      [RENDER]
```

### Render Workflow

```
┌────────────────────────────────────────────┐
│  Description (English for Building,        │
│   Vietnamese for Planning Detail)          │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Build Render Prompt                       │
│  • prompt_builder.build_*_prompt()         │
│  • Inject anti-hallucination rules         │
│  • Add camera angle, lighting, weather     │
│  • Add quality presets (GI, shadows, etc.) │
│  • Add aspect ratio instructions           │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Gemini Image Generation                   │
│  • Model: gemini-3-pro-image-preview       │
│  • Temperature: 0.4 (balanced creativity)  │
│  • Resolution: up to 2048x2048             │
│  • Input: [prompt, sketch, reference]      │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Post-processing                           │
│  • Validate image size                     │
│  • Convert to base64                       │
│  • Return to frontend                      │
└────────┬───────────────────────────────────┘
         │
         ▼
     [DISPLAY]
```

---

## 🛠️ Key Technologies

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | UI structure |
| **CSS3** | Styling (responsive design) |
| **Vanilla JavaScript** | Logic (no framework - lightweight) |
| **Fetch API** | Backend communication |
| **Canvas API** | Inpainting mask drawing |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **Python 3.11** | Backend language |
| **Flask** | Web framework |
| **Pillow (PIL)** | Image processing |
| **OpenCV** | Advanced image processing |
| **google-generativeai** | Gemini API client |
| **python-dotenv** | Environment management |

### AI Models

| Model | Use Case | Temperature | Cost per Call |
|-------|----------|-------------|---------------|
| **gemini-2.5-pro** | Building sketch analysis (Vietnamese) | 0.3 | $0.0035 |
| **gemini-2.5-flash** | Translation (VI→EN) | 0.4 | $0.0001 |
| **gemini-2.5-flash** | Planning sketch analysis (Vietnamese) | 0.2 | $0.0001 |
| **gemini-3-pro-image-preview** | Image generation (all modes) | 0.4 | $0.04 |

### Infrastructure

- **Docker** + **Docker Compose** - Containerization
- **Nginx** - Frontend static file serving
- **Flask Development Server** - Backend (production: Gunicorn)

---

## 📊 Model Usage

### Building Render Pipeline

```
┌──────────────────┐    gemini-2.5-pro     ┌──────────────────┐
│  Sketch Image    │───────────────────────>│  Vietnamese JSON │
│                  │    (Analyze)           │  Description     │
└──────────────────┘    Temp: 0.3           └─────────┬────────┘
                        Cost: $0.0035                 │
                                                      │
                                          ┌───────────▼────────┐
                                          │ User Review & Edit │
                                          └───────────┬────────┘
                                                      │
                        gemini-2.5-flash              │
┌──────────────────┐    (Translate)      ┌───────────▼────────┐
│  English JSON    │<────────────────────│  Vietnamese JSON   │
│  (Source of      │    Temp: 0.4        │                    │
│   Truth)         │    Cost: $0.0001    │                    │
└─────────┬────────┘                     └────────────────────┘
          │
          │
          │    gemini-3-pro-image-preview
          │    (Generate Image)
          │    Temp: 0.4
          │    Cost: $0.04
          │
          ▼
┌──────────────────┐
│  Photorealistic  │
│  Render Image    │
│  (2048x2048)     │
└──────────────────┘

TOTAL COST: ~$0.044 per render
```

### Planning Detail Render Pipeline

```
┌──────────────────┐    gemini-2.5-flash   ┌──────────────────┐
│  Planning Sketch │───────────────────────>│  Vietnamese JSON │
│                  │    (Analyze)           │  (Structured)    │
└──────────────────┘    Temp: 0.2           └─────────┬────────┘
                        Cost: $0.0001                 │
                                                      │
                                          ┌───────────▼────────┐
                                          │ Auto-fill Form OR  │
                                          │ Manual Input       │
                                          └───────────┬────────┘
                                                      │
                        NO TRANSLATION                │
                        (Vietnamese OK)               │
          ┌───────────────────────────────────────────┘
          │
          │    gemini-3-pro-image-preview
          │    (Generate Image)
          │    Temp: 0.4
          │    Cost: $0.04
          │
          ▼
┌──────────────────┐
│  Planning Detail │
│  Render Image    │
│  (2048x2048)     │
└──────────────────┘

TOTAL COST: ~$0.040 per render (slightly cheaper - no translation)
```

---

## 🎯 Critical Design Principles

### 1. Anti-Hallucination Strategy

**Problem:** AI tends to "imagine" details not in the sketch (e.g., add buildings to empty lots, add floors, change window count)

**Solution:** Multi-layer prompt engineering

**Layer 1: Analysis Prompt**
```
⚠️ CRITICAL INSTRUCTIONS:
- ONLY describe what you SEE in the sketch
- Do NOT count empty spaces as buildings
- EXACT floor count is PRIORITY 1
- Do NOT imagine additional elements
```

**Layer 2: Translation Prompt**
```
⚠️ CRITICAL REQUIREMENTS:
- FLOOR COUNT MUST BE PRESERVED EXACTLY
- TRANSLATE EVERY SINGLE ITEM (do not merge/skip)
- Enhance materials but maintain user intent
```

**Layer 3: Render Prompt** (Planning Detail - most critical)
```
🚨 ANTI-HALLUCINATION CRITICAL:
✗ ABSOLUTELY DO NOT add buildings to empty spaces
✗ DO NOT fill vacant lots with buildings
✗ ONLY render buildings that are CLEARLY DRAWN
✓ Empty spaces → green areas, plazas, parking, playgrounds
✗ NEVER imagine additional high-rise/low-rise buildings

1. PRESERVE SHAPES & PROPORTIONS (Priority 1 - ABSOLUTE)
   ⚠️ This is the MOST CRITICAL requirement!
```

### 2. Vietnamese vs English Strategy

**Building Render:** Vietnamese → English translation
**Why?**
- Building descriptions complex (materials, textures, technical specs)
- English prompts historically perform better for photorealism
- Translation step adds enhancement (e.g., "kính" → "smooth tempered glass with subtle reflections")
- Gemini 3.0 image model trained primarily on English prompts

**Planning Detail Render:** Vietnamese only (no translation)
**Why?**
- Planning descriptions simpler (building count, style, landscape)
- Prompt instructions already in English (core logic)
- Gemini 2.5/3.0 has strong Vietnamese support
- Faster (one less API call)
- Cheaper ($0.0001 saved)
- Fewer error points (translation can introduce mistakes)

### 3. Source of Truth for Floor Count

**CRITICAL:** Floor count is the MOST IMPORTANT architectural constraint

**Why?**
- Wrong floor count = completely wrong building
- Client requirement: EXACT match to sketch
- Legal/regulatory implications in real projects

**Implementation:**
```python
# Analysis prompt (Vietnamese)
"floor_count": "Số tầng CHÍNH (là số nguyên, VD: 2, 3, 4, 10...)"

# Translation prompt (English)
⚠️ **FLOOR COUNT MUST BE PRESERVED EXACTLY**
"floor_count": "EXACT floor count as integer (e.g., 3, 10, 25)"

# Render prompt (English/Vietnamese)
⚠️ The building has EXACTLY {floor_count} floors
⚠️ Count carefully: ground floor + {floor_count-1} upper floors
```

### 4. Quality Presets System

**Purpose:** Allow users to control render quality vs speed/cost trade-offs

**Presets:**

| Preset | Use Case | Features |
|--------|----------|----------|
| **Standard** | Quick preview | Basic lighting, simple shadows |
| **High Fidelity** | Presentation | Global illumination, soft shadows, reflections |
| **Ultra Realism** | Final delivery | Ray tracing, caustics, subsurface scattering |

**Implementation:**
```python
quality_presets = {
    "global_illumination": True,
    "soft_shadows": True,
    "reflections": True,
    "ambient_occlusion": True,
    "depth_of_field": False  # Can toggle
}

# Injected into prompt:
"Rendering: Global illumination, soft shadows, realistic reflections..."
```

### 5. Thread Safety

**Problem:** Multiple users calling API concurrently → shared instances cause race conditions

**Solution:** Thread-local instances

```python
# backend/core/thread_local.py
_thread_local = threading.local()

def get_gemini_client():
    if not hasattr(_thread_local, 'gemini_client'):
        _thread_local.gemini_client = GeminiClient()
    return _thread_local.gemini_client
```

Each request gets isolated instances → no conflicts

---

## 🔌 API Endpoints

### Analysis Endpoints

#### `POST /api/analyze-sketch`
**Purpose:** Analyze building sketch (Vietnamese output)

**Request:**
```json
{
  "image_base64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "building_type": "Nhà phố",
  "floor_count": "3",
  "facade_style": "Hiện đại",
  "critical_elements": [...],
  "materials_precise": [...],
  "environment": [...],
  "technical_specs": {...},
  "sketch_detail_level": "detailed",
  "is_colored": false,
  "sketch_type": "line_drawing"
}
```

**Model:** gemini-2.5-pro
**Cost:** ~$0.0035

---

#### `POST /api/planning/analyze-sketch`
**Purpose:** Analyze planning sketch (Vietnamese output)

**Request:**
```json
{
  "image_base64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "analysis": {
    "scale": "1:500",
    "project_type": "mixed_use",
    "overall_description": "Khu đô thị hỗn hợp...",
    "highrise_zone": {
      "count": "30-31",
      "floors": "38-40",
      "style": "modern",
      "colors": "vàng, trắng, kính",
      "features": "lam chắn nắng, ban công"
    },
    "lowrise_zone": {
      "exists": true,
      "floors": "3-4",
      "style": "neoclassical",
      "colors": "mái xám đen, tường trắng"
    },
    "landscape": {
      "green_spaces": "công viên trung tâm, sân chơi",
      "tree_type": "diverse",
      "road_pattern": "grid"
    }
  }
}
```

**Model:** gemini-2.5-flash
**Cost:** ~$0.0001

---

### Translation Endpoints

#### `POST /api/translate-prompt`
**Purpose:** Translate Vietnamese description to English (with enhancement)

**Request:**
```json
{
  "analysis_json": {
    "building_type": "Nhà phố",
    "floor_count": "3",
    ...
  },
  "style_keywords": "hiện đại, tối giản",
  "negative_prompt": "mờ, méo"
}
```

**Response:**
```json
{
  "building_type": "Townhouse",
  "floor_count": "3",
  "facade_style": "Modern",
  "critical_elements": [...],
  "materials_precise": [...],
  "environment": [...],
  "technical_specs": {...},
  "style_keywords": "modern, minimalist, architectural photography",
  "negative_prompt": "blurry, distorted, low quality"
}
```

**Model:** gemini-2.5-flash
**Cost:** ~$0.0001

---

### Render Endpoints

#### `POST /api/render`
**Purpose:** Generate building render

**Request:**
```json
{
  "image_base64": "data:image/png;base64,...",
  "analysis": {
    "building_type": "Townhouse",
    "floor_count": "3",
    ...
  },
  "camera_angle": "match_sketch",
  "time_of_day": "golden_hour",
  "weather": "clear",
  "aspect_ratio": "1:1",
  "style_keywords": "modern, minimalist",
  "negative_prompt": "blurry, distorted",
  "reference_images": [...]  // Optional
}
```

**Response:**
```json
{
  "generated_image_base64": "data:image/png;base64,...",
  "mime_type": "image/png",
  "aspect_ratio": "1:1"
}
```

**Model:** gemini-3-pro-image-preview
**Cost:** ~$0.04

---

#### `POST /api/planning/detail-render`
**Purpose:** Generate planning detail render

**Request:**
```json
{
  "image_base64": "data:image/png;base64,...",
  "planning_data": {
    "planning_description": "Quy hoạch 1:500...",
    "camera_angle": "match_sketch",
    "time_of_day": "golden_hour",
    "weather": "clear",
    "quality_level": "high_fidelity",
    "quality_presets": {
      "global_illumination": true,
      "soft_shadows": true,
      "reflections": true
    },
    "sketch_adherence": 0.90,
    "aspect_ratio": "16:9",
    "structured_data": {  // Optional (for logging)
      "scale": "1:500",
      "project_type": "mixed_use",
      ...
    }
  }
}
```

**Response:**
```json
{
  "generated_image_base64": "data:image/png;base64,...",
  "mime_type": "image/png",
  "aspect_ratio": "16:9"
}
```

**Model:** gemini-3-pro-image-preview
**Cost:** ~$0.04

---

### Other Endpoints

- `POST /api/inpaint` - Edit specific regions of rendered image
- `GET /api/references/list` - List reference images
- `POST /api/references/upload` - Upload reference image
- `GET /health` - Health check

---

## 🧠 Prompt Engineering Strategy

### Prompt Template Structure

All render prompts follow this structure:

```
1. ROLE
   "You are an expert architectural visualizer..."

2. INPUT DESCRIPTION
   "Building: 3-story modern townhouse..."

3. CRITICAL REQUIREMENTS (Priority Order)
   ⚠️ Anti-hallucination rules
   ⚠️ Structure preservation rules

4. QUALITY SETTINGS
   - Rendering: Global illumination, soft shadows...
   - Materials: Photorealistic textures...

5. CAMERA & LIGHTING
   - Camera: Match sketch angle precisely
   - Lighting: Golden hour, warm sunlight...

6. OUTPUT CONSTRAINTS
   - Aspect ratio: 1:1 (2048x2048)
   - Style: Photorealistic architectural photography
   - Do NOT add: text, watermarks, people
```

### Anti-Hallucination Techniques

**Technique 1: Explicit Negation**
```
✗ DO NOT add buildings to empty spaces
✗ DO NOT change floor count
✗ DO NOT add windows not in sketch
```

**Technique 2: Positive Constraints**
```
✓ ONLY render buildings CLEARLY DRAWN
✓ Preserve shapes & proportions 95%+
✓ Empty spaces → green areas, plazas (NOT buildings)
```

**Technique 3: Priority Ordering**
```
PRIORITY 1 (ABSOLUTE): Preserve shapes & proportions
PRIORITY 2 (CRITICAL): Floor count accuracy
PRIORITY 3 (HIGH): Material realism
```

**Technique 4: Repetition**
```
⚠️ CRITICAL: Do NOT add buildings to empty spaces
...
⚠️ REMINDER: Empty lots should become green spaces, NOT buildings
```

### Vietnamese vs English Prompt Injection

**Building Render:** All prompts in English (after translation)
```python
prompt = f"""
You are an expert architectural visualizer.

Building: {analysis['building_type']}, {analysis['floor_count']} floors, {analysis['facade_style']} style.
⚠️ The building has EXACTLY {analysis['floor_count']} floors - do NOT change this!
...
"""
```

**Planning Detail Render:** Hybrid (Vietnamese description + English instructions)
```python
prompt = f"""
You are an expert urban planning visualizer.

Planning Description (Vietnamese):
{planning_description}

CRITICAL REQUIREMENTS (Priority Order):

1. **PRESERVE SHAPES & PROPORTIONS** (Priority 1 - ABSOLUTE REQUIREMENT):
   ⚠️ This is the MOST CRITICAL requirement!

   🚨 **ANTI-HALLUCINATION CRITICAL**:
   ✗ ABSOLUTELY DO NOT add new buildings to empty spaces
   ✓ Empty spaces should become: green areas, plazas, parking, playgrounds
...
"""
```

---

## ⚡ Performance & Cost

### Cost Breakdown (Per Render)

**Building Render:**
```
Analysis (gemini-2.5-pro):        $0.0035
Translation (gemini-2.5-flash):   $0.0001
Rendering (gemini-3-pro-image):   $0.0400
────────────────────────────────────────
TOTAL:                            $0.0436  (~$0.044)
```

**Planning Detail Render:**
```
Analysis (gemini-2.5-flash):      $0.0001
Rendering (gemini-3-pro-image):   $0.0400
────────────────────────────────────────
TOTAL:                            $0.0401  (~$0.040)
```

**Planning Render:**
```
Rendering (gemini-3-pro-image):   $0.0400
────────────────────────────────────────
TOTAL:                            $0.0400  (~$0.040)
```

### Performance Metrics

| Operation | Average Time | Notes |
|-----------|--------------|-------|
| **Sketch Upload** | <1s | Local processing |
| **Analysis (Building)** | 5-15s | gemini-2.5-pro |
| **Analysis (Planning)** | 3-8s | gemini-2.5-flash (faster) |
| **Translation** | 3-8s | gemini-2.5-flash |
| **Image Generation** | 30-90s | gemini-3-pro-image (varies by complexity) |
| **Total (Building Render)** | 40-120s | End to end |
| **Total (Planning Detail)** | 35-100s | No translation step |

### Optimization Strategies

**1. Caching**
```python
# Cache analysis results to avoid re-analyzing same sketch
cache.set(image_bytes, analysis_result)
```

**2. Image Preprocessing**
```python
# Resize to optimal size (no quality loss, faster API)
sketch_pil = processor.resize_image(sketch_pil, max_size=1024)  # Analysis
sketch_pil = processor.resize_image(sketch_pil, max_size=2048)  # Rendering
```

**3. Temperature Tuning**
```python
# Lower temperature = more consistent, faster
analysis: 0.3      # Factual extraction
translation: 0.4   # Balanced
rendering: 0.4     # Slightly creative
```

**4. Skip Translation When Possible**
- Planning Detail Render: Vietnamese only (saves $0.0001 + 3-8s)

---

## 🔐 Configuration

### Environment Variables (.env)

```bash
# Required
GEMINI_API_KEY=AIzaSy...  # Your Gemini API key

# Optional
PORT=5001                  # Backend port
DEBUG=True                 # Debug mode
LOG_LEVEL=INFO            # Logging level
```

### Model Configuration (config.py)

```python
class Models:
    FLASH = "gemini-2.5-flash"              # Fast text (translation, planning analysis)
    PRO = "gemini-2.5-pro"                  # Advanced reasoning (building analysis)
    FLASH_IMAGE = "gemini-3-pro-image-preview"  # Image generation (all renders)
```

**To change models:** Edit `backend/config.py` → `Models` class

---

## 🚀 Getting Started

### Quick Start

```bash
# 1. Clone repo
git clone <repo-url>
cd S2RTool

# 2. Setup environment
cp .env.example .env
nano .env  # Add GEMINI_API_KEY

# 3. Start with Docker
docker-compose up -d

# 4. Access app
# Frontend: http://localhost:3001
# Backend:  http://localhost:5001
```

---

## 📚 Further Reading

- [Docker Setup Guide](DOCKER_README.md) - Deployment & troubleshooting
- [Planning Mode Design](PLANNING_MODE_DESIGN.md) - Planning mode architecture
- [Gemini API Docs](https://ai.google.dev/docs) - Official Gemini documentation

---

**Last Updated:** 2025-01-23
**Version:** 4.0
**Powered by:** Google Gemini AI (2.5 & 3.0)
