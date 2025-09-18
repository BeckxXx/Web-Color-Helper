// DOM-Referenzen
const boxes = document.querySelector(".boxes");
const oklch = document.querySelector(".oklch");
const normal = document.querySelector(".normal");
const sampleBtn = document.querySelector("#sample");
const oklchCode = document.querySelector("#oklchCode");
const normalCode = document.querySelector("#normalCode");
const startPicker = new iro.ColorPicker("#startPicker", {width: 150, color: "c3d051"});
const endPicker = new iro.ColorPicker("#endPicker", {width: 150, color: "002f53"});
const inputStart = document.getElementById("inputStart");
const inputEnd = document.getElementById("inputEnd");
const steps = 12;
const applyColorsBtn = document.getElementById("applyColorsBtn"); // Neuer Button

let avgColors = []; // Global nach Ermittlung der Farben

// Hilfsfunktionen
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3)
        hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
}

function rgbArrayToHex(rgb) {
    return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function createGradientColors(startHex, endHex, steps) {
    const startRgb = hexToRgb(startHex);
    const endRgb = hexToRgb(endHex);
    let result = [];
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(lerp(startRgb[0], endRgb[0], t));
        const g = Math.round(lerp(startRgb[1], endRgb[1], t));
        const b = Math.round(lerp(startRgb[2], endRgb[2], t));
        result.push(rgbArrayToHex([r, g, b]));
    }
    return result;
}

function setGradient(element, colors) {
    element.style.background = `linear-gradient(to right, ${colors.join(", ")})`;
}

function getContrastColor(hex) {
    const rgb = hexToRgb(hex);
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.7 ? "#000000" : "#FFFFFF";
}

function updateColorScaleBoxes() {
    const startHex = inputStart.value || startPicker.color.hexString;
    const endHex = inputEnd.value || endPicker.color.hexString;
    boxes.innerHTML = "";
    const gradientColors = createGradientColors(startHex, endHex, steps);
    gradientColors.forEach((color) => {
        const box = document.createElement("div");
        box.className = "colorBox";
        box.style.backgroundColor = color;
        box.title = color;
        box.textContent = color;
        box.style.color = getContrastColor(color);
        box.addEventListener("click", () => {
            navigator.clipboard.writeText(color);
        });
        boxes.appendChild(box);
    });
}

function updateGradients() {
    const startHex = inputStart.value || startPicker.color.hexString;
    const endHex = inputEnd.value || endPicker.color.hexString;
    updateColorScaleBoxes();
    const normalColors = createGradientColors(startHex, endHex, steps);
    setGradient(normal, normalColors);
    normalCode.textContent = normalColors.join(", ");
    const oklchColors = createGradientColors(startHex, endHex, steps);
    setGradient(oklch, oklchColors);
    oklchCode.textContent = oklchColors.join(", ");
}

function validateAndFormatHex(input) {
    let val = input.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
        return val.toLowerCase();
    }
    return null;
}

// Initial update
updateGradients();

sampleBtn.addEventListener("click", () => {
    startPicker.color.rgb = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
    };
    endPicker.color.rgb = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
    };
    updateGradients();
});

startPicker.on("color:change", (color) => {
    inputStart.value = color.hexString;
    updateGradients();
});

endPicker.on("color:change", (color) => {
    inputEnd.value = color.hexString;
    updateGradients();
});

inputStart.addEventListener("input", () => {
    let val = inputStart.value.trim();
    if (val && !val.startsWith("#")) {
        val = "#" + val;
        inputStart.value = val; // Eingabefeld direkt anpassen
    }
    const valid = validateAndFormatHex(val);
    if (valid !== null) {
        startPicker.color.hexString = valid;
        updateGradients();
    }
});

inputEnd.addEventListener("input", () => {
    let val = inputEnd.value.trim();
    if (val && !val.startsWith("#")) {
        val = "#" + val;
        inputEnd.value = val;
    }
    const valid = validateAndFormatHex(val);
    if (valid !== null) {
        endPicker.color.hexString = valid;
        updateGradients();
    }
});

inputStart.addEventListener("change", () => {
    let val = inputStart.value.trim();
    if (!val.startsWith("#")) val = "#" + val;
    startPicker.color.hexString = val;
    updateGradients();
});

inputEnd.addEventListener("change", () => {
    let val = inputEnd.value.trim();
    if (!val.startsWith("#")) val = "#" + val;
    endPicker.color.hexString = val;
    updateGradients();
});

// Tabs toggle
document.querySelectorAll(".tab-link").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-link").forEach((el) => el.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.getAttribute("data-tab")).classList.add("active");
    });
});

// Image upload and color selection
const fileInput = document.getElementById("image-upload");
const canvas = document.getElementById("image-canvas");
const ctx = canvas.getContext("2d");
const hoverColorSpan = document.getElementById("hover-color");
const clickedColorSpan = document.getElementById("clicked-color");
const imageColorScale = document.getElementById("image-color-scale");
const avgScaleContainer = document.getElementById("avg-color-scale");
const imageContainer = document.querySelector(".image-container");
let img = new Image();
let imgLoaded = false;
let currentHoverColor = null;

function getAverageColors(ctx, width, height, buckets = 5) {
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const bucketsArr = Array.from({length: buckets}, () => []);
    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i],
            g = imageData[i + 1],
            b = imageData[i + 2];
        const brightness = Math.floor((((r + g + b) / 3) * buckets) / 256);
        bucketsArr[Math.min(brightness, buckets - 1)].push([r, g, b]);
    }
    return bucketsArr.map((colors) => {
        if (!colors.length) return "#CCCCCC";
        const [sumR, sumG, sumB] = colors.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
        const n = colors.length;
        return rgbArrayToHex([Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n)]);
    });
}

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        img.onload = () => {
            const containerWidth = imageContainer.clientWidth;
            const containerHeight = imageContainer.clientHeight;
            let width = img.width;
            let height = img.height;
            const scale = Math.min(containerWidth / width, containerHeight / height, 1);
            canvas.width = width * scale;
            canvas.height = height * scale;
            canvas.style.width = canvas.width + "px";
            canvas.style.height = canvas.height + "px";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            imgLoaded = true;
            hoverColorSpan.textContent = "-";
            hoverColorSpan.style.backgroundColor = "transparent";
            hoverColorSpan.removeAttribute("data-color");
            clickedColorSpan.textContent = "-";
            imageColorScale.innerHTML = "";
            avgScaleContainer.innerHTML = "";
            avgColors = getAverageColors(ctx, canvas.width, canvas.height, 5);
            avgColors.forEach((hex) => {
                const box = document.createElement("div");
                box.className = "colorBox";
                box.style.backgroundColor = hex;
                box.title = hex;
                box.textContent = hex;
                box.style.color = getContrastColor(hex);
                box.addEventListener("click", () => {
                    navigator.clipboard.writeText(hex);
                });
                avgScaleContainer.appendChild(box);
            });
            // Button anzeigen, wenn Farben vorhanden sind
            if (avgColors.length > 0) {
                applyColorsBtn.style.display = "inline-block";
				applyColorsBtn.classList.add('sample');
            } else {
                applyColorsBtn.style.display = "none";
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

const colorHoverIndicator = document.getElementById("color-hover-indicator");

canvas.addEventListener("mousemove", (e) => {
    if (!imgLoaded) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(mouseX * scaleX);
    const y = Math.floor(mouseY * scaleY);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
        hoverColorSpan.textContent = "-";
        hoverColorSpan.style.backgroundColor = "transparent";
        hoverColorSpan.removeAttribute("data-color");
        currentHoverColor = null;
        imageContainer.classList.remove("hovered");
        colorHoverIndicator.style.display = "none";
        return;
    }
    imageContainer.classList.add("hovered");
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const rgbHex = rgbArrayToHex([pixel[0], pixel[1], pixel[2]]).toUpperCase();
    hoverColorSpan.textContent = rgbHex;
    currentHoverColor = rgbHex;
    hoverColorSpan.style.backgroundColor = rgbHex;
    hoverColorSpan.setAttribute("data-color", rgbHex);
    colorHoverIndicator.style.backgroundColor = rgbHex;
    colorHoverIndicator.style.left = `${e.clientX}px`;
    colorHoverIndicator.style.top = `${e.clientY}px`;
    colorHoverIndicator.style.display = "block";
});

canvas.addEventListener("mouseleave", () => {
    imageContainer.classList.remove("hovered");
    hoverColorSpan.textContent = "-";
    hoverColorSpan.style.backgroundColor = "transparent";
    hoverColorSpan.removeAttribute("data-color");
    currentHoverColor = null;
    colorHoverIndicator.style.display = "none";
});

canvas.addEventListener("click", () => {
    if (!currentHoverColor) return;
    navigator.clipboard.writeText(currentHoverColor).then(() => {
        clickedColorSpan.textContent = currentHoverColor;
        clickedColorSpan.style.backgroundColor = currentHoverColor;
        clickedColorSpan.style.color = getContrastColor(currentHoverColor);
        generateColorScaleFromHex(currentHoverColor);
    });
});

function generateColorScaleFromHex(baseHex) {
    const steps = 5;
    const baseRgb = hexToRgb(baseHex);
    if (!baseRgb) return;
    imageColorScale.innerHTML = "";
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(lerp(baseRgb[0], 255, t));
        const g = Math.round(lerp(baseRgb[1], 255, t));
        const b = Math.round(lerp(baseRgb[2], 255, t));
        const hex = rgbArrayToHex([r, g, b]);
        const box = document.createElement("div");
        box.className = "colorBox";
        box.style.backgroundColor = hex;
        box.title = hex;
        box.textContent = hex;
        box.style.color = getContrastColor(hex);
        box.addEventListener("click", () => {
            navigator.clipboard.writeText(hex);
        });
        imageColorScale.appendChild(box);
    }
}

applyColorsBtn.addEventListener("click", () => {
    if (!avgColors || avgColors.length === 0) {
        console.log("Keine Grundfarben verfügbar.");
        return;
    }

    // Sortiere Farben nach Luminanz (Helligkeit)
    const sortByLuminance = (a, b) => {
        const getLuminance = (hex) => {
            const rgb = hexToRgb(hex);
            return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
        };
        return getLuminance(a) - getLuminance(b);
    };

    const sortedColors = avgColors.slice().sort(sortByLuminance);
    console.log("Dunkelste Farbe:", sortedColors[0]);
    console.log("Hellste Farbe:", sortedColors[sortedColors.length - 1]);

    // Werte setzen
    inputStart.value = sortedColors[0];
    inputEnd.value = sortedColors[sortedColors.length - 1];

    // Farb-Picker updaten
    startPicker.color.hexString = inputStart.value;
    endPicker.color.hexString = inputEnd.value;

    updateGradients();

    // Auf Tab 1 wechseln
    document.querySelectorAll(".tab-link").forEach((el) => el.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
    document.querySelector('.tab-link[data-tab="tab1"]').classList.add("active");
    document.getElementById("tab1").classList.add("active");
});
