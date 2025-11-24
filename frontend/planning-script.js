// ============================================
// S2R TOOL - Planning Mode JavaScript
// Version: 3.2
// ============================================

// ============== CONFIG ==============
const API_BASE_URL = 'http://localhost:5001/api';

// ============== STATE ==============
let currentSitePlanImage = null;
let currentLotMapImage = null;
let isPlanningRendering = false;

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
            } else {
                console.log(`📐 Image already optimal: ${width}×${height}`);
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

// ============== HELPER FUNCTIONS ==============
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

function showSuccess(id, message) {
    const successDiv = document.getElementById(id);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');

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

            if (uploaderDiv && previewImg) {
                uploaderDiv.classList.add('has-image');
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');

                const uploadText = uploaderDiv.querySelector('.planning-upload-text');
                if (uploadText) {
                    uploadText.textContent = '✅ Đã tải Site Plan';
                }
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

            if (uploaderDiv && previewImg) {
                uploaderDiv.classList.add('has-image');
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');

                const uploadText = uploaderDiv.querySelector('.planning-upload-text');
                if (uploadText) {
                    uploadText.textContent = '✅ Đã tải Lot Map';
                }
            }

            const addLotBtn = document.getElementById('addLotBtn');
            if (addLotBtn) {
                addLotBtn.disabled = false;
            }

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

    // Remove info box if it exists
    const infoBox = container.querySelector('.info-box');
    if (infoBox) {
        infoBox.remove();
    }

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

    lotCard.querySelector('.btn-remove').addEventListener('click', () => {
        lotCard.remove();
        updateLotNumbers();
        updateGenerateButton();
    });

    lotCard.querySelector('.lot-description-input').addEventListener('input', updateGenerateButton);

    container.appendChild(lotCard);

    lotCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    lotCard.querySelector('.lot-description-input').focus();

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

    if (isPlanningRendering) {
        console.warn('⚠️  Planning render already in progress');
        return;
    }

    isPlanningRendering = true;
    const generateBtn = document.getElementById('generatePlanningBtn');

    try {
        console.log('🎨 Generating planning render...');

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner"></span> Đang render...';
        hideError('planningError');
        hideSuccess('planningSuccess');

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

        displayPlanningRender(result.generated_image_base64, result.mime_type);

        showSuccess('planningSuccess', '🎉 Planning render hoàn tất!');
        console.log('✅ Planning render complete');

    } catch (error) {
        console.error('❌ Planning render failed:', error);
        showError('planningError', `Lỗi render: ${error.message}`);
    } finally {
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

    const downloadBtn = document.getElementById('downloadPlanningBtn');
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.onclick = () => downloadPlanningImage(base64Data);
    }

    const controls = document.getElementById('planningOutputControls');
    if (controls) {
        controls.classList.remove('hidden');
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

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Planning Mode initialized');

    const sitePlanInput = document.getElementById('uploadSitePlan');
    const lotMapInput = document.getElementById('uploadLotMap');
    const addLotBtn = document.getElementById('addLotBtn');
    const generateBtn = document.getElementById('generatePlanningBtn');
    const regenerateBtn = document.getElementById('regeneratePlanningBtn');

    if (sitePlanInput) {
        sitePlanInput.addEventListener('change', handleSitePlanUpload);
    }

    if (lotMapInput) {
        lotMapInput.addEventListener('change', handleLotMapUpload);
    }

    if (addLotBtn) {
        addLotBtn.addEventListener('click', addLotDescription);
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', generatePlanningRender);
    }

    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', generatePlanningRender);
    }

    console.log('✅ Planning Mode setup complete');
});

console.log('📦 Planning script v3.2 loaded successfully! 🎉');
