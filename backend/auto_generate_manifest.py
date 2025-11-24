#!/usr/bin/env python3
"""
auto_generate_manifest.py

Tool để tự động quét folder images/ và tạo entries trong manifest.json

Usage:
    python auto_generate_manifest.py
    
    hoặc khi thêm ảnh mới:
    python auto_generate_manifest.py --scan
"""

import os
import json
from pathlib import Path
from typing import Dict, List
import argparse


# ============== CONFIG ==============
IMAGES_DIR = Path("references/images")
MANIFEST_PATH = Path("references/manifest.json")


# ============== HELPER FUNCTIONS ==============

def detect_category_from_folder(folder_name: str) -> Dict[str, str]:
    """
    Detect category metadata from folder name
    """
    category_map = {
        "cao_tang_hien_dai": {
            "name": "Cao Tầng Hiện Đại",
            "name_vi": "Cao Tầng Hiện Đại",
            "description": "High-rise modern architecture",
            "description_vi": "Kiến trúc cao tầng hiện đại",
            "tags": ["modern", "high_rise", "glass", "urban"]
        },
        "thap_tang_dong_duong": {
            "name": "Thấp Tầng Đông Dương",
            "name_vi": "Thấp Tầng Đông Dương",
            "description": "Indochinese colonial architecture",
            "description_vi": "Kiến trúc thuộc địa Đông Dương",
            "tags": ["indochine", "colonial", "traditional", "heritage"]
        },
        "thap_tang_neoclassic": {
            "name": "Thấp Tầng Neoclassic",
            "name_vi": "Thấp Tầng Tân Cổ Điển",
            "description": "Neoclassical architecture",
            "description_vi": "Kiến trúc tân cổ điển",
            "tags": ["neoclassical", "french_colonial", "elegant", "classical"]
        },
        "lighting_presets": {
            "name": "Lighting Presets",
            "name_vi": "Cài đặt Ánh sáng",
            "description": "Various lighting conditions",
            "description_vi": "Các điều kiện ánh sáng khác nhau",
            "tags": ["lighting", "mood", "atmosphere"]
        }
    }
    
    return category_map.get(folder_name, {
        "name": folder_name.replace("_", " ").title(),
        "name_vi": folder_name.replace("_", " ").title(),
        "description": f"Category: {folder_name}",
        "description_vi": f"Danh mục: {folder_name}",
        "tags": [folder_name]
    })


def scan_images_folder() -> Dict[str, List[Dict]]:
    """
    Scan images/ folder and return structure
    
    Returns:
        {
            "cao_tang_hien_dai": [
                {"file": "ct_hd_001.jpg", "path": "..."},
                ...
            ],
            ...
        }
    """
    if not IMAGES_DIR.exists():
        print(f"❌ Error: {IMAGES_DIR} does not exist!")
        return {}
    
    categories = {}
    
    for category_folder in IMAGES_DIR.iterdir():
        if not category_folder.is_dir():
            continue
        
        category_name = category_folder.name
        images = []
        
        for image_file in category_folder.glob("*"):
            if image_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                images.append({
                    "file": image_file.name,
                    "path": str(image_file.relative_to(Path("references")))
                })
        
        if images:
            categories[category_name] = images
    
    return categories


def generate_image_entry(category: str, image_info: Dict, index: int) -> Dict:
    """
    Generate a manifest entry for an image
    """
    file_stem = Path(image_info["file"]).stem  # Filename without extension
    
    # Try to extract metadata from filename
    # Example: ct_hd_001_golden_hour.jpg → lighting: golden_hour
    parts = file_stem.split("_")
    
    entry = {
        "id": file_stem,
        "name": file_stem.replace("_", " ").title(),
        "storage": "local",
        "path": image_info["path"],
        "thumbnail": image_info["path"],
        "metadata": {
            "category": category,
            "index": index
        }
    }
    
    # Add intelligent defaults based on category
    if "cao_tang" in category or "high" in category:
        entry["metadata"]["floors"] = "10+"
        entry["metadata"]["context"] = "urban"
    elif "thap_tang" in category or "low" in category:
        entry["metadata"]["floors"] = "2-3"
        entry["metadata"]["context"] = "residential"
    
    # Try to detect lighting from filename
    if "golden" in file_stem or "sunset" in file_stem:
        entry["metadata"]["lighting"] = "golden_hour"
        entry["metadata"]["time_of_day"] = "sunset"
    elif "night" in file_stem:
        entry["metadata"]["lighting"] = "night"
        entry["metadata"]["time_of_day"] = "night"
    elif "day" in file_stem or "daylight" in file_stem:
        entry["metadata"]["lighting"] = "daylight"
        entry["metadata"]["time_of_day"] = "midday"
    
    return entry


def generate_manifest(scanned_data: Dict) -> Dict:
    """
    Generate complete manifest.json structure
    """
    manifest = {
        "version": "1.0.0",
        "last_updated": "auto-generated",
        "description": "Local reference images library",
        "categories": {}
    }
    
    for category_name, images in scanned_data.items():
        category_meta = detect_category_from_folder(category_name)
        
        # Generate image entries
        image_entries = []
        for idx, img_info in enumerate(images, 1):
            image_entries.append(generate_image_entry(category_name, img_info, idx))
        
        # Add to manifest
        manifest["categories"][category_name] = {
            **category_meta,
            "subcategory_main": {
                "name": "Main Collection",
                "name_vi": "Bộ sưu tập chính",
                "images": image_entries
            }
        }
    
    return manifest


def merge_with_existing(new_manifest: Dict, existing_path: Path, sync_mode: bool = False) -> Dict:
    """
    Merge new manifest with existing one (preserve manual edits)
    
    Args:
        sync_mode: If True, remove entries for images that no longer exist
    """
    if not existing_path.exists():
        return new_manifest
    
    with open(existing_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if sync_mode:
        # ⭐ CHẾ ĐỘ SYNC: Xóa ảnh không tồn tại
        print("  🔄 SYNC MODE: Removing non-existent images...")
        
        for category, data in list(existing.get("categories", {}).items()):
            if category not in new_manifest["categories"]:
                # Category không còn tồn tại → xóa
                print(f"  ❌ Removed category: {category}")
                del existing["categories"][category]
                continue
            
            # Lấy danh sách ID ảnh hiện tại
            new_image_ids = {img["id"] for img in new_manifest["categories"][category]["subcategory_main"]["images"]}
            
            # Lọc chỉ giữ ảnh còn tồn tại
            existing_images = existing["categories"][category].get("subcategory_main", {}).get("images", [])
            filtered_images = []
            
            for img in existing_images:
                if img["id"] in new_image_ids:
                    filtered_images.append(img)
                else:
                    print(f"  ❌ Removed: {img['id']} (file not found)")
            
            existing["categories"][category]["subcategory_main"]["images"] = filtered_images
        
        # Thêm category và ảnh mới
        for category, data in new_manifest["categories"].items():
            if category not in existing["categories"]:
                existing["categories"][category] = data
                print(f"  ➕ Added category: {category}")
            else:
                # Thêm ảnh mới vào category đã tồn tại
                existing_images = existing["categories"][category]["subcategory_main"]["images"]
                existing_ids = {img["id"] for img in existing_images}
                
                for new_img in data["subcategory_main"]["images"]:
                    if new_img["id"] not in existing_ids:
                        existing_images.append(new_img)
                        print(f"  ➕ Added: {new_img['id']}")
        
        return existing
    
    else:
        # ⭐ CHẾ ĐỘ MERGE: Chỉ thêm mới, không xóa
        for category, data in new_manifest["categories"].items():
            if category in existing.get("categories", {}):
                # Category exists, merge images
                existing_images = existing["categories"][category].get("subcategory_main", {}).get("images", [])
                new_images = data["subcategory_main"]["images"]
                
                existing_ids = {img["id"] for img in existing_images}
                
                # Add only new images
                for new_img in new_images:
                    if new_img["id"] not in existing_ids:
                        existing_images.append(new_img)
                        print(f"  ➕ Added: {new_img['id']}")
                
                existing["categories"][category]["subcategory_main"]["images"] = existing_images
            else:
                # New category
                existing["categories"][category] = data
                print(f"  ➕ Added category: {category}")
        
        return existing


# ============== MAIN ==============

def main():
    parser = argparse.ArgumentParser(description="Auto-generate manifest.json from images folder")
    parser.add_argument('--scan', action='store_true', help='Scan and update manifest')
    parser.add_argument('--create', action='store_true', help='Create new manifest (overwrite)')
    parser.add_argument('--preview', action='store_true', help='Preview without saving')
    parser.add_argument('--sync', action='store_true', help='Sync mode: remove images that no longer exist')
    
    args = parser.parse_args()
    
    if not args.scan and not args.create and not args.preview:
        args.scan = True  # Default action
    
    print("=" * 60)
    print("📸 AUTO-GENERATE MANIFEST.JSON")
    print("=" * 60)
    print()
    
    # Scan images folder
    print(f"📁 Scanning: {IMAGES_DIR}")
    scanned_data = scan_images_folder()
    
    if not scanned_data:
        print("❌ No images found!")
        return
    
    print(f"✅ Found {len(scanned_data)} categories:")
    for cat, imgs in scanned_data.items():
        print(f"  • {cat}: {len(imgs)} images")
    print()
    
    # Generate manifest
    print("🔧 Generating manifest...")
    new_manifest = generate_manifest(scanned_data)
    
    if args.preview:
        print("\n" + "=" * 60)
        print("PREVIEW:")
        print(json.dumps(new_manifest, indent=2, ensure_ascii=False))
        print("=" * 60)
        return
    
    # Merge or overwrite
    if args.create:
        final_manifest = new_manifest
        print("⚠️  Creating NEW manifest (overwriting existing)")
    elif args.sync:
        print("🔄 SYNC mode: Will remove images that no longer exist...")
        final_manifest = merge_with_existing(new_manifest, MANIFEST_PATH, sync_mode=True)
    else:
        print("🔄 Merging with existing manifest...")
        final_manifest = merge_with_existing(new_manifest, MANIFEST_PATH, sync_mode=args.sync)
    
    # Save
    print(f"💾 Saving to: {MANIFEST_PATH}")
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_manifest, f, indent=2, ensure_ascii=False)
    
    print()
    print("=" * 60)
    print("✅ MANIFEST GENERATED SUCCESSFULLY!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review manifest.json")
    print("2. Edit metadata if needed (lighting, materials, etc.)")
    print("3. Restart backend: python app.py")
    print()


if __name__ == "__main__":
    main()