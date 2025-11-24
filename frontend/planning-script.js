// ============================================
// S2R TOOL - Planning Mode JavaScript
// Version: 3.4 - FULL ROBUST VERSION
// Updated: Docker Compatible & Safe DOM
// ============================================

// ============== CONFIG ==============
const API_BASE_URL = '/api';

// ============== STATE ==============
let currentSitePlanImage = null;
let currentLotMapImage = null;
let isPlanningRendering = false;

// ============== DOM ELEMENTS (Global Variables) ==============
// Sẽ được gán trong DOMContentLoaded
let sitePlanInput, lotMapInput, addLotBtn, generateBtn, regenerateBtn, gallery, outputControls;

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Planning Mode initialized');

    // 1. Initialize Elements
    sitePlanInput = document.getElementById('uploadSitePlan');
    lotMapInput = document.getElementById('uploadLotMap');
    addLotBtn = document.getElementById('addLotBtn');
    generateBtn = document.getElementById('generatePlanningBtn');
    regenerateBtn = document.getElementById('regeneratePlanningBtn');
    gallery = document.getElementById('planningGallery');
    outputControls = document.getElementById('planningOutputControls');

    // 2. Setup Listeners
    if (sitePlanInput) sitePlanInput.addEventListener('change', handleSitePlanUpload);
    if (lotMapInput) lotMapInput.addEventListener('change', handleLotMapUpload);
    if (addLotBtn) addLotBtn.addEventListener('click', addLotDescription);
    if (generateBtn) generateBtn.addEventListener('click', generatePlanningRender);
    if (regenerateBtn) regenerateBtn.addEventListener('click', generatePlanningRender);

    // 3. Setup Download Listener (Delegation)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#downloadPlanningBtn')) {
            // Lấy base64 từ ảnh đang hiển thị
            const img = gallery ? gallery.querySelector('img') : null;
            if (img && img.src.startsWith('data:')) {
                const base64 = img.src.split(',')[1];
                downloadPlanningImage(base64);
            }
        }
    });

    console.log('✅ Planning Mode setup complete');
});

// ============== IMAGE OPTIMIZATION ==============
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

// ============== PLANNING MODE HANDLERS ==============

async function handleSitePlanUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        console.log('📤 Processing site plan upload...');
        const optimizedBlob = await optimizeImageForUpload(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            currentSitePlanImage = e.target.result;

            const uploaderDiv = document.querySelector('#sitePlanUploader');
            const previewImg = document.getElementById('sitePlanPreview');

            if (uploaderDiv) uploaderDiv.classList.add('has-image');
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
            }

            updateGenerateButton();
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
        const optimizedBlob = await optimizeImageForUpload(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            currentLotMapImage = e.target.result;

            const uploaderDiv = document.querySelector('#lotMapUploader');
            const previewImg = document.getElementById('lotMapPreview');

            if (uploaderDiv) uploaderDiv.classList.add('has-image');
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
            }

            if (addLotBtn) addLotBtn.disabled = false;

            updateGenerateButton();
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

    // Xóa thông báo "chưa có lô" nếu có
    const infoBox = container.querySelector('.info-box');
    if (infoBox) infoBox.remove();

    const lotNumber = container.children.length + 1;

    const lotCard = document.createElement('div');
    lotCard.className = 'lot-card';
    lotCard.dataset.lotIndex = lotNumber - 1;

    lotCard.innerHTML = `
        <div class="lot-card-header">
            <label style="display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <strong>Lô số:</strong>
                <input type="text" class="lot-number-input" value="${lotNumber}" placeholder="Lô ${lotNumber}">
            </label>
            <button type="button" class="btn-remove" style="margin: 0;">×</button>
        </div>
        <textarea class="lot-description-input" placeholder="Mô tả lô này: công trình, số tầng, vật liệu..."></textarea>
    `;

    lotCard.querySelector('.btn-remove').addEventListener('click', () => {
        lotCard.remove();
        updateLotNumbers();
        updateGenerateButton();
    });

    lotCard.querySelector('.lot-description-input').addEventListener('input', updateGenerateButton);

    container.appendChild(lotCard);
    lotCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    updateGenerateButton();
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
    if (!generateBtn) return;

    const hasSitePlan = currentSitePlanImage !== null;
    const hasLotMap = currentLotMapImage !== null;

    const container = document.getElementById('lotCardsContainer');
    const hasLots = container && container.querySelectorAll('.lot-card').length > 0;

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
            lots.push({ lot_number: lotNumber, description: description });
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

    if (isPlanningRendering) return;

    isPlanningRendering = true;
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner"></span> Đang render...';
    }
    hideError('planningError');
    hideSuccess('planningSuccess');

    try {
        console.log('🎨 Generating planning render...');

        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

        const requestData = {
            site_plan_base64: currentSitePlanImage,
            lot_map_base64: currentLotMapImage,
            lot_descriptions: lots,
            camera_angle: getVal('planningCameraAngle'),
            time_of_day: getVal('planningTimeOfDay'),
            aspect_ratio: getVal('planningAspectRatio'),
            style_keywords: getVal('planningStyleKeywords')
        };

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
        displayPlanningRender(result.generated_image_base64, result.mime_type);
        showSuccess('planningSuccess', '🎉 Planning render hoàn tất!');

    } catch (error) {
        console.error('❌ Planning render failed:', error);
        showError('planningError', `Lỗi render: ${error.message}`);
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `Generate Planning Render`;
        }
        isPlanningRendering = false;
    }
}

function displayPlanningRender(base64Data, mimeType) {
    if (!gallery) return;

    gallery.innerHTML = '';
    const img = document.createElement('img');
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.alt = 'Planning render result';
    img.style.width = '100%';
    img.style.borderRadius = '12px';
    gallery.appendChild(img);

    // Hiển thị nút download và controls
    if (outputControls) outputControls.classList.remove('hidden');
    const dlBtn = document.getElementById('downloadPlanningBtn');
    if (dlBtn) dlBtn.classList.remove('hidden');
}

function downloadPlanningImage(base64Data) {
    try {
        const byteString = atob(base64Data);
        const mimeString = 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

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

    } catch (error) {
        console.error('❌ Download failed:', error);
        showError('planningError', 'Lỗi khi tải ảnh.');
    }
}

// UI Helpers
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