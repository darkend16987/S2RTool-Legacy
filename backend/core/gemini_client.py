"""
core/gemini_client.py - Gemini API Client Wrapper
Uses BOTH old (generativeai) and new (genai) APIs
✅ FIX: Chuyển 'tools' ra khỏi 'generationConfig' trong Raw REST Payload
✅ FIX: Hỗ trợ render ảnh 2K chuẩn xác
"""

import json
import re
import io
import time
import urllib.request
import urllib.error
from typing import List, Optional, Union, Dict
from PIL import Image

# OLD API for text/JSON generation (Stable for text)
import google.generativeai as genai_old
from google.generativeai import types as types_old

# NEW API for image generation (Imagen 3)
try:
    from google import genai as genai_new
    from google.genai import types as types_new
    HAS_NEW_API = True
except ImportError:
    HAS_NEW_API = False
    print("⚠️  google-genai not installed. Image generation will not work.")

# Assumes config.py exists with these variables
from config import GEMINI_API_KEY, Models, Defaults


class GeminiClient:
    """Wrapper for Gemini API operations"""

    def __init__(self, api_key: Optional[str] = None, max_retries: int = 3):
        """
        Initialize Gemini client
        """
        self.api_key = api_key or GEMINI_API_KEY
        self.max_retries = max_retries

        if not self.api_key:
            raise ValueError("Gemini API Key is missing. Please set GEMINI_API_KEY in .env")

        # Configure OLD API (for text/JSON)
        genai_old.configure(api_key=self.api_key)

        # Configure NEW API (for images)
        if HAS_NEW_API:
            self.client_new = genai_new.Client(api_key=self.api_key)
        else:
            self.client_new = None

    def _retry_with_backoff(self, func, *args, **kwargs):
        """
        Execute function with exponential backoff retry logic
        """
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                error_msg = str(e).lower()

                # Check if error is retryable
                is_retryable = any(x in error_msg for x in [
                    'rate limit', 'quota', 'timeout', 'connection',
                    'temporarily unavailable', '429', '500', '503'
                ])

                # Check for Pydantic Validation Error (Not retryable via same method, but handled by caller)
                if "validation error" in error_msg and "extra inputs" in error_msg:
                    raise e 

                if not is_retryable or attempt == self.max_retries - 1:
                    raise e

                backoff_time = 2 ** attempt
                print(f"⚠️  Gemini API error (attempt {attempt + 1}/{self.max_retries}): {e}")
                time.sleep(backoff_time)

        raise last_exception

    def generate_content_json(
        self,
        prompt_parts: Union[str, List],
        model_name: str = Models.FLASH,
        temperature: float = Defaults.TEMPERATURE_ANALYSIS
    ) -> Dict:
        """
        Generate content and parse as JSON (uses OLD API)
        """
        def _generate():
            model = genai_old.GenerativeModel(model_name)
            parts = prompt_parts if isinstance(prompt_parts, list) else [prompt_parts]

            response = model.generate_content(
                parts,
                generation_config=types_old.GenerationConfig(
                    temperature=temperature,
                    response_mime_type="application/json"
                )
            )
            
            if not response.text:
                raise ValueError("Gemini returned empty response text")

            response_text = response.text.strip()
            
            # ✅ FIX: Robust Regex to clean Markdown Code Blocks
            # Removes ```json at start and ``` at end
            pattern = r"^```(?:json)?\s*(.*?)\s*```$"
            match = re.search(pattern, response_text, re.DOTALL | re.IGNORECASE)
            if match:
                response_text = match.group(1)

            try:
                return json.loads(response_text)
            except json.JSONDecodeError as e:
                print(f"❌ JSON Parse Error. Raw text: {response_text[:100]}...")
                raise ValueError(f"Invalid JSON from Gemini: {str(e)}")

        return self._retry_with_backoff(_generate)

    def generate_image(
        self,
        prompt: str,
        source_image: Optional[Image.Image] = None,
        reference_image: Optional[Image.Image] = None,
        model_name: str = Models.FLASH_IMAGE,
        temperature: float = Defaults.TEMPERATURE_GENERATION
    ) -> Image.Image:
        """
        Generate image using NEW API (google-genai).
        Falls back to Raw REST API if local library validation fails (e.g. 2K issue).
        """
        if not HAS_NEW_API:
            raise ImportError("Library 'google-genai' not installed. Add to requirements.txt")

        if not self.client_new:
            raise ValueError("Gemini Client (New API) not initialized.")

        # 1. Định nghĩa hàm gọi SDK chuẩn
        def _generate_img_sdk():
            print(f"🎨 Generating image with {model_name} (SDK Mode)...")
            parts = []
            
            if source_image:
                img_byte_arr = io.BytesIO()
                source_image.save(img_byte_arr, format='PNG')
                parts.append(types_new.Part.from_bytes(data=img_byte_arr.getvalue(), mime_type="image/png"))
            
            if reference_image:
                img_byte_arr = io.BytesIO()
                reference_image.save(img_byte_arr, format='PNG')
                parts.append(types_new.Part.from_bytes(data=img_byte_arr.getvalue(), mime_type="image/png"))
            
            parts.append(types_new.Part.from_text(text=prompt))
            contents = [types_new.Content(role="user", parts=parts)]

            # Config dictionary cho SDK
            generate_content_config = {
                "response_modalities": ["IMAGE", "TEXT"],
                "temperature": temperature,
                "image_config": {
                    "image_size": "2K"
                },
                "tools": [{"googleSearch": {}}]
            }
            
            text_metadata = []
            for chunk in self.client_new.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=generate_content_config 
            ):
                if chunk.candidates:
                    candidate = chunk.candidates[0]
                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                text_metadata.append(part.text)
                            if part.inline_data and part.inline_data.data:
                                print(f"   ✅ Image received (SDK)!")
                                return Image.open(io.BytesIO(part.inline_data.data))

            raise RuntimeError("Gemini API returned no image.")

        # 2. Thử gọi SDK, nếu lỗi Validation -> Gọi Fallback
        try:
            return self._retry_with_backoff(_generate_img_sdk)
        except Exception as e:
            error_str = str(e).lower()
            # Bắt lỗi "Extra inputs forbidden" hoặc lỗi Validation liên quan đến image_size
            if ("validation error" in error_str and "extra" in error_str) or ("image_size" in error_str):
                print(f"⚠️  Local SDK Validation Failed (likely old version).")
                print(f"🔄 Switching to Raw REST API Fallback to force 2K render...")
                return self._generate_image_raw_rest(prompt, source_image, reference_image, model_name, temperature)
            else:
                raise e

    def _generate_image_raw_rest(
        self,
        prompt: str,
        source_image: Optional[Image.Image],
        reference_image: Optional[Image.Image],
        model_name: str,
        temperature: float
    ) -> Image.Image:
        """
        Fallback method: Manually constructs HTTP request to bypass strict SDK validation.
        This guarantees 'imageSize': '2K' is sent to the server.
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
        
        # Prepare Parts
        parts = []
        
        # Helper to convert image to base64 part
        def img_to_part(img):
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            b64_data = io.BytesIO(buf.getvalue()).read()
            # Standard base64 encoding for JSON payload
            import base64
            return {
                "inlineData": {
                    "mimeType": "image/png",
                    "data": base64.b64encode(b64_data).decode('utf-8')
                }
            }

        if source_image:
            parts.append(img_to_part(source_image))
        
        if reference_image:
            parts.append(img_to_part(reference_image))
            
        parts.append({"text": prompt})

        # Construct Payload (Note: CamelCase for JSON API)
        payload = {
            "contents": [{
                "role": "user",
                "parts": parts
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE", "TEXT"],
                "temperature": temperature,
                "imageConfig": {
                    "imageSize": "2K"
                }
                # ❌ tools KHÔNG được nằm ở đây trong REST API
            },
            "tools": [{"googleSearch": {}}] # ✅ tools phải nằm ở root level
        }

        # Send Request
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                
            # Parse Response
            # Look for inlineData in candidates
            candidates = result.get('candidates', [])
            if not candidates:
                raise RuntimeError("Raw API returned no candidates.")
            
            content = candidates[0].get('content', {})
            parts_resp = content.get('parts', [])
            
            for part in parts_resp:
                if 'inlineData' in part:
                    b64_resp = part['inlineData']['data']
                    import base64
                    img_data = base64.b64decode(b64_resp)
                    print(f"   ✅ Image received (Raw REST Fallback) - 2K Success!")
                    return Image.open(io.BytesIO(img_data))
                
                if 'text' in part:
                    print(f"   📝 Metadata: {part['text'][:50]}...")

            raise RuntimeError("Raw API returned no image data.")

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"❌ Raw API HTTP Error: {e.code} - {error_body}")
            raise RuntimeError(f"Gemini API Error: {error_body}")
        except Exception as e:
            print(f"❌ Raw API Error: {str(e)}")
            raise e

    def generate_with_inpaint(
        self,
        original: Image.Image,
        mask: Image.Image,
        prompt: str,
        reference: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """
        Simulate inpainting using Multimodal Prompting.
        """
        inpaint_prompt = f"""
        TASK: IMAGE EDITING / INPAINTING
        - Input 1: Original Image
        - Input 2: Mask (White = Edit, Black = Keep)
        - Instruction: {prompt}
        - Return ONLY the edited image.
        """
        
        return self.generate_image(
            prompt=inpaint_prompt,
            source_image=original,
            reference_image=mask,
            model_name=Models.FLASH_IMAGE 
        )