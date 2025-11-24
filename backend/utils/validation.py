"""
utils/validation.py - Input Validation
"""

from typing import Dict, List
from config import SUPPORTED_ASPECT_RATIOS, CAMERA_VIEWPOINTS


def validate_aspect_ratio(ratio: str) -> bool:
    """Check if aspect ratio is supported"""
    return ratio in SUPPORTED_ASPECT_RATIOS


def validate_viewpoint(viewpoint: str) -> bool:
    """Check if viewpoint is valid"""
    return viewpoint in CAMERA_VIEWPOINTS


def validate_translated_data(data: Dict) -> List[str]:
    """
    Validate translated_data_en structure
    
    Returns:
        List of missing/invalid fields (empty if valid)
    """
    required = [
        'building_core',
        'critical_geometry',
        'materials_hierarchy',
        'environment_context'
    ]
    
    errors = []
    
    for field in required:
        if field not in data:
            errors.append(f"Missing field: {field}")
        elif not data[field]:
            errors.append(f"Empty field: {field}")
    
    return errors
