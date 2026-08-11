// cinematic-bg.js — Canvas-based frame animation for cinematic background
// Uses the 280 reference-image frames to create a smooth looping "video" effect

(function () {
    'use strict';

    const TOTAL_FRAMES = 280;
    const TARGET_FPS = 15; // ~18.7 second loop
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    // Determine the correct base path for reference images
    // merchant.html is at root level, pages/*.html are one level deeper
    const isSubPage = window.location.pathname.includes('/pages/');
    const basePath = isSubPage
        ? '../../reference-image/'
        : '../reference-image/';

    // State
    let canvas, ctx;
    let frames = [];
    let loadedCount = 0;
    let currentFrame = 0;
    let lastFrameTime = 0;
    let animationId = null;
    let isRunning = false;

    // Pad number with leading zeros: 1 -> "001"
    function pad(n) {
        return String(n).padStart(3, '0');
    }

    // Create the canvas and overlay DOM elements
    function createElements() {
        // Canvas for frame rendering
        canvas = document.createElement('canvas');
        canvas.id = 'cinematic-bg';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);

        // Dark overlay for readability + cinematic light effect
        const overlay = document.createElement('div');
        overlay.id = 'cinematic-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(overlay, canvas.nextSibling);

        ctx = canvas.getContext('2d');
        resizeCanvas();
    }

    // Resize canvas to fill viewport
    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Redraw current frame after resize
        if (frames[currentFrame] && frames[currentFrame].complete) {
            drawFrame(frames[currentFrame]);
        }
    }

    // Draw a single frame, covering the canvas (cover fit)
    function drawFrame(img) {
        if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // "cover" fit: fill canvas while preserving aspect ratio
        const scale = Math.max(cw / iw, ch / ih);
        const sw = iw * scale;
        const sh = ih * scale;
        const sx = (cw - sw) / 2;
        const sy = (ch - sh) / 2;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, sx, sy, sw, sh);
    }

    // Preload all frames
    function preloadFrames() {
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image();
            img.src = basePath + 'ezgif-frame-' + pad(i) + '.jpg';
            img.onload = () => {
                loadedCount++;
                // Start animating once we have enough frames to be smooth
                if (loadedCount === 10 && !isRunning) {
                    startAnimation();
                }
            };
            frames.push(img);
        }
    }

    // Main animation loop
    function animate(timestamp) {
        if (!isRunning) return;

        animationId = requestAnimationFrame(animate);

        const elapsed = timestamp - lastFrameTime;
        if (elapsed < FRAME_INTERVAL) return;

        lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

        // Only draw if the frame is loaded
        const frame = frames[currentFrame];
        if (frame && frame.complete && frame.naturalWidth > 0) {
            drawFrame(frame);
        }

        // Advance to next frame, loop back at end
        currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
    }

    function startAnimation() {
        if (isRunning) return;
        isRunning = true;
        lastFrameTime = performance.now();
        animationId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // Pause when tab is hidden to save CPU/GPU
    function handleVisibility() {
        if (document.hidden) {
            stopAnimation();
        } else {
            startAnimation();
        }
    }

    // Initialize
    function init() {
        createElements();
        preloadFrames();
        window.addEventListener('resize', resizeCanvas);
        document.addEventListener('visibilitychange', handleVisibility);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
