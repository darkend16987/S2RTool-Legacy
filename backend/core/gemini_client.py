"""
core/gemini_client.py - Gemini API Client Wrapper
Uses BOTH old (generativeai) and new (genai) APIs
✅ FIX: Syntax error in Regex
✅ FIX: Robust JSON parsing
✅ FIX: Added retry logic with exponential backoff
"""

import json
import re
import io
import time
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

            # Using response_mime_type="application/json" forces Gemini to output valid JSON
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
                print(f"❌ JSON Parse Error. Raw text: {response_text[:100]}...") # Log raw text for debug
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
        Generate image using NEW API (google-genai)
        """
        # 1. Check Library
        if not HAS_NEW_API:
            raise ImportError("Library 'google-genai' not installed. Add to requirements.txt")

        # 2. Check Client
        if not self.client_new:
            raise ValueError("Gemini Client (New API) not initialized.")

        def _generate_img():
            print(f"🎨 Generating image with {model_name}...")
            
            parts = []
            
            # Handle Source Image (for variations/editing contexts)
            if source_image:
                img_byte_arr = io.BytesIO()
                source_image.save(img_byte_arr, format='PNG')
                parts.append(types_new.Part.from_bytes(data=img_byte_arr.getvalue(), mime_type="image/png"))
            
            # Handle Reference Image (ControlNet-like behavior depending on prompt)
            if reference_image:
                img_byte_arr = io.BytesIO()
                reference_image.save(img_byte_arr, format='PNG')
                parts.append(types_new.Part.from_bytes(data=img_byte_arr.getvalue(), mime_type="image/png"))
            
            parts.append(types_new.Part.from_text(text=prompt))

            contents = [types_new.Content(role="user", parts=parts)]

            # ✅ OPTIMIZED: Configure for maximum image quality (2K resolution)
            # Based on AI Studio reference code for gemini-3-pro-image-preview
            generate_content_config = types_new.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],  # ✅ Receive both image and text metadata
                temperature=temperature,
                image_config=types_new.ImageConfig(
                    image_size="2K"  # ✅ CRITICAL: Enable 2K resolution (2048px) for high-quality renders
                ),
                tools=[
                    types_new.Tool(googleSearch=types_new.GoogleSearch())  # ✅ Enable Google Search for architectural reference images
                ]
            )
            
            # Stream response to handle chunks
            text_metadata = []  # ✅ NEW: Collect text metadata from response

            for chunk in self.client_new.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=generate_content_config
            ):
                # Check logic inside the stream
                if chunk.candidates:
                    candidate = chunk.candidates[0]
                    # Check validation/safety block here if needed

                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            # ✅ NEW: Capture text metadata
                            if hasattr(part, 'text') and part.text:
                                text_metadata.append(part.text)
                                print(f"   📝 Model metadata: {part.text[:100]}...")

                            # ✅ EXISTING: Capture image data
                            if part.inline_data and part.inline_data.data:
                                try:
                                    generated_image = Image.open(io.BytesIO(part.inline_data.data))
                                    print(f"   ✅ Image received successfully! (2K resolution)")
                                    if text_metadata:
                                        print(f"   ℹ️  Model description: {' '.join(text_metadata)[:200]}...")
                                    return generated_image
                                except Exception as e:
                                    print(f"   ⚠️ Failed to decode image bytes: {e}")

            # If loop finishes without returning
            raise RuntimeError("Gemini API returned no image. Likely blocked by Safety Filters or Prompt format issue.")

        return self._retry_with_backoff(_generate_img)

    def generate_with_inpaint(
        self,
        original: Image.Image,
        mask: Image.Image,
        prompt: str,
        reference: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """
        Simulate inpainting using Multimodal Prompting.
        Note: Actual API Inpainting support varies by model version.
        """
        inpaint_prompt = f"""
        TASK: IMAGE EDITING / INPAINTING
        - Input 1: Original Image
        - Input 2: Mask (White = Edit, Black = Keep)
        - Instruction: {prompt}
        - Return ONLY the edited image.
        """
        
        # Depending on how strict the model is, passing reference as a 3rd image or combining logic
        # Currently passing original + mask as inputs to the model.
        return self.generate_image(
            prompt=inpaint_prompt,
            source_image=original,
            reference_image=mask, # Passing mask as reference
            model_name=Models.FLASH_IMAGE 
        )