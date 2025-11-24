"""
api/settings.py - User Settings Management
Allows users to configure API key and model selections through UI
"""

import os
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from config import Models, Defaults

settings_bp = Blueprint('settings', __name__)

# Path to user config file
USER_CONFIG_PATH = Path(__file__).parent.parent / 'user_config.json'


def get_default_config():
    """Get default configuration from config.py"""
    return {
        "api_key": os.environ.get("GEMINI_API_KEY", ""),
        "models": {
            "building_analysis": Models.PRO,
            "planning_analysis": Models.FLASH,
            "translation": Models.FLASH,
            "image_generation": Models.FLASH_IMAGE
        },
        "temperatures": {
            "building_analysis": Defaults.TEMPERATURE_ANALYSIS,
            "planning_analysis": 0.2,
            "translation": Defaults.TEMPERATURE_TRANSLATION,
            "image_generation": Defaults.TEMPERATURE_GENERATION
        },
        "preferences": {
            "default_aspect_ratio": "1:1",
            "default_camera_angle": "match_sketch",
            "default_time_of_day": "golden_hour",
            "default_quality_level": "high_fidelity"
        }
    }


def load_user_config():
    """Load user configuration from file, fallback to defaults"""
    if USER_CONFIG_PATH.exists():
        try:
            with open(USER_CONFIG_PATH, 'r', encoding='utf-8') as f:
                user_config = json.load(f)

            # Merge with defaults (in case new fields added)
            default_config = get_default_config()

            # Deep merge
            for key in default_config:
                if key not in user_config:
                    user_config[key] = default_config[key]
                elif isinstance(default_config[key], dict):
                    for subkey in default_config[key]:
                        if subkey not in user_config[key]:
                            user_config[key][subkey] = default_config[key][subkey]

            return user_config
        except Exception as e:
            print(f"⚠️  Error loading user config: {e}")
            return get_default_config()
    else:
        return get_default_config()


def save_user_config(config):
    """Save user configuration to file"""
    try:
        with open(USER_CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"✅ User config saved to {USER_CONFIG_PATH}")
        return True
    except Exception as e:
        print(f"❌ Error saving user config: {e}")
        return False


@settings_bp.route('/settings', methods=['GET'])
def get_settings():
    """
    Get current settings (API key masked for security)

    Response:
    {
        "api_key_configured": true,
        "api_key_masked": "AIzaSy...****...xyz",
        "models": {...},
        "temperatures": {...},
        "preferences": {...},
        "available_models": {...}
    }
    """
    try:
        config = load_user_config()

        # Mask API key for security
        api_key = config.get("api_key", "")
        api_key_configured = bool(api_key)
        api_key_masked = ""

        if api_key:
            if len(api_key) > 14:
                api_key_masked = f"{api_key[:10]}...{api_key[-4:]}"
            else:
                api_key_masked = api_key[:6] + "****"

        # Available models for selection
        available_models = {
            "text": [
                {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Fast, cost-effective (Vietnamese support)"},
                {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Advanced reasoning, higher quality"},
                {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Legacy)", "description": "Older version"},
                {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro (Legacy)", "description": "Older version"}
            ],
            "image": [
                {"id": "gemini-3-pro-image-preview", "name": "Gemini 3 Pro Image (Current)", "description": "Latest image generation model, 2048x2048"},
                {"id": "gemini-2.5-flash-image", "name": "Gemini 2.5 Flash Image", "description": "Faster, lower quality"},
                {"id": "imagen-3.0-generate-001", "name": "Imagen 3.0", "description": "Alternative image model"}
            ]
        }

        return jsonify({
            "api_key_configured": api_key_configured,
            "api_key_masked": api_key_masked,
            "models": config.get("models", {}),
            "temperatures": config.get("temperatures", {}),
            "preferences": config.get("preferences", {}),
            "available_models": available_models
        })

    except Exception as e:
        print(f"❌ [GET_SETTINGS_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@settings_bp.route('/settings', methods=['POST'])
def update_settings():
    """
    Update settings

    Request:
    {
        "api_key": "AIzaSy...",  // Optional
        "models": {
            "building_analysis": "gemini-2.5-pro",
            "planning_analysis": "gemini-2.5-flash",
            ...
        },
        "temperatures": {...},
        "preferences": {...}
    }

    Response:
    {
        "success": true,
        "message": "Settings saved successfully"
    }
    """
    try:
        data = request.json

        # Load current config
        config = load_user_config()

        # Update API key if provided
        if "api_key" in data and data["api_key"]:
            # Validate API key format (basic check)
            api_key = data["api_key"].strip()
            if api_key and not api_key.startswith("AIzaSy"):
                return jsonify({
                    "error": "Invalid API key format. Gemini API keys start with 'AIzaSy'"
                }), 400

            config["api_key"] = api_key

            # Update environment variable for current session
            os.environ["GEMINI_API_KEY"] = api_key
            print(f"✅ API key updated (session): {api_key[:10]}...{api_key[-4:]}")

        # Update models if provided
        if "models" in data:
            config["models"].update(data["models"])

        # Update temperatures if provided
        if "temperatures" in data:
            config["temperatures"].update(data["temperatures"])

        # Update preferences if provided
        if "preferences" in data:
            config["preferences"].update(data["preferences"])

        # Save to file
        if save_user_config(config):
            return jsonify({
                "success": True,
                "message": "Settings saved successfully"
            })
        else:
            return jsonify({
                "error": "Failed to save settings to file"
            }), 500

    except Exception as e:
        print(f"❌ [UPDATE_SETTINGS_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@settings_bp.route('/settings/reset', methods=['POST'])
def reset_settings():
    """
    Reset settings to defaults

    Response:
    {
        "success": true,
        "message": "Settings reset to defaults"
    }
    """
    try:
        default_config = get_default_config()

        if save_user_config(default_config):
            return jsonify({
                "success": True,
                "message": "Settings reset to defaults"
            })
        else:
            return jsonify({
                "error": "Failed to reset settings"
            }), 500

    except Exception as e:
        print(f"❌ [RESET_SETTINGS_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@settings_bp.route('/settings/test-api-key', methods=['POST'])
def test_api_key():
    """
    Test API key validity by making a simple Gemini API call

    Request:
    {
        "api_key": "AIzaSy..."
    }

    Response:
    {
        "valid": true,
        "message": "API key is valid"
    }
    """
    try:
        data = request.json
        api_key = data.get("api_key", "").strip()

        if not api_key:
            return jsonify({"error": "API key is required"}), 400

        # Test API key with a simple call
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        # Simple test: list available models
        try:
            models = genai.list_models()
            model_count = len(list(models))

            return jsonify({
                "valid": True,
                "message": f"API key is valid. {model_count} models available.",
                "api_key_masked": f"{api_key[:10]}...{api_key[-4:]}"
            })
        except Exception as api_error:
            error_message = str(api_error)

            if "API_KEY_INVALID" in error_message or "invalid" in error_message.lower():
                return jsonify({
                    "valid": False,
                    "message": "API key is invalid"
                }), 400
            else:
                return jsonify({
                    "valid": False,
                    "message": f"API error: {error_message}"
                }), 400

    except Exception as e:
        print(f"❌ [TEST_API_KEY_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
