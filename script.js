// ===================
// CONFIGURATION
// ===================
const CONFIG = {
    logoCanvas: { width: 350, height: 200, padding: 15 },
    speakerCanvas: { size: 591, thumbSize: 300 },
    overlayCanvas: { size: 591, thumbSize: 300 },
    zoomBuffer: 1.1,
    zoomStep: 1.07,
    alignment: {
        landscape: "top-center",
        portrait: "center"
    },
    editBorder: {
        normal: "4px solid green",
        warning: "4px solid red"
    }
};

// ===================
// ELEMENTS
// ===================

const tabs = {
    logo: document.getElementById('logo-tab'),
    speaker: document.getElementById('speaker-tab'),
    overlay: document.getElementById('overlay-tab') // NEW TAB
};
const areas = {
    logo: document.getElementById('logo-area'),
    speaker: document.getElementById('speaker-area'),
    overlay: document.getElementById('overlay-area') // NEW AREA
};
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toast = document.getElementById('toast');

// LOGO AREA
const uploadLogo = document.getElementById('upload-logo');
const galleryLogo = document.getElementById('gallery-logo');
const downloadLogo = document.getElementById('downloadLink-logo');
const restartLogo = document.getElementById('restart-logo');
const spinnerLogo = document.getElementById('spinner-logo');

// SPEAKER AREA
const uploadSpeaker = document.getElementById('upload-speaker');
const gallerySpeaker = document.getElementById('gallery-speaker');
const downloadSpeaker = document.getElementById('downloadLink-speaker');
const restartSpeaker = document.getElementById('restart-speaker');
const spinnerSpeaker = document.getElementById('spinner-speaker');

// OVERLAY AREA
const uploadOverlay = document.getElementById('upload-overlay');
const galleryOverlay = document.getElementById('gallery-overlay');
const downloadOverlay = document.getElementById('downloadLink-overlay');
const restartOverlay = document.getElementById('restart-overlay');
const spinnerOverlay = document.getElementById('spinner-overlay');

let logoFiles = [];
let speakerFiles = [];
let overlayFiles = [];

// ===================
// TABS
// ===================
Object.keys(tabs).forEach(key => {
    tabs[key].addEventListener('click', () => {
        Object.keys(tabs).forEach(k => {
            tabs[k].classList.remove('active');
            areas[k].classList.remove('active-area');
            areas[k].classList.add('hidden-area');
        });
        tabs[key].classList.add('active');
        areas[key].classList.add('active-area');
        areas[key].classList.remove('hidden-area');
    });
});

// ===================
// IMAGE HANDLERS
// ===================
function handleFiles(files, gallery, fileArray, type) {
    gallery.innerHTML = '';
    [...files].forEach(file => {
        if (file.type.startsWith('image/')) {
            fileArray.push(file);
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'thumb';
                div.innerHTML = `<img src="${e.target.result}"><input type="checkbox" checked>`;
                gallery.appendChild(div);
            };
            reader.readAsDataURL(file);
        }
    });
}

function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

function getFilename(base, suffix) {
    return `${base.replace(/\.[^/.]+$/, "")}${suffix}.png`;
}

function processAndDownload(files, config, suffix, spinner, gallery, downloadLinkName) {
    const selected = [...gallery.querySelectorAll('input')].map((el, i) => el.checked ? files[i] : null).filter(Boolean);
    if (!selected.length) return alert("Please select at least one image.");
    spinner.classList.remove('hidden');

    const zip = new JSZip();
    const promises = selected.map(async (file, i) => {
        const img = await loadImage(file);
        const processed = resizeImage(img, config);
        zip.file(getFilename(file.name, suffix), processed.split(',')[1], { base64: true });
    });

    Promise.all(promises).then(async () => {
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.getElementById(downloadLinkName);
        link.href = url;
        link.download = `processed-${suffix.slice(1)}.zip`;
        link.style.display = 'inline-block';
        spinner.classList.add('hidden');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    });
}

function resizeImage(img, config) {
    canvas.width = config.width || config.size;
    canvas.height = config.height || config.size;
    const padding = config.padding || 0;
    const maxWidth = canvas.width - padding * 2;
    const maxHeight = canvas.height - padding * 2;
    let width = img.width, height = img.height;
    const aspect = width / height;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspect;
    }
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    return canvas.toDataURL('image/png');
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===================
// EVENT LISTENERS
// ===================
uploadLogo.addEventListener('change', e => handleFiles(e.target.files, galleryLogo, logoFiles, 'logo'));
uploadSpeaker.addEventListener('change', e => handleFiles(e.target.files, gallerySpeaker, speakerFiles, 'speaker'));
uploadOverlay.addEventListener('change', e => handleFiles(e.target.files, galleryOverlay, overlayFiles, 'overlay'));

downloadLogo.addEventListener('click', () => processAndDownload(logoFiles, CONFIG.logoCanvas, '_350x200', spinnerLogo, galleryLogo, 'downloadLink-logo'));
downloadSpeaker.addEventListener('click', () => processAndDownload(speakerFiles, CONFIG.speakerCanvas, '_591x591', spinnerSpeaker, gallerySpeaker, 'downloadLink-speaker'));
downloadOverlay.addEventListener('click', () => processAndDownload(overlayFiles, CONFIG.overlayCanvas, '_cardoverlay', spinnerOverlay, galleryOverlay, 'downloadLink-overlay'));

restartLogo.addEventListener('click', () => { logoFiles = []; galleryLogo.innerHTML = ''; downloadLogo.style.display = 'none'; });
restartSpeaker.addEventListener('click', () => { speakerFiles = []; gallerySpeaker.innerHTML = ''; downloadSpeaker.style.display = 'none'; });
restartOverlay.addEventListener('click', () => { overlayFiles = []; galleryOverlay.innerHTML = ''; downloadOverlay.style.display = 'none'; });
