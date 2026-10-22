
// Centralized Watermark System for VevahaMatrimony
// This ensures all user profile photos have consistent watermarking across all pages

class WatermarkSystem {
    constructor() {
        this.watermarkText = 'vevahamatrimony';
        this.watermarkColor = 'rgba(255, 255, 255, 0.8)'; // White with 80% opacity
        this.strokeColor = 'rgba(255, 255, 255, 0.9)'; // White stroke
        this.cornerWatermarkColor = 'rgba(255, 255, 255, 0.8)';
        this.cornerStrokeColor = 'rgba(255, 255, 255, 0.9)';
    }

    // Apply watermark to image URL or data
    applyWatermark(imageSrc, callback, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Handle cross-origin images
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            // Set canvas size to match image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // Apply comprehensive watermark
            this.drawWatermarkPattern(ctx, canvas.width, canvas.height, options);

            // Convert to data URL
            const watermarkedImageData = canvas.toDataURL('image/jpeg', 0.9);
            callback(watermarkedImageData);
        };

        img.onerror = () => {
            console.warn('Failed to load image for watermarking, using original');
            callback(imageSrc);
        };

        img.src = imageSrc;
    }

    // Draw comprehensive watermark pattern
    drawWatermarkPattern(ctx, width, height, options = {}) {
        // Calculate diagonal length for font sizing
        const diagonal = Math.sqrt(width * width + height * height);
        const fontSize = Math.max(diagonal * 0.12, 24); // 12% of diagonal
        
        // Configure watermark text style
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; // Semi-transparent white
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'; // Slightly more opaque stroke
        ctx.lineWidth = 1.5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Save canvas state
        ctx.save();

        // Position for diagonal watermark - accurate diagonal angle
        // Passes through center, spans from bottom-left towards top-right
        const angle = Math.atan2(-height, width); 
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);

        // Draw single centered watermark
        ctx.strokeText(this.watermarkText, 0, 0);
        ctx.fillText(this.watermarkText, 0, 0);

        // Restore canvas state
        ctx.restore();
    }

    // Add corner watermarks - removed for clean single watermark approach
    addCornerWatermarks(ctx, width, height, baseFontSize) {
        // Removed for cleaner watermark appearance
    }

    // Add center watermark - removed for clean single watermark approach  
    addCenterWatermark(ctx, width, height, baseFontSize) {
        // Removed for cleaner watermark appearance
    }

    // Apply watermark to all profile images on a page
    watermarkAllProfileImages() {
        const profileImages = document.querySelectorAll('.profile-image, .profile-photo, .user-photo, #profileImage, img[src*="profile"], img[src*="user"], .membercard-img');
        
        profileImages.forEach(img => {
            if (img.dataset.watermarked === 'true') return; // Skip already watermarked images
            
            // Skip feature icons and system images
            if (img.closest('.feature-card') || 
                img.src.includes('images/screened-profiles') ||
                img.src.includes('images/verified-profiles') ||
                img.src.includes('images/government-ids') ||
                img.src.includes('images/privacy-icon') ||
                img.src.includes('images/Personal-Matchmaking') ||
                img.src.includes('images/247 Support') ||
                img.alt && (img.alt.includes('100% Manually Screened') || img.alt.includes('Verification by Personal Visit'))) {
                return; // Skip these images
            }
            
            const originalSrc = img.src;
            if (!originalSrc || originalSrc.includes('placeholder') || originalSrc.includes('data:image')) return;

            this.applyWatermark(originalSrc, (watermarkedSrc) => {
                img.src = watermarkedSrc;
                img.dataset.watermarked = 'true';
                img.classList.add('watermark-protected');
            });
        });
    }

    // Apply CSS protection to images
    applyCSSProtection() {
        const style = document.createElement('style');
        style.textContent = `
            .watermark-protected,
            .profile-image,
            .profile-photo,
            .user-photo {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                user-drag: none;
                pointer-events: auto !important; /* Allow hover/click for modals */
                position: relative;
            }

            /* Redundant CSS watermark removed to ensure single clean canvas-based watermark */

            .watermark-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-40deg);
                background: transparent;
                color: rgba(255, 255, 255, 0.8);
                padding: 4px 8px;
                font-size: 14px;
                font-weight: 700;
                text-transform: lowercase;
                letter-spacing: 1px;
                pointer-events: none;
                z-index: 10;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize watermark system on page load
    init() {
        this.applyCSSProtection();
        
        // Apply watermarks when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.watermarkAllProfileImages(), 1000);
            });
        } else {
            setTimeout(() => this.watermarkAllProfileImages(), 1000);
        }

        // Re-apply watermarks when new images are loaded
        this.observeNewImages();

        // Prevent right-click context menu on images
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG' && (
                e.target.classList.contains('watermark-protected') ||
                e.target.classList.contains('profile-image') ||
                e.target.classList.contains('profile-photo') ||
                e.target.classList.contains('user-photo')
            )) {
                e.preventDefault();
                return false;
            }
        });

        // Prevent drag and drop
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        });
    }

    // Observe new images being added to the DOM
    observeNewImages() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const images = node.querySelectorAll ? 
                            node.querySelectorAll('img.profile-image, img.profile-photo, img.user-photo, img[src*="profile"]') : 
                            [];
                        
                        if (node.tagName === 'IMG' && (
                            node.classList.contains('profile-image') ||
                            node.classList.contains('profile-photo') ||
                            node.classList.contains('user-photo') ||
                            node.src.includes('profile')
                        )) {
                            this.watermarkSingleImage(node);
                        }

                        images.forEach(img => this.watermarkSingleImage(img));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Watermark a single image
    watermarkSingleImage(img) {
        if (img.dataset.watermarked === 'true') return;
        
        // Skip feature icons and system images
        if (img.closest('.feature-card') || 
            img.src.includes('images/screened-profiles') ||
            img.src.includes('images/verified-profiles') ||
            img.src.includes('images/government-ids') ||
            img.src.includes('images/privacy-icon') ||
            img.src.includes('images/Personal-Matchmaking') ||
            img.src.includes('images/247 Support') ||
            img.alt && (img.alt.includes('100% Manually Screened') || img.alt.includes('Verification by Personal Visit'))) {
            return; // Skip these images
        }
        
        const originalSrc = img.src;
        if (!originalSrc || originalSrc.includes('placeholder') || originalSrc.includes('data:image')) return;

        this.applyWatermark(originalSrc, (watermarkedSrc) => {
            img.src = watermarkedSrc;
            img.dataset.watermarked = 'true';
            img.classList.add('watermark-protected');
        });
    }
}

// Initialize watermark system globally
const watermarkSystem = new WatermarkSystem();

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    watermarkSystem.init();
}

// Make it globally available
window.WatermarkSystem = WatermarkSystem;
window.watermarkSystem = watermarkSystem;
