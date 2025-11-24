/**
 * settings.js - Settings Page Logic
 * Manages API key and model configuration
 */

const API_BASE_URL = '/api';

let currentSettings = null;
let availableModels = null;

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('⚙️ Settings Page Initialized');
    loadSettings();
    setupEventListeners();
});

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    const elements = {
        testApiKeyBtn: document.getElementById('testApiKeyBtn'),
        saveBtn: document.getElementById('saveBtn'),
        resetBtn: document.getElementById('resetBtn')
    };

    if (elements.testApiKeyBtn) elements.testApiKeyBtn.addEventListener('click', testApiKey);
    if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveSettings);
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetSettings);

    // Temperature sliders (Safe setup)
    setupTemperatureSlider('tempBuildingAnalysis', 'tempBuildingAnalysisValue');
    setupTemperatureSlider('tempPlanningAnalysis', 'tempPlanningAnalysisValue');
    setupTemperatureSlider('tempTranslation', 'tempTranslationValue');
    setupTemperatureSlider('tempImageGeneration', 'tempImageGenerationValue');
}

function setupTemperatureSlider(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);

    if (slider && valueDisplay) {
        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
        });
    }
}

// ========================================
// Load Settings
// ========================================

async function loadSettings() {
    try {
        showAlert('Loading settings...', 'info');

        const response = await fetch(`${API_BASE_URL}/settings`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load settings');
        }

        currentSettings = data;
        availableModels = data.available_models;

        console.log('✅ Settings loaded:', data);

        // Populate UI (Safe calls)
        populateAPIKeySection(data);
        populateModelSelections(data);
        populateTemperatures(data.temperatures);
        populatePreferences(data.preferences);

        showAlert('Settings loaded successfully', 'success');
        setTimeout(clearAlerts, 2000);

    } catch (error) {
        console.error('Error loading settings:', error);
        showAlert(`Error loading settings: ${error.message}`, 'error');
    }
}

// ========================================
// Populate UI
// ========================================

function populateAPIKeySection(data) {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyStatus = document.getElementById('apiKeyStatus');

    if (apiKeyInput && data.api_key_configured !== undefined) {
        apiKeyInput.placeholder = data.api_key_masked || 'Enter Gemini API Key';
    }

    if (apiKeyStatus) {
        if (data.api_key_configured) {
            apiKeyStatus.innerHTML = `<span class="status-badge success">✓ Configured</span>`;
        } else {
            apiKeyStatus.innerHTML = `<span class="status-badge error">✗ Not configured</span>`;
        }
    }
}

function populateModelSelections(data) {
    if (!data.models || !availableModels) return;

    const models = data.models;

    // Helper to safely populate
    const safePopulate = (id, list, current) => {
        if (document.getElementById(id)) {
            populateModelSelect(id, list, current);
        } else {
            console.warn(`⚠️ Element #${id} not found in HTML`);
        }
    };

    safePopulate('modelBuildingAnalysis', availableModels.text, models.building_analysis);
    safePopulate('modelPlanningAnalysis', availableModels.text, models.planning_analysis);
    safePopulate('modelTranslation', availableModels.text, models.translation);
    safePopulate('modelImageGeneration', availableModels.image, models.image_generation);
}

function populateModelSelect(selectId, modelList, currentValue) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '';

    if (!modelList || !Array.isArray(modelList)) {
        console.warn(`No models list for ${selectId}`);
        return;
    }

    modelList.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.title = model.description || '';

        if (model.id === currentValue) {
            option.selected = true;
        }

        select.appendChild(option);
    });
}

function populateTemperatures(temperatures) {
    if (!temperatures) return;
    setSliderValue('tempBuildingAnalysis', temperatures.building_analysis);
    setSliderValue('tempPlanningAnalysis', temperatures.planning_analysis);
    setSliderValue('tempTranslation', temperatures.translation);
    setSliderValue('tempImageGeneration', temperatures.image_generation);
}

function setSliderValue(sliderId, value) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(sliderId + 'Value');

    if (slider) slider.value = value;
    if (valueDisplay) valueDisplay.textContent = value;
}

function populatePreferences(preferences) {
    if (!preferences) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('prefAspectRatio', preferences.default_aspect_ratio);
    setVal('prefCameraAngle', preferences.default_camera_angle);
    setVal('prefTimeOfDay', preferences.default_time_of_day);
    setVal('prefQualityLevel', preferences.default_quality_level);
}

// ========================================
// Test API Key
// ========================================

async function testApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const testBtn = document.getElementById('testApiKeyBtn');
    const statusEl = document.getElementById('apiKeyStatus');

    if (!apiKeyInput) return;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showAlert('Please enter an API key to test', 'error');
        return;
    }

    try {
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.innerHTML = '<span class="loading"></span> Testing...';
        }

        const response = await fetch(`${API_BASE_URL}/settings/test-api-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            showAlert(`✓ ${data.message}`, 'success');
            if (statusEl) statusEl.innerHTML = `<span class="status-badge success">✓ Valid</span>`;
        } else {
            showAlert(`✗ ${data.message}`, 'error');
            if (statusEl) statusEl.innerHTML = `<span class="status-badge error">✗ Invalid</span>`;
        }

    } catch (error) {
        console.error('Error testing API key:', error);
        showAlert(`Error testing API key: ${error.message}`, 'error');
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Key';
        }
    }
}

// ========================================
// Save Settings
// ========================================

async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading"></span> Saving...';
        }

        // Helper to get value safely
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : undefined;
        };

        const getFloat = (id) => {
            const el = document.getElementById(id);
            return el ? parseFloat(el.value) : 0.7;
        };

        // Collect settings
        const settings = {
            api_key: apiKeyInput ? (apiKeyInput.value.trim() || undefined) : undefined,
            models: {
                building_analysis: getVal('modelBuildingAnalysis'),
                planning_analysis: getVal('modelPlanningAnalysis'),
                translation: getVal('modelTranslation'),
                image_generation: getVal('modelImageGeneration')
            },
            temperatures: {
                building_analysis: getFloat('tempBuildingAnalysis'),
                planning_analysis: getFloat('tempPlanningAnalysis'),
                translation: getFloat('tempTranslation'),
                image_generation: getFloat('tempImageGeneration')
            },
            preferences: {
                default_aspect_ratio: getVal('prefAspectRatio'),
                default_camera_angle: getVal('prefCameraAngle'),
                default_time_of_day: getVal('prefTimeOfDay'),
                default_quality_level: getVal('prefQualityLevel')
            }
        };

        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to save settings');
        }

        showAlert('✓ Settings saved successfully!', 'success');

        // Clear API key input (security)
        if (apiKeyInput) apiKeyInput.value = '';

        // Reload settings to show updated masked key
        setTimeout(() => {
            loadSettings();
        }, 1500);

    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert(`✗ Error saving settings: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Settings';
        }
    }
}

// ========================================
// Reset Settings
// ========================================

async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        return;
    }

    const resetBtn = document.getElementById('resetBtn');

    try {
        if (resetBtn) {
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<span class="loading"></span> Resetting...';
        }

        const response = await fetch(`${API_BASE_URL}/settings/reset`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to reset settings');
        }

        showAlert('✓ Settings reset to defaults', 'success');

        // Reload settings
        setTimeout(() => {
            loadSettings();
        }, 1500);

    } catch (error) {
        console.error('Error resetting settings:', error);
        showAlert(`✗ Error resetting settings: ${error.message}`, 'error');
    } finally {
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset to Defaults';
        }
    }
}

// ========================================
// Alert Helpers
// ========================================

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return; // Fail silently if no container
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    alertContainer.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function clearAlerts() {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) alertContainer.innerHTML = '';
}