"""
app.py - Main Flask Application
S2R Tool Backend - Version 3.1

Clean architecture with Flask Blueprints
All endpoints organized in api/ folder
"""

# ⭐ CRITICAL: Load .env FIRST (before any other imports)
from dotenv import load_dotenv
load_dotenv()  # This loads .env file into environment variables

from flask import Flask, jsonify
from flask_cors import CORS
import os

from config import ServerConfig
from api.render import render_bp
from api.translate import translate_bp
from api.analyze import analyze_bp
from api.references import references_bp
from api.inpaint import inpaint_bp
from api.planning import planning_bp
from api.settings import settings_bp


def create_app():
    """
    Application factory pattern
    Creates and configures the Flask application
    """
    app = Flask(__name__)
    
    # ============== CONFIGURATION ==============
    app.config['MAX_CONTENT_LENGTH'] = ServerConfig.MAX_CONTENT_LENGTH
    
    # ============== CORS ==============
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # ============== REGISTER BLUEPRINTS ==============
    # All API endpoints are organized in api/ folder
    app.register_blueprint(analyze_bp, url_prefix='/api')      # /api/analyze-sketch
    app.register_blueprint(translate_bp, url_prefix='/api')    # /api/translate-prompt
    app.register_blueprint(render_bp, url_prefix='/api')       # /api/render
    app.register_blueprint(references_bp, url_prefix='/api')   # /api/references/*
    app.register_blueprint(inpaint_bp, url_prefix='/api')      # /api/inpaint
    app.register_blueprint(planning_bp, url_prefix='/api')     # /api/planning/*
    app.register_blueprint(settings_bp, url_prefix='/api')     # /api/settings
    
    # ============== HEALTH CHECK ==============
    @app.route('/health', methods=['GET'])
    def health_check():
        """
        Health check endpoint
        Returns system status and available features
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        api_key_status = "✅ Loaded" if api_key else "❌ Missing"
        api_key_preview = f"{api_key[:20]}..." if api_key else "None"
        
        return jsonify({
            "status": "healthy",
            "version": "3.1",
            "api_key_status": api_key_status,
            "api_key_preview": api_key_preview,
            "endpoints": {
                "analyze": "/api/analyze-sketch",
                "translate": "/api/translate-prompt",
                "render": "/api/render",
                "references_list": "/api/references/list",
                "references_download": "/api/references/download",
                "references_search": "/api/references/search",
                "inpaint": "/api/inpaint",
                "planning_render": "/api/planning/render",
                "planning_detail_render": "/api/planning/detail-render",
                "planning_analyze": "/api/planning/analyze-sketch",
                "settings": "/api/settings"
            },
            "features": [
                "sketch_analysis",
                "vi_to_en_translation",
                "multi_viewpoint_rendering",
                "reference_library",
                "hybrid_inpainting",
                "planning_mode_rendering"
            ]
        })
    
    # ============== ERROR HANDLERS ==============
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad request",
            "message": str(error)
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not found",
            "message": "The requested resource does not exist"
        }), 404
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({
            "error": "File too large",
            "message": "Maximum file size is 16MB"
        }), 413
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
    
    return app


# ============== MAIN ENTRY POINT ==============
if __name__ == '__main__':
    print("=" * 70)
    print("🚀 S2R TOOL - BACKEND SERVER v3.1")
    print("=" * 70)
    print()
    
    # ============== VERIFY API KEY ==============
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY not found!")
        print("=" * 70)
        print()
        print("Please check:")
        print("  1. File .env exists in backend/ folder")
        print("  2. File .env contains: GEMINI_API_KEY=AIzaSy...")
        print("  3. python-dotenv is installed: pip install python-dotenv")
        print()
        print("Current working directory:", os.getcwd())
        print("Looking for .env at:", os.path.join(os.getcwd(), '.env'))
        print()
        print("=" * 70)
        exit(1)
    
    # Verify API key format
    if not api_key.startswith("AIzaSy"):
        print("⚠️  WARNING: API key format looks suspicious!")
        print("=" * 70)
        print(f"Key preview: {api_key[:20]}...")
        print("Expected format: Should start with 'AIzaSy'")
        print()
        print("Continuing anyway, but API calls may fail...")
        print()
    
    # Success
    print("✅ API Key loaded successfully!")
    print(f"   Key preview: {api_key[:20]}...{api_key[-4:]}")
    print()
    
    # ============== CHECK DEPENDENCIES ==============
    print("📦 Checking dependencies...")
    
    dependencies_ok = True
    
    try:
        import google.generativeai
        print("   ✅ google-generativeai")
    except ImportError:
        print("   ❌ google-generativeai - Run: pip install google-generativeai")
        dependencies_ok = False
    
    try:
        import google.genai
        print("   ✅ google-genai")
    except ImportError:
        print("   ⚠️  google-genai - Optional for image generation")
    
    try:
        import PIL
        print("   ✅ PIL (Pillow)")
    except ImportError:
        print("   ❌ Pillow - Run: pip install Pillow")
        dependencies_ok = False
    
    try:
        import cv2
        print("   ✅ opencv-python")
    except ImportError:
        print("   ❌ opencv-python - Run: pip install opencv-python")
        dependencies_ok = False
    
    try:
        import numpy
        print("   ✅ numpy")
    except ImportError:
        print("   ❌ numpy - Run: pip install numpy")
        dependencies_ok = False
    
    print()
    
    if not dependencies_ok:
        print("❌ Some required dependencies are missing!")
        print("   Please install them before starting the server.")
        print()
        print("=" * 70)
        exit(1)
    
    # ============== START SERVER ==============
    print("🌐 Starting Flask server...")
    print(f"   Host: {ServerConfig.HOST}")
    print(f"   Port: {ServerConfig.PORT}")
    print(f"   Debug: {ServerConfig.DEBUG}")
    print()
    print("📡 Available endpoints:")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/health")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/api/analyze-sketch")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/api/translate-prompt")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/api/render")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/api/inpaint")
    print(f"   http://{ServerConfig.HOST}:{ServerConfig.PORT}/api/planning/render")
    print()
    print("=" * 70)
    print()
    
    # Create and run app
    app = create_app()
    
    try:
        app.run(
            host=ServerConfig.HOST,
            port=ServerConfig.PORT,
            debug=ServerConfig.DEBUG,
            threaded=True  # Enable threading for concurrent requests
        )
    except KeyboardInterrupt:
        print()
        print("=" * 70)
        print("👋 Server stopped by user")
        print("=" * 70)
    except Exception as e:
        print()
        print("=" * 70)
        print(f"❌ Server error: {e}")
        print("=" * 70)
        import traceback
        traceback.print_exc()