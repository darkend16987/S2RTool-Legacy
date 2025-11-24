# ⭐ CRITICAL: Load .env FIRST
from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from typing import Dict, Tuple, List

# ============== API Configuration ==============
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "Missing GEMINI_API_KEY!\n"
        "Please check:\n"
        "1. File .env exists in backend/ folder\n"
        "2. File .env contains: GEMINI_API_KEY=AIzaSy...\n"
        "3. python-dotenv is installed: pip install python-dotenv"
    )

if not GEMINI_API_KEY.startswith("AIzaSy"):
    print(f"⚠️  WARNING: API key format suspicious: {GEMINI_API_KEY[:20]}...")


# ============== MODEL NAMES ==============

class Models:
    """Gemini model names"""
    FLASH = "gemini-2.5-flash"  # Fast text generation
    PRO = "gemini-2.5-pro"  # Advanced reasoning
    FLASH_IMAGE = "gemini-3-pro-image-preview"  # Image generation (latest model)


# ============== Server Config ==============
class ServerConfig:
    """Flask server configuration"""
    HOST = "0.0.0.0"
    PORT = int(os.environ.get("PORT", 5001))
    DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

# ============== Logging Config ==============
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

class LoggingConfig:
    """Logging configuration"""
    LEVEL = LOG_LEVEL
    FORMAT = LOG_FORMAT
    
    # Log to file
    LOG_TO_FILE = True
    LOG_FILE = Path(__file__).parent / "logs" / "app.log"
    LOG_MAX_BYTES = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT = 5

# ============== Paths ==============
BASE_DIR = Path(__file__).parent
REFERENCES_DIR = BASE_DIR / "references"
MANIFEST_PATH = REFERENCES_DIR / "manifest.json"

# ============== Generation Settings ==============
class GenerationConfig:
    """Default generation settings"""
    DEFAULT_TEMPERATURE = 0.4
    DEFAULT_TOP_P = 0.95
    DEFAULT_TOP_K = 40
    MAX_OUTPUT_TOKENS = 8192
    
    IMAGE_SAFETY_SETTINGS = {
        "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
        "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
        "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE"
    }

class Defaults:
    """Default values for generation"""
    # General defaults
    TEMPERATURE = 0.4
    TOP_P = 0.95
    TOP_K = 40
    MAX_OUTPUT_TOKENS = 8192
    SAFETY_SETTINGS = GenerationConfig.IMAGE_SAFETY_SETTINGS
    
    # Task-specific temperatures
    TEMPERATURE_ANALYSIS = 0.3      # Lower for factual analysis
    TEMPERATURE_TRANSLATION = 0.4   # Balanced for translation
    # SỬA LỖI: Đổi tên biến để khớp với core/gemini_client.py
    TEMPERATURE_GENERATION = 0.4    # Balanced for image generation
    TEMPERATURE_INPAINT = 0.5       # Slightly higher for creative inpainting
    
    # Image generation defaults
    IMAGE_TEMPERATURE = 0.4
    IMAGE_GUIDANCE_SCALE = 7.5
    IMAGE_NUM_STEPS = 40

# ============== Aspect Ratios ==============
# Updated to use Gemini 3.0's higher resolution capabilities
ASPECT_RATIOS: Dict[str, Tuple[int, int]] = {
    "1:1": (2048, 2048),      # Square - Master plan, elevations (4.2MP)
    "3:4": (1536, 2048),      # Portrait 3:4 (3.1MP)
    "4:3": (2048, 1536),      # Landscape 4:3 (3.1MP)
    "9:16": (1152, 2048),     # Portrait - Tall buildings (2.4MP)
    "16:9": (2048, 1152)      # Landscape - Wide shots, panoramas (2.4MP)
}

# Alias for backward compatibility
SUPPORTED_ASPECT_RATIOS = ASPECT_RATIOS

# ============== Camera Viewpoints ==============
CAMERA_VIEWPOINTS: Dict[str, Dict] = {
    "match_sketch": {
        "name": "Match Sketch Angle (Default)",
        "name_vi": "Góc nhìn như sketch gốc (Mặc định)",
        "description": "Use the EXACT camera angle from the source sketch",
        "camera_angle": "match source sketch precisely",
        "prompt_addition": "Use the EXACT camera angle, viewpoint, and perspective from the source sketch. Do NOT change the viewing angle - maintain the original camera position from the sketch precisely"
    },
    "main_facade": {
        "name": "Main Facade",
        "name_vi": "Mặt tiền chính",
        "description": "Front elevation view, straight-on perspective",
        "camera_angle": "eye-level, centered",
        "prompt_addition": "architectural front elevation, straight-on view"
    },
    "three_quarter": {
        "name": "Three Quarter View",
        "name_vi": "Góc 3/4",
        "description": "45-degree angle showing two sides",
        "camera_angle": "45-degree angle",
        "prompt_addition": "three-quarter perspective view showing two facades"
    },
    "aerial_angle": {
        "name": "Aerial View",
        "name_vi": "Góc trên cao",
        "description": "Bird's eye view from above",
        "camera_angle": "high angle, looking down",
        "prompt_addition": "aerial view, bird's eye perspective from above"
    },
    "low_angle": {
        "name": "Low Angle",
        "name_vi": "Góc thấp",
        "description": "View from ground level looking up",
        "camera_angle": "low angle, looking up",
        "prompt_addition": "dramatic low-angle shot from ground level"
    },
    "side_elevation": {
        "name": "Side Elevation",
        "name_vi": "Mặt bên",
        "description": "Side view of building",
        "camera_angle": "90-degree side view",
        "prompt_addition": "architectural side elevation, perpendicular view"
    },
    "balcony_closeup": {
        "name": "Balcony Detail",
        "name_vi": "Chi tiết ban công",
        "description": "Close-up of balcony/facade details",
        "camera_angle": "medium close-up",
        "prompt_addition": "detailed close-up of balcony and facade elements"
    },
    "entrance_detail": {
        "name": "Entrance Detail",
        "name_vi": "Chi tiết cổng vào",
        "description": "Close-up of entrance and doorway",
        "camera_angle": "close-up, centered on entrance",
        "prompt_addition": "detailed view of main entrance and doorway"
    },
    "interior_exterior": {
        "name": "Interior-Exterior",
        "name_vi": "Nội ngoại thất",
        "description": "View showing both interior and exterior",
        "camera_angle": "see-through perspective",
        "prompt_addition": "cutaway view showing interior spaces through transparent facade"
    }
}

# Alias for backward compatibility
VIEWPOINTS = CAMERA_VIEWPOINTS

# ============== Default Negative Items ==============
DEFAULT_NEGATIVE_ITEMS: List[str] = [
    "blurry",
    "low quality",
    "distorted",
    "deformed",
    "amateur",
    "unrealistic proportions",
    "cartoon",
    "sketch",
    "drawing",
    "painting",
    "illustration",
    "draft",
    "watermark",
    "text overlay",
    "signature",
    "people",
    "cars in focus",
    "cluttered foreground"
]

# ============== Image Config ==============
class ImageConfig:
    """Image processing configuration"""
    MAX_IMAGE_SIZE = 2048  # Max dimension
    MIN_IMAGE_SIZE = 512   # Min dimension
    DEFAULT_QUALITY = 95   # JPEG quality
    
    # Supported formats
    SUPPORTED_FORMATS = ['PNG', 'JPEG', 'JPG', 'WEBP']
    
    # Preprocessing
    APPLY_DENOISING = True
    DENOISE_STRENGTH = 10
    
    APPLY_SHARPENING = True
    SHARPEN_AMOUNT = 1.5
    
    APPLY_CONTRAST_ENHANCEMENT = True
    CONTRAST_CLIP_LIMIT = 2.0
    
    # Edge detection
    EDGE_DETECTION_THRESHOLD_LOW = 50
    EDGE_DETECTION_THRESHOLD_HIGH = 150
    
    # Sketch detection
    SKETCH_DETAIL_THRESHOLD_LOW = 0.3
    SKETCH_DETAIL_THRESHOLD_HIGH = 0.7
    
    COLOR_THRESHOLD = 30  # Threshold to consider image as colored

class ImageThresholds:
    """Image processing thresholds"""
    DETAIL_LOW = 0.3
    DETAIL_HIGH = 0.7
    COLOR_THRESHOLD = 30
    EDGE_LOW = 50
    EDGE_HIGH = 150

# ============== Sketch Types ==============
class SketchType:
    """Sketch type classifications"""
    LINE_DRAWING = "line_drawing"
    SHADED = "shaded"
    COLORED = "colored"
    MIXED = "mixed"

class SketchDetailLevel:
    """Sketch detail level classifications"""
    SIMPLE = "simple"
    INTERMEDIATE = "intermediate"
    DETAILED = "detailed"
    VERY_DETAILED = "very_detailed"

# ============== Inpainting Config ==============
class InpaintingConfig:
    """Inpainting settings"""
    PRESERVE_MODE_STRICT = "strict"
    PRESERVE_MODE_HYBRID = "hybrid"
    PRESERVE_MODE_FLEXIBLE = "flexible"
    
    DEFAULT_PRESERVE_MODE = PRESERVE_MODE_HYBRID
    
    # Mask processing
    MASK_BLUR_RADIUS = 5
    MASK_EROSION_KERNEL = 3
    MASK_DILATION_KERNEL = 5

# ============== Translation Config ==============
class TranslationConfig:
    """Translation settings"""
    DEFAULT_SOURCE_LANG = "vi"
    DEFAULT_TARGET_LANG = "en"
    
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0  # seconds

# ============== API Endpoints ==============
class APIEndpoints:
    """API endpoint paths"""
    ANALYZE_SKETCH = "/api/analyze-sketch"
    TRANSLATE_PROMPT = "/api/translate-prompt"
    RENDER = "/api/render"
    INPAINT = "/api/inpaint"
    
    REFERENCES_LIST = "/api/references/list"
    REFERENCES_SERVE = "/api/references/serve/<image_id>"
    REFERENCES_DOWNLOAD = "/api/references/download"
    REFERENCES_UPLOAD = "/api/references/upload"
    
    HEALTH = "/health"

# ============== Performance Config ==============
class PerformanceConfig:
    """Performance tuning"""
    # Image generation
    IMAGE_GENERATION_TIMEOUT = 120  # seconds
    
    # Analysis
    ANALYSIS_TIMEOUT = 60  # seconds
    
    # Translation
    TRANSLATION_TIMEOUT = 30  # seconds
    
    # Caching
    ENABLE_CACHE = False
    CACHE_TTL = 3600  # 1 hour

# ============== PROMPTS ==============

# Analysis System Prompt (Vietnamese)
ANALYSIS_SYSTEM_PROMPT_VI = """Bạn là chuyên gia phân tích bản vẽ kiến trúc với 20 năm kinh nghiệm.

NHIỆM VỤ:
Phân tích sketch kiến trúc và trả về mô tả chi tiết bằng tiếng Việt theo format JSON.

OUTPUT FORMAT (JSON):
{
    "building_type": "Loại công trình (VD: Nhà phố, Biệt thự, Cao ốc...)",
    "floor_count": "Số tầng CHÍNH (là số nguyên, VD: 2, 3, 4, 10...)",
    "floor_details": "Mô tả chi tiết tầng (nếu phức tạp, VD: 'Tháp 1: đế 4 tầng + thân 10 tầng, Tháp 2: 8 tầng' hoặc '3 tầng + 1 tum' - để trống nếu đơn giản)",
    "facade_style": "Phong cách kiến trúc (VD: Hiện đại, Tân cổ điển, Đông Dương...)",
    "critical_elements": [
        {
            "type": "Tên thành phần (VD: Cửa sổ, Ban công, Cổng...)",
            "description": "Mô tả chi tiết về vị trí, kích thước, hình dạng, vật liệu"
        }
    ],
    "materials_precise": [
        {
            "type": "Bộ phận (VD: Tường, Mái, Cột...)",
            "description": "Vật liệu cụ thể (VD: Kính cường lực màu xanh nhạt, Gỗ óc chó...)"
        }
    ],
    "environment": [
        {
            "type": "Thành phần môi trường (VD: Cây xanh, Đường phố, Hàng rào...)",
            "description": "Mô tả chi tiết"
        }
    ],
    "technical_specs": {
        "camera": "Máy ảnh khuyến nghị (VD: Canon EOS 5D Mark IV, Nikon D850...)",
        "lens": "Ống kính phù hợp (VD: 24mm wide-angle, 50mm standard...)",
        "perspective": "Phối cảnh (VD: 1 điểm tụ, 2 điểm tụ...)",
        "lighting": "Ánh sáng (VD: Ánh sáng tự nhiên ban ngày, hoàng hôn, giờ vàng...)"
    }
}

QUY TẮC:
1. Mô tả cực kỳ chi tiết và cụ thể
2. Chỉ mô tả những gì nhìn thấy trong sketch
3. Sử dụng thuật ngữ kiến trúc chuyên nghiệp
4. Nếu không chắc chắn, đưa ra dự đoán hợp lý dựa trên ngữ cảnh
5. Trả về ĐÚNG format JSON, không có text thừa

QUAN TRỌNG:
- "floor_count": ⚠️ TUYỆT ĐỐI phải đếm chính xác số tầng từ sketch! Đây là thông tin QUAN TRỌNG NHẤT!
- "critical_elements": Tối thiểu 3-5 elements, mô tả rất chi tiết
- "materials_precise": Phải ghi rõ màu sắc, chất liệu, kết cấu
- "environment": Bao gồm cả cây cối, đường phố, bầu trời nếu có"""

# Restructure and Translate Prompt
RESTRUCTURE_AND_TRANSLATE_PROMPT = """You are a professional Vietnamese-to-English translator specializing in architectural terminology.

TASK:
Translate the Vietnamese architectural description to English while maintaining technical accuracy and adding photorealistic rendering details.

INPUT FORMAT (Vietnamese JSON):
{
    "building_type": "Loại công trình",
    "floor_count": "Số tầng",
    "floor_details": "Mô tả chi tiết tầng (optional)",
    "facade_style": "Phong cách",
    "critical_elements": [...],
    "materials_precise": [...],
    "environment": [...],
    "technical_specs": {...},
    "style_keywords": "additional style keywords",
    "negative_prompt": "things to avoid"
}

OUTPUT FORMAT (English JSON):
{
    "building_type": "Building type in English",
    "floor_count": "EXACT floor count as integer (e.g., 3, 10, 25)",
    "floor_details": "Detailed floor description in English (e.g., 'Tower 1: 4-floor podium + 10-floor body, Tower 2: 8 floors' or '3 floors + mezzanine' - empty if simple)",
    "facade_style": "Architectural style in English",
    "critical_elements": [
        {
            "type": "Element name in English",
            "description": "Detailed description in English"
        }
    ],
    "materials_precise": [
        {
            "type": "Component in English",
            "description": "Material description with color, texture, finish"
        }
    ],
    "environment": [
        {
            "type": "Environmental element in English",
            "description": "Detailed description"
        }
    ],
    "technical_specs": {
        "camera": "Camera angle",
        "lens": "Lens specification",
        "perspective": "Perspective type",
        "lighting": "Lighting condition"
    },
    "style_keywords": "Translated and enhanced style keywords",
    "negative_prompt": "Translated negative items"
}

TRANSLATION RULES:
1. Maintain technical accuracy
2. Use professional architectural terminology
3. Add photorealistic details (e.g., "smooth glass" → "smooth tempered glass with subtle reflections")
4. Preserve all numerical values and measurements
5. Enhance material descriptions with texture/finish details
6. Return ONLY valid JSON, no additional text

CRITICAL REQUIREMENTS:
⚠️ **FLOOR COUNT MUST BE PRESERVED EXACTLY** - This is the MOST CRITICAL architectural constraint!
⚠️ **FLOOR DETAILS MUST BE TRANSLATED ACCURATELY** - If provided, translate the detailed floor description precisely
⚠️ TRANSLATE **EVERY SINGLE ITEM** IN ARRAYS - DO NOT SKIP OR MERGE!
   - If input has 7 environment items → output MUST have 7 environment items
   - If input has 5 materials → output MUST have 5 materials
   - Translate each item individually, preserving all user-specified details

IMPORTANT:
- Translate "Hiện đại" → "Modern"
- Translate "Tân cổ điển" → "Neoclassical"
- Translate "Đông Dương" → "Indochinese/French Colonial"
- Add rendering terms: "photorealistic", "architectural visualization", "high detail"
- Materials must include: base material + color + texture + finish
- **PEOPLE** (người, con người) → "people, pedestrians, human activity"
- **VEHICLES** (xe cộ, xe ô tô, xe máy) → "vehicles, cars, motorcycles, traffic"
- **TIME OF DAY** (thời điểm, buổi sáng, chiều tối) → translate accurately with atmospheric details"""

# ============== Debug Info ==============
if __name__ == "__main__":
    print("=" * 60)
    print("📋 CONFIGURATION CHECK")
    print("=" * 60)
    print()
    print(f"API Key: {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-4:] if len(GEMINI_API_KEY) > 14 else '...'}")
    print(f"Server: {ServerConfig.HOST}:{ServerConfig.PORT}")
    print(f"Debug: {ServerConfig.DEBUG}")
    print(f"Base Dir: {BASE_DIR}")
    print(f"References: {REFERENCES_DIR}")
    print()
    print("Models:")
    print(f"  - Flash (Text): {Models.FLASH}")
    print(f"  - Pro (Reasoning): {Models.PRO}")
    print(f"  - Flash Image (Gen): {Models.FLASH_IMAGE}")
    print()
    print("Defaults:")
    print(f"  - Temp Analysis: {Defaults.TEMPERATURE_ANALYSIS}")
    print(f"  - Temp Render: {Defaults.TEMPERATURE_RENDER}")
    print()
    print(f"Aspect Ratios: {len(ASPECT_RATIOS)} options ({', '.join(ASPECT_RATIOS.keys())})")
    print(f"Camera Viewpoints: {len(CAMERA_VIEWPOINTS)} options")
    print(f"Default Negative Items: {len(DEFAULT_NEGATIVE_ITEMS)} items")
    print()
    print("✅ Configuration loaded successfully!")
    print("=" * 60)

