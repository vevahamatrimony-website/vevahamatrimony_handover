// Mobile optimization script for VevahaMatrimony
console.log('📱 Mobile optimization script loaded');

// Detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Optimize viewport for mobile
if (isMobileDevice()) {
    console.log('📱 Mobile device detected');
    
    // Add mobile-friendly meta tags if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
    }
    
    // Add mobile class to body
    document.addEventListener('DOMContentLoaded', function() {
        document.body.classList.add('mobile-device');
    });
}

// Prevent zoom on input focus for iOS
if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    document.addEventListener('DOMContentLoaded', function() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.style.fontSize = '16px';
            });
        });
    });
}

// Touch event optimization
let touchStartY = 0;
document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    const touchY = e.touches[0].clientY;
    const touchDiff = touchY - touchStartY;
    
    // Prevent pull-to-refresh on certain elements
    if (touchDiff > 0 && window.scrollY === 0) {
        const target = e.target;
        if (target.closest('.no-pull-refresh')) {
            e.preventDefault();
        }
    }
}, { passive: false });

console.log('✅ Mobile optimization initialized');
