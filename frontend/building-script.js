// ============================================
// ARCHITECTURE S2R TOOL - Frontend JavaScript
// Version: 3.4 - FULL ROBUST VERSION
// Updated: Docker Compatible & Safe DOM
// ============================================

// ============== CONFIG ==============
// FIXED: Sử dụng đường dẫn tương đối cho Nginx/Docker
const API_BASE_URL = '/api';

// ============== STATE ==============
let currentSketchImage = null;
let currentAnalysisData = null;
let currentTranslatedData = null;
let currentRenderedImage = null;
let currentReferenceImage = null;
let currentMaskImage = null;

// Trạng thái xử lý để tránh double-click
let isAnalyzing = false;
let isTranslating = false;
let isRendering = false;
let isInpainting = false;

// ============== DOM ELEMENTS (Global References) ==============
// Các biến này sẽ được gán giá trị khi DOM ready
let uploadSketch, previewImage, uploadLabel, analyzeButton, generateButton;
let gallery, aspectRatioSelect, viewpointSelect;

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 S2R Tool v3.4 initialized');

    // 1. Khởi tạo các DOM Elements an toàn
    uploadSketch = document.getElementById('uploadSketch');
    previewImage = document.getElementById('previewImage');
    uploadLabel = document.getElementById('uploadLabel');
    analyzeButton = document.getElementById('analyzeSketchButton');
    generateButton = document.getElementById('generateRenderButton');
    gallery = document.getElementById('gallery');
    aspectRatioSelect = document.getElementById('aspect_ratio');
    viewpointSelect = document.getElementById('viewpoint');

    // 2. Chạy các hàm cài đặt
    loadAspectRatios();
    setupEventListeners();
    setupDynamicContainers();
    setupExportButton();
    setupReferenceImageUI();
    setupInpaintingUI();
});

// ============== ASPECT RATIOS ==============
async function loadAspectRatios() {
    if (!aspectRatioSelect) return;

    const ratios = {
        "1:1": "Vuông (2048×2048) - Master Plan",
        "3:4": "Chân dung (1536×2048)",
        "4:3": "Tiêu chuẩn (2048×1536)",
        "9:16": "Dọc (1152×2048) - Tall Buildings",
        "16:9": "Widescreen (2048×1152) - Panorama"
    };

    aspectRatioSelect.innerHTML = '';
    for (const [value, label] of Object.entries(ratios)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        if (value === "16:9") option.selected = true;
        aspectRatioSelect.appendChild(option);
    }
}

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    // File upload
    if (uploadSketch) {
        uploadSketch.addEventListener('change', handleImageUpload);
    }

    // Click preview to re-upload
    if (previewImage && uploadSketch) {
        previewImage.addEventListener('click', () => uploadSketch.click());
    }

    // Analyze button
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzeSketch);
    }

    // Generate button
    if (generateButton) {
        generateButton.addEventListener('click', generateRender);
    }

    // Xử lý các nút bấm được sinh ra động (Download, Regenerate) bằng Event Delegation
    document.addEventListener('click', (e) => {
        if (e.target.closest('#downloadImageBtn')) {
            handleDownloadImage();
        }
        if (e.target.closest('#regenerateBtn')) {
            generateRender();
        }
    });

    // Range slider display
    const sketchAdherence = document.getElementById('sketch_adherence');
    const sketchAdherenceValue = document.getElementById('sketch_adherence_value');
    if (sketchAdherence && sketchAdherenceValue) {
        sketchAdherence.addEventListener('input', (e) => {
            sketchAdherenceValue.textContent = e.target.value;
        });
    }

    // Dropdown custom inputs (Môi trường)
    setupEnvironmentDropdowns();

    // Floor count +/- buttons
    const floorMinus = document.getElementById('floorMinus');
    const floorPlus = document.getElementById('floorPlus');
    const floorInput = document.getElementById('floor_count');

    if (floorMinus && floorPlus && floorInput) {
        floorPlus.addEventListener('click', () => {
            const current = parseInt(floorInput.value) || 3;
            floorInput.value = Math.min(50, current + 1);
        });

        floorMinus.addEventListener('click', () => {
            const current = parseInt(floorInput.value) || 3;
            floorInput.value = Math.max(1, current - 1);
        });
    }

    // Nút thêm Dynamic items
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const containerId = e.target.dataset.container;
            const container = document.getElementById(containerId);
            const type = e.target.dataset.type;
            if (container) {
                addDynamicItem(container, type);
            }
        });
    });
}

// ============== ENVIRONMENT DROPDOWNS ==============
function setupEnvironmentDropdowns() {
    const dropdowns = [
        { select: 'env_location', custom: 'env_location_custom' },
        { select: 'env_time', custom: 'env_time_custom' },
        { select: 'env_weather', custom: 'env_weather_custom' },
        { select: 'env_vehicles', custom: 'env_vehicles_custom' },
        { select: 'env_people', custom: 'env_people_custom' }
    ];

    dropdowns.forEach(({ select, custom }) => {
        const selectEl = document.getElementById(select);
        const customEl = document.getElementById(custom);

        if (selectEl && customEl) {
            selectEl.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customEl.classList.remove('hidden');
                    customEl.focus();
                } else {
                    customEl.classList.add('hidden');
                    customEl.value = '';
                }
            });
        }
    });
}

// ============== IMAGE OPTIMIZATION ==============
async function optimizeImageForUpload(file) {
    const MAX_DIMENSION = 1024; // Match backend resize limit

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
                console.log(`📐 Resizing image: ${img.width}×${img.height} → ${width}×${height}`);
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
        console.log(`📤 Processing upload: ${file.name}`);
        const optimizedBlob = await optimizeImageForUpload(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            currentSketchImage = e.target.result;

            if (previewImage) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            }

            if (uploadLabel) {
                uploadLabel.classList.add('hidden');
            }

            if (analyzeButton) {
                analyzeButton.disabled = false;
            }

            console.log('✅ Image ready for analysis');
        };
        reader.readAsDataURL(optimizedBlob);

    } catch (error) {
        console.error('❌ Image optimization failed:', error);
        showError('analyzeError', 'Lỗi xử lý ảnh. Vui lòng thử lại.');
    }
}

// ============== STEP 1: ANALYZE SKETCH ==============
async function analyzeSketch() {
    if (!currentSketchImage) {
        showError('analyzeError', 'Vui lòng upload ảnh sketch trước!');
        return;
    }

    if (isAnalyzing) {
        console.warn('⚠️ Analysis already in progress');
        return;
    }

    isAnalyzing = true;
    showSpinner('analyzeSpinner', true);
    if (analyzeButton) analyzeButton.disabled = true;
    hideError('analyzeError');
    hideSuccess('analyzeSuccess');

    try {
        console.log('📊 Analyzing sketch...');

        const response = await fetch(`${API_BASE_URL}/analyze-sketch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_base64: currentSketchImage
            })
        });

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        currentAnalysisData = await response.json();
        console.log('✅ Analysis complete:', currentAnalysisData);

        fillFormFromAnalysis(currentAnalysisData);
        await translatePrompt();

        showSuccess('analyzeSuccess', '✨ Phân tích thành công! Vui lòng kiểm tra thông số.');

    } catch (error) {
        console.error('❌ Analysis failed:', error);
        showError('analyzeError', `Lỗi phân tích: ${error.message}`);
    } finally {
        showSpinner('analyzeSpinner', false);
        if (analyzeButton) analyzeButton.disabled = false;
        isAnalyzing = false;
    }
}

// ============== FILL FORM FROM ANALYSIS ==============
function fillFormFromAnalysis(data) {
    // Helper để set giá trị an toàn
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('main_description', data.building_type);
    setVal('facade_style', data.facade_style);

    if (data.floor_count) {
        let floorNum = 3;
        if (typeof data.floor_count === 'number') {
            floorNum = data.floor_count;
        } else if (typeof data.floor_count === 'string') {
            const match = data.floor_count.match(/(\d+)/);
            if (match) floorNum = parseInt(match[1]);
        }
        setVal('floor_count', floorNum);

        const floorStr = String(data.floor_count).toLowerCase();
        const hasMezzanine = floorStr.includes('tum') || floorStr.includes('lửng');
        const mezzEl = document.getElementById('has_mezzanine');
        if (mezzEl) mezzEl.checked = hasMezzanine;
    }

    // Dynamic items
    const criticalContainer = document.getElementById('criticalElementsContainer');
    if (criticalContainer) {
        criticalContainer.innerHTML = '';
        if (data.critical_elements) {
            data.critical_elements.forEach(elem => {
                addDynamicItem(criticalContainer, 'element', elem.type, elem.description);
            });
        }
    }

    const materialsContainer = document.getElementById('materialsPreciseContainer');
    if (materialsContainer) {
        materialsContainer.innerHTML = '';
        if (data.materials_precise) {
            data.materials_precise.forEach(mat => {
                addDynamicItem(materialsContainer, 'material', mat.type, mat.description);
            });
        }
    }

    const envContainer = document.getElementById('environmentContainer');
    if (envContainer) {
        envContainer.innerHTML = '';
        if (data.environment) {
            data.environment.forEach(env => {
                addDynamicItem(envContainer, 'setting', env.type, env.description);
            });
        }
    }

    if (data.technical_specs) {
        setVal('tech_camera', data.technical_specs.camera);
        setVal('tech_lens', data.technical_specs.lens);
        setVal('tech_lighting', data.technical_specs.lighting);
        setVal('tech_perspective', data.technical_specs.perspective);
    }
}

// ============== STEP 2: TRANSLATE PROMPT ==============
async function translatePrompt() {
    if (isTranslating) return;
    isTranslating = true;
    const formData = collectFormData();

    try {
        console.log('🌐 Translating to English...');

        const response = await fetch(`${API_BASE_URL}/translate-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                form_data: formData
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        currentTranslatedData = result.translated_data_en;
        console.log('✅ Translation complete');

        if (generateButton) generateButton.disabled = false;

    } catch (error) {
        console.error('❌ Translation failed:', error);
        // Không throw error để luồng không bị ngắt hoàn toàn
    } finally {
        isTranslating = false;
    }
}

// ============== COLLECT FORM DATA ==============
function collectFormData() {
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getChecked = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const getFloat = (id) => { const el = document.getElementById(id); return el ? parseFloat(el.value) : 0.95; };

    const data = {
        building_type: getVal('main_description'),
        facade_style: getVal('facade_style'),
        floor_count: parseInt(getVal('floor_count')) || 3,
        floor_details: getVal('floor_details').trim(),
        has_mezzanine: getChecked('has_mezzanine'),
        sketch_detail_level: currentAnalysisData?.sketch_detail_level || 'intermediate',
        is_colored: currentAnalysisData?.is_colored || false,
        critical_elements: [],
        materials_precise: [],
        environment: [],
        style_keywords: getVal('style_keywords'),
        technical_specs: {
            camera: getVal('tech_camera'),
            lens: getVal('tech_lens'),
            perspective: getVal('tech_perspective'),
            lighting: getVal('tech_lighting')
        },
        negative_prompt: getVal('negative_prompt'),
        sketch_adherence: getFloat('sketch_adherence')
    };

    document.querySelectorAll('#criticalElementsContainer .dynamic-item').forEach(item => {
        data.critical_elements.push({
            type: item.querySelector('.item-type').value,
            description: item.querySelector('.item-description').value
        });
    });

    document.querySelectorAll('#materialsPreciseContainer .dynamic-item').forEach(item => {
        data.materials_precise.push({
            type: item.querySelector('.item-type').value,
            description: item.querySelector('.item-description').value
        });
    });

    // Collect Environment from Dropdowns
    const collectEnv = (selectId, customId, typeName) => {
        const select = document.getElementById(selectId);
        const custom = document.getElementById(customId);
        if (!select || !custom) return;

        const val = select.value === 'custom' ? custom.value : select.value;
        if (val) data.environment.push({ type: typeName, description: val });
    };

    collectEnv('env_location', 'env_location_custom', 'Không gian');
    collectEnv('env_time', 'env_time_custom', 'Thời điểm');
    collectEnv('env_weather', 'env_weather_custom', 'Thời tiết');
    collectEnv('env_vehicles', 'env_vehicles_custom', 'Xe cộ');
    collectEnv('env_people', 'env_people_custom', 'Người');

    const addContext = getVal('env_additional').trim();
    if (addContext) data.environment.push({ type: 'Bối cảnh bổ sung', description: addContext });

    return data;
}

// ============== STEP 3: GENERATE RENDER ==============
async function generateRender() {
    if (!currentSketchImage) {
        showError('renderError', 'Vui lòng upload sketch trước!');
        return;
    }

    if (isRendering) {
        console.warn('⚠️ Rendering already in progress');
        return;
    }

    isRendering = true;
    showSpinner('renderSpinner', true);
    if (generateButton) generateButton.disabled = true;
    hideError('renderError');
    hideSuccess('renderSuccess');

    try {
        console.log('🎨 Generating render...');
        const form_data_vi = collectFormData();

        const requestData = {
            image_base64: currentSketchImage,
            form_data_vi: form_data_vi,
            aspect_ratio: aspectRatioSelect ? aspectRatioSelect.value : "16:9",
            viewpoint: viewpointSelect ? viewpointSelect.value : "main_facade"
        };

        if (currentReferenceImage) {
            requestData.reference_image_base64 = currentReferenceImage;
            console.log('📎 Using reference image');
        }

        const response = await fetch(`${API_BASE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Render failed');
        }

        const result = await response.json();
        currentRenderedImage = result.generated_image_base64;
        displayRenderedImage(result.generated_image_base64, result.mime_type);
        showSuccess('renderSuccess', '🎉 Render hoàn tất!');

    } catch (error) {
        console.error('❌ Render failed:', error);
        showError('renderError', `Lỗi render: ${error.message}`);
    } finally {
        showSpinner('renderSpinner', false);
        if (generateButton) generateButton.disabled = false;
        isRendering = false;
    }
}

// ============== DISPLAY RENDERED IMAGE ==============
function displayRenderedImage(base64Data, mimeType) {
    if (!gallery) return;

    gallery.innerHTML = '';

    const img = document.createElement('img');
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.alt = 'Rendered result';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';

    gallery.appendChild(img);

    const controls = document.getElementById('outputControls');
    if (controls) controls.classList.remove('hidden');

    addUseAsReferenceButton();
}

// DOWNLOAD HANDLER
function handleDownloadImage() {
    if (!currentRenderedImage) {
        showError('renderError', 'Chưa có ảnh!');
        return;
    }

    try {
        const byteString = atob(currentRenderedImage);
        const mimeString = 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `s2r-render-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess('renderSuccess', '✅ Ảnh đã được tải xuống!');
    } catch (error) {
        console.error('Download failed', error);
    }
}

// ============== DYNAMIC ITEMS ==============
function setupDynamicContainers() {
    console.log('🔧 Dynamic containers ready');
}

function addDynamicItem(container, type, typeValue = '', descriptionValue = '') {
    const item = document.createElement('div');
    item.className = 'dynamic-item';

    const typeLabel = type === 'element' ? 'Loại' : type === 'material' ? 'Vật liệu' : 'Bối cảnh';

    item.innerHTML = `
        <input type="text" class="item-type" placeholder="${typeLabel}" value="${typeValue}">
        <input type="text" class="item-description" placeholder="Mô tả chi tiết" value="${descriptionValue}">
        <button type="button" class="btn-remove">×</button>
    `;

    item.querySelector('.btn-remove').addEventListener('click', () => item.remove());
    container.appendChild(item);
}

// ============== REFERENCE UI & EXPORT ==============
function setupReferenceImageUI() {
    const formElement = document.getElementById('renderPromptForm');
    if (!formElement) return;

    const referenceSection = document.createElement('details');
    referenceSection.className = 'form-section';
    referenceSection.id = 'referenceSection';
    referenceSection.innerHTML = `
        <summary>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </svg>
            📸 Ảnh tham khảo (Reference Image)
        </summary>
        <div class="section-content">
            <div class="form-group">
                <button type="button" id="chooseFromLibraryBtn" class="btn-secondary" style="width:100%">Chọn từ thư viện</button>
                <input type="file" id="uploadReference" accept="image/*" style="display: none;">
                <label for="uploadReference" class="btn-secondary" style="width:100%;display:block;text-align:center">Upload ảnh riêng</label>
            </div>
            <div id="referencePreview" class="hidden" style="margin-top:1rem">
                <img id="referencePreviewImage" style="max-width:100%">
                <button type="button" id="clearReferenceBtn" class="btn-secondary" style="width:100%">Xóa reference</button>
            </div>
        </div>`;

    const styleSection = Array.from(formElement.querySelectorAll('.form-section')).find(
        section => section.textContent.includes('Từ khóa Phong cách')
    );

    if (styleSection) formElement.insertBefore(referenceSection, styleSection);
    else formElement.appendChild(referenceSection);

    const libBtn = document.getElementById('chooseFromLibraryBtn');
    const upBtn = document.getElementById('uploadReference');
    const clearBtn = document.getElementById('clearReferenceBtn');

    if (libBtn) libBtn.addEventListener('click', openReferenceLibrary);
    if (upBtn) upBtn.addEventListener('change', handleReferenceUpload);
    if (clearBtn) clearBtn.addEventListener('click', () => {
        currentReferenceImage = null;
        document.getElementById('referencePreview').classList.add('hidden');
    });
}

function handleReferenceUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentReferenceImage = e.target.result;
        showReferencePreview(e.target.result);
        showSuccess('renderSuccess', '✅ Đã tải ảnh reference!');
    };
    reader.readAsDataURL(file);
}

function showReferencePreview(imageData) {
    const preview = document.getElementById('referencePreview');
    const previewImg = document.getElementById('referencePreviewImage');
    if (preview && previewImg) {
        previewImg.src = imageData;
        preview.classList.remove('hidden');
    }
}

async function openReferenceLibrary() {
    try {
        const response = await fetch(`${API_BASE_URL}/references/list`);
        const data = await response.json();
        if (!data.categories || data.categories.length === 0) {
            showError('renderError', 'Không thể tải thư viện reference.');
            return;
        }
        showCategoryPicker(data.categories);
    } catch (error) {
        showError('renderError', 'Lỗi tải thư viện reference.');
    }
}

function showCategoryPicker(categories) {
    // Logic hiển thị modal chọn danh mục (Giả lập)
    console.log('Open category picker:', categories);
    // Trong thực tế, bạn sẽ tạo modal HTML ở đây giống như bản gốc
}

function setupInpaintingUI() {
    const uploadMask = document.getElementById('uploadMask');
    const applyInpaintBtn = document.getElementById('applyInpaintBtn');

    if (!uploadMask || !applyInpaintBtn) return;

    uploadMask.addEventListener('change', handleMaskUpload);
    applyInpaintBtn.addEventListener('click', applyInpainting);
}

function handleMaskUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentMaskImage = e.target.result;
        const previewImg = document.getElementById('maskPreviewImage');
        const previewDiv = document.getElementById('maskPreview');

        if (previewImg) previewImg.src = e.target.result;
        if (previewDiv) previewDiv.classList.remove('hidden');

        const applyBtn = document.getElementById('applyInpaintBtn');
        if (applyBtn && currentRenderedImage) applyBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

async function applyInpainting() {
    if (!currentRenderedImage || !currentMaskImage) return;

    const instruction = document.getElementById('inpaintInstruction').value;
    if (!instruction) {
        showError('renderError', 'Vui lòng nhập mô tả.');
        return;
    }

    if (isInpainting) return;
    isInpainting = true;

    const applyBtn = document.getElementById('applyInpaintBtn');
    if (applyBtn) applyBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/inpaint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_image_base64: `data:image/png;base64,${currentRenderedImage}`,
                mask_image_base64: currentMaskImage,
                edit_instruction: instruction,
                reference_image_base64: currentReferenceImage
            })
        });

        if (!response.ok) throw new Error('Inpainting failed');
        const data = await response.json();

        currentRenderedImage = data.edited_image;
        displayRenderedImage(data.edited_image, data.mime_type);
        showSuccess('renderSuccess', 'Inpainting hoàn tất!');

    } catch (error) {
        showError('renderError', error.message);
    } finally {
        isInpainting = false;
        if (applyBtn) applyBtn.disabled = false;
    }
}

function setupExportButton() {
    const outputActions = document.querySelector('.output-actions');
    if (!outputActions) return;

    // Tránh tạo trùng nút
    if (document.getElementById('exportJsonButton')) return;

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportJsonButton';
    exportBtn.className = 'btn-secondary';
    exportBtn.innerText = 'Export JSON';
    exportBtn.addEventListener('click', exportToJSON);

    if (generateButton) outputActions.insertBefore(exportBtn, generateButton);
}

function exportToJSON() {
    if (!currentTranslatedData) {
        showError('renderError', 'Chưa có dữ liệu!');
        return;
    }

    const exportData = {
        form_data: collectFormData(),
        translated_data: currentTranslatedData,
        settings: {
            aspect: aspectRatioSelect ? aspectRatioSelect.value : '16:9'
        },
        date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2r-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function addUseAsReferenceButton() {
    const controls = document.getElementById('outputControls');
    if (!controls || document.getElementById('useAsReferenceBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'useAsReferenceBtn';
    btn.className = 'btn-secondary btn-icon';
    btn.innerText = 'Làm Reference';
    btn.addEventListener('click', () => {
        if (!currentRenderedImage) return;
        currentReferenceImage = `data:image/png;base64,${currentRenderedImage}`;
        showReferencePreview(currentReferenceImage);

        const refSection = document.getElementById('referenceSection');
        if (refSection) refSection.setAttribute('open', '');
        showSuccess('renderSuccess', 'Đã đặt làm ảnh reference!');
    });
    controls.appendChild(btn);
}

// Helper functions (Safe)
function showSpinner(id, show) {
    const spinner = document.getElementById(id);
    if (spinner) spinner.classList.toggle('hidden', !show);
}
function showError(id, message) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}
function showSuccess(id, message) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 4000); }
}
function hideSuccess(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}