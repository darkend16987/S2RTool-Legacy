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
        
        Args:
            base64_string: Base64 encoded image (with or without data URI prefix)
        
        Returns:
            (PIL Image, mime_type) or (None, None) if invalid
        """
        try:
            # Remove data URI prefix if present
            if base64_string.startswith('data:'):
                # Extract mime type
                match = re.match(r'data:([^;]+);base64,(.+)', base64_string)
                if match:
                    mime_type = match.group(1)
                    base64_data = match.group(2)
                else:
                    return None, None
            else:
                base64_data = base64_string
                mime_type = 'image/jpeg'
            
            # Decode base64
            image_bytes = base64.b64decode(base64_data)
            
            # Open as PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            return pil_image, mime_type
            
        except Exception as e:
            print(f"Error processing base64 image: {e}")
            return None, None
    
    def detect_sketch_type(self, pil_image: Image.Image) -> SketchInfo:
        """
        Detect sketch characteristics
        
        Args:
            pil_image: PIL Image to analyze
        
        Returns:
            SketchInfo with detected characteristics
        """
        # Convert to numpy
        img_array = np.array(pil_image)
        
        # Convert to grayscale for analysis
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            is_colored = True
        else:
            gray = img_array
            is_colored = False
        
        # Calculate mean intensity
        mean_intensity = np.mean(gray)
        
        # Edge detection
        # SỬA LỖI: Gọi cv2.Canny với 2 biến LOW và HIGH riêng biệt
        # thay vì 1 biến tuple không tồn tại
        edges = cv2.Canny(gray, 
                          ImageConfig.EDGE_DETECTION_THRESHOLD_LOW, 
                          ImageConfig.EDGE_DETECTION_THRESHOLD_HIGH)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        
        # Classify sketch type
        if mean_intensity > 200:  # Very bright
            sketch_type = 'line_drawing'
        elif mean_intensity > 150:
            sketch_type = 'shaded'
        else:
            sketch_type = 'colored'
        
        # Classify detail level
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
        preserve_quality: bool = True  # ✅ NEW: Option to preserve maximum quality
    ) -> Image.Image:
        """
        Preprocess sketch for better rendering

        Args:
            pil_image: Input sketch
            target_aspect_ratio: Target ratio (e.g., "16:9")
            sketch_info: Pre-computed sketch info (optional)
            preserve_quality: If True, minimize quality loss (default: True)

        Returns:
            Preprocessed PIL Image
        """
        # Get target dimensions
        if target_aspect_ratio in SUPPORTED_ASPECT_RATIOS:
            target_w, target_h = SUPPORTED_ASPECT_RATIOS[target_aspect_ratio]
        else:
            target_w, target_h = 1920, 1080

        # ✅ OPTIMIZED: If preserve_quality is True and image is already close to target size,
        # return with minimal processing to avoid quality loss
        orig_w, orig_h = pil_image.size
        if preserve_quality:
            # If image is already within 10% of target dimensions, skip aggressive preprocessing
            size_ratio = min(orig_w / target_w, orig_h / target_h)
            if 0.9 <= size_ratio <= 1.1:
                print(f"   ℹ️  Sketch size optimal ({orig_w}x{orig_h}), skipping aggressive preprocessing")
                # Just ensure exact dimensions with high-quality resize
                return pil_image.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # Resize maintaining aspect ratio
        img_array = np.array(pil_image)
        h, w = img_array.shape[:2]

        # Calculate scale to fit in target dimensions
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)

        # ✅ OPTIMIZED: Use high-quality interpolation (LANCZOS4 is best for downscaling)
        if len(img_array.shape) == 3:
            resized = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        else:
            resized = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

        # ✅ OPTIMIZED: Only enhance edges if needed AND quality preservation is disabled
        # Edge enhancement can introduce artifacts, so skip if preserve_quality=True
        if not preserve_quality and sketch_info and sketch_info.sketch_type == 'line_drawing':
            resized = self._enhance_edges(resized)

        # Pad to exact target size
        if len(resized.shape) == 3:
            padded = np.ones((target_h, target_w, resized.shape[2]), dtype=np.uint8) * 255
        else:
            padded = np.ones((target_h, target_w), dtype=np.uint8) * 255

        # Center the image
        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        padded[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

        return Image.fromarray(padded)
    
    def _enhance_edges(self, img_array: np.ndarray) -> np.ndarray:
        """
        ✅ OPTIMIZED: Gently enhance edges for line drawings
        Uses softer filters to avoid introducing artifacts
        """
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # ✅ OPTIMIZED: Use softer bilateral filter (reduced from 9,75,75 to 5,50,50)
        # Smaller kernel = less blurring, better detail preservation
        filtered = cv2.bilateralFilter(gray, 5, 50, 50)

        # ✅ OPTIMIZED: Use CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # instead of equalizeHist - prevents over-enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(filtered)

        # ✅ OPTIMIZED: Apply gentle sharpening to recover fine details lost in filtering
        kernel = np.array([[-0.5, -0.5, -0.5],
                          [-0.5,  5.0, -0.5],
                          [-0.5, -0.5, -0.5]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)

        # Convert back to RGB if needed
        if len(img_array.shape) == 3:
            sharpened = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2RGB)

        return sharpened
    
    def resize_image(self, pil_image: Image.Image, max_size: int = 1024) -> Image.Image:
        """
        Resize image to fit within max_size while maintaining aspect ratio
        
        Args:
            pil_image: Input image
            max_size: Maximum dimension size
        
        Returns:
            Resized PIL Image
        """
        w, h = pil_image.size
        
        if w <= max_size and h <= max_size:
            return pil_image
        
        # Calculate new dimensions
        if w > h:
            new_w = max_size
            new_h = int(h * (max_size / w))
        else:
            new_h = max_size
            new_w = int(w * (max_size / h))
        
        return pil_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    def convert_to_base64(self, pil_image: Image.Image, format: str = 'PNG') -> str:
        """
        Convert PIL Image to base64 string
        
        Args:
            pil_image: Input image
            format: Output format (PNG, JPEG, etc.)
        
        Returns:
            Base64 encoded string
        """
        img_byte_arr = io.BytesIO()
        pil_image.save(img_byte_arr, format=format)
        img_byte_arr.seek(0)
        return base64.b64encode(img_byte_arr.read()).decode('utf-8')
