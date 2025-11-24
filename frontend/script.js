// ============================================
// ARCHITECTURE S2R TOOL - Frontend JavaScript
// Version: 3.1 - COMPLETE WITH ALL FIXES
// Updated: 2025-11-03
// ============================================

// ============== CONFIG ==============
const API_BASE_URL = 'http://localhost:5001/api';

// ============== STATE ==============
let currentSketchImage = null;
let currentAnalysisData = null;
let currentTranslatedData = null;
let currentRenderedImage = null;
let currentReferenceImage = null;
let currentMaskImage = null; // ⭐ NEW: Mask for inpainting

// ✅ FIX: Prevent double-click race conditions
let isAnalyzing = false;
let isTranslating = false;
let isRendering = false;
let isInpainting = false;

// ============== DOM ELEMENTS ==============
const uploadSketch = document.getElementById('uploadSketch');
const previewImage = document.getElementById('previewImage');
const uploadLabel = document.getElementById('uploadLabel');
const analyzeButton = document.getElementById('analyzeSketchButton');
const generateButton = document.getElementById('generateRenderButton');
const gallery = document.getElementById('gallery');
const aspectRatioSelect = document.getElementById('aspect_ratio');
const viewpointSelect = document.getElementById('viewpoint');

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 S2R Tool v3.1 initialized');
    loadAspectRatios();
    setupEventListeners();
    setupDynamicContainers();
    setupExportButton();
    setupReferenceImageUI();
    setupInpaintingUI(); // ⭐ NEW: Setup inpainting
});

// ============== ASPECT RATIOS ==============
async function loadAspectRatios() {
    const ratios = {
        "1:1": "Vuông (1024×1024)",
        "3:4": "Chân dung (768×1024)",
        "4:3": "Tiêu chuẩn (1024×768)",
        "9:16": "Dọc (576×1024)",
        "16:9": "Widescreen (1024×576)"
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
    uploadSketch.addEventListener('change', handleImageUpload);
    
    // Click preview to re-upload
    previewImage.addEventListener('click', () => uploadSketch.click());
    
    // Analyze button
    analyzeButton.addEventListener('click', analyzeSketch);
    
    // Generate button
    generateButton.addEventListener('click', generateRender);
    
    // ⭐ NEW: Download button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#downloadImageBtn')) {
            handleDownloadImage();
        }
    });
    
    // ⭐ NEW: Regenerate button
    document.addEventListener('click', (e) => {
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

    // ✅ NEW: Floor count +/- buttons
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

    // Add dynamic item buttons
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const container = document.getElementById(e.target.dataset.container);
            const type = e.target.dataset.type;
            addDynamicItem(container, type);
        });
    });
}

// ============== IMAGE OPTIMIZATION ==============
/**
 * Resize image to optimize upload size (client-side)
 * ✅ Maintains quality - uses high-quality downscaling
 * ✅ Matches backend max size (1024px) to avoid wasted bandwidth
 */
async function optimizeImageForUpload(file) {
    const MAX_DIMENSION = 1024; // Match backend resize limit

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Calculate new dimensions if image is larger than backend will use
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);

                console.log(`📐 Resizing image: ${img.width}×${img.height} → ${width}×${height}`);
            } else {
                console.log(`📐 Image already optimal: ${width}×${height}`);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            // ✅ HIGH QUALITY downscaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob (PNG lossless)
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
        console.log(`📤 Processing upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // ✅ FIX: Optimize image before upload
        const optimizedBlob = await optimizeImageForUpload(file);
        const optimizedSize = (optimizedBlob.size / 1024 / 1024).toFixed(2);
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const savings = ((1 - optimizedBlob.size / file.size) * 100).toFixed(0);

        console.log(`✅ Optimized: ${originalSize}MB → ${optimizedSize}MB (saved ${savings}%)`);

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            currentSketchImage = e.target.result;
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            uploadLabel.classList.add('hidden');
            analyzeButton.disabled = false;

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

    // ✅ FIX: Prevent double-click
    if (isAnalyzing) {
        console.warn('⚠️  Analysis already in progress, ignoring duplicate request');
        return;
    }

    isAnalyzing = true;
    showSpinner('analyzeSpinner', true);
    analyzeButton.disabled = true;
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
        
        // Check response status
        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMsg = errorData.error;
                }
            } catch (jsonError) {
                console.warn("Could not parse error JSON from backend", jsonError);
            }
            throw new Error(errorMsg);
        }
        
        currentAnalysisData = await response.json();
        console.log('✅ Analysis complete:', currentAnalysisData);
        
        // Auto-fill form với dữ liệu phân tích
        fillFormFromAnalysis(currentAnalysisData);
        
        // Tự động translate
        await translatePrompt();
        
        showSuccess('analyzeSuccess', '✨ Phân tích thành công! Vui lòng kiểm tra và chỉnh sửa thông số.'); // ⭐ FIXED: No more alert()
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        showError('analyzeError', `Lỗi phân tích: ${error.message}`);
    } finally {
        showSpinner('analyzeSpinner', false);
        analyzeButton.disabled = false;
        isAnalyzing = false;  // ✅ FIX: Reset flag
    }
}

// ============== FILL FORM FROM ANALYSIS ==============
function fillFormFromAnalysis(data) {
    // ⭐ FIXED: Main description - CHỈ building type
    document.getElementById('main_description').value = data.building_type || '';

    // ⭐ FIXED: Facade style - RIÊNG BIỆT
    if (document.getElementById('facade_style')) {
        document.getElementById('facade_style').value = data.facade_style || '';
    }

    // ✅ NEW: Floor count (extract number from string like "3 tầng" or use as-is if integer)
    if (data.floor_count) {
        let floorNum = 3; // default
        if (typeof data.floor_count === 'number') {
            floorNum = data.floor_count;
        } else if (typeof data.floor_count === 'string') {
            // Extract number from string like "3 tầng" or "3 floors"
            const match = data.floor_count.match(/(\d+)/);
            if (match) {
                floorNum = parseInt(match[1]);
            }
        }
        document.getElementById('floor_count').value = floorNum;

        // Check for mezzanine keywords
        const floorStr = String(data.floor_count).toLowerCase();
        const hasMezzanine = floorStr.includes('tum') || floorStr.includes('lửng') || floorStr.includes('mezzanine');
        document.getElementById('has_mezzanine').checked = hasMezzanine;
    }

    // Critical elements
    const criticalContainer = document.getElementById('criticalElementsContainer');
    criticalContainer.innerHTML = '';
    if (data.critical_elements) {
        data.critical_elements.forEach(elem => {
            addDynamicItem(criticalContainer, 'element', elem.type, elem.description);
        });
    }
    
    // Materials
    const materialsContainer = document.getElementById('materialsPreciseContainer');
    materialsContainer.innerHTML = '';
    if (data.materials_precise) {
        data.materials_precise.forEach(mat => {
            addDynamicItem(materialsContainer, 'material', mat.type, mat.description);
        });
    }
    
    // Environment
    const envContainer = document.getElementById('environmentContainer');
    envContainer.innerHTML = '';
    if (data.environment) {
        data.environment.forEach(env => {
            addDynamicItem(envContainer, 'setting', env.type, env.description);
        });
    }
    
    // Technical specs
    if (data.technical_specs) {
        document.getElementById('tech_camera').value = data.technical_specs.camera || '';
        document.getElementById('tech_lens').value = data.technical_specs.lens || '';
        document.getElementById('tech_lighting').value = data.technical_specs.lighting || '';
        document.getElementById('tech_perspective').value = data.technical_specs.perspective || '';
    }
}

// ============== STEP 2: TRANSLATE PROMPT ==============
async function translatePrompt() {
    // ✅ FIX: Prevent double-click
    if (isTranslating) {
        console.warn('⚠️  Translation already in progress, ignoring duplicate request');
        return;
    }

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

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        currentTranslatedData = result.translated_data_en;
        console.log('✅ Translation complete');

        // Enable generate button
        generateButton.disabled = false;

    } catch (error) {
        console.error('❌ Translation failed:', error);
        throw error;
    } finally {
        isTranslating = false;  // ✅ FIX: Reset flag
    }
}

// ============== COLLECT FORM DATA ==============
function collectFormData() {
    const data = {
        building_type: document.getElementById('main_description').value,
        facade_style: document.getElementById('facade_style').value,
        floor_count: parseInt(document.getElementById('floor_count').value) || 3,  // ✅ NEW: Integer floor count
        has_mezzanine: document.getElementById('has_mezzanine').checked,  // ✅ NEW: Mezzanine flag
        sketch_detail_level: currentAnalysisData?.sketch_detail_level || 'intermediate',
        is_colored: currentAnalysisData?.is_colored || false,
        critical_elements: [],
        materials_precise: [],
        environment: [],
        style_keywords: document.getElementById('style_keywords').value,
        technical_specs: {
            camera: document.getElementById('tech_camera').value,
            lens: document.getElementById('tech_lens').value,
            perspective: document.getElementById('tech_perspective').value,
            lighting: document.getElementById('tech_lighting').value
        },
        negative_prompt: document.getElementById('negative_prompt').value,
        sketch_adherence: parseFloat(document.getElementById('sketch_adherence').value)
    };
    
    // Collect critical elements
    document.querySelectorAll('#criticalElementsContainer .dynamic-item').forEach(item => {
        data.critical_elements.push({
            type: item.querySelector('.item-type').value,
            description: item.querySelector('.item-description').value
        });
    });
    
    // Collect materials
    document.querySelectorAll('#materialsPreciseContainer .dynamic-item').forEach(item => {
        data.materials_precise.push({
            type: item.querySelector('.item-type').value,
            description: item.querySelector('.item-description').value
        });
    });
    
    // Collect environment
    document.querySelectorAll('#environmentContainer .dynamic-item').forEach(item => {
        data.environment.push({
            type: item.querySelector('.item-type').value,
            description: item.querySelector('.item-description').value
        });
    });
    
    return data;
}

// ============== STEP 3: GENERATE RENDER ==============
async function generateRender() {
    if (!currentSketchImage) {
        showError('renderError', 'Vui lòng upload sketch trước!');
        return;
    }

    // ✅ FIX: Prevent double-click
    if (isRendering) {
        console.warn('⚠️  Rendering already in progress, ignoring duplicate request');
        return;
    }

    isRendering = true;
    showSpinner('renderSpinner', true);
    generateButton.disabled = true;
    hideError('renderError');
    hideSuccess('renderSuccess');

    try {
        console.log('🎨 Generating render...');

        // ✅ FIX: Collect FRESH form_data_vi with user edits
        const form_data_vi = collectFormData();

        console.log('📝 Sending form_data_vi with user edits:');
        console.log('   - Building type:', form_data_vi.building_type);
        console.log('   - Facade style:', form_data_vi.facade_style);
        console.log('   - Environment items:', form_data_vi.environment.length);
        console.log('   - Lighting:', form_data_vi.technical_specs.lighting);

        // ✅ FIX: Correct field names matching backend expectations
        const requestData = {
            image_base64: currentSketchImage,       // ✅ FIXED: Was "sketch_image"
            form_data_vi: form_data_vi,             // ✅ FIXED: Was "translated_data_en" (old data)
            aspect_ratio: aspectRatioSelect.value,
            viewpoint: viewpointSelect.value
        };

        // Include reference image if available
        if (currentReferenceImage) {
            requestData.reference_image_base64 = currentReferenceImage;  // ✅ FIXED: Was "reference_image"
            console.log('📎 Using reference image for style consistency');
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

        // ✅ FIX: Backend returns "generated_image_base64", not "rendered_image"
        currentRenderedImage = result.generated_image_base64;

        // Display the image
        displayRenderedImage(result.generated_image_base64, result.mime_type);

        showSuccess('renderSuccess', '🎉 Render hoàn tất! Bạn có thể tải ảnh xuống bên dưới.');
        console.log('✅ Render complete');

    } catch (error) {
        console.error('❌ Render failed:', error);
        showError('renderError', `Lỗi render: ${error.message}`);
    } finally {
        showSpinner('renderSpinner', false);
        generateButton.disabled = false;
        isRendering = false;  // ✅ FIX: Reset flag
    }
}

// ============== DISPLAY RENDERED IMAGE ==============
function displayRenderedImage(base64Data, mimeType) {
    gallery.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.alt = 'Rendered result';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    gallery.appendChild(img);
    
    // Show output controls
    document.getElementById('outputControls').classList.remove('hidden');
    
    // Add "Use as Reference" button if not exists
    addUseAsReferenceButton();
}

// ⭐ NEW: DOWNLOAD IMAGE HANDLER
function handleDownloadImage() {
    if (!currentRenderedImage) {
        showError('renderError', 'Chưa có ảnh để tải về!');
        return;
    }
    
    try {
        // Convert base64 to blob
        const byteString = atob(currentRenderedImage);
        const mimeString = 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `s2r-render-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('renderSuccess', '✅ Ảnh đã được tải xuống!');
        console.log('✅ Image downloaded');
        
    } catch (error) {
        console.error('❌ Download failed:', error);
        showError('renderError', 'Lỗi khi tải ảnh. Vui lòng thử lại.');
    }
}

// ============== DYNAMIC ITEMS (FORM) ==============
function setupDynamicContainers() {
    // Initialize empty containers
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
    
    // Remove button handler
    item.querySelector('.btn-remove').addEventListener('click', () => {
        item.remove();
    });
    
    container.appendChild(item);
}

// ============== REFERENCE IMAGE FEATURE ==============
function setupReferenceImageUI() {
    console.log('🔧 Setting up Reference Image UI...');

    const formElement = document.getElementById('renderPromptForm');
    if (!formElement) {
        console.error('❌ Form element not found!');
        return;
    }

    // Create reference section
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
            <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 1rem;">
                Sử dụng ảnh tham khảo để giữ style/màu sắc nhất quán khi render góc khác hoặc phiên bản mới.
            </p>

            <div class="form-group">
                <button type="button" id="chooseFromLibraryBtn" class="btn-secondary" style="width: 100%; margin-bottom: 0.5rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M20.4 14.5L16 10 4 20"/>
                    </svg>
                    Chọn từ thư viện
                </button>

                <input type="file" id="uploadReference" accept="image/*" style="display: none;">
                <label for="uploadReference" class="btn-secondary" style="width: 100%; display: inline-block; text-align: center; cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload ảnh riêng
                </label>
            </div>

            <div id="referencePreview" class="hidden" style="margin-top: 1rem;">
                <img id="referencePreviewImage" src="" alt="Reference preview" style="max-width: 100%; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" id="clearReferenceBtn" class="btn-secondary" style="width: 100%; margin-top: 0.5rem;">
                    Xóa reference
                </button>
            </div>
        </div>
    `;

    // ✅ FIX: Insert into form, not panel
    // Find style keywords section to insert before it
    const styleSection = Array.from(formElement.querySelectorAll('.form-section')).find(
        section => section.textContent.includes('Từ khóa Phong cách')
    );

    if (styleSection) {
        console.log('✅ Found style section, inserting reference section before it');
        formElement.insertBefore(referenceSection, styleSection);
    } else {
        console.log('⚠️  Style section not found, appending to end of form');
        formElement.appendChild(referenceSection);
    }

    console.log('✅ Reference section inserted into DOM');

    // Event listeners
    document.getElementById('chooseFromLibraryBtn').addEventListener('click', openReferenceLibrary);
    document.getElementById('uploadReference').addEventListener('change', handleReferenceUpload);

    const clearBtn = document.getElementById('clearReferenceBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentReferenceImage = null;
            document.getElementById('referencePreview').classList.add('hidden');
            console.log('🗑️ Reference cleared');
        });
    }

    console.log('✅ Reference Image UI setup complete!');
}

function handleReferenceUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentReferenceImage = e.target.result;
        showReferencePreview(e.target.result);
        
        console.log('✅ Reference uploaded');
        showSuccess('renderSuccess', '✅ Đã tải ảnh reference! Render tiếp sẽ giữ style từ ảnh này.'); // ⭐ FIXED: No more alert()
    };
    reader.readAsDataURL(file);
}

function showReferencePreview(imageData) {
    const preview = document.getElementById('referencePreview');
    const previewImg = document.getElementById('referencePreviewImage');
    
    previewImg.src = imageData;
    preview.classList.remove('hidden');
}

async function openReferenceLibrary() {
    try {
        // ✅ FIX: Backend /references/list without params returns categories
        const response = await fetch(`${API_BASE_URL}/references/list`);
        const data = await response.json();
        
        if (!data.categories || data.categories.length === 0) {
            showError('renderError', 'Không thể tải thư viện reference. Vui lòng kiểm tra backend.'); // ⭐ FIXED: No more alert()
            return;
        }
        
        showCategoryPicker(data.categories);
    } catch (error) {
        console.error('❌ Failed to load reference library:', error);
        showError('renderError', 'Không thể tải thư viện reference. Vui lòng kiểm tra backend.'); // ⭐ FIXED: No more alert()
    }
}

function showCategoryPicker(categories) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Chọn danh mục</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="category-grid">
                    ${categories.map(cat => `
                        <button class="category-card" data-category="${cat}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M20.4 14.5L16 10 4 20"/>
                            </svg>
                            <span>${cat}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    modal.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', async () => {
            const category = card.dataset.category;
            modal.remove();
            
            // Fetch images in this category
            const response = await fetch(`${API_BASE_URL}/references/list?category=${category}`);
            const data = await response.json();
            showReferencePicker(data.images);
        });
    });
}

function showReferencePicker(images) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Chọn Ảnh Reference</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="reference-grid">
                    ${images.map(img => `
                        <div class="reference-card" data-image-id="${img.id}">
                            <img src="${img.thumbnail_url || '/api/references/serve/' + img.id}" alt="${img.name}">
                            <div class="reference-card-title">${img.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    modal.querySelectorAll('.reference-card').forEach(card => {
        card.addEventListener('click', async () => {
            const imageId = card.dataset.imageId;
            await selectReferenceFromLibrary(imageId);
            modal.remove();
        });
    });
}

async function selectReferenceFromLibrary(imageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/references/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_id: imageId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to download reference');
        }
        
        const data = await response.json();
        currentReferenceImage = `data:${data.mime_type};base64,${data.base64}`;
        showReferencePreview(currentReferenceImage);
        
        console.log('✅ Reference selected from library:', imageId);
        showSuccess('renderSuccess', '✅ Đã chọn reference từ thư viện!'); // ⭐ FIXED: No more alert()
        
    } catch (error) {
        console.error('❌ Reference download failed:', error);
        showError('renderError', 'Không thể tải ảnh reference. Vui lòng thử lại.');
    }
}

// ⭐ Add "Use as Reference" button to output controls
function addUseAsReferenceButton() {
    const controls = document.getElementById('outputControls');
    
    // Check if button already exists
    if (document.getElementById('useAsReferenceBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'useAsReferenceBtn';
    btn.className = 'btn-secondary btn-icon';
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
        Làm Reference
    `;
    
    btn.addEventListener('click', () => {
        if (!currentRenderedImage) {
            showError('renderError', 'Chưa có ảnh render!');
            return;
        }
        
        currentReferenceImage = `data:image/png;base64,${currentRenderedImage}`;
        showReferencePreview(currentReferenceImage);
        
        // Open reference section
        const refSection = document.getElementById('referenceSection');
        if (refSection) {
            refSection.setAttribute('open', '');
        }
        
        showSuccess('renderSuccess', '✅ Đã lưu ảnh này làm reference! Render tiếp sẽ giữ style từ ảnh này.');
        console.log('📎 Current render saved as reference');
    });
    
    controls.appendChild(btn);
}

// ============== INPAINTING FEATURE ==============
function setupInpaintingUI() {
    const uploadMask = document.getElementById('uploadMask');
    const applyInpaintBtn = document.getElementById('applyInpaintBtn');
    
    if (!uploadMask || !applyInpaintBtn) return;
    
    // Upload mask handler
    uploadMask.addEventListener('change', handleMaskUpload);
    
    // Apply inpaint handler
    applyInpaintBtn.addEventListener('click', applyInpainting);
}

function handleMaskUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentMaskImage = e.target.result;
        
        // Show preview
        const previewImg = document.getElementById('maskPreviewImage');
        const previewDiv = document.getElementById('maskPreview');
        previewImg.src = e.target.result;
        previewDiv.classList.remove('hidden');
        
        // Enable apply button if we have both mask and rendered image
        const applyBtn = document.getElementById('applyInpaintBtn');
        if (currentRenderedImage) {
            applyBtn.disabled = false;
        }
        
        console.log('✅ Mask image uploaded');
    };
    reader.readAsDataURL(file);
}

async function applyInpainting() {
    if (!currentRenderedImage) {
        showError('renderError', 'Chưa có ảnh render gốc!');
        return;
    }

    if (!currentMaskImage) {
        showError('renderError', 'Chưa upload mask image!');
        return;
    }

    const instruction = document.getElementById('inpaintInstruction').value.trim();
    if (!instruction) {
        showError('renderError', 'Vui lòng mô tả thay đổi cần thực hiện!');
        return;
    }

    // ✅ FIX: Prevent double-click
    if (isInpainting) {
        console.warn('⚠️  Inpainting already in progress, ignoring duplicate request');
        return;
    }

    isInpainting = true;

    try {
        console.log('🎨 Starting inpainting...');

        // Show loading
        const applyBtn = document.getElementById('applyInpaintBtn');
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="spinner"></span> Đang xử lý...';

        hideError('renderError');
        hideSuccess('renderSuccess');
        
        const response = await fetch(`${API_BASE_URL}/inpaint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_image_base64: `data:image/png;base64,${currentRenderedImage}`,  // ← Đổi tên
                mask_image_base64: currentMaskImage,                                     // ← Đổi tên
                edit_instruction: instruction,
                reference_image_base64: currentReferenceImage                            // ← Đổi tên
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Inpainting failed');
        }
        
        const data = await response.json();
        
        // Display result (replace current render)
        currentRenderedImage = data.edited_image;
        displayRenderedImage(data.edited_image, data.mime_type);
        
        showSuccess('renderSuccess', '✨ Inpainting hoàn tất! Ảnh đã được chỉnh sửa.');
        console.log('✅ Inpainting complete');
        
        // Reset inpaint form
        document.getElementById('inpaintInstruction').value = '';
        
    } catch (error) {
        console.error('❌ Inpainting failed:', error);
        showError('renderError', `Lỗi inpainting: ${error.message}`);
    } finally {
        // Restore button
        const applyBtn = document.getElementById('applyInpaintBtn');
        applyBtn.disabled = !currentMaskImage;
        applyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Áp dụng Inpainting
        `;
        isInpainting = false;  // ✅ FIX: Reset flag
    }
}

// ============== EXPORT JSON ==============
function setupExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportJsonButton';
    exportBtn.className = 'btn-secondary';
    exportBtn.innerHTML = `
        <span id="exportSpinner" class="spinner hidden"></span>
        Export JSON
    `;
    exportBtn.addEventListener('click', exportToJSON);
    
    // Insert before generate button
    const outputActions = document.querySelector('.output-actions');
    outputActions.insertBefore(exportBtn, generateButton);
}

function exportToJSON() {
    if (!currentTranslatedData) {
        showError('renderError', 'Chưa có dữ liệu để export! Vui lòng phân tích sketch trước.');
        return;
    }
    
    const exportData = {
        sketch_info: {
            uploaded: currentSketchImage ? true : false,
            analysis: currentAnalysisData
        },
        form_data_vi: collectFormData(),
        translated_data_en: currentTranslatedData,
        reference_image: currentReferenceImage ? 'included' : 'none',
        settings: {
            aspect_ratio: aspectRatioSelect.value,
            viewpoint: viewpointSelect.value,
            sketch_adherence: parseFloat(document.getElementById('sketch_adherence').value)
        },
        export_date: new Date().toISOString()
    };
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2r-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ JSON exported');
}

// ============== HELPER FUNCTIONS ==============
function showSpinner(id, show) {
    const spinner = document.getElementById(id);
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
    }
}

function showError(id, message) {
    const errorDiv = document.getElementById(id);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError(id) {
    const errorDiv = document.getElementById(id);
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// ⭐ NEW: Success message functions
function showSuccess(id, message) {
    const successDiv = document.getElementById(id);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        
        // Auto-hide sau 4 giây
        setTimeout(() => {
            successDiv.classList.add('hidden');
        }, 4000);
    }
}

function hideSuccess(id) {
    const successDiv = document.getElementById(id);
    if (successDiv) {
        successDiv.classList.add('hidden');
    }
}

// ============== PLANNING MODE ==============

// Planning Mode State
let currentSitePlanImage = null;
let currentLotMapImage = null;
let lotDescriptions = [];
let isPlanningRendering = false;

function setupPlanningMode() {
    console.log('🔧 Setting up Planning Mode...');

    // Mode selector buttons
    const buildingBtn = document.getElementById('modeBuildingBtn');
    const planningBtn = document.getElementById('modePlanningBtn');

    if (!buildingBtn || !planningBtn) {
        console.warn('⚠️  Mode selector buttons not found');
        return;
    }

    // Mode switching
    buildingBtn.addEventListener('click', () => switchToMode('building'));
    planningBtn.addEventListener('click', () => switchToMode('planning'));

    // Planning mode uploads
    const sitePlanInput = document.getElementById('uploadSitePlan');
    const lotMapInput = document.getElementById('uploadLotMap');

    if (sitePlanInput) {
        sitePlanInput.addEventListener('change', handleSitePlanUpload);
    }

    if (lotMapInput) {
        lotMapInput.addEventListener('change', handleLotMapUpload);
    }

    // Add lot button
    const addLotBtn = document.getElementById('addLotBtn');
    if (addLotBtn) {
        addLotBtn.addEventListener('click', addLotDescription);
    }

    // Generate planning render button
    const generatePlanningBtn = document.getElementById('generatePlanningBtn');
    if (generatePlanningBtn) {
        generatePlanningBtn.addEventListener('click', generatePlanningRender);
    }

    console.log('✅ Planning Mode setup complete');
}

function switchToMode(mode) {
    console.log(`🔄 Switching to ${mode} mode`);

    const buildingBtn = document.getElementById('modeBuildingBtn');
    const planningBtn = document.getElementById('modePlanningBtn');
    const buildingContainer = document.getElementById('buildingModeContainer');
    const planningContainer = document.getElementById('planningModeContainer');

    if (mode === 'building') {
        // Update button states
        buildingBtn.classList.add('mode-card-active');
        planningBtn.classList.remove('mode-card-active');

        // Show/hide containers
        buildingContainer.style.display = 'block';
        planningContainer.style.display = 'none';
    } else {
        // Update button states
        buildingBtn.classList.remove('mode-card-active');
        planningBtn.classList.add('mode-card-active');

        // Show/hide containers
        buildingContainer.style.display = 'none';
        planningContainer.style.display = 'block';
    }
}

async function handleSitePlanUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        console.log('📤 Processing site plan upload...');

        // Optimize image
        const optimizedBlob = await optimizeImageForUpload(file);

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            currentSitePlanImage = e.target.result;

            // Update UI
            const uploaderDiv = document.querySelector('#sitePlanUploader');
            const previewImg = document.getElementById('sitePlanPreview');

            if (uploaderDiv && previewImg) {
                uploaderDiv.classList.add('has-image');
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');

                // Update text
                const uploadText = uploaderDiv.querySelector('.planning-upload-text');
                if (uploadText) {
                    uploadText.textContent = '✅ Đã tải Site Plan';
                }
            }

            console.log('✅ Site plan uploaded');
        };
        reader.readAsDataURL(optimizedBlob);

    } catch (error) {
        console.error('❌ Site plan upload failed:', error);
        showError('planningError', 'Lỗi tải site plan. Vui lòng thử lại.');
    }
}

async function handleLotMapUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        console.log('📤 Processing lot map upload...');

        // Optimize image
        const optimizedBlob = await optimizeImageForUpload(file);

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            currentLotMapImage = e.target.result;

            // Update UI
            const uploaderDiv = document.querySelector('#lotMapUploader');
            const previewImg = document.getElementById('lotMapPreview');

            if (uploaderDiv && previewImg) {
                uploaderDiv.classList.add('has-image');
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');

                // Update text
                const uploadText = uploaderDiv.querySelector('.planning-upload-text');
                if (uploadText) {
                    uploadText.textContent = '✅ Đã tải Lot Map';
                }
            }

            // Enable add lot button
            const addLotBtn = document.getElementById('addLotBtn');
            if (addLotBtn) {
                addLotBtn.disabled = false;
            }

            console.log('✅ Lot map uploaded');
        };
        reader.readAsDataURL(optimizedBlob);

    } catch (error) {
        console.error('❌ Lot map upload failed:', error);
        showError('planningError', 'Lỗi tải lot map. Vui lòng thử lại.');
    }
}

function addLotDescription() {
    const container = document.getElementById('lotCardsContainer');
    if (!container) return;

    const lotNumber = container.children.length + 1;

    const lotCard = document.createElement('div');
    lotCard.className = 'lot-card';
    lotCard.dataset.lotIndex = lotNumber - 1;

    lotCard.innerHTML = `
        <div class="lot-card-header">
            <label style="display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <strong>Lô số:</strong>
                <input type="text"
                       class="lot-number-input"
                       value="${lotNumber}"
                       placeholder="Lô ${lotNumber}">
            </label>
            <button type="button" class="btn-remove" style="margin: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <textarea
            class="lot-description-input"
            placeholder="Mô tả lô này: công trình, số tầng, vật liệu, màu sắc, đặc điểm..."
        ></textarea>
    `;

    // Remove button handler
    lotCard.querySelector('.btn-remove').addEventListener('click', () => {
        lotCard.remove();
        updateLotNumbers();
        updateGenerateButton();
    });

    // Update generate button when description changes
    lotCard.querySelector('.lot-description-input').addEventListener('input', updateGenerateButton);

    container.appendChild(lotCard);

    // Scroll to new card
    lotCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Focus on description field
    lotCard.querySelector('.lot-description-input').focus();

    // Update generate button state
    updateGenerateButton();

    console.log(`✅ Added lot description card #${lotNumber}`);
}

function updateLotNumbers() {
    const container = document.getElementById('lotCardsContainer');
    if (!container) return;

    const cards = container.querySelectorAll('.lot-card');
    cards.forEach((card, index) => {
        card.dataset.lotIndex = index;
        const input = card.querySelector('.lot-number-input');
        if (input && !input.value.trim()) {
            input.value = index + 1;
        }
    });
}

function updateGenerateButton() {
    const generateBtn = document.getElementById('generatePlanningBtn');
    if (!generateBtn) return;

    // Check if we have all required data
    const hasSitePlan = currentSitePlanImage !== null;
    const hasLotMap = currentLotMapImage !== null;

    const container = document.getElementById('lotCardsContainer');
    const hasLots = container && container.children.length > 0;

    // Check if at least one lot has description
    let hasDescriptions = false;
    if (container) {
        const descriptions = Array.from(container.querySelectorAll('.lot-description-input'));
        hasDescriptions = descriptions.some(input => input.value.trim() !== '');
    }

    generateBtn.disabled = !(hasSitePlan && hasLotMap && hasLots && hasDescriptions);
}

function collectLotDescriptions() {
    const container = document.getElementById('lotCardsContainer');
    if (!container) return [];

    const lots = [];
    const cards = container.querySelectorAll('.lot-card');

    cards.forEach((card) => {
        const numberInput = card.querySelector('.lot-number-input');
        const descriptionInput = card.querySelector('.lot-description-input');

        const lotNumber = numberInput ? numberInput.value.trim() : '';
        const description = descriptionInput ? descriptionInput.value.trim() : '';

        if (lotNumber && description) {
            lots.push({
                lot_number: lotNumber,
                description: description
            });
        }
    });

    return lots;
}

async function generatePlanningRender() {
    if (!currentSitePlanImage || !currentLotMapImage) {
        showError('planningError', 'Vui lòng upload Site Plan và Lot Map!');
        return;
    }

    const lots = collectLotDescriptions();
    if (lots.length === 0) {
        showError('planningError', 'Vui lòng thêm ít nhất một mô tả lô!');
        return;
    }

    // Prevent double-click
    if (isPlanningRendering) {
        console.warn('⚠️  Planning render already in progress');
        return;
    }

    isPlanningRendering = true;
    const generateBtn = document.getElementById('generatePlanningBtn');

    try {
        console.log('🎨 Generating planning render...');

        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner"></span> Đang render...';
        hideError('planningError');
        hideSuccess('planningSuccess');

        // Collect settings
        const cameraAngle = document.getElementById('planningCameraAngle').value;
        const timeOfDay = document.getElementById('planningTimeOfDay').value;
        const aspectRatio = document.getElementById('planningAspectRatio').value;
        const styleKeywords = document.getElementById('planningStyleKeywords').value;

        const requestData = {
            site_plan_base64: currentSitePlanImage,
            lot_map_base64: currentLotMapImage,
            lot_descriptions: lots,
            camera_angle: cameraAngle,
            time_of_day: timeOfDay,
            aspect_ratio: aspectRatio,
            style_keywords: styleKeywords
        };

        console.log('📝 Planning request:', {
            lots: lots.length,
            camera_angle: cameraAngle,
            time_of_day: timeOfDay
        });

        const response = await fetch(`${API_BASE_URL}/planning/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Planning render failed');
        }

        const result = await response.json();

        // Display result
        displayPlanningRender(result.generated_image_base64, result.mime_type);

        showSuccess('planningSuccess', '🎉 Planning render hoàn tất!');
        console.log('✅ Planning render complete');

    } catch (error) {
        console.error('❌ Planning render failed:', error);
        showError('planningError', `Lỗi render: ${error.message}`);
    } finally {
        // Restore button
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            Generate Planning Render
        `;
        isPlanningRendering = false;
    }
}

function displayPlanningRender(base64Data, mimeType) {
    const gallery = document.getElementById('planningGallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    const img = document.createElement('img');
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.alt = 'Planning render result';

    gallery.appendChild(img);

    // Show download button
    const downloadBtn = document.getElementById('downloadPlanningBtn');
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.onclick = () => downloadPlanningImage(base64Data);
    }

    console.log('✅ Planning render displayed');
}

function downloadPlanningImage(base64Data) {
    try {
        const byteString = atob(base64Data);
        const mimeString = 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `planning-render-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess('planningSuccess', '✅ Ảnh đã được tải xuống!');
        console.log('✅ Planning image downloaded');

    } catch (error) {
        console.error('❌ Download failed:', error);
        showError('planningError', 'Lỗi khi tải ảnh. Vui lòng thử lại.');
    }
}

// Initialize Planning Mode on page load
document.addEventListener('DOMContentLoaded', () => {
    setupPlanningMode();
});

// ============== END ==============
console.log('📦 Script v3.2 loaded successfully - Planning Mode added! 🎉');