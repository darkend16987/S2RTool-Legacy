/**
 * settings.js - Settings Page Logic
 * Manages API key and model configuration
 */

const API_BASE_URL = 'http://localhost:5001/api';

let currentSettings = null;
let availableModels = null;

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Test API Key
    document.getElementById('testApiKeyBtn').addEventListener('click', testApiKey);

    // Save Settings
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    // Reset Settings
    document.getElementById('resetBtn').addEventListener('click', resetSettings);

    // Temperature sliders
    setupTemperatureSlider('tempBuildingAnalysis', 'tempBuildingAnalysisValue');
    setupTemperatureSlider('tempPlanningAnalysis', 'tempPlanningAnalysisValue');
    setupTemperatureSlider('tempTranslation', 'tempTranslationValue');
    setupTemperatureSlider('tempImageGeneration', 'tempImageGenerationValue');
}

function setupTemperatureSlider(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);

    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
    });
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

        // Populate UI
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

    // Show masked API key
    if (data.api_key_configured) {
        apiKeyInput.placeholder = data.api_key_masked;
        apiKeyStatus.innerHTML = `
            <span class="status-badge success">✓ Configured</span>
        `;
    } else {
        apiKeyStatus.innerHTML = `
            <span class="status-badge error">✗ Not configured</span>
        `;
    }
}

function populateModelSelections(data) {
    const models = data.models;

    // Building Analysis
    populateModelSelect('modelBuildingAnalysis', availableModels.text, models.building_analysis);

    // Planning Analysis
    populateModelSelect('modelPlanningAnalysis', availableModels.text, models.planning_analysis);

    // Translation
    populateModelSelect('modelTranslation', availableModels.text, models.translation);

    // Image Generation
    populateModelSelect('modelImageGeneration', availableModels.image, models.image_generation);
}

function populateModelSelect(selectId, modelList, currentValue) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';

    modelList.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.title = model.description;

        if (model.id === currentValue) {
            option.selected = true;
        }

        select.appendChild(option);
    });
}

function populateTemperatures(temperatures) {
    // Building Analysis
    setSliderValue('tempBuildingAnalysis', temperatures.building_analysis);

    // Planning Analysis
    setSliderValue('tempPlanningAnalysis', temperatures.planning_analysis);

    // Translation
    setSliderValue('tempTranslation', temperatures.translation);

    // Image Generation
    setSliderValue('tempImageGeneration', temperatures.image_generation);
}

function setSliderValue(sliderId, value) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(sliderId + 'Value');

    slider.value = value;
    valueDisplay.textContent = value;
}

function populatePreferences(preferences) {
    document.getElementById('prefAspectRatio').value = preferences.default_aspect_ratio;
    document.getElementById('prefCameraAngle').value = preferences.default_camera_angle;
    document.getElementById('prefTimeOfDay').value = preferences.default_time_of_day;
    document.getElementById('prefQualityLevel').value = preferences.default_quality_level;
}

// ========================================
// Test API Key
// ========================================

async function testApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const testBtn = document.getElementById('testApiKeyBtn');
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showAlert('Please enter an API key to test', 'error');
        return;
    }

    try {
        testBtn.disabled = true;
        testBtn.innerHTML = '<span class="loading"></span> Testing...';

        const response = await fetch(`${API_BASE_URL}/settings/test-api-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ api_key: apiKey })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            showAlert(`✓ ${data.message}`, 'success');
            document.getElementById('apiKeyStatus').innerHTML = `
                <span class="status-badge success">✓ Valid</span>
            `;
        } else {
            showAlert(`✗ ${data.message}`, 'error');
            document.getElementById('apiKeyStatus').innerHTML = `
                <span class="status-badge error">✗ Invalid</span>
            `;
        }

    } catch (error) {
        console.error('Error testing API key:', error);
        showAlert(`Error testing API key: ${error.message}`, 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Key';
    }
}

// ========================================
// Save Settings
// ========================================

async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading"></span> Saving...';

        // Collect settings
        const settings = {
            api_key: document.getElementById('apiKeyInput').value.trim() || undefined,
            models: {
                building_analysis: document.getElementById('modelBuildingAnalysis').value,
                planning_analysis: document.getElementById('modelPlanningAnalysis').value,
                translation: document.getElementById('modelTranslation').value,
                image_generation: document.getElementById('modelImageGeneration').value
            },
            temperatures: {
                building_analysis: parseFloat(document.getElementById('tempBuildingAnalysis').value),
                planning_analysis: parseFloat(document.getElementById('tempPlanningAnalysis').value),
                translation: parseFloat(document.getElementById('tempTranslation').value),
                image_generation: parseFloat(document.getElementById('tempImageGeneration').value)
            },
            preferences: {
                default_aspect_ratio: document.getElementById('prefAspectRatio').value,
                default_camera_angle: document.getElementById('prefCameraAngle').value,
                default_time_of_day: document.getElementById('prefTimeOfDay').value,
                default_quality_level: document.getElementById('prefQualityLevel').value
            }
        };

        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to save settings');
        }

        showAlert('✓ Settings saved successfully!', 'success');

        // Clear API key input (security)
        document.getElementById('apiKeyInput').value = '';

        // Reload settings to show updated masked key
        setTimeout(() => {
            loadSettings();
        }, 1500);

    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert(`✗ Error saving settings: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Save Settings';
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
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span class="loading"></span> Resetting...';

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
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset to Defaults';
    }
}

// ========================================
// Alert Helpers
// ========================================

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');

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
    alertContainer.innerHTML = '';
}
