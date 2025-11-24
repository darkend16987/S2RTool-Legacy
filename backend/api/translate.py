"""
api/translate.py - Translation Endpoint
✅ FIX: Thread-safe instances to prevent race conditions
"""

from flask import Blueprint, request, jsonify

from core.thread_local import get_translator

translate_bp = Blueprint('translate', __name__)


@translate_bp.route('/translate-prompt', methods=['POST'])
def translate_prompt():
    """
    Translate VI form data to EN structured format

    Request:
    {
        "form_data": {...}  // Vietnamese
    }

    Response:
    {
        "translated_data_en": {...},
        "status": "success"
    }
    """
    try:
        # ✅ FIX: Get thread-local translator (prevents race conditions)
        translator = get_translator()

        data = request.json

        if 'form_data' not in data:
            return jsonify({"error": "Missing 'form_data'"}), 400

        form_data_vi = data['form_data']

        # Translate
        translated_data_en = translator.translate_vi_to_en(form_data_vi)
        
        return jsonify({
            "translated_data_en": translated_data_en,
            "status": "success"
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
