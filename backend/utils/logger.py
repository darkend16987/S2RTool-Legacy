"""
utils/logger.py - Logging Configuration

Enhanced logging utility with backward-compatible print() replacement.
"""

import logging
import sys
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
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)

    return logger


# ============== GLOBAL LOGGER FOR EASY IMPORT ==============
_default_logger = setup_logger('s2rtool')


def debug(*args, **kwargs):
    """Debug level log (equivalent to print but with DEBUG level)"""
    message = ' '.join(str(arg) for arg in args)
    _default_logger.debug(message, **kwargs)


def info(*args, **kwargs):
    """Info level log (equivalent to print but with INFO level)"""
    message = ' '.join(str(arg) for arg in args)
    _default_logger.info(message, **kwargs)


def warning(*args, **kwargs):
    """Warning level log"""
    message = ' '.join(str(arg) for arg in args)
    _default_logger.warning(message, **kwargs)


def error(*args, **kwargs):
    """Error level log"""
    message = ' '.join(str(arg) for arg in args)
    _default_logger.error(message, **kwargs)


def critical(*args, **kwargs):
    """Critical level log"""
    message = ' '.join(str(arg) for arg in args)
    _default_logger.critical(message, **kwargs)


# ============== BACKWARD COMPATIBLE PRINT REPLACEMENT ==============
# Use this to gradually replace print() statements
def log_print(*args, level='INFO', **kwargs):
    """
    Drop-in replacement for print() with logging support

    Usage:
        # Instead of: print(f"✅ Cache HIT!")
        # Use: log_print("✅ Cache HIT!")

    Args:
        *args: Arguments to print/log
        level: Log level ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
        **kwargs: Additional kwargs for logger
    """
    message = ' '.join(str(arg) for arg in args)

    level_map = {
        'DEBUG': _default_logger.debug,
        'INFO': _default_logger.info,
        'WARNING': _default_logger.warning,
        'ERROR': _default_logger.error,
        'CRITICAL': _default_logger.critical
    }

    log_func = level_map.get(level.upper(), _default_logger.info)
    log_func(message, **kwargs)
