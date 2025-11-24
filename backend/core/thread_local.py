"""
core/thread_local.py - Thread-Local Instance Management

Provides thread-safe singleton instances for Flask workers
to prevent race conditions when handling concurrent requests.
"""

from threading import local
from typing import Optional

# Thread-local storage
_thread_locals = local()

# ✅ Global cache (shared across all threads)
# Cache is thread-safe because OrderedDict operations are atomic in CPython
_global_analysis_cache = None


def get_analysis_cache():
    """
    Get global analysis cache instance

    Note: This is intentionally NOT thread-local because we want
    to share cached results across all threads.

    Returns:
        AnalysisCache: Shared cache instance
    """
    global _global_analysis_cache
    if _global_analysis_cache is None:
        from core.analysis_cache import AnalysisCache
        _global_analysis_cache = AnalysisCache(maxsize=100, ttl_hours=24)
        print("✅ Analysis cache initialized (maxsize=100, TTL=24h)")
    return _global_analysis_cache


def get_image_processor():
    """
    Get thread-local ImageProcessor instance

    Returns:
        ImageProcessor: Thread-safe instance
    """
    if not hasattr(_thread_locals, 'image_processor'):
        from core.image_processor import ImageProcessor
        _thread_locals.image_processor = ImageProcessor()
    return _thread_locals.image_processor


def get_prompt_builder():
    """
    Get thread-local PromptBuilder instance

    Returns:
        PromptBuilder: Thread-safe instance
    """
    if not hasattr(_thread_locals, 'prompt_builder'):
        from core.prompt_builder import PromptBuilder
        _thread_locals.prompt_builder = PromptBuilder()
    return _thread_locals.prompt_builder


def get_gemini_client():
    """
    Get thread-local GeminiClient instance

    Returns:
        GeminiClient: Thread-safe instance
    """
    if not hasattr(_thread_locals, 'gemini_client'):
        from core.gemini_client import GeminiClient
        _thread_locals.gemini_client = GeminiClient()
    return _thread_locals.gemini_client


def get_translator():
    """
    Get thread-local Translator instance

    Returns:
        Translator: Thread-safe instance with thread-local GeminiClient
    """
    if not hasattr(_thread_locals, 'translator'):
        from core.translator import Translator
        # Use thread-local GeminiClient
        gemini = get_gemini_client()
        _thread_locals.translator = Translator(gemini_client=gemini)
    return _thread_locals.translator


def get_inpainting_engine():
    """
    Get thread-local InpaintingEngine instance

    Returns:
        InpaintingEngine: Thread-safe instance
    """
    if not hasattr(_thread_locals, 'inpainting_engine'):
        from core.inpainting import InpaintingEngine
        _thread_locals.inpainting_engine = InpaintingEngine()
    return _thread_locals.inpainting_engine


def clear_thread_locals():
    """
    Clear all thread-local instances (for testing/cleanup)
    """
    for attr in list(vars(_thread_locals).keys()):
        delattr(_thread_locals, attr)
