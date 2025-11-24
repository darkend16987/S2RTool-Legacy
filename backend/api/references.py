"""
api/references.py - Reference Images API
"""

from flask import Blueprint, request, jsonify, send_file
import io

from references.library import get_library

references_bp = Blueprint('references', __name__)


@references_bp.route('/references/list', methods=['GET'])
def list_references():
    """
    List available reference images
    
    Query params:
        category: Category name (optional)
        subcategory: Subcategory name (optional)
    
    Response:
    {
        "images": [
            {
                "id": "...",
                "name": "...",
                "thumbnail_url": "...",
                "metadata": {...}
            }
        ]
    }
    """
    try:
        library = get_library()
        
        category = request.args.get('category')
        subcategory = request.args.get('subcategory')
        
        if category and subcategory:
            images = library.list_images(category, subcategory)
        elif category:
            # List first subcategory
            subcats = library.list_subcategories(category)
            if subcats:
                images = library.list_images(category, subcats[0])
            else:
                images = []
        else:
            # List all categories
            categories = library.list_categories()
            return jsonify({"categories": categories})
        
        return jsonify({"images": images})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@references_bp.route('/references/download', methods=['POST'])
def download_reference():
    """
    Download reference image as base64
    
    Request:
    {
        "image_id": "modern_vn_001"
    }
    
    Response:
    {
        "base64": "...",
        "mime_type": "image/jpeg"
    }
    """
    try:
        data = request.json
        
        if 'image_id' not in data:
            return jsonify({"error": "Missing image_id"}), 400
        
        library = get_library()
        result = library.get_image_base64(data['image_id'])
        
        if not result:
            return jsonify({"error": "Image not found"}), 404
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@references_bp.route('/references/search', methods=['GET'])
def search_references():
    """
    Search references by tags
    
    Query params:
        tags: Comma-separated tags (e.g., "modern,vietnam")
    
    Response:
    {
        "results": [...]
    }
    """
    try:
        tags_str = request.args.get('tags', '')
        tags = [t.strip() for t in tags_str.split(',') if t.strip()]
        
        if not tags:
            return jsonify({"error": "No tags provided"}), 400
        
        library = get_library()
        results = library.search_by_tags(tags)
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
