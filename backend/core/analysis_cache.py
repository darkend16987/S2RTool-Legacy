"""
core/analysis_cache.py - LRU Cache for Analysis Results

Caches analysis results to avoid redundant Gemini API calls
for identical images, saving costs and improving response time.
"""

import hashlib
from collections import OrderedDict
from typing import Optional, Dict
from datetime import datetime, timedelta


class AnalysisCache:
    """
    LRU (Least Recently Used) cache for image analysis results

    Features:
    - Hash-based key generation from image bytes
    - Automatic eviction of oldest entries when full
    - TTL (time-to-live) support for cache expiration
    """

    def __init__(self, maxsize: int = 100, ttl_hours: int = 24):
        """
        Initialize cache

        Args:
            maxsize: Maximum number of cached entries (default: 100)
            ttl_hours: Time-to-live in hours (default: 24)
        """
        self.maxsize = maxsize
        self.ttl = timedelta(hours=ttl_hours)

        # OrderedDict maintains insertion order for LRU
        self.cache: OrderedDict[str, Dict] = OrderedDict()

        # Statistics
        self.hits = 0
        self.misses = 0

    def _compute_hash(self, image_bytes: bytes) -> str:
        """
        Compute MD5 hash of image bytes

        Args:
            image_bytes: Raw image data

        Returns:
            Hex digest of MD5 hash
        """
        return hashlib.md5(image_bytes).hexdigest()

    def get(self, image_bytes: bytes) -> Optional[Dict]:
        """
        Get cached analysis result

        Args:
            image_bytes: Image data to lookup

        Returns:
            Cached analysis dict or None if not found/expired
        """
        key = self._compute_hash(image_bytes)

        if key not in self.cache:
            self.misses += 1
            return None

        # Get entry and check expiration
        entry = self.cache[key]
        timestamp = entry['timestamp']

        # Check if expired
        if datetime.now() - timestamp > self.ttl:
            print(f"🗑️  Cache entry expired (age: {datetime.now() - timestamp})")
            del self.cache[key]
            self.misses += 1
            return None

        # Move to end (mark as recently used)
        self.cache.move_to_end(key)

        self.hits += 1
        print(f"✅ Cache HIT! (hash: {key[:8]}..., age: {datetime.now() - timestamp})")

        return entry['result']

    def set(self, image_bytes: bytes, result: Dict) -> None:
        """
        Store analysis result in cache

        Args:
            image_bytes: Image data as key
            result: Analysis result to cache
        """
        key = self._compute_hash(image_bytes)

        # If already exists, remove it (will re-add at end)
        if key in self.cache:
            del self.cache[key]

        # Add new entry
        self.cache[key] = {
            'result': result,
            'timestamp': datetime.now()
        }

        # Evict oldest if over capacity
        if len(self.cache) > self.maxsize:
            oldest_key = next(iter(self.cache))
            evicted = self.cache.pop(oldest_key)
            print(f"🗑️  Cache full - evicted oldest entry (age: {datetime.now() - evicted['timestamp']})")

        print(f"💾 Cached analysis result (hash: {key[:8]}..., total: {len(self.cache)}/{self.maxsize})")

    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        print("🗑️  Cache cleared")

    def get_stats(self) -> Dict:
        """
        Get cache statistics

        Returns:
            Dict with cache stats
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

        return {
            'size': len(self.cache),
            'maxsize': self.maxsize,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.1f}%",
            'ttl_hours': self.ttl.total_seconds() / 3600
        }

    def cleanup_expired(self) -> int:
        """
        Remove expired entries

        Returns:
            Number of entries removed
        """
        now = datetime.now()
        expired_keys = [
            key for key, entry in self.cache.items()
            if now - entry['timestamp'] > self.ttl
        ]

        for key in expired_keys:
            del self.cache[key]

        if expired_keys:
            print(f"🗑️  Cleaned up {len(expired_keys)} expired cache entries")

        return len(expired_keys)
