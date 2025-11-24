# 🏗️ S2RTool - Sketch to Render Tool

![Version](https://img.shields.io/badge/version-4.0-blue)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20%7C%203.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)

**AI-Powered Architectural Visualization** - Chuyển đổi sketch kiến trúc thành render photorealistic với Google Gemini AI

---

## ✨ Features

🎨 **3 Render Modes**
- **Building Render** - Render công trình đơn lẻ với chi tiết cao
- **Planning Render** - Render quy hoạch tổng thể nhiều lô đất
- **Planning Detail Render** - Render quy hoạch chi tiết từ sketch có sẵn

🤖 **AI-Powered Analysis**
- Tự động phân tích sketch và trích xuất thông tin kiến trúc
- Vietnamese-first với auto-translation sang English
- Anti-hallucination prompting cho độ chính xác cao

🎯 **High Fidelity Rendering**
- Bảo toàn structure 90-95%+ từ sketch gốc
- Resolution up to 2048x2048
- Quality presets (Standard, High Fidelity, Ultra Realism)

📚 **Reference System**
- Upload ảnh tham khảo cho style consistency
- Inpainting support để chỉnh sửa vùng cụ thể

---

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd S2RTool

# 2. Setup environment
cp .env.example .env

# 3. Add your Gemini API key to .env
nano .env  # or use your preferred editor
# Add: GEMINI_API_KEY=your_api_key_here

# 4. Start with Docker Compose
docker-compose up -d

# 5. Access the application
# Frontend: http://localhost:3001
# Backend:  http://localhost:5001
```

### Verify Installation

```bash
# Check services
docker-compose ps

# Check health
curl http://localhost:5001/health
curl http://localhost:3001/health

# View logs
docker-compose logs -f
```

---

## 📖 Usage

### 1. Building Render Mode

**Use Case:** Render công trình đơn lẻ (nhà phố, biệt thự, cao ốc)

**Steps:**
1. Upload sketch công trình
2. Click "Analyze Sketch" để AI tự động phân tích
3. Review & edit description (Vietnamese)
4. Select camera angle, lighting, quality settings
5. Optional: Upload reference images cho style guidance
6. Click "Generate Render"

**Features:**
- ✅ Auto-analyze với gemini-2.5-pro
- ✅ Vietnamese → English translation (source of truth)
- ✅ Multi camera angles (match sketch, 3/4, aerial, etc.)
- ✅ Reference image support
- ✅ Inpainting support

---

### 2. Planning Render Mode

**Use Case:** Render quy hoạch tổng thể với nhiều lô đất

**Steps:**
1. Upload site plan sketch (mặt bằng phân lô)
2. Upload lot map with numbers (bản đồ đánh số lô)
3. Describe each lot (type, building count, height, style)
4. Select camera angle (aerial views)
5. Click "Generate Planning Render"

**Features:**
- ✅ Multi-lot support (3-50+ lots)
- ✅ Lot boundary fidelity >90%
- ✅ Aerial camera angles (drone 45°, bird's eye)
- ✅ Time of day control

---

### 3. Planning Detail Render Mode

**Use Case:** Render quy hoạch chi tiết từ sketch có sẵn công trình

**Steps:**
1. Upload planning sketch (có công trình đã vẽ)
2. **Option A:** Click "Analyze Sketch" → AI auto-fill form
   **Option B:** Manually fill structured form
3. Review structured data:
   - Scale (1:500, 1:200, etc.)
   - Project type (mixed-use, residential, etc.)
   - High-rise zone (count, floors, style, colors)
   - Low-rise zone (floors, style, colors)
   - Landscape (green spaces, trees, roads)
4. Select quality presets, camera angle
5. Click "Generate Render"

**Features:**
- ✅ AI-powered analyze (gemini-2.5-flash, Vietnamese)
- ✅ Structured form with auto-fill
- ✅ Scale-aware rendering (1:500 vs 1:100)
- ✅ Quality presets (GI, soft shadows, reflections)
- ✅ Vietnamese descriptions (no translation needed)
- ✅ Custom override textarea for full control

**Anti-Hallucination:**
- 🚨 System NEVER adds buildings to empty spaces
- ✓ Only renders buildings clearly drawn in sketch
- ✓ Empty spaces become green areas, plazas, parking

---

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- Responsive design (mobile-friendly)
- Canvas API for inpainting

### Backend
- Python 3.11 + Flask
- Pillow (PIL) + OpenCV for image processing
- Google Gemini API (2.5 & 3.0)

### Infrastructure
- Docker + Docker Compose
- Nginx (frontend static serving)

### AI Models

| Model | Use Case | Cost |
|-------|----------|------|
| gemini-2.5-pro | Building analysis (Vietnamese) | $0.0035/call |
| gemini-2.5-flash | Translation & planning analysis | $0.0001/call |
| gemini-3-pro-image-preview | Image generation | $0.04/image |

**Total Cost per Render:** ~$0.04-0.044

---

## 📁 Project Structure

```
S2RTool/
├── frontend/                      # Static HTML/CSS/JS
│   ├── index.html                # Landing page
│   ├── building-render.html      # Building Render UI
│   ├── planning-render.html      # Planning Render UI
│   ├── planning-detail-render.html
│   └── *.js, *.css
│
├── backend/                      # Python Flask API
│   ├── api/                     # API Endpoints
│   │   ├── analyze.py          # Sketch analysis
│   │   ├── render.py           # Building render
│   │   ├── planning.py         # Planning renders
│   │   ├── translate.py        # VI→EN translation
│   │   ├── inpaint.py          # Image editing
│   │   └── references.py       # Reference images
│   │
│   ├── core/                   # Core Logic
│   │   ├── gemini_client.py   # Gemini API wrapper
│   │   ├── prompt_builder.py  # Prompt templates
│   │   ├── image_processor.py # Image processing
│   │   └── translator.py      # Translation logic
│   │
│   ├── config.py              # Configuration
│   └── app.py                 # Flask app entry
│
├── docker-compose.yaml        # Docker orchestration
├── .env                       # Environment variables
├── README.md                  # This file
├── HOW-IT-WORKS.md           # Detailed documentation
└── DOCKER_README.md          # Docker guide
```

---

## 🎯 Key Design Principles

### 1. Anti-Hallucination
- Multi-layer prompt engineering
- Explicit constraints to prevent AI from adding non-existent elements
- Priority-based requirements (floor count, shapes, proportions)

### 2. Vietnamese-First
- Native Vietnamese support
- Smart translation strategy:
  - Building Render: VI → EN (complex descriptions)
  - Planning Detail: VI only (simpler descriptions)

### 3. High Fidelity
- Structure preservation >90-95%
- Floor count accuracy (CRITICAL constraint)
- Shape & proportion fidelity

### 4. Thread Safety
- Thread-local instances for concurrent requests
- No shared state between API calls

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=5001
DEBUG=True
LOG_LEVEL=INFO
```

### Model Configuration

Edit `backend/config.py`:

```python
class Models:
    FLASH = "gemini-2.5-flash"              # Fast text
    PRO = "gemini-2.5-pro"                  # Advanced reasoning
    FLASH_IMAGE = "gemini-3-pro-image-preview"  # Image generation
```

---

## 🔧 Development

### Backend Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run development server
python app.py

# Run with hot reload
FLASK_ENV=development python app.py
```

### Frontend Development

```bash
# Serve frontend (without Docker)
cd frontend
python -m http.server 8000

# Update API_BASE_URL in script.js for local backend
const API_BASE_URL = 'http://localhost:5001/api';
```

### Docker Development

```bash
# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Shell access
docker-compose exec backend bash
```

---

## 📊 Performance

| Operation | Time | Cost |
|-----------|------|------|
| Sketch Upload | <1s | Free |
| Analysis (Building) | 5-15s | $0.0035 |
| Analysis (Planning) | 3-8s | $0.0001 |
| Translation | 3-8s | $0.0001 |
| Image Generation | 30-90s | $0.04 |
| **Total (Building)** | **40-120s** | **~$0.044** |
| **Total (Planning Detail)** | **35-100s** | **~$0.040** |

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `ValueError: Missing GEMINI_API_KEY`

**Solution:**
```bash
# Check .env exists
cat .env

# Verify API key
grep GEMINI_API_KEY .env

# Restart
docker-compose restart backend
```

### Frontend Can't Connect

**Error:** Network error or CORS

**Solution:**
```bash
# Check backend status
docker-compose ps backend

# Check logs
docker-compose logs backend

# Verify health
curl http://localhost:5001/health
```

### Port Already in Use

```bash
# Find process
lsof -i :5001

# Change port in docker-compose.yaml
# Or kill process
```

See [DOCKER_README.md](DOCKER_README.md) for more troubleshooting.

---

## 📚 Documentation

- **[HOW-IT-WORKS.md](HOW-IT-WORKS.md)** - Comprehensive system documentation
  - Architecture deep dive
  - AI workflow details
  - Prompt engineering strategies
  - API reference

- **[DOCKER_README.md](DOCKER_README.md)** - Docker deployment guide
  - Setup & configuration
  - Common commands
  - Production deployment

- **[PLANNING_MODE_DESIGN.md](PLANNING_MODE_DESIGN.md)** - Planning mode architecture

---

## 🔐 Security

- Never commit `.env` to git (already in `.gitignore`)
- Use strong API keys
- For production:
  - Enable HTTPS
  - Limit CORS origins
  - Use Docker secrets
  - Set up firewall rules

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Google Gemini AI** - Powering all analysis and rendering
- **Docker** - Containerization platform
- **Flask** - Web framework
- **Pillow & OpenCV** - Image processing libraries

---

## 📞 Support

- **Documentation:** See [HOW-IT-WORKS.md](HOW-IT-WORKS.md)
- **Issues:** Create issue on GitHub
- **Email:** support@s2rtool.com

---

## 🗺️ Roadmap

### Version 4.1 (Coming Soon)
- [ ] Settings UI for API key & model configuration
- [ ] Batch rendering support
- [ ] Export documentation (PDF reports)
- [ ] Advanced inpainting tools

### Version 4.2
- [ ] AI auto-segmentation for Planning Render
- [ ] Style presets library
- [ ] Render history & comparison
- [ ] Team collaboration features

### Version 5.0
- [ ] Multi-language support (English, Chinese)
- [ ] Custom model fine-tuning
- [ ] Enterprise features (SSO, audit logs)
- [ ] API for third-party integration

---

**Made with ❤️ for architectural visualization**

**Powered by Google Gemini AI (2.5 & 3.0)**

Version 4.0 | © 2025 S2RTool
