"""
references/library.py - Reference Images Library Manager
"""

import json
import base64
import os
from typing import Dict, List, Optional
from pathlib import Path


class ReferenceLibrary:
    """Manage reference images with 3-tier storage"""
    
    def __init__(self, manifest_path: str = None):
        """
        Initialize library
        
        Args:
            manifest_path: Path to manifest.json
        """
        if manifest_path is None:
            # Default to references/manifest.json
            current_dir = Path(__file__).parent
            manifest_path = current_dir / "manifest.json"
        
        self.manifest_path = Path(manifest_path)
        self.manifest = self._load_manifest()
        self.images_dir = self.manifest_path.parent / "images"
    
    def _load_manifest(self) -> Dict:
        """Load manifest.json"""
        if not self.manifest_path.exists():
            print(f"⚠️  Warning: Manifest not found at {self.manifest_path}")
            return {"categories": {}}
        
        with open(self.manifest_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def list_categories(self) -> List[str]:
        """List all categories"""
        return list(self.manifest.get('categories', {}).keys())
    
    def list_subcategories(self, category: str) -> List[str]:
        """List subcategories in a category"""
        cat_data = self.manifest.get('categories', {}).get(category, {})
        return list(cat_data.get('subcategories', {}).keys())
    
    def list_images(self, category: str, subcategory: str) -> List[Dict]:
        """
        List images in a subcategory
        
        Returns:
            List of image metadata dicts
        """
        try:
            subcat_data = self.manifest['categories'][category]['subcategories'][subcategory]
            return subcat_data.get('images', [])
        except KeyError:
            return []
    
    def get_image_base64(self, image_id: str) -> Optional[Dict]:
        """
        Get image as base64
        
        Returns:
            {"base64": "...", "mime_type": "image/jpeg"} or None
        """
        # Search for image in manifest
        image_meta = None
        for cat_name, cat_data in self.manifest.get('categories', {}).items():
            for subcat_name, subcat_data in cat_data.get('subcategories', {}).items():
                for img in subcat_data.get('images', []):
                    if img.get('id') == image_id:
                        image_meta = img
                        break
                if image_meta:
                    break
            if image_meta:
                break
        
        if not image_meta:
            return None
        
        # Try storage tiers
        # Tier 1: Embedded base64
        if 'base64' in image_meta:
            return {
                "base64": image_meta['base64'],
                "mime_type": image_meta.get('mime_type', 'image/jpeg')
            }
        
        # Tier 2: Local file
        if 'local_path' in image_meta:
            local_path = self.images_dir / image_meta['local_path']
            if local_path.exists():
                with open(local_path, 'rb') as f:
                    img_bytes = f.read()
                    b64 = base64.b64encode(img_bytes).decode('utf-8')
                    return {
                        "base64": b64,
                        "mime_type": image_meta.get('mime_type', 'image/jpeg')
                    }
        
        # Tier 3: Cloud URL
        if 'cloud_url' in image_meta:
            # Return URL for client to fetch
            return {
                "cloud_url": image_meta['cloud_url'],
                "mime_type": image_meta.get('mime_type', 'image/jpeg')
            }
        
        return None
    
    def search_by_tags(self, tags: List[str]) -> List[Dict]:
        """
        Search images by tags
        
        Args:
            tags: List of tags to search for
        
        Returns:
            List of matching images with metadata
        """
        results = []
        tags_lower = [t.lower() for t in tags]
        
        for cat_name, cat_data in self.manifest.get('categories', {}).items():
            for subcat_name, subcat_data in cat_data.get('subcategories', {}).items():
                for img in subcat_data.get('images', []):
                    img_tags = [t.lower() for t in img.get('tags', [])]
                    # Check if any tag matches
                    if any(tag in img_tags for tag in tags_lower):
                        result = img.copy()
                        result['category'] = cat_name
                        result['subcategory'] = subcat_name
                        results.append(result)
        
        return results
    
    def get_thumbnail_url(self, image_id: str) -> Optional[str]:
        """Get thumbnail URL for an image"""
        # Search for image
        for cat_name, cat_data in self.manifest.get('categories', {}).items():
            for subcat_name, subcat_data in cat_data.get('subcategories', {}).items():
                for img in subcat_data.get('images', []):
                    if img.get('id') == image_id:
                        return img.get('thumbnail_url', img.get('cloud_url'))
        return None


# Singleton instance
_library_instance = None


def get_library() -> ReferenceLibrary:
    """Get singleton library instance"""
    global _library_instance
    if _library_instance is None:
        _library_instance = ReferenceLibrary()
    return _library_instance
