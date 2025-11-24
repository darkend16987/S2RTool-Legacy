// ============================================
// PLANNING DETAIL RENDER - Frontend JavaScript
// Version: 1.0
// ============================================

// ============== CONFIG ==============
const API_BASE_URL = 'http://localhost:5001/api';

// ============== STATE ==============
let currentSketchImage = null;
let currentRenderedImage = null;
let isRendering = false;

// ============== DOM ELEMENTS ==============
const uploadSketch = document.getElementById('uploadSketch');
const previewImage = document.getElementById('previewImage');
const uploadLabel = document.getElementById('uploadLabel');
const generateButton = document.getElementById('generateRenderButton');
const gallery = document.getElementById('gallery');
const aspectRatioSelect = document.getElementById('aspect_ratio');

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Planning Detail Render v1.0 initialized');
    setupEventListeners();
});

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    // File upload
    uploadSketch.addEventListener('change', handleImageUpload);

    // Click preview to re-upload
    previewImage.addEventListener('click', () => uploadSketch.click());

    // Analyze button
    const analyzeButton = document.getElementById('analyzeSketchButton');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzeSketch);
    }

    // Generate button
    generateButton.addEventListener('click', generateRender);

    // Download button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#downloadImageBtn')) {
            handleDownloadImage();
        }
    });

    // Regenerate button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#regenerateBtn')) {
            generateRender();
        }
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

    // Range slider display
    const sketchAdherence = document.getElementById('sketch_adherence');
    const sketchAdherenceValue = document.getElementById('sketch_adherence_value');
    if (sketchAdherence && sketchAdherenceValue) {
        sketchAdherence.addEventListener('input', (e) => {
            sketchAdherenceValue.textContent = e.target.value;
        });
    }

    // Quality level auto-preset
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
        standard: {
            global_illumination: true,
            soft_shadows: true,
            hdri_sky: false,
            reflections: true,
            depth_of_field: false,
            bloom: false,
            color_correction: true,
            desaturate: false
        },
        high_fidelity: {
            global_illumination: true,
            soft_shadows: true,
            hdri_sky: true,
            reflections: true,
            depth_of_field: true,
            bloom: true,
            color_correction: true,
            desaturate: true
        },
        ultra_realism: {
            global_illumination: true,
            soft_shadows: true,
            hdri_sky: true,
            reflections: true,
            depth_of_field: true,
            bloom: true,
            color_correction: true,
            desaturate: true
        }
    };

    const preset = presets[level] || presets.high_fidelity;

    document.getElementById('quality_gi').checked = preset.global_illumination;
    document.getElementById('quality_shadows').checked = preset.soft_shadows;
    document.getElementById('quality_hdri').checked = preset.hdri_sky;
    document.getElementById('quality_reflection').checked = preset.reflections;
    document.getElementById('quality_dof').checked = preset.depth_of_field;
    document.getElementById('quality_bloom').checked = preset.bloom;
    document.getElementById('quality_color_correction').checked = preset.color_correction;
    document.getElementById('quality_desaturate').checked = preset.desaturate;

    console.log(`✅ Applied ${level} quality preset`);
}

// ============== IMAGE UPLOAD ==============
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log(`📁 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    try {
        // Read file as base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            currentSketchImage = base64;

            // Show preview
            previewImage.src = base64;
            previewImage.classList.remove('hidden');
            uploadLabel.classList.add('hidden');

            // Enable generate button
            generateButton.disabled = false;

            console.log('✅ Image uploaded successfully');
        };
        reader.readAsDataURL(file);
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

    const analyzeButton = document.getElementById('analyzeSketchButton');
    const analyzeButtonText = document.getElementById('analyzeButtonText');
    const analyzeSpinner = document.getElementById('analyzeSpinner');

    analyzeButton.disabled = true;
    analyzeButtonText.textContent = 'Đang phân tích...';
    showSpinner('analyzeSpinner', true);
    hideError('renderError');

    console.log('🔍 Analyzing sketch...');

    try {
        const response = await fetch(`${API_BASE_URL}/planning/analyze-sketch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_base64: currentSketchImage
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analyze failed');
        }

        const data = await response.json();
        console.log('✅ Analysis complete:', data);

        // Fill form with analyzed data
        fillFormFromAnalysis(data.analysis);

        showSuccess('renderSuccess', '✅ Đã phân tích sketch thành công! Vui lòng kiểm tra và điều chỉnh các trường nếu cần.');
        setTimeout(() => hideSuccess('renderSuccess'), 5000);

    } catch (error) {
        console.error('❌ Analyze failed:', error);
        showError('renderError', `Lỗi phân tích: ${error.message}`);
    } finally {
        analyzeButton.disabled = false;
        analyzeButtonText.textContent = 'Phân tích Sketch (Analyze)';
        showSpinner('analyzeSpinner', false);
    }
}

// ============== FILL FORM FROM ANALYSIS ==============
function fillFormFromAnalysis(analysis) {
    // Basic info
    if (analysis.scale) {
        document.getElementById('scale').value = analysis.scale;
    }
    if (analysis.project_type) {
        document.getElementById('project_type').value = analysis.project_type;
    }
    if (analysis.overall_description) {
        document.getElementById('overall_description').value = analysis.overall_description;
    }

    // High-rise zone
    if (analysis.highrise_zone) {
        const hr = analysis.highrise_zone;
        if (hr.count) document.getElementById('highrise_count').value = hr.count;
        if (hr.floors) document.getElementById('highrise_floors').value = hr.floors;
        if (hr.style) document.getElementById('highrise_style').value = hr.style;
        if (hr.colors) document.getElementById('highrise_colors').value = hr.colors;
        if (hr.features) document.getElementById('highrise_features').value = hr.features;
    }

    // Low-rise zone
    if (analysis.lowrise_zone && analysis.lowrise_zone.exists) {
        document.getElementById('has_lowrise').checked = true;
        document.getElementById('lowrise_fields').classList.remove('hidden');

        const lr = analysis.lowrise_zone;
        if (lr.floors) document.getElementById('lowrise_floors').value = lr.floors;
        if (lr.style) document.getElementById('lowrise_style').value = lr.style;
        if (lr.colors) document.getElementById('lowrise_colors').value = lr.colors;
    }

    // Landscape
    if (analysis.landscape) {
        const land = analysis.landscape;
        if (land.green_spaces) document.getElementById('green_spaces').value = land.green_spaces;
        if (land.tree_type) document.getElementById('tree_type').value = land.tree_type;
        if (land.road_pattern) document.getElementById('road_pattern').value = land.road_pattern;
    }

    console.log('✅ Form filled from analysis');
}

// ============== COLLECT FORM DATA ==============
function collectFormData() {
    const qualityPresets = {
        global_illumination: document.getElementById('quality_gi').checked,
        soft_shadows: document.getElementById('quality_shadows').checked,
        hdri_sky: document.getElementById('quality_hdri').checked,
        reflections: document.getElementById('quality_reflection').checked,
        depth_of_field: document.getElementById('quality_dof').checked,
        bloom: document.getElementById('quality_bloom').checked,
        color_correction: document.getElementById('quality_color_correction').checked,
        desaturate: document.getElementById('quality_desaturate').checked
    };

    // Check if custom description is provided (overrides structured)
    const customDescription = document.getElementById('custom_description').value.trim();

    let planning_description;
    if (customDescription) {
        // Use custom description directly
        planning_description = customDescription;
    } else {
        // Build from structured fields
        planning_description = buildDescriptionFromFields();
    }

    return {
        planning_description: planning_description,
        camera_angle: document.getElementById('camera_angle').value,
        time_of_day: document.getElementById('time_of_day').value,
        weather: document.getElementById('weather').value,
        quality_level: document.getElementById('quality_level').value,
        quality_presets: qualityPresets,
        sketch_adherence: parseFloat(document.getElementById('sketch_adherence').value),
        aspect_ratio: aspectRatioSelect.value,
        // Also include structured data for backend
        structured_data: {
            scale: document.getElementById('scale').value,
            project_type: document.getElementById('project_type').value,
            overall_description: document.getElementById('overall_description').value,
            highrise_zone: {
                count: document.getElementById('highrise_count').value,
                floors: document.getElementById('highrise_floors').value,
                style: document.getElementById('highrise_style').value,
                colors: document.getElementById('highrise_colors').value,
                features: document.getElementById('highrise_features').value
            },
            lowrise_zone: {
                exists: document.getElementById('has_lowrise').checked,
                floors: document.getElementById('lowrise_floors').value,
                style: document.getElementById('lowrise_style').value,
                colors: document.getElementById('lowrise_colors').value
            },
            landscape: {
                green_spaces: document.getElementById('green_spaces').value,
                tree_type: document.getElementById('tree_type').value,
                road_pattern: document.getElementById('road_pattern').value,
                context: {
                    people: document.getElementById('context_people').checked,
                    vehicles: document.getElementById('context_vehicles').checked,
                    skyline: document.getElementById('context_skyline').checked,
                    water: document.getElementById('context_water').checked
                }
            }
        }
    };
}

// ============== BUILD DESCRIPTION FROM STRUCTURED FIELDS ==============
function buildDescriptionFromFields() {
    const parts = [];

    // Scale and type
    const scale = document.getElementById('scale').value;
    const projectType = document.getElementById('project_type').options[document.getElementById('project_type').selectedIndex].text;
    parts.push(`Quy hoạch ${scale} ${projectType}`);

    // Overall description
    const overall = document.getElementById('overall_description').value.trim();
    if (overall) {
        parts.push(overall);
    }

    // High-rise zone
    const hrCount = document.getElementById('highrise_count').value.trim();
    const hrFloors = document.getElementById('highrise_floors').value.trim();
    const hrStyle = document.getElementById('highrise_style').options[document.getElementById('highrise_style').selectedIndex].text;
    const hrColors = document.getElementById('highrise_colors').value.trim();
    const hrFeatures = document.getElementById('highrise_features').value.trim();

    if (hrCount || hrFloors) {
        let hrPart = 'Phân khu cao tầng:';
        if (hrCount) hrPart += ` ${hrCount} tòa`;
        if (hrFloors) hrPart += `, mỗi tòa ${hrFloors} tầng`;
        hrPart += `. ${hrStyle}`;
        if (hrColors) hrPart += `, màu sắc: ${hrColors}`;
        if (hrFeatures) hrPart += `. Đặc điểm: ${hrFeatures}`;
        parts.push(hrPart);
    }

    // Low-rise zone
    if (document.getElementById('has_lowrise').checked) {
        const lrFloors = document.getElementById('lowrise_floors').value.trim();
        const lrStyle = document.getElementById('lowrise_style').options[document.getElementById('lowrise_style').selectedIndex].text;
        const lrColors = document.getElementById('lowrise_colors').value.trim();

        let lrPart = 'Phân khu thấp tầng:';
        if (lrFloors) lrPart += ` ${lrFloors} tầng`;
        lrPart += `. ${lrStyle}`;
        if (lrColors) lrPart += `, ${lrColors}`;
        parts.push(lrPart);
    }

    // Landscape
    const greenSpaces = document.getElementById('green_spaces').value.trim();
    const treeType = document.getElementById('tree_type').options[document.getElementById('tree_type').selectedIndex].text;
    const roadPattern = document.getElementById('road_pattern').options[document.getElementById('road_pattern').selectedIndex].text;

    let landPart = 'Cảnh quan:';
    if (greenSpaces) landPart += ` ${greenSpaces}.`;
    landPart += ` Cây xanh: ${treeType}. Giao thông: ${roadPattern}`;
    parts.push(landPart);

    // Context
    const contextParts = [];
    if (document.getElementById('context_people').checked) contextParts.push('người đi bộ (motion blur)');
    if (document.getElementById('context_vehicles').checked) contextParts.push('xe hơi (motion blur)');
    if (document.getElementById('context_skyline').checked) contextParts.push('city skyline phía xa');
    if (document.getElementById('context_water').checked) contextParts.push('water features');

    if (contextParts.length > 0) {
        parts.push(`Context: ${contextParts.join(', ')}`);
    }

    return parts.join('. ') + '.';
}

// ============== GENERATE RENDER ==============
async function generateRender() {
    if (!currentSketchImage) {
        showError('renderError', 'Vui lòng upload sketch trước!');
        return;
    }

    if (isRendering) {
        console.warn('⚠️  Rendering already in progress');
        return;
    }

    // Validate: either custom description OR structured fields must have content
    const customDesc = document.getElementById('custom_description').value.trim();
    const overallDesc = document.getElementById('overall_description').value.trim();
    const hasHighrise = document.getElementById('highrise_count').value.trim() || document.getElementById('highrise_floors').value.trim();

    if (!customDesc && !overallDesc && !hasHighrise) {
        showError('renderError', 'Vui lòng điền thông tin (nhấn Analyze hoặc điền thủ công)!');
        return;
    }

    isRendering = true;
    showSpinner('renderSpinner', true);
    generateButton.disabled = true;
    hideError('renderError');
    hideSuccess('renderSuccess');

    try {
        console.log('🎨 Generating planning detail render...');

        const formData = collectFormData();
        console.log('📝 Form data:', formData);

        const requestData = {
            image_base64: currentSketchImage,
            planning_data: formData
        };

        const startTime = Date.now();

        const response = await fetch(`${API_BASE_URL}/planning/detail-render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`✅ Render generated in ${elapsedTime}s`);

        // Display result
        currentRenderedImage = data.generated_image_base64;
        displayRenderedImage(currentRenderedImage);

        showSuccess('renderSuccess', `✅ Render thành công trong ${elapsedTime}s!`);

        // Show stats
        document.getElementById('statTime').textContent = `${elapsedTime}s`;
        document.getElementById('statsBox').classList.remove('hidden');

    } catch (error) {
        console.error('❌ Render failed:', error);
        showError('renderError', 'Lỗi khi render: ' + error.message);
    } finally {
        isRendering = false;
        showSpinner('renderSpinner', false);
        generateButton.disabled = false;
    }
}

// ============== DISPLAY RESULTS ==============
function displayRenderedImage(base64Image) {
    gallery.innerHTML = '';

    const img = document.createElement('img');
    img.src = base64Image;
    img.alt = 'Rendered planning';
    img.style.width = '100%';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    gallery.appendChild(img);

    // Show output controls
    document.getElementById('outputControls').classList.remove('hidden');
}

// ============== DOWNLOAD ==============
function handleDownloadImage() {
    if (!currentRenderedImage) {
        showError('renderError', 'Chưa có ảnh để tải về!');
        return;
    }

    const link = document.createElement('a');
    link.href = currentRenderedImage;
    link.download = `planning-detail-render-${Date.now()}.png`;
    link.click();

    console.log('📥 Image downloaded');
    showSuccess('renderSuccess', '✅ Đã tải ảnh về!');
}

// ============== UI HELPERS ==============
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('hidden');
    }
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideSuccess(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('hidden');
    }
}

function showSpinner(spinnerId, show) {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}
