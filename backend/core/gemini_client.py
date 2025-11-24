"""
core/gemini_client.py - Gemini API Client Wrapper
Uses BOTH old (generativeai) and new (genai) APIs
✅ FIX: Added retry logic with exponential backoff
"""

import json
import re
import io
import base64
import time
from typing import List, Optional, Union, Dict
from PIL import Image

# OLD API for text/JSON generation
from google import generativeai as genai_old
from google.generativeai import types as types_old

# NEW API for image generation
try:
    from google import genai as genai_new
    from google.genai import types as types_new
    HAS_NEW_API = True
except ImportError:
    HAS_NEW_API = False
    print("⚠️  google-genai not installed. Image generation will not work.")
    print("   Install: pip install google-genai")

from config import GEMINI_API_KEY, Models, Defaults


class GeminiClient:
    """Wrapper for Gemini API operations"""

    def __init__(self, api_key: Optional[str] = None, max_retries: int = 3):
        """
        Initialize Gemini client

        Args:
            api_key: Gemini API key (uses config if None)
            max_retries: Maximum number of retry attempts (default: 3)
        """
        self.api_key = api_key or GEMINI_API_KEY
        self.max_retries = max_retries

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

        Args:
            func: Function to execute
            *args, **kwargs: Arguments to pass to function

        Returns:
            Function result

        Raises:
            Last exception if all retries fail
        """
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                error_msg = str(e).lower()

                # Check if error is retryable
                is_retryable = any([
                    'rate limit' in error_msg,
                    'quota' in error_msg,
                    'timeout' in error_msg,
                    'connection' in error_msg,
                    'temporarily unavailable' in error_msg,
                    '429' in error_msg,  # Too Many Requests
                    '500' in error_msg,  # Internal Server Error
                    '503' in error_msg,  # Service Unavailable
                ])

                if not is_retryable or attempt == self.max_retries - 1:
                    # Don't retry or last attempt
                    raise

                # Calculate backoff time: 2^attempt seconds (2s, 4s, 8s)
                backoff_time = 2 ** attempt
                print(f"⚠️  Gemini API error (attempt {attempt + 1}/{self.max_retries}): {e}")
                print(f"   Retrying in {backoff_time} seconds...")
                time.sleep(backoff_time)

        # This shouldn't be reached, but just in case
        raise last_exception
    
    def generate_content_json(
        self,
        prompt_parts: Union[str, List],
        model_name: str = Models.FLASH,
        temperature: float = Defaults.TEMPERATURE_ANALYSIS
    ) -> Dict:
        """
        Generate content and parse as JSON (uses OLD API)
        ✅ FIX: Wrapped with retry logic

        Args:
            prompt_parts: String prompt or list of [text, image, ...]
            model_name: Model to use
            temperature: Generation temperature

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If JSON parsing fails
        """
        def _generate():
            model = genai_old.GenerativeModel(model_name)

            # Ensure prompt_parts is a list
            parts = prompt_parts if isinstance(prompt_parts, list) else [prompt_parts]

            # Generate
            response = model.generate_content(
                parts,
                generation_config=types_old.GenerationConfig(
                    temperature=temperature,
                    response_mime_type="application/json"
                )
            )

            response_text = response.text.strip()

            # Clean markdown code blocks
            if response_text.startswith('```'):
                response_text = re.sub(r'^```(?:json)?\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)

            # Parse JSON
            try:
                return json.loads(response_text)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON from Gemini: {str(e)}\nResponse: {response_text[:500]}")

        # ✅ FIX: Retry with exponential backoff
        return self._retry_with_backoff(_generate)
    
    def generate_image(
        self,
        prompt: str,
        source_image: Optional[Image.Image] = None,
        reference_image: Optional[Image.Image] = None,
        model_name: str = Models.FLASH_IMAGE,
        temperature: float = Defaults.TEMPERATURE_GENERATION
    ) -> Optional[Image.Image]:
        """
        Generate image using NEW API (google-genai)
        ✅ FIX: Wrapped with retry logic

        ✅ Uses google-genai package (NEW API) for gemini-2.5-flash-image

        Args:
            prompt: Text prompt
            source_image: Source sketch image (optional)
            reference_image: Style reference (optional)
            model_name: Model to use
            temperature: Generation temperature

        Returns:
            Generated PIL Image or None
        """
        if not HAS_NEW_API or not self.client_new:
            print("❌ google-genai not installed!")
            print("   Install: pip install google-genai")
            return None

        def _generate_img():
            print(f"🎨 Generating image with {model_name}...")
            
            # Build content parts
            parts = []
            
            # Add source image if provided
            if source_image:
                # Convert PIL to bytes
                img_byte_arr = io.BytesIO()
                source_image.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                parts.append(
                    types_new.Part.from_bytes(
                        data=img_bytes,
                        mime_type="image/png"
                    )
                )
            
            # Add reference image if provided
            if reference_image:
                img_byte_arr = io.BytesIO()
                reference_image.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                parts.append(
                    types_new.Part.from_bytes(
                        data=img_bytes,
                        mime_type="image/png"
                    )
                )
            
            # Add text prompt
            parts.append(types_new.Part.from_text(text=prompt))
            
            # Create content
            contents = [
                types_new.Content(
                    role="user",
                    parts=parts
                )
            ]
            
            # Configure generation
            generate_content_config = types_new.GenerateContentConfig(
                response_modalities=["IMAGE"],  # ✅ NEW API supports this!
                temperature=temperature
            )
            
            print(f"   Sending request to Gemini...")
            
            # Generate with streaming
            generated_image = None
            file_index = 0
            
            for chunk in self.client_new.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=generate_content_config
            ):
                if (
                    chunk.candidates is None
                    or chunk.candidates[0].content is None
                    or chunk.candidates[0].content.parts is None
                ):
                    continue
                
                # Check for image data
                for part in chunk.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        print(f"   ✅ Received image data (chunk {file_index})")
                        
                        # Get image bytes
                        image_bytes = part.inline_data.data
                        
                        # Convert to PIL Image
                        try:
                            generated_image = Image.open(io.BytesIO(image_bytes))
                            print(f"   ✅ Image decoded successfully!")
                            print(f"   Size: {generated_image.size}")
                            print(f"   Mode: {generated_image.mode}")
                            file_index += 1
                        except Exception as e:
                            print(f"   ⚠️  Failed to decode image: {e}")
                    
                    # Also check for text response
                    if hasattr(chunk, 'text') and chunk.text:
                        print(f"   Text response: {chunk.text[:100]}")
            
            if generated_image:
                print(f"✅ Image generation successful!")
                return generated_image
            else:
                print(f"⚠️  No image generated")
                return None

        # ✅ FIX: Retry with exponential backoff
        try:
            return self._retry_with_backoff(_generate_img)
        except Exception as e:
            print(f"❌ Image generation failed after retries: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def generate_with_inpaint(
        self,
        original: Image.Image,
        mask: Image.Image,
        prompt: str,
        reference: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """
        Generate with inpainting
        
        Args:
            original: Original image
            mask: Binary mask (255=edit, 0=preserve)
            prompt: Inpainting instruction
            reference: Optional style reference
        
        Returns:
            Edited image or None
        """
        # For inpainting, we pass original and mask as source images
        # and use prompt to describe the edit
        
        # Combine original and mask into prompt context
        inpaint_prompt = f"""
INPAINTING TASK:
- Original image and mask are provided
- WHITE areas in mask = edit zone
- BLACK areas in mask = preserve exactly
- Instruction: {prompt}
"""
        
        return self.generate_image(
            prompt=inpaint_prompt,
            source_image=original,
            reference_image=mask,  # Pass mask as reference
            model_name=Models.FLASH_IMAGE
        )