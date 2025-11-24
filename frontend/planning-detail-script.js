// ============================================
// PLANNING DETAIL RENDER - Frontend JavaScript
// Version: 3.4 - FULL ROBUST VERSION
// Updated: Docker Compatible & Safe DOM
// ============================================

// ============== CONFIG ==============
const API_BASE_URL = '/api';

// ============== STATE ==============
let currentSketchImage = null;
let currentRenderedImage = null;
let isRendering = false;

// ============== DOM ELEMENTS (Global) ==============
let uploadSketch, previewImage, uploadLabel, generateButton, gallery, aspectRatioSelect, analyzeButton;

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Planning Detail Render v3.4 initialized');

    // 1. Initialize Elements Safely
    uploadSketch = document.getElementById('uploadSketch');
    previewImage = document.getElementById('previewImage');
    uploadLabel = document.getElementById('uploadLabel');
    generateButton = document.getElementById('generateRenderButton');
    gallery = document.getElementById('gallery');
    aspectRatioSelect = document.getElementById('aspect_ratio');
    analyzeButton = document.getElementById('analyzeSketchButton');

    // 2. Setup Listeners
    setupEventListeners();
});

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    if (uploadSketch) uploadSketch.addEventListener('change', handleImageUpload);

    if (previewImage && uploadSketch) {
        previewImage.addEventListener('click', () => uploadSketch.click());
    }

    if (analyzeButton) analyzeButton.addEventListener('click', analyzeSketch);

    if (generateButton) generateButton.addEventListener('click', generateRender);

    document.addEventListener('click', (e) => {
        if (e.target.closest('#downloadImageBtn')) handleDownloadImage();
        if (e.target.closest('#regenerateBtn')) generateRender();
    });

    // Low-rise toggle
    const hasLowriseCheckbox = document.getElementById('has_lowrise');
    const lowriseFields = document.getElementById('lowrise_fields');
    if (hasLowriseCheckbox && lowriseFields) {
        hasLowriseCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                lowriseFields.classList.remove('hidden');
            } else {
                lowriseFields.classList.add('hidden');
            }
        });
    }

    // Range slider
    const sketchAdherence = document.getElementById('sketch_adherence');
    const sketchAdherenceValue = document.getElementById('sketch_adherence_value');
    if (sketchAdherence && sketchAdherenceValue) {
        sketchAdherence.addEventListener('input', (e) => {
            sketchAdherenceValue.textContent = e.target.value;
        });
    }

    // Quality preset
    const qualityLevelSelect = document.getElementById('quality_level');
    if (qualityLevelSelect) {
        qualityLevelSelect.addEventListener('change', (e) => {
            applyQualityPreset(e.target.value);
        });
    }
}

// ============== QUALITY PRESETS ==============
function applyQualityPreset(level) {
    const presets = {
        standard: { global_illumination: true, soft_shadows: true, hdri_sky: false, reflections: true, depth_of_field: false, bloom: false, color_correction: true, desaturate: false },
        high_fidelity: { global_illumination: true, soft_shadows: true, hdri_sky: true, reflections: true, depth_of_field: true, bloom: true, color_correction: true, desaturate: true },
        ultra_realism: { global_illumination: true, soft_shadows: true, hdri_sky: true, reflections: true, depth_of_field: true, bloom: true, color_correction: true, desaturate: true }
    };

    const preset = presets[level] || presets.high_fidelity;

    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    setCheck('quality_gi', preset.global_illumination);
    setCheck('quality_shadows', preset.soft_shadows);
    setCheck('quality_hdri', preset.hdri_sky);
    setCheck('quality_reflection', preset.reflections);
    setCheck('quality_dof', preset.depth_of_field);
    setCheck('quality_bloom', preset.bloom);
    setCheck('quality_color_correction', preset.color_correction);
    setCheck('quality_desaturate', preset.desaturate);

    console.log(`✅ Applied ${level} quality preset`);
}

// ============== IMAGE OPTIMIZATION (Reuse logic) ==============
async function optimizeImageForUpload(file) {
    const MAX_DIMENSION = 1024;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/png');
        };
        img.src = URL.createObjectURL(file);
    });
}

// ============== IMAGE UPLOAD ==============
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        console.log(`📁 Uploading ${file.name}`);
        const optimizedBlob = await optimizeImageForUpload(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            currentSketchImage = e.target.result;
            if (previewImage) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            }
            if (uploadLabel) uploadLabel.classList.add('hidden');
            if (analyzeButton) analyzeButton.disabled = false; // Enable analyze button

            // Enable Generate button immediately if user skips analyze (optional)
            if (generateButton) generateButton.disabled = false;

            console.log('✅ Image uploaded successfully');
        };
        reader.readAsDataURL(optimizedBlob);
    } catch (error) {
        console.error('❌ Image upload failed:', error);
        showError('renderError', 'Lỗi khi tải ảnh: ' + error.message);
    }
}

// ============== ANALYZE SKETCH ==============
async function analyzeSketch() {
    if (!currentSketchImage) {
        showError('renderError', 'Vui lòng upload sketch trước!');
        return;
    }

    const btnText = document.getElementById('analyzeButtonText');
    const spinner = document.getElementById('analyzeSpinner');

    if (analyzeButton) analyzeButton.disabled = true;
    if (btnText) btnText.textContent = 'Đang phân tích...';
    if (spinner) spinner.classList.remove('hidden');
    hideError('renderError');

    try {
        const response = await fetch(`${API_BASE_URL}/planning/analyze-sketch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: currentSketchImage })
        });

        if (!response.ok) throw new Error('Analyze failed');

        const data = await response.json();
        fillFormFromAnalysis(data.analysis);
        showSuccess('renderSuccess', '✅ Đã phân tích sketch thành công!');

    } catch (error) {
        showError('renderError', `Lỗi phân tích: ${error.message}`);
    } finally {
        if (analyzeButton) analyzeButton.disabled = false;
        if (btnText) btnText.textContent = 'Phân tích Sketch (Analyze)';
        if (spinner) spinner.classList.add('hidden');
    }
}

// ============== FILL FORM FROM ANALYSIS ==============
function fillFormFromAnalysis(analysis) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    if (analysis.scale) setVal('scale', analysis.scale);
    if (analysis.project_type) setVal('project_type', analysis.project_type);
    if (analysis.overall_description) setVal('overall_description', analysis.overall_description);

    if (analysis.highrise_zone) {
        const hr = analysis.highrise_zone;
        setVal('highrise_count', hr.count);
        setVal('highrise_floors', hr.floors);
        setVal('highrise_style', hr.style);
        setVal('highrise_colors', hr.colors);
        setVal('highrise_features', hr.features);
    }

    if (analysis.lowrise_zone && analysis.lowrise_zone.exists) {
        const check = document.getElementById('has_lowrise');
        const fields = document.getElementById('lowrise_fields');
        if (check) check.checked = true;
        if (fields) fields.classList.remove('hidden');

        const lr = analysis.lowrise_zone;
        setVal('lowrise_floors', lr.floors);
        setVal('lowrise_style', lr.style);
        setVal('lowrise_colors', lr.colors);
    }

    if (analysis.landscape) {
        const land = analysis.landscape;
        setVal('green_spaces', land.green_spaces);
        setVal('tree_type', land.tree_type);
        setVal('road_pattern', land.road_pattern);
    }
}

// ============== COLLECT FORM DATA ==============
function collectFormData() {
    const getChecked = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

    const qualityPresets = {
        global_illumination: getChecked('quality_gi'),
        soft_shadows: getChecked('quality_shadows'),
        hdri_sky: getChecked('quality_hdri'),
        reflections: getChecked('quality_reflection'),
        depth_of_field: getChecked('quality_dof'),
        bloom: getChecked('quality_bloom'),
        color_correction: getChecked('quality_color_correction'),
        desaturate: getChecked('quality_desaturate')
    };

    const customDesc = getVal('custom_description').trim();
    const planning_description = customDesc ? customDesc : buildDescriptionFromFields();

    return {
        planning_description: planning_description,
        camera_angle: getVal('camera_angle'),
        time_of_day: getVal('time_of_day'),
        weather: getVal('weather'),
        horizon_line: getVal('horizon_line'),
        quality_level: getVal('quality_level'),
        quality_presets: qualityPresets,
        sketch_adherence: parseFloat(getVal('sketch_adherence')) || 0.9,
        aspect_ratio: aspectRatioSelect ? aspectRatioSelect.value : '16:9',
        structured_data: { /* Simplified */ }
    };
}

function buildDescriptionFromFields() {
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getText = (id) => {
        const el = document.getElementById(id);
        return el && el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : '';
    };

    const parts = [];
    parts.push(`Quy hoạch ${getVal('scale')} ${getText('project_type')}`);

    const overall = getVal('overall_description').trim();
    if (overall) parts.push(overall);

    // High-rise
    const hrCount = getVal('highrise_count');
    if (hrCount) parts.push(`Cao tầng: ${hrCount} tòa, ${getVal('highrise_floors')} tầng, ${getText('highrise_style')}`);

    return parts.join('. ') + '.';
}

// ============== GENERATE RENDER ==============
async function generateRender() {
    if (!currentSketchImage) {
        showError('renderError', 'Vui lòng upload sketch trước!');
        return;
    }

    if (isRendering) return;

    isRendering = true;
    showSpinner('renderSpinner', true);
    if (generateButton) generateButton.disabled = true;
    hideError('renderError');
    hideSuccess('renderSuccess');

    try {
        console.log('🎨 Generating planning detail render...');
        const formData = collectFormData();

        const requestData = {
            image_base64: currentSketchImage,
            planning_data: formData
        };

        const response = await fetch(`${API_BASE_URL}/planning/detail-render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error`);
        }

        const data = await response.json();
        currentRenderedImage = data.generated_image_base64;
        displayRenderedImage(currentRenderedImage);
        showSuccess('renderSuccess', `✅ Render thành công!`);

        // Stats
        const timeEl = document.getElementById('statTime');
        const statsBox = document.getElementById('statsBox');
        if (timeEl) timeEl.textContent = 'Done';
        if (statsBox) statsBox.classList.remove('hidden');

    } catch (error) {
        console.error('❌ Render failed:', error);
        showError('renderError', 'Lỗi khi render: ' + error.message);
    } finally {
        isRendering = false;
        showSpinner('renderSpinner', false);
        if (generateButton) generateButton.disabled = false;
    }
}

// ============== DISPLAY RESULTS ==============
function displayRenderedImage(base64Image) {
    if (!gallery) return;
    gallery.innerHTML = '';
    const img = document.createElement('img');
    img.src = base64Image;
    img.style.width = '100%';
    img.style.borderRadius = '12px';
    gallery.appendChild(img);

    const controls = document.getElementById('outputControls');
    if (controls) controls.classList.remove('hidden');
}

function handleDownloadImage() {
    if (!currentRenderedImage) {
        showError('renderError', 'Chưa có ảnh!');
        return;
    }
    const link = document.createElement('a');
    link.href = currentRenderedImage;
    link.download = `planning-detail-${Date.now()}.png`;
    link.click();
}

// ============== HELPERS ==============
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}
function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 4000); }
}
function hideSuccess(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}
function showSpinner(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
}