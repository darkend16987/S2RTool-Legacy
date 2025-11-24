"""
api/inpaint.py - Inpainting Endpoint
✅ FIX: Thread-safe instances to prevent race conditions
"""

from flask import Blueprint, request, jsonify
import numpy as np
import base64
import io
from PIL import Image

from core.thread_local import get_image_processor, get_inpainting_engine

inpaint_bp = Blueprint('inpaint', __name__)


@inpaint_bp.route('/inpaint', methods=['POST'])
def inpaint_image():
    """
    Inpaint image with mask

    Request:
    {
        "source_image_base64": "...",
        "mask_image_base64": "...",
        "edit_instruction": "...",
        "reference_image_base64": "..." (optional),
        "preserve_mode": "hybrid" (optional)
    }

    Response:
    {
        "edited_image_base64": "...",
        "mime_type": "image/png"
    }
    """
    try:
        # ✅ FIX: Get thread-local instances (prevents race conditions)
        processor = get_image_processor()
        inpainting = get_inpainting_engine()

        data = request.json

        required = ['source_image_base64', 'mask_image_base64', 'edit_instruction']
        if not all(k in data for k in required):
            return jsonify({"error": f"Missing: {required}"}), 400

        # Process images
        source_pil, _ = processor.process_base64_image(data['source_image_base64'])
        mask_pil, _ = processor.process_base64_image(data['mask_image_base64'])
        
        if not source_pil or not mask_pil:
            return jsonify({"error": "Invalid images"}), 400
        
        # Convert to numpy
        source_array = np.array(source_pil.convert('RGB'))
        mask_array = np.array(mask_pil.convert('L'))  # Grayscale
        
        # Reference image (optional)
        reference_array = None
        if 'reference_image_base64' in data:
            ref_pil, _ = processor.process_base64_image(data['reference_image_base64'])
            if ref_pil:
                reference_array = np.array(ref_pil.convert('RGB'))
        
        # Inpaint
        preserve_mode = data.get('preserve_mode', 'hybrid')
        
        edited_array = inpainting.inpaint(
            original_image=source_array,
            mask_image=mask_array,
            edit_instruction=data['edit_instruction'],
            reference_image=reference_array,
            preserve_mode=preserve_mode
        )
        
        # Convert back to base64
        edited_pil = Image.fromarray(edited_array)
        img_byte_arr = io.BytesIO()
        edited_pil.save(img_byte_arr, format='PNG')
        img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        
        return jsonify({
            "edited_image_base64": img_base64,
            "mime_type": "image/png"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
