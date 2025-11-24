"""
models/schemas.py - Data Models & Schemas
Pydantic models for request/response validation
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


# ============== REQUEST MODELS ==============

class AnalyzeSketchRequest(BaseModel):
    """Request for sketch analysis"""
    image_base64: str = Field(..., description="Base64 encoded image")


class TranslatePromptRequest(BaseModel):
    """Request for Vietnamese to English translation"""
    form_data: Dict[str, Any] = Field(..., description="Vietnamese form data")


class RenderImageRequest(BaseModel):
    """Request for image rendering"""
    image_base64: str = Field(..., description="Sketch image in base64")
    translated_data_en: Dict[str, Any] = Field(..., description="Translated English data")
    aspect_ratio: str = Field(default="16:9", description="Aspect ratio")
    viewpoint: str = Field(default="main_facade", description="Camera viewpoint")
    reference_image_base64: Optional[str] = Field(None, description="Optional reference image")


class InpaintRequest(BaseModel):
    """Request for inpainting"""
    source_image_base64: str = Field(..., description="Original image")
    mask_image_base64: str = Field(..., description="Mask image (white=edit, black=preserve)")
    edit_instruction: str = Field(..., description="What to change")
    reference_image_base64: Optional[str] = Field(None, description="Style reference")
    preserve_mode: str = Field(default="hybrid", description="Preservation mode")


class ReferenceDownloadRequest(BaseModel):
    """Request to download a reference image"""
    image_id: str = Field(..., description="Reference image ID")


# ============== RESPONSE MODELS ==============

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(default="healthy")
    features: List[str] = Field(default_factory=list)
    version: Optional[str] = None


class AnalyzeSketchResponse(BaseModel):
    """Sketch analysis response"""
    building_type: str
    facade_style: str
    sketch_detail_level: str
    is_colored: bool
    sketch_type: str
    critical_elements: Optional[List[Dict]] = None
    materials_precise: Optional[List[Dict]] = None
    environment: Optional[List[Dict]] = None
    technical_specs: Optional[Dict] = None


class TranslatePromptResponse(BaseModel):
    """Translation response"""
    translated_data_en: Dict[str, Any]
    status: str = Field(default="success")


class RenderImageResponse(BaseModel):
    """Render response"""
    generated_image_base64: str
    mime_type: str = Field(default="image/png")
    aspect_ratio: str
    viewpoint: str
    sketch_type: Optional[str] = None


class InpaintResponse(BaseModel):
    """Inpainting response"""
    edited_image_base64: str
    mime_type: str = Field(default="image/png")


class ReferenceListResponse(BaseModel):
    """Reference list response"""
    images: Optional[List[Dict]] = None
    categories: Optional[List[str]] = None


class ReferenceDownloadResponse(BaseModel):
    """Reference download response"""
    base64: str
    mime_type: str


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[Dict] = None


# ============== DATA STRUCTURES ==============

class MaterialItem(BaseModel):
    """Material specification"""
    priority: int
    element: str
    material: str
    color: str
    texture: Optional[str] = None


class ArchitecturalDetail(BaseModel):
    """Architectural detail"""
    element: str
    description: str
    emphasis: str = Field(default="medium")


class EnvironmentContext(BaseModel):
    """Environment context"""
    lighting: str
    time: str
    weather: Optional[str] = None
    surroundings: Optional[str] = None


class TechnicalSpecs(BaseModel):
    """Technical photo specifications"""
    camera: str
    lens: str
    perspective: str
    depth_of_field: Optional[str] = None


class BuildingCore(BaseModel):
    """Core building information"""
    type: str
    style_primary: str
    style_keywords: Optional[List[str]] = None


class TranslatedDataEN(BaseModel):
    """Complete translated data structure"""
    building_core: BuildingCore
    critical_geometry: Dict[str, Any]
    materials_hierarchy: List[MaterialItem]
    environment_context: EnvironmentContext
    technical_photo_specs: TechnicalSpecs
    fidelity_requirements: Optional[Dict] = None