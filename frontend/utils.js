/**
 * utils.js - Shared Utilities for S2RTool Frontend
 *
 * This file contains common functions used across multiple pages
 * to avoid code duplication and improve maintainability.
 */

// ============== CONFIGURATION ==============
const CONFIG = {
    MAX_IMAGE_DIMENSION: 1024,
    DEBUG: false, // Set to true for development, false for production
    AUTO_HIDE_SUCCESS_MS: 4000
};

// ============== LOGGING UTILITIES ==============

/**
 * Debug logging (only in development mode)
 */
function debugLog(...args) {
    if (CONFIG.DEBUG) {
        console.log(...args);
    }
}

/**
 * Error logging (always logged)
 */
function errorLog(...args) {
    console.error(...args);
}

/**
 * Warning logging (always logged)
 */
function warnLog(...args) {
    console.warn(...args);
}

/**
 * Info logging (conditional on DEBUG)
 */
function infoLog(...args) {
    if (CONFIG.DEBUG) {
        console.info(...args);
    }
}

// ============== IMAGE OPTIMIZATION ==============

/**
 * Optimize image for upload by resizing to max dimensions
 * @param {File} file - Image file to optimize
 * @returns {Promise<Blob>} Optimized image blob
 */
async function optimizeImageForUpload(file) {
    const MAX_DIMENSION = CONFIG.MAX_IMAGE_DIMENSION;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
                debugLog(`📐 Resizing image: ${img.width}×${img.height} → ${width}×${height}`);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(resolve, 'image/png');
        };
        img.onerror = () => {
            errorLog('❌ Failed to load image for optimization');
            resolve(file); // Fallback to original file
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Convert File/Blob to base64 string
 * @param {Blob} blob - File or Blob to convert
 * @returns {Promise<string>} Base64 data URL
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ============== UI UTILITIES ==============

/**
 * Show error message in specified container
 * @param {string} id - Element ID
 * @param {string} message - Error message to display
 */
function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    } else {
        errorLog(`❌ Error container not found: ${id}`);
    }
}

/**
 * Hide error message
 * @param {string} id - Element ID
 */
function hideError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
    }
}

/**
 * Show success message (auto-hides after delay)
 * @param {string} id - Element ID
 * @param {string} message - Success message to display
 * @param {number} autoHideMs - Auto-hide delay in milliseconds (default: 4000)
 */
function showSuccess(id, message, autoHideMs = CONFIG.AUTO_HIDE_SUCCESS_MS) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
        if (autoHideMs > 0) {
            setTimeout(() => el.classList.add('hidden'), autoHideMs);
        }
    } else {
        warnLog(`⚠️ Success container not found: ${id}`);
    }
}

/**
 * Hide success message
 * @param {string} id - Element ID
 */
function hideSuccess(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
    }
}

/**
 * Show loading state on button
 * @param {HTMLButtonElement} button - Button element
 * @param {string} loadingText - Text to display while loading
 */
function showButtonLoading(button, loadingText = 'Processing...') {
    if (button) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
    }
}

/**
 * Hide loading state on button
 * @param {HTMLButtonElement} button - Button element
 */
function hideButtonLoading(button) {
    if (button) {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

// ============== API UTILITIES ==============

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
function getApiBaseUrl() {
    // If running in Docker, backend is on different container
    // If running locally, adjust this URL
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001';
    }

    // In production/Docker, use relative path (Nginx proxy)
    return '';
}

/**
 * Make API request with error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/render')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    debugLog(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        debugLog(`✅ API Response received`);
        return data;

    } catch (error) {
        errorLog(`❌ API Error: ${error.message}`);
        throw error;
    }
}

// ============== VALIDATION UTILITIES ==============

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
function validateImageFile(file, maxSizeMB = 16) {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload PNG, JPEG, or WebP image.'
        };
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${maxSizeMB}MB.`
        };
    }

    return { valid: true };
}

// ============== DOM UTILITIES ==============

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null if not found
 */
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        warnLog(`⚠️ Element not found: ${id}`);
    }
    return el;
}

/**
 * Set element visibility
 * @param {string} id - Element ID
 * @param {boolean} visible - Whether element should be visible
 */
function setElementVisibility(id, visible) {
    const el = getElement(id);
    if (el) {
        if (visible) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
}

// ============== DOWNLOAD UTILITIES ==============

/**
 * Download base64 image
 * @param {string} base64Data - Base64 image data
 * @param {string} filename - Filename for download
 */
function downloadBase64Image(base64Data, filename = 'image.png') {
    try {
        // Remove data URL prefix if present
        const base64Content = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data;

        // Convert base64 to blob
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog(`💾 Downloaded: ${filename}`);
    } catch (error) {
        errorLog(`❌ Download failed: ${error.message}`);
        throw error;
    }
}

// ============== EXPORTS (for ES6 modules, if needed) ==============
// If using ES6 modules, uncomment below:
// export {
//     CONFIG,
//     debugLog, errorLog, warnLog, infoLog,
//     optimizeImageForUpload, blobToBase64,
//     showError, hideError, showSuccess, hideSuccess,
//     showButtonLoading, hideButtonLoading,
//     getApiBaseUrl, apiRequest,
//     validateImageFile,
//     getElement, setElementVisibility,
//     downloadBase64Image
// };
