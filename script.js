// ===================
// CONFIGURATION
// ===================
const CONFIG = {
    logoCanvas: { width: 350, height: 200, padding: 15 },
    speakerCanvas: { size: 591, thumbSize: 300 },
    zoomBuffer: 1.1, // 10% zoom on initial speaker images
    zoomStep: 1.07, // Zoom increment (7% per click)
    alignment: {
        landscape: "top-center", // Options: top-center, center, bottom-center
        portrait: "center" // Options: top-center, center, bottom-center
    },
    editBorder: {
        normal: "4px solid green",
        warning: "4px solid red"
    }
};

// ===================
// ELEMENTS
// ===================

// Tabs
const logoTab = document.getElementById('logo-tab');
const speakerTab = document.getElementById('speaker-tab');
const logoArea = document.getElementById('logo-area');
const speakerArea = document.getElementById('speaker-area');

// Common
const toast = document.getElementById('toast');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Logo Area
const uploadLogo = document.getElementById('upload-logo');
const dropAreaLogo = document.getElementById('drop-area-logo');
const galleryLogo = document.getElementById('gallery-logo');
const downloadButtonLogo = document.getElementById('downloadLink-logo');
const restartButtonLogo = document.getElementById('restart-logo');
const spinnerLogo = document.getElementById('spinner-logo');

let logoFiles = [];

// Speaker Area
const uploadSpeaker = document.getElementById('upload-speaker');
const dropAreaSpeaker = document.getElementById('drop-area-speaker');
const gallerySpeaker = document.getElementById('gallery-speaker');
const downloadButtonSpeaker = document.getElementById('downloadLink-speaker');
const restartButtonSpeaker = document.getElementById('restart-speaker');
const spinnerSpeaker = document.getElementById('spinner-speaker');

let speakerFiles = [];
let speakerEditData = [];
let speakerThumbnails = [];
let currentEditIndex = null;
let imgToEdit = null;
let originalEditData = null;

// Modal Edit
const editModal = document.getElementById('edit-modal');
const editCanvas = document.getElementById('edit-canvas');
const editCtx = editCanvas.getContext('2d');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const doneEditingButton = document.getElementById('done-editing');
const cancelEditingButton = document.getElementById('cancel-editing');

let dragging = false;
let dragStartX = 0;
let dragStartY = 0;

// ===================
// NAVIGATION
// ===================

logoTab.addEventListener('click', () => {
    logoTab.classList.add('active');
    speakerTab.classList.remove('active');
    logoArea.style.display = 'block';
    speakerArea.style.display = 'none';
});

speakerTab.addEventListener('click', () => {
    speakerTab.classList.add('active');
    logoTab.classList.remove('active');
    speakerArea.style.display = 'block';
    logoArea.style.display = 'none';
});

// ===================
// HELPERS
// ===================

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getFilename(name, suffix) {
    const base = name.substring(0, name.lastIndexOf('.')) || name;
    return `${base}${suffix}.png`;
}

function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

function triggerZipDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function calculateAlignment(imgWidth, imgHeight, scale, canvasSize, type) {
    let offsetX = 0, offsetY = 0;
    const mode = CONFIG.alignment[type];

    if (mode === "top-center") {
        offsetX = (canvasSize - imgWidth * scale) / 2;
        offsetY = 0;
    } else if (mode === "center") {
        offsetX = (canvasSize - imgWidth * scale) / 2;
        offsetY = (canvasSize - imgHeight * scale) / 2;
    } else if (mode === "bottom-center") {
        offsetX = (canvasSize - imgWidth * scale) / 2;
        offsetY = canvasSize - imgHeight * scale;
    }
    return { offsetX, offsetY };
}

// ===================
// LOGO HANDLING
// ===================

dropAreaLogo.addEventListener('click', () => uploadLogo.click());
dropAreaLogo.addEventListener('dragover', e => e.preventDefault());
dropAreaLogo.addEventListener('drop', e => {
    e.preventDefault();
    handleLogoFiles(e.dataTransfer.files);
});
uploadLogo.addEventListener('change', e => handleLogoFiles(e.target.files));

function handleLogoFiles(files) {
    logoFiles = [];
    galleryLogo.innerHTML = '';
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            logoFiles.push(file);
            displayLogoThumbnail(file);
        }
    }
}

function displayLogoThumbnail(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        thumb.innerHTML = `
            <img src="${e.target.result}">
            <input type="checkbox" checked>
        `;
        galleryLogo.appendChild(thumb);
    };
    reader.readAsDataURL(file);
}

function processLogo(img) {
    canvas.width = CONFIG.logoCanvas.width;
    canvas.height = CONFIG.logoCanvas.height;
    const padding = CONFIG.logoCanvas.padding;
    const maxWidth = canvas.width - padding * 2;
    const maxHeight = canvas.height - padding * 2;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let width = img.width;
    let height = img.height;
    const aspect = width / height;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspect;
    }
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
    }

    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    ctx.drawImage(img, x, y, width, height);

    return canvas.toDataURL('image/png');
}

downloadButtonLogo.addEventListener('click', async () => {
    const selected = logoFiles.map((_, i) => i).filter(i => galleryLogo.querySelectorAll('input')[i].checked);
    if (selected.length === 0) return alert("Please select at least one logo.");

    spinnerLogo.classList.remove('hidden');
    try {
        const zip = new JSZip();
        for (let idx of selected) {
            const file = logoFiles[idx];
            const img = await loadImage(file);
            const processed = processLogo(img);
            zip.file(getFilename(file.name, '_350x200'), processed.split(',')[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        triggerZipDownload(blob, 'processed-logos.zip');
    } finally {
        spinnerLogo.classList.add('hidden');
        showToast();
    }
});

restartButtonLogo.addEventListener('click', () => {
    logoFiles = [];
    galleryLogo.innerHTML = '';
});

// ===================
// SPEAKER HANDLING
// ===================

dropAreaSpeaker.addEventListener('click', () => uploadSpeaker.click());
dropAreaSpeaker.addEventListener('dragover', e => e.preventDefault());
dropAreaSpeaker.addEventListener('drop', e => {
    e.preventDefault();
    handleSpeakerFiles(e.dataTransfer.files);
});
uploadSpeaker.addEventListener('change', e => handleSpeakerFiles(e.target.files));

function handleSpeakerFiles(files) {
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const index = speakerFiles.length;
            speakerFiles.push(file);
            displaySpeakerThumbnail(file, index);
        }
    }
}

function displaySpeakerThumbnail(file, index) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvasSize = CONFIG.speakerCanvas.size;
            let scale;
            if (img.width > img.height) {
                scale = (canvasSize / img.height) * CONFIG.zoomBuffer;
                speakerEditData[index] = calculateAlignment(img.width, img.height, scale, canvasSize, "landscape");
            } else {
                scale = (canvasSize / img.width) * CONFIG.zoomBuffer;
                speakerEditData[index] = calculateAlignment(img.width, img.height, scale, canvasSize, "portrait");
            }
            speakerEditData[index].scale = scale;

            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = CONFIG.speakerCanvas.thumbSize;
            thumbCanvas.height = CONFIG.speakerCanvas.thumbSize;
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.fillStyle = 'white';
            thumbCtx.fillRect(0, 0, CONFIG.speakerCanvas.thumbSize, CONFIG.speakerCanvas.thumbSize);

            thumbCtx.drawImage(
                img,
                speakerEditData[index].offsetX * (CONFIG.speakerCanvas.thumbSize / canvasSize),
                speakerEditData[index].offsetY * (CONFIG.speakerCanvas.thumbSize / canvasSize),
                img.width * scale * (CONFIG.speakerCanvas.thumbSize / canvasSize),
                img.height * scale * (CONFIG.speakerCanvas.thumbSize / canvasSize)
            );

            const thumb = document.createElement('div');
            thumb.className = 'thumb';
            thumb.innerHTML = `
                <img src="${thumbCanvas.toDataURL('image/png')}">
                <input type="checkbox" checked>
                <button class="edit-button" data-index="${index}"><i class="fas fa-pencil-alt"></i></button>
            `;
            gallerySpeaker.appendChild(thumb);

            speakerThumbnails[index] = thumb.querySelector('img');

            thumb.querySelector('.edit-button').addEventListener('click', () => openEditor(index));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function openEditor(index) {
    originalEditData = { ...speakerEditData[index] };
    currentEditIndex = index;
    const reader = new FileReader();
    reader.onload = e => {
        imgToEdit = new Image();
        imgToEdit.onload = () => {
            drawEditCanvas();
            editModal.classList.remove('hidden');
        };
        imgToEdit.src = e.target.result;
    };
    reader.readAsDataURL(speakerFiles[index]);
}

function drawEditCanvas() {
    const { offsetX, offsetY, scale } = speakerEditData[currentEditIndex];
    editCtx.fillStyle = 'white';
    editCtx.fillRect(0, 0, CONFIG.speakerCanvas.size, CONFIG.speakerCanvas.size);
    editCtx.drawImage(imgToEdit, offsetX, offsetY, imgToEdit.width * scale, imgToEdit.height * scale);

    const overflow = offsetX > 0 || offsetY > 0 ||
        offsetX + imgToEdit.width * scale < CONFIG.speakerCanvas.size ||
        offsetY + imgToEdit.height * scale < CONFIG.speakerCanvas.size;
    editCanvas.style.border = overflow ? CONFIG.editBorder.warning : CONFIG.editBorder.normal;
}

editCanvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});
document.addEventListener('mousemove', (e) => {
    if (dragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        speakerEditData[currentEditIndex].offsetX += dx;
        speakerEditData[currentEditIndex].offsetY += dy;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        drawEditCanvas();
    }
});
document.addEventListener('mouseup', () => dragging = false);

zoomInButton.addEventListener('click', () => {
    speakerEditData[currentEditIndex].scale *= CONFIG.zoomStep;
    drawEditCanvas();
});

zoomOutButton.addEventListener('click', () => {
    speakerEditData[currentEditIndex].scale /= CONFIG.zoomStep;
    drawEditCanvas();
});

doneEditingButton.addEventListener('click', () => {
    editModal.classList.add('hidden');
    updateSpeakerThumbnail(currentEditIndex);
});

cancelEditingButton.addEventListener('click', () => {
    if (originalEditData) {
        speakerEditData[currentEditIndex] = { ...originalEditData };
    }
    editModal.classList.add('hidden');
});

function updateSpeakerThumbnail(index) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = CONFIG.speakerCanvas.thumbSize;
            thumbCanvas.height = CONFIG.speakerCanvas.thumbSize;
            const thumbCtx = thumbCanvas.getContext('2d');
            const { offsetX, offsetY, scale } = speakerEditData[index];
            thumbCtx.fillStyle = 'white';
            thumbCtx.fillRect(0, 0, CONFIG.speakerCanvas.thumbSize, CONFIG.speakerCanvas.thumbSize);
            thumbCtx.drawImage(
                img,
                offsetX * (CONFIG.speakerCanvas.thumbSize / CONFIG.speakerCanvas.size),
                offsetY * (CONFIG.speakerCanvas.thumbSize / CONFIG.speakerCanvas.size),
                img.width * scale * (CONFIG.speakerCanvas.thumbSize / CONFIG.speakerCanvas.size),
                img.height * scale * (CONFIG.speakerCanvas.thumbSize / CONFIG.speakerCanvas.size)
            );
            speakerThumbnails[index].src = thumbCanvas.toDataURL('image/png');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(speakerFiles[index]);
}

downloadButtonSpeaker.addEventListener('click', async () => {
    const selected = speakerFiles.map((_, i) => i).filter(i => gallerySpeaker.querySelectorAll('input')[i].checked);
    if (selected.length === 0) return alert("Please select at least one speaker image.");

    spinnerSpeaker.classList.remove('hidden');
    try {
        const zip = new JSZip();
        for (let idx of selected) {
            const file = speakerFiles[idx];
            const img = await loadImage(file);
            const processed = processSpeaker(img, speakerEditData[idx]);
            zip.file(getFilename(file.name, '_591x591'), processed.split(',')[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        triggerZipDownload(blob, 'processed-speakers.zip');
    } finally {
        spinnerSpeaker.classList.add('hidden');
        showToast();
    }
});

restartButtonSpeaker.addEventListener('click', () => {
    speakerFiles = [];
    gallerySpeaker.innerHTML = '';
});

function processSpeaker(img, { offsetX, offsetY, scale }) {
    canvas.width = CONFIG.speakerCanvas.size;
    canvas.height = CONFIG.speakerCanvas.size;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
    return canvas.toDataURL('image/png');
}
