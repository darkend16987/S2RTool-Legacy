"""
api/planning.py - Planning Mode Render Endpoint
Urban planning visualization with multiple lots
"""

import base64
import io
from flask import Blueprint, request, jsonify

from core.thread_local import (
    get_image_processor,
    get_prompt_builder,
    get_gemini_client
)
from config import Models

planning_bp = Blueprint('planning', __name__)


@planning_bp.route('/planning/render', methods=['POST'])
def planning_render():
    """
    Generate planning mode render from site plan and lot descriptions

    Request:
    {
        "site_plan_base64": "data:image/png;base64,...",
        "lot_map_base64": "data:image/png;base64,...",
        "lot_descriptions": [
            {
                "lot_number": "1",
                "description": "3-story residential building, modern style..."
            },
            ...
        ],
        "camera_angle": "drone_45deg",  // optional
        "time_of_day": "golden_hour",   // optional
        "aspect_ratio": "16:9",         // optional
        "style_keywords": "..."         // optional
    }

    Response:
    {
        "generated_image_base64": "...",
        "mime_type": "image/png"
    }
    """
    try:
        # Get thread-local instances
        processor = get_image_processor()
        prompt_builder = get_prompt_builder()
        gemini = get_gemini_client()

        data = request.json

        # Validate required fields
        required = ['site_plan_base64', 'lot_map_base64', 'lot_descriptions']
        if not all(k in data for k in required):
            return jsonify({"error": f"Missing required fields: {required}"}), 400

        # Validate lot descriptions
        lot_descriptions = data['lot_descriptions']
        if not isinstance(lot_descriptions, list) or len(lot_descriptions) == 0:
            return jsonify({"error": "lot_descriptions must be a non-empty array"}), 400

        for lot in lot_descriptions:
            if not isinstance(lot, dict) or 'lot_number' not in lot or 'description' not in lot:
                return jsonify({"error": "Each lot must have lot_number and description"}), 400

        # Process images
        site_plan_pil, _ = processor.process_base64_image(data['site_plan_base64'])
        lot_map_pil, _ = processor.process_base64_image(data['lot_map_base64'])

        if not site_plan_pil or not lot_map_pil:
            return jsonify({"error": "Invalid images"}), 400

        # ✅ OPTIMIZED: Resize to 2048 to preserve maximum detail
        site_plan_pil = processor.resize_image(site_plan_pil, max_size=2048)
        lot_map_pil = processor.resize_image(lot_map_pil, max_size=2048)

        # Extract parameters
        camera_angle = data.get('camera_angle', 'drone_45deg')
        time_of_day = data.get('time_of_day', 'golden_hour')
        aspect_ratio = data.get('aspect_ratio', '16:9')
        style_keywords = data.get('style_keywords', '')

        # Build planning prompt
        planning_prompt = prompt_builder.build_planning_prompt(
            lot_descriptions=lot_descriptions,
            camera_angle=camera_angle,
            time_of_day=time_of_day,
            aspect_ratio=aspect_ratio,
            style_keywords=style_keywords
        )

        print(f"🏙️  Generating planning render...")
        print(f"   Lots: {len(lot_descriptions)}")
        print(f"   Camera: {camera_angle}")
        print(f"   Time: {time_of_day}")
        print(f"   Aspect ratio: {aspect_ratio}")

        # Generate with Gemini
        # Send: 1) Site Plan as source, 2) Lot Map as reference
        # Prompt explains the role of each image
        generated_pil = gemini.generate_image(
            prompt=planning_prompt,
            source_image=site_plan_pil,      # Site plan (lot boundaries)
            reference_image=lot_map_pil,     # Lot map (numbered identification)
            temperature=0.4  # Slightly higher for creative planning visualization
        )

        if not generated_pil:
            return jsonify({"error": "Planning render generation failed"}), 500

        # Convert PIL Image to base64
        output_buffer = io.BytesIO()
        generated_pil.save(output_buffer, format='PNG', quality=95)
        output_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')

        print("✅ Planning render complete")

        return jsonify({
            "generated_image_base64": output_base64,
            "mime_type": "image/png"
        })

    except Exception as e:
        print(f"❌ [PLANNING_RENDER_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

        return jsonify({"error": str(e)}), 500


@planning_bp.route('/planning/analyze-sketch', methods=['POST'])
def analyze_sketch():
    """
    Analyze planning sketch and extract structured information

    Request:
    {
        "image_base64": "data:image/png;base64,..."
    }

    Response:
    {
        "analysis": {
            "scale": "1:500",
            "project_type": "mixed_use",
            "overall_description": "...",
            "highrise_zone": {...},
            "lowrise_zone": {...},
            "landscape": {...}
        }
    }
    """
    try:
        # Get thread-local instances
        processor = get_image_processor()
        prompt_builder = get_prompt_builder()
        gemini = get_gemini_client()

        data = request.json

        # Validate required fields
        if 'image_base64' not in data:
            return jsonify({"error": "Missing image_base64"}), 400

        # Process sketch image
        sketch_pil, _ = processor.process_base64_image(data['image_base64'])
        if not sketch_pil:
            return jsonify({"error": "Invalid sketch image"}), 400

        # Resize if needed
        sketch_pil = processor.resize_image(sketch_pil, max_size=2048)

        # Build analyze prompt
        analyze_prompt = prompt_builder.build_planning_analyze_prompt()

        print(f"🔍 Analyzing planning sketch...")

        # Call Gemini with text generation (JSON response)
        analysis = gemini.generate_content_json(
            prompt_parts=[analyze_prompt, sketch_pil],
            model_name='gemini-2.5-flash',  # Use 2.5 flash for Vietnamese support
            temperature=0.2  # Low temperature for structured output
        )

        print(f"✅ Planning sketch analyzed successfully")

        return jsonify({
            "analysis": analysis
        })

    except Exception as e:
        print(f"❌ [PLANNING_ANALYZE_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

        return jsonify({"error": str(e)}), 500


@planning_bp.route('/planning/detail-render', methods=['POST'])
def planning_detail_render():
    """
    Generate planning detail render from sketch with existing buildings

    Request:
    {
        "image_base64": "data:image/png;base64,...",
        "planning_data": {
            "planning_description": "Overall planning description",
            "camera_angle": "drone_45deg",
            "time_of_day": "golden_hour",
            "weather": "clear",
            "horizon_line": "ground_only", // NEW PARAMETER
            "quality_presets": {
                "global_illumination": true,
                "soft_shadows": true,
                ...
            },
            "sketch_adherence": 0.90,
            "aspect_ratio": "16:9"
        }
    }

    Response:
    {
        "generated_image_base64": "...",
        "mime_type": "image/png",
        "aspect_ratio": "16:9"
    }
    """
    try:
        # Get thread-local instances
        processor = get_image_processor()
        prompt_builder = get_prompt_builder()
        gemini = get_gemini_client()

        data = request.json

        # Validate required fields
        if 'image_base64' not in data or 'planning_data' not in data:
            return jsonify({"error": "Missing image_base64 or planning_data"}), 400

        planning_data = data['planning_data']
        if 'planning_description' not in planning_data:
            return jsonify({"error": "Missing planning_description"}), 400

        # Process sketch image
        sketch_pil, _ = processor.process_base64_image(data['image_base64'])
        if not sketch_pil:
            return jsonify({"error": "Invalid sketch image"}), 400

        # Resize if needed (match new resolution capabilities)
        sketch_pil = processor.resize_image(sketch_pil, max_size=2048)

        # Extract parameters
        planning_description = planning_data['planning_description']
        camera_angle = planning_data.get('camera_angle', 'match_sketch')
        time_of_day = planning_data.get('time_of_day', 'golden_hour')
        weather = planning_data.get('weather', 'clear')
        # Extract Horizon Line
        horizon_line = planning_data.get('horizon_line', 'ground_only')
        
        quality_level = planning_data.get('quality_level', 'high_fidelity')
        quality_presets = planning_data.get('quality_presets', {})
        sketch_adherence = planning_data.get('sketch_adherence', 0.90)
        aspect_ratio = planning_data.get('aspect_ratio', '16:9')

        # Build planning detail prompt
        planning_prompt = prompt_builder.build_planning_detail_prompt(
            planning_description=planning_description,
            camera_angle=camera_angle,
            time_of_day=time_of_day,
            weather=weather,
            horizon_line=horizon_line, # Pass horizon line
            quality_level=quality_level,
            quality_presets=quality_presets,
            sketch_adherence=sketch_adherence,
            aspect_ratio=aspect_ratio
        )

        print(f"🌆 Generating planning detail render...")
        print(f"   Description: {planning_description[:80]}...")
        print(f"   Camera: {camera_angle}")
        print(f"   Time: {time_of_day}, Weather: {weather}")
        print(f"   Horizon: {horizon_line}")
        print(f"   Quality Level: {quality_level}")
        print(f"   Adherence: {sketch_adherence}")
        print(f"   Aspect ratio: {aspect_ratio}")

        # Log structured data if provided (for debugging/monitoring)
        structured_data = planning_data.get('structured_data')
        if structured_data:
            print(f"   📊 Structured Data:")
            print(f"      Scale: {structured_data.get('scale', 'N/A')}")
            print(f"      Project Type: {structured_data.get('project_type', 'N/A')}")
            hr = structured_data.get('highrise_zone', {})
            if hr.get('count'):
                print(f"      High-rise: {hr.get('count')} tòa, {hr.get('floors')} tầng")
            lr = structured_data.get('lowrise_zone', {})
            if lr.get('exists'):
                print(f"      Low-rise: {lr.get('floors')} tầng")

        # Generate with Gemini
        generated_pil = gemini.generate_image(
            prompt=planning_prompt,
            source_image=sketch_pil,
            temperature=0.4
        )

        if not generated_pil:
            return jsonify({"error": "Planning detail render generation failed"}), 500

        # Convert PIL Image to base64
        output_buffer = io.BytesIO()
        generated_pil.save(output_buffer, format='PNG', quality=95)
        output_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')

        # Add data:image/png;base64, prefix
        output_base64_full = f"data:image/png;base64,{output_base64}"

        print("✅ Planning detail render complete")

        return jsonify({
            "generated_image_base64": output_base64_full,
            "mime_type": "image/png",
            "aspect_ratio": aspect_ratio
        })

    except Exception as e:
        print(f"❌ [PLANNING_DETAIL_RENDER_ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

        return jsonify({"error": str(e)}), 500