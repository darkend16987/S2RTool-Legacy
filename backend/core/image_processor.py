"""
core/image_processor.py - Image Processing with CV2
"""

import base64
import io
import re
from typing import Optional, Tuple
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

from config import SUPPORTED_ASPECT_RATIOS, ImageConfig


@dataclass
class SketchInfo:
    """Information about detected sketch"""
    sketch_type: str  # 'line_drawing', 'shaded', 'colored'
    detail_level: str  # 'simple', 'detailed', 'very_detailed'
    is_colored: bool
    mean_intensity: float
    edge_density: float


class ImageProcessor:
    """Handle all image processing operations"""
    
    def process_base64_image(self, base64_string: str) -> Tuple[Optional[Image.Image], Optional[str]]:
        """
        Convert base64 string to PIL Image
        """
        try:
            if base64_string.startswith('data:'):
                match = re.match(r'data:([^;]+);base64,(.+)', base64_string)
                if match:
                    mime_type = match.group(1)
                    base64_data = match.group(2)
                else:
                    return None, None
            else:
                base64_data = base64_string
                mime_type = 'image/jpeg'
            
            image_bytes = base64.b64decode(base64_data)
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            return pil_image, mime_type
            
        except Exception as e:
            print(f"Error processing base64 image: {e}")
            return None, None
    
    def detect_sketch_type(self, pil_image: Image.Image) -> SketchInfo:
        """
        Detect sketch characteristics
        """
        img_array = np.array(pil_image)
        
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            is_colored = True
        else:
            gray = img_array
            is_colored = False
        
        mean_intensity = np.mean(gray)
        
        edges = cv2.Canny(gray, 
                          ImageConfig.EDGE_DETECTION_THRESHOLD_LOW, 
                          ImageConfig.EDGE_DETECTION_THRESHOLD_HIGH)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        
        if mean_intensity > 200:
            sketch_type = 'line_drawing'
        elif mean_intensity > 150:
            sketch_type = 'shaded'
        else:
            sketch_type = 'colored'
        
        if edge_density < 0.05:
            detail_level = 'simple'
        elif edge_density < 0.15:
            detail_level = 'detailed'
        else:
            detail_level = 'very_detailed'
        
        return SketchInfo(
            sketch_type=sketch_type,
            detail_level=detail_level,
            is_colored=is_colored,
            mean_intensity=float(mean_intensity),
            edge_density=float(edge_density)
        )
    
    def preprocess_sketch(
        self,
        pil_image: Image.Image,
        target_aspect_ratio: str = "16:9",
        sketch_info: Optional[SketchInfo] = None,
        preserve_quality: bool = True
    ) -> Image.Image:
        """
        Preprocess sketch for better rendering
        ✅ OPTIMIZED: Logic để hỗ trợ output 2K tốt nhất
        """
        # Get target dimensions
        if target_aspect_ratio in SUPPORTED_ASPECT_RATIOS:
            target_w, target_h = SUPPORTED_ASPECT_RATIOS[target_aspect_ratio]
        else:
            target_w, target_h = 1920, 1080

        orig_w, orig_h = pil_image.size

        # ✅ OPTIMIZED: Nếu muốn ảnh ra 2K, đừng resize ảnh gốc xuống thấp
        # Nếu preserve_quality=True, ta chỉ resize khi ảnh quá nhỏ
        if preserve_quality:
            # Nếu ảnh gốc đã lớn (>1500px), giữ nguyên hoặc resize nhẹ theo Lanczos
            if orig_w > 1500 or orig_h > 1500:
                print(f"   ℹ️  Sketch is High-Res ({orig_w}x{orig_h}). Keeping raw quality for 2K render.")
                # Vẫn cần resize để khớp aspect ratio nếu cần, nhưng ưu tiên giữ size lớn
                # Logic: Scale ảnh sao cho cạnh nhỏ nhất khớp với target, cạnh kia dư ra rồi crop/pad
                # Tuy nhiên đơn giản nhất là trả về nguyên gốc nếu tỉ lệ gần đúng
                return pil_image
            
            # Nếu ảnh quá nhỏ, upscale lên tối thiểu 1920 để Gemini có nhiều chi tiết hơn
            if orig_w < 1920:
                scale_factor = 1920 / orig_w
                new_w = int(orig_w * scale_factor)
                new_h = int(orig_h * scale_factor)
                print(f"   ℹ️  Upscaling sketch to {new_w}x{new_h} for better 2K input")
                return pil_image.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Fallback to standard resize logic if preserve_quality=False or legacy mode
        img_array = np.array(pil_image)
        h, w = img_array.shape[:2]
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)

        if len(img_array.shape) == 3:
            resized = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        else:
            resized = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

        if not preserve_quality and sketch_info and sketch_info.sketch_type == 'line_drawing':
            resized = self._enhance_edges(resized)

        if len(resized.shape) == 3:
            padded = np.ones((target_h, target_w, resized.shape[2]), dtype=np.uint8) * 255
        else:
            padded = np.ones((target_h, target_w), dtype=np.uint8) * 255

        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        padded[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

        return Image.fromarray(padded)
    
    def _enhance_edges(self, img_array: np.ndarray) -> np.ndarray:
        """Gently enhance edges for line drawings"""
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        filtered = cv2.bilateralFilter(gray, 5, 50, 50)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(filtered)

        kernel = np.array([[-0.5, -0.5, -0.5],
                          [-0.5,  5.0, -0.5],
                          [-0.5, -0.5, -0.5]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)

        if len(img_array.shape) == 3:
            sharpened = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2RGB)

        return sharpened
    
    def resize_image(self, pil_image: Image.Image, max_size: int = 2048) -> Image.Image:
        """
        Resize image, default max_size boosted to 2048 for better analysis
        """
        w, h = pil_image.size
        
        if w <= max_size and h <= max_size:
            return pil_image
        
        if w > h:
            new_w = max_size
            new_h = int(h * (max_size / w))
        else:
            new_h = max_size
            new_w = int(w * (max_size / h))
        
        return pil_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    def convert_to_base64(self, pil_image: Image.Image, format: str = 'PNG') -> str:
        img_byte_arr = io.BytesIO()
        pil_image.save(img_byte_arr, format=format)
        img_byte_arr.seek(0)
        return base64.b64encode(img_byte_arr.read()).decode('utf-8')