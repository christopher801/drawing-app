// ========== CANVAS SETUP ==========
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// ========== STATE ==========
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#ff6b9d';
let currentSize = 5;
let backgroundColor = 'white';

// History for undo/redo
let history = [];
let historyStep = -1;

// For shapes
let startX, startY;
let snapshot;

// ========== DOM ELEMENTS ==========
const toolBtns = document.querySelectorAll('.tool-btn');
const colorPicker = document.getElementById('colorPicker');
const colorBoxes = document.querySelectorAll('.color-box');
const brushSize = document.getElementById('brushSize');
const sizeValue = document.getElementById('sizeValue');
const brushPreview = document.getElementById('brushPreview');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const bgBtns = document.querySelectorAll('.bg-btn');

// Info display
const currentToolEl = document.getElementById('currentTool');
const currentSizeEl = document.getElementById('currentSize');
const currentColorEl = document.getElementById('currentColor');

// ========== INIT ==========
setBackground(backgroundColor);
saveState();

// ========== TOOLS ==========
toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
        
        const toolNames = {
            pen: 'Pen',
            eraser: 'Efase',
            line: 'Line',
            rectangle: 'Rectangle',
            circle: 'Circle',
            fill: 'Fill'
        };
        currentToolEl.textContent = toolNames[currentTool];
    });
});

// ========== COLOR ==========
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    updateColorDisplay();
});

colorBoxes.forEach(box => {
    box.addEventListener('click', () => {
        currentColor = box.dataset.color;
        colorPicker.value = currentColor;
        updateColorDisplay();
    });
});

function updateColorDisplay() {
    currentColorEl.textContent = currentColor;
    brushPreview.style.setProperty('--brush-color', currentColor);
}

// ========== BRUSH SIZE ==========
brushSize.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeValue.textContent = currentSize + 'px';
    currentSizeEl.textContent = currentSize + 'px';
    updateBrushPreview();
});

function updateBrushPreview() {
    const previewDot = brushPreview.querySelector('::after');
    brushPreview.style.setProperty('--brush-size', currentSize + 'px');
    
    // Update pseudo-element via custom property
    const style = document.createElement('style');
    style.textContent = `
        .brush-preview::after {
            width: ${currentSize}px;
            height: ${currentSize}px;
            background: ${currentColor};
        }
    `;
    document.head.appendChild(style);
}

// ========== BACKGROUND ==========
bgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        bgBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        backgroundColor = btn.dataset.bg;
        setBackground(backgroundColor);
        saveState();
    });
});

function setBackground(bg) {
    if (bg === 'white') {
        canvas.style.background = 'white';
    } else if (bg === 'black') {
        canvas.style.background = 'black';
    } else {
        canvas.style.background = 'transparent';
    }
}

// ========== DRAWING ==========
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);

// Touch events
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', stopDraw);

function startDraw(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    if (currentTool === 'fill') {
        floodFill(startX, startY);
        saveState();
        return;
    }
    
    if (['line', 'rectangle', 'circle'].includes(currentTool)) {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'eraser') {
        ctx.clearRect(x - currentSize/2, y - currentSize/2, currentSize, currentSize);
    } else if (currentTool === 'line') {
        drawLine(x, y);
    } else if (currentTool === 'rectangle') {
        drawRectangle(x, y);
    } else if (currentTool === 'circle') {
        drawCircle(x, y);
    }
}

function stopDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    saveState();
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                      e.type === 'touchmove' ? 'mousemove' : 
                                      'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// ========== SHAPES ==========
function drawLine(x, y) {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function drawRectangle(x, y) {
    ctx.putImageData(snapshot, 0, 0);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.strokeRect(startX, startY, x - startX, y - startY);
}

function drawCircle(x, y) {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath();
    const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.stroke();
}

// ========== FLOOD FILL ==========
function floodFill(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixelColor(imageData, x, y);
    const fillColor = hexToRgb(currentColor);
    
    if (colorsMatch(targetColor, fillColor)) return;
    
    const pixelsToCheck = [[x, y]];
    
    while (pixelsToCheck.length > 0) {
        const [currentX, currentY] = pixelsToCheck.pop();
        
        if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height) continue;
        
        const currentColor = getPixelColor(imageData, currentX, currentY);
        
        if (colorsMatch(currentColor, targetColor)) {
            setPixelColor(imageData, currentX, currentY, fillColor);
            pixelsToCheck.push([currentX + 1, currentY]);
            pixelsToCheck.push([currentX - 1, currentY]);
            pixelsToCheck.push([currentX, currentY + 1]);
            pixelsToCheck.push([currentX, currentY - 1]);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
    };
}

function setPixelColor(imageData, x, y, color) {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color.r;
    imageData.data[index + 1] = color.g;
    imageData.data[index + 2] = color.b;
    imageData.data[index + 3] = 255;
}

function colorsMatch(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
    } : null;
}

// ========== HISTORY ==========
function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(canvas.toDataURL());
}

undoBtn.addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
});

redoBtn.addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState();
    }
});

function restoreState() {
    const img = new Image();
    img.src = history[historyStep];
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

// ========== CLEAR ==========
clearBtn.addEventListener('click', () => {
    if (confirm('Efase tout desinen an?')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setBackground(backgroundColor);
        saveState();
    }
});

// ========== SAVE ==========
saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'mon-desinen-' + Date.now() + '.png';
    link.href = canvas.toDataURL();
    link.click();
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
            e.preventDefault();
            undoBtn.click();
        } else if (e.key === 'y') {
            e.preventDefault();
            redoBtn.click();
        } else if (e.key === 's') {
            e.preventDefault();
            saveBtn.click();
        }
    }
});