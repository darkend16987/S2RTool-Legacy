"""
core/inpainting.py - Hybrid Inpainting Engine
"""

import numpy as np
import cv2
from PIL import Image
from typing import Optional

from .gemini_client import GeminiClient
from .prompt_builder import PromptBuilder


class InpaintingEngine:
    """Hybrid inpainting: Gemini generation + CV2 preservation"""
    
    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()
        self.prompt_builder = PromptBuilder()
    
    def inpaint(
        self,
        original_image: np.ndarray,
        mask_image: np.ndarray,
        edit_instruction: str,
        reference_image: Optional[np.ndarray] = None,
        preserve_mode: str = "hybrid"
    ) -> np.ndarray:
        """
        Perform inpainting
        
        Args:
            original_image: RGB numpy array
            mask_image: Grayscale mask (255=edit, 0=preserve)
            edit_instruction: Edit description
            reference_image: Optional style reference
            preserve_mode: "gemini_only" | "hybrid" | "strict"
        
        Returns:
            Edited image as numpy array
        """
        # Build prompt
        prompt = self.prompt_builder.build_inpaint_prompt(
            edit_instruction=edit_instruction,
            has_reference=(reference_image is not None)
        )
        
        # Convert to PIL
        original_pil = Image.fromarray(original_image)
        mask_pil = Image.fromarray(mask_image)
        reference_pil = Image.fromarray(reference_image) if reference_image is not None else None
        
        # Call Gemini
        edited_pil = self.client.generate_with_inpaint(
            original=original_pil,
            mask=mask_pil,
            prompt=prompt,
            reference=reference_pil
        )
        
        if edited_pil is None:
            return original_image
        
        edited_array = np.array(edited_pil)
        
        # Post-processing
        if preserve_mode == "gemini_only":
            return edited_array
        elif preserve_mode == "hybrid":
            return self._hybrid_preserve(original_image, edited_array, mask_image)
        elif preserve_mode == "strict":
            return self._strict_preserve(original_image, edited_array, mask_image)
        else:
            raise ValueError(f"Unknown preserve_mode: {preserve_mode}")
    
    def _hybrid_preserve(self, original: np.ndarray, edited: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Soft preservation with edge blending"""
        _, mask_binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        
        # Create blending mask
        kernel = np.ones((11, 11), np.uint8)
        mask_dilated = cv2.dilate(mask_binary, kernel, iterations=1)
        blend_mask = cv2.GaussianBlur(mask_dilated, (21, 21), 0) / 255.0
        blend_mask = np.expand_dims(blend_mask, axis=2)
        
        # Blend
        result = (original * (1 - blend_mask) + edited * blend_mask).astype(np.uint8)
        return result
    
    def _strict_preserve(self, original: np.ndarray, edited: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Hard copy: Black areas = 100% original"""
        _, mask_binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
        mask_3d = np.expand_dims(mask_binary, axis=2).repeat(3, axis=2) / 255.0
        
        result = np.where(mask_3d > 0.5, edited, original).astype(np.uint8)
        return result
