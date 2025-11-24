"""
utils/logger.py - Logging Configuration
"""

import logging
from config import LOG_FORMAT, LOG_LEVEL


def setup_logger(name: str) -> logging.Logger:
    """
    Setup logger with consistent configuration
    
    Args:
        name: Logger name (usually __name__)
    
    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(LOG_LEVEL)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
    
    return logger
