// Global variables for step navigation and form validation
var currentStep = 1;
var totalSteps = 3;
var otpSentEmail = null; // tracks the email OTP was sent to
var otpTimer = null;     // countdown timer for OTP resend
var otpCountdown = 30;   // seconds countdown

// Show message function
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        } text-white`;

    messageDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

var otpSending = false;

// Send OTP function with improved error handling and VevahaAPI integration
async function sendOTP() {
    const emailInput = document.getElementById('email');
    const sendBtn = document.getElementById('send-otp-btn');
    const sendText = document.getElementById('send-otp-text');
    const spinner = document.getElementById('otp-spinner');
    const emailStatus = document.getElementById('emailStatus');
    const emailOtpStatus = document.getElementById('emailOtpStatus');

    if (!emailInput || !sendBtn || !sendText || !spinner) {
        console.error('Required DOM elements not found for OTP sending');
        showMessage('Page not properly loaded. Please refresh and try again.', 'error');
        return;
    }

    const email = emailInput.value.trim();

    if (!email) {
        showMessage('Please enter your email address first.', 'error');
        emailInput.focus();
        return;
    }

    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
    }

    // Prevent multiple simultaneous requests
    if (otpSending) {
        console.log('OTP sending already in progress');
        return;
    }

    // Set loading state
    otpSending = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    sendText.textContent = 'Sending...';
    spinner.classList.remove('hidden');

    // Clear previous messages
    if (emailStatus) emailStatus.innerHTML = '';
    if (emailOtpStatus) emailOtpStatus.innerHTML = '';

    try {
        console.log('📧 Attempting to send OTP to:', email);

        let result = await window.VM.auth.sendOTP(email);

        console.log('📥 OTP send response:', result);

        if (result.success) {
            otpSentEmail = email;
            console.log('✅ OTP sent successfully to:', email);
            showMessage('OTP sent to your email! Please check your inbox and spam folder.', 'success');

            // Update UI to show OTP section
            const otpSection = document.getElementById('otp-section');
            if (otpSection) {
                otpSection.classList.remove('hidden');

                // Focus on OTP input after a short delay
                setTimeout(() => {
                    const otpInput = document.getElementById('otp');
                    if (otpInput) {
                        otpInput.focus();
                    }
                }, 100);
            }

            // Update status
            if (emailStatus) {
                emailStatus.innerHTML = `<span class="text-green-600">✅ OTP sent to ${email}</span>`;
            }

            // Update button text
            sendText.textContent = 'Resend OTP';

            // Start countdown timer
            startResendCountdown();

        } else {
            throw new Error(result.error || 'Failed to send OTP');
        }

    } catch (error) {
        console.error('❌ Error sending OTP:', error);
        let errorMessage = error.message;

        // Handle specific error cases
        if (errorMessage.includes('already registered')) {
            errorMessage = 'Email already registered. Please use a different email or try logging in.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (!errorMessage || errorMessage === 'Failed to fetch') {
            errorMessage = 'Unable to connect to server. Please try again.';
        }

        showMessage(errorMessage, 'error');

        // Clear status messages on error
        if (emailStatus) emailStatus.innerHTML = `<span class="text-red-600">❌ ${errorMessage}</span>`;
        if (emailOtpStatus) emailOtpStatus.innerHTML = '';
    } finally {
        // Always reset button state
        otpSending = false;
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        sendText.textContent = otpSentEmail ? 'Resend OTP' : 'Send OTP';
        spinner.classList.add('hidden');
    }
}

// Verify OTP function with VevahaAPI integration
async function verifyOTP() {
    const otpInput = document.getElementById('otp');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const verifyText = document.getElementById('verify-otp-text');
    const verifySpinner = document.getElementById('otp-verify-spinner');
    const otpStatus = document.getElementById('otpStatus');
    const emailOtpStatus = document.getElementById('emailOtpStatus');

    if (!otpInput || !verifyBtn || !verifyText || !verifySpinner) {
        console.error('Required DOM elements not found for OTP verification');
        showMessage('Page not properly loaded. Please refresh and try again.', 'error');
        return;
    }

    const otp = otpInput.value.trim();

    if (!otp) {
        showMessage('Please enter the OTP before verifying.', 'error');
        otpInput.focus();
        return;
    }

    if (otp.length !== 6 || isNaN(Number(otp))) {
        showMessage('OTP must be a 6-digit number.', 'error');
        otpInput.focus();
        return;
    }

    // If otpSentEmail is null, fall back to the current email field value
    if (!otpSentEmail) {
        const emailFallback = document.getElementById('email');
        if (emailFallback && emailFallback.value.trim()) {
            otpSentEmail = emailFallback.value.trim();
            console.warn('otpSentEmail was null, fell back to email input:', otpSentEmail);
        } else {
            showMessage('Please send OTP first before verifying.', 'error');
            return;
        }
    }

    verifyBtn.disabled = true;
    verifyText.textContent = 'Verifying...';
    verifySpinner.classList.remove('hidden');

    // Clear previous messages
    if (otpStatus) otpStatus.innerHTML = '';
    if (emailOtpStatus) emailOtpStatus.innerHTML = '';

    try {
        console.log('🔍 Verifying OTP:', otp, 'for email:', otpSentEmail);

        // Use VM.auth for proper cross-domain handling
        let result = await window.VM.auth.verifyOTP(otpSentEmail, otp);

        console.log('📥 OTP verification response:', result);

        if (result.success) {
            window.isEmailVerified = true;
            console.log('✅ Email verification successful, status set to:', window.isEmailVerified);
            showMessage('✅ Email verified successfully!', 'success');

            // Update verify button to verified state
            if (verifyText) verifyText.textContent = '✅ Verified';
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                verifyBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            }

            // Update status messages
            if (emailOtpStatus) {
                emailOtpStatus.innerHTML = '<span class="text-green-600 font-semibold">✅ Email verified successfully!</span>';
            }
            if (otpStatus) {
                otpStatus.innerHTML = '<span class="text-green-600 font-semibold">✅ Verification complete!</span>';
            }

            // Also store verification status in sessionStorage as backup
            sessionStorage.setItem('emailVerified', 'true');
            sessionStorage.setItem('verifiedEmail', otpSentEmail);

            // Hide OTP section, show verified badge, unlock the form
            setTimeout(() => {
                const otpSection = document.getElementById('otp-section');
                if (otpSection) otpSection.classList.add('hidden');

                const emailVerifiedBadge = document.getElementById('email-verified');
                if (emailVerifiedBadge) emailVerifiedBadge.classList.remove('hidden');

                const lockedSections = document.getElementById('locked-sections');
                const lockNotice = document.getElementById('otp-lock-notice');
                if (lockedSections) lockedSections.classList.remove('hidden');
                if (lockNotice) lockNotice.classList.add('hidden');
            }, 1500);

            // Enable next step button
            // nextStep1 logic handled by register.html directly
            /*
            const nextStep1Btn = document.getElementById('nextStep1');
            if (nextStep1Btn) {
                nextStep1Btn.disabled = false;
                nextStep1Btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
                nextStep1Btn.classList.add('bg-gradient-to-r', 'from-pink-600', 'to-pink-700', 'hover:from-pink-700', 'hover:to-pink-800');
            }
            */

            // Clear countdown timer
            if (otpTimer) {
                clearInterval(otpTimer);
                otpTimer = null;
            }

            console.log('✅ Email verification successful');

        } else {
            const errorMsg = result.error || 'Invalid OTP. Please check and try again.';
            showMessage(errorMsg, 'error');

            if (otpStatus) {
                otpStatus.innerHTML = `<span class="text-red-600 font-semibold">❌ ${errorMsg}</span>`;
            }

            // Clear OTP input for retry
            otpInput.value = '';
            otpInput.focus();
        }

    } catch (error) {
        console.error('❌ Error verifying OTP:', error);
        let errorMessage = error.message;

        // Handle specific error cases
        if (errorMessage.includes('Invalid OTP') || errorMessage.includes('invalid')) {
            errorMessage = 'Invalid OTP. Please check the code and try again.';
        } else if (errorMessage.includes('expired')) {
            errorMessage = 'OTP has expired. Please request a new one.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (!errorMessage || errorMessage === 'Failed to fetch') {
            errorMessage = 'Unable to connect to server. Please try again.';
        }

        showMessage(errorMessage, 'error');

        if (otpStatus) {
            otpStatus.innerHTML = `<span class="text-red-600 font-semibold">❌ ${errorMessage}</span>`;
        }

        // Clear OTP input for retry
        otpInput.value = '';
        otpInput.focus();
    } finally {
        // Reset button state if not verified
        if (!window.isEmailVerified) {
            verifyBtn.disabled = false;
            verifyText.textContent = 'Verify OTP';
            verifySpinner.classList.add('hidden');
        }
    }
}

// Resend countdown timer with improved UX
function startResendCountdown() {
    const resendBtn = document.getElementById('resend-otp-btn');
    const resendText = document.getElementById('resend-otp-text');

    if (!resendBtn || !resendText) return;

    otpCountdown = 60; // 60 seconds countdown before resend is available
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    resendBtn.classList.remove('text-pink-600', 'hover:text-pink-700');

    // Clear existing timer if any
    if (otpTimer) {
        clearInterval(otpTimer);
    }

    otpTimer = setInterval(() => {
        otpCountdown--;
        resendText.textContent = `Resend OTP (${otpCountdown}s)`;

        if (otpCountdown <= 0) {
            clearInterval(otpTimer);
            resendBtn.disabled = false;
            resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            resendBtn.classList.add('text-pink-600', 'hover:text-pink-700');
            resendText.textContent = 'Resend OTP';
            otpTimer = null;
        }
    }, 1000);
}

// ══════════════════════════════════════════════════════════════
// MOBILE OTP FUNCTIONS (MSG91 Integration)
// ══════════════════════════════════════════════════════════════
var mobileSending = false;
var mobileOtpSentTo = '';
var mobileOtpTimer = null;
var mobileOtpCountdown = 0;

async function sendMobileOTP(isResend) {
    const phoneInput = document.getElementById('phoneInput');
    const sendBtn = document.getElementById('send-mobile-otp-btn');
    const sendText = document.getElementById('send-mobile-otp-text');
    const spinner = document.getElementById('mobile-otp-spinner');
    const statusDiv = document.getElementById('mobileOtpStatus');

    if (!phoneInput || !sendBtn) return;

    const mobile = phoneInput.value.replace(/\D/g, '').trim();

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
        showMessage('Please enter a valid 10-digit mobile number (starting with 6–9) first.', 'error');
        phoneInput.focus();
        return;
    }

    if (mobileSending) return;

    mobileSending = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    sendText.textContent = 'Sending...';
    spinner.classList.remove('hidden');
    if (statusDiv) statusDiv.innerHTML = '';

    try {
        const resp = await fetch('/api/auth/send-mobile-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        const data = await resp.json();

        if (!resp.ok || !data.success) {
            throw new Error(data.error || 'Failed to send OTP');
        }

        mobileOtpSentTo = mobile;
        showMessage('📱 OTP sent to your mobile number!', 'success');

        // Show OTP input section
        const otpSection = document.getElementById('mobile-otp-section');
        if (otpSection) {
            otpSection.classList.remove('hidden');
            setTimeout(() => {
                const otpInput = document.getElementById('mobileOtp');
                if (otpInput) otpInput.focus();
            }, 100);
        }

        if (statusDiv) statusDiv.innerHTML = '<span class="text-green-600">✅ OTP sent successfully!</span>';

        sendText.textContent = 'Resend OTP';
        startMobileOtpCountdown();

    } catch (err) {
        console.error('Send Mobile OTP error:', err);
        const msg = err.message || 'Failed to send OTP';
        showMessage(msg, 'error');
        if (statusDiv) statusDiv.innerHTML = `<span class="text-red-600">❌ ${msg}</span>`;
        sendText.textContent = mobileOtpSentTo ? 'Resend OTP' : 'Send OTP';
    } finally {
        mobileSending = false;
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        spinner.classList.add('hidden');
    }
}

async function verifyMobileOTP() {
    const otpInput = document.getElementById('mobileOtp');
    const verifyBtn = document.getElementById('verify-mobile-otp-btn');
    const verifyText = document.getElementById('verify-mobile-otp-text');
    const verifySpinner = document.getElementById('mobile-otp-verify-spinner');
    const statusDiv = document.getElementById('mobileOtpVerifyStatus');

    if (!otpInput || !verifyBtn) return;

    const otp = otpInput.value.trim();
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
        showMessage('Please enter the 6-digit OTP received on your mobile.', 'error');
        otpInput.focus();
        return;
    }

    if (!mobileOtpSentTo) {
        showMessage('Please send OTP first.', 'error');
        return;
    }

    verifyBtn.disabled = true;
    verifyText.textContent = 'Verifying...';
    if (verifySpinner) verifySpinner.classList.remove('hidden');
    if (statusDiv) statusDiv.innerHTML = '';

    try {
        const resp = await fetch('/api/auth/verify-mobile-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: mobileOtpSentTo, otp })
        });
        const data = await resp.json();

        if (!resp.ok || !data.success) {
            throw new Error(data.error || 'Invalid OTP');
        }

        // ✅ Success
        window.isMobileVerified = true;
        sessionStorage.setItem('mobileVerified', 'true');
        sessionStorage.setItem('verifiedMobile', mobileOtpSentTo);

        showMessage('✅ Mobile number verified successfully!', 'success');

        if (verifyText) verifyText.textContent = '✅ Verified';
        verifyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        verifyBtn.classList.add('bg-gray-400', 'cursor-not-allowed');

        if (statusDiv) statusDiv.innerHTML = '<span class="text-green-600 font-semibold">✅ Mobile verified!</span>';

        // Clear timer
        if (mobileOtpTimer) { clearInterval(mobileOtpTimer); mobileOtpTimer = null; }

        setTimeout(() => {
            const otpSection = document.getElementById('mobile-otp-section');
            if (otpSection) otpSection.classList.add('hidden');

            const mobileVerifiedBadge = document.getElementById('mobile-verified');
            if (mobileVerifiedBadge) mobileVerifiedBadge.classList.remove('hidden');
        }, 1200);

        // Auto-trigger 6-digit auto-verify
        if (otpInput) {
            otpInput.removeEventListener('input', otpInput._mobileAutoVerify);
        }

    } catch (err) {
        console.error('Verify Mobile OTP error:', err);
        const msg = err.message || 'Invalid OTP. Please try again.';
        showMessage(msg, 'error');
        if (statusDiv) statusDiv.innerHTML = `<span class="text-red-600 font-semibold">❌ ${msg}</span>`;
        otpInput.value = '';
        otpInput.focus();
    } finally {
        if (!window.isMobileVerified) {
            verifyBtn.disabled = false;
            verifyText.textContent = 'Verify';
            if (verifySpinner) verifySpinner.classList.add('hidden');
        }
    }
}

function startMobileOtpCountdown() {
    const resendBtn = document.getElementById('resend-mobile-otp-btn');
    const timerSpan = document.getElementById('mobileOtpTimer');
    const sendBtn = document.getElementById('send-mobile-otp-btn');
    const sendText = document.getElementById('send-mobile-otp-text');

    mobileOtpCountdown = 30;
    if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
    if (resendBtn) resendBtn.classList.add('hidden');

    if (mobileOtpTimer) clearInterval(mobileOtpTimer);

    mobileOtpTimer = setInterval(() => {
        mobileOtpCountdown--;
        if (timerSpan) timerSpan.textContent = `Resend available in ${mobileOtpCountdown}s`;

        if (mobileOtpCountdown <= 0) {
            clearInterval(mobileOtpTimer);
            mobileOtpTimer = null;
            if (timerSpan) timerSpan.textContent = 'You can resend OTP now';
            if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
            if (sendText) sendText.textContent = 'Resend OTP';
            if (resendBtn) resendBtn.classList.remove('hidden');
        }
    }, 1000);
}

// vevahamatrimony Frontend Logic
console.log('vevahamatrimony website loaded successfully!');

// currentStep is already declared at the top of the file

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded');
    initializeEventListeners();

    // Initialize email and mobile verification states
    window.isEmailVerified = false;
    window.isMobileVerified = false;

    // Ensure next button is disabled initially
    // nextStep1 initial state handled by register.html
    /*
    const nextBtn = document.getElementById('nextStep1');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
        nextBtn.classList.remove('bg-gradient-to-r', 'from-pink-600', 'to-pink-700');
    }
    */

    // Add event listeners for email input
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function () {
            // Reset verification state when email changes
            if (this.value.trim() !== otpSentEmail) {
                window.isEmailVerified = false;
                const otpSection = document.getElementById('otp-section');
                if (otpSection) otpSection.classList.add('hidden');

                const emailOtpStatus = document.getElementById('emailOtpStatus');
                if (emailOtpStatus) emailOtpStatus.innerHTML = '';

                // Disable next button
                // nextStep1 disable logic removed
                /*
                const nextBtn = document.getElementById('nextStep1');
                if (nextBtn) {
                    nextBtn.disabled = true;
                    nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
                    nextBtn.classList.remove('bg-gradient-to-r', 'from-pink-600', 'to-pink-700');
                }
                */
            }
        });
    }

    // Add event listeners for phoneInput
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            // Reset verification state when phone number changes
            if (this.value.replace(/\D/g, '').trim() !== mobileOtpSentTo) {
                window.isMobileVerified = false;
                
                const otpSection = document.getElementById('mobile-otp-section');
                if (otpSection) otpSection.classList.add('hidden');

                const mobileOtpVerifyStatus = document.getElementById('mobileOtpVerifyStatus');
                if (mobileOtpVerifyStatus) mobileOtpVerifyStatus.innerHTML = '';

                const mobileVerifiedBadge = document.getElementById('mobile-verified');
                if (mobileVerifiedBadge) mobileVerifiedBadge.classList.remove('hidden'); // hide by adding/removing classes correctly
                if (mobileVerifiedBadge) mobileVerifiedBadge.classList.add('hidden');
                
                const mobileOtpStatus = document.getElementById('mobileOtpStatus');
                if (mobileOtpStatus) mobileOtpStatus.innerHTML = '';
            }
        });
    }

    // Add event listener for OTP input (auto-submit on 6 digits)
    const otpInput = document.getElementById('otp');
    if (otpInput) {
        otpInput.addEventListener('input', function () {
            // Only allow numbers
            this.value = this.value.replace(/[^0-9]/g, '');

            // Auto-verify when 6 digits are entered
            if (this.value.length === 6) {
                setTimeout(() => verifyOTP(), 100);
            }
        });

        // Add Enter key support
        otpInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && this.value.length === 6) {
                verifyOTP();
            }
        });
    }

    // Mobile OTP auto-verify when 6 digits entered
    const mobileOtpInput = document.getElementById('mobileOtp');
    if (mobileOtpInput) {
        mobileOtpInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
            if (this.value.length === 6) {
                setTimeout(() => verifyMobileOTP(), 100);
            }
        });
        mobileOtpInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && this.value.length === 6) {
                verifyMobileOTP();
            }
        });
    }

    // Add page load animation to body
    document.body.classList.add('page-load-animation');

    // Check user session and update navbar
    updateNavbarBasedOnSession();

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && href.length > 1) {
                e.preventDefault();
                try {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                } catch (error) {
                    console.warn('Invalid selector for smooth scrolling:', href);
                }
            }
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('nav');
        if (window.scrollY > 50) {
            navbar.classList.add('backdrop-blur-sm', 'bg-white/95');
        } else {
            navbar.classList.remove('backdrop-blur-sm', 'bg-white/95');
        }
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Counter animation for statistics
    function animateCounters() {
        const counters = document.querySelectorAll('[data-count]');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current).toLocaleString();
            }, 16);
        });
    }

    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('#mobile-menu-button');
    const mobileMenu = document.querySelector('#mobile-nav-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Initialize search dropdown functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Prevent dropdown from closing when clicking inside it
        const searchDropdown = document.getElementById('searchSuggestions');
        if (searchDropdown) {
            searchDropdown.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });
        }
    }

    // Add form validation to all forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function (e) {
            const emailInputs = form.querySelectorAll('input[type="email"]');
            const phoneInputs = form.querySelectorAll('input[type="tel"]');

            emailInputs.forEach(input => {
                if (input.value && !isValidEmail(input.value)) {
                    e.preventDefault();
                    alert('Please enter a valid email address.');
                    input.focus();
                    return;
                }
            });

            phoneInputs.forEach(input => {
                if (input.value && !validatePhone(input.value)) {
                    e.preventDefault();
                    alert('Please enter a valid 10-digit mobile number.');
                    input.focus();
                    return;
                }
            });
        });
    });

    // Image lazy loading
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('opacity-0');
                img.classList.add('opacity-100');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    // Success stories carousel (if exists)
    const testimonialCarousel = document.querySelector('#testimonials-carousel');
    if (testimonialCarousel) {
        let currentSlide = 0;
        const slides = testimonialCarousel.querySelectorAll('.testimonial-slide');
        const totalSlides = slides.length;

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.toggle('hidden', i !== index);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }

        // Auto-play testimonials
        setInterval(nextSlide, 5000);
    }

    // Membership plan selection
    document.querySelectorAll('.membership-card button').forEach(button => {
        button.addEventListener('click', function () {
            const planName = this.closest('.membership-card').querySelector('h3').textContent;
            const planPrice = this.closest('.membership-card').querySelector('.text-3xl').textContent;

            // Store selected plan in localStorage
            localStorage.setItem('selectedPlan', JSON.stringify({
                name: planName,
                price: planPrice
            }));

            showNotification(`${planName} plan selected! Redirecting to payment...`, 'success');

            // Simulate payment redirect
            setTimeout(() => {
                alert('This is a demo. In production, this would redirect to Razorpay payment gateway.');
            }, 2000);
        });
    });

    // Profile visibility toggle
    const visibilityToggles = document.querySelectorAll('.visibility-toggle');
    visibilityToggles.forEach(toggle => {
        toggle.addEventListener('change', function () {
            const profileCard = this.closest('.profile-card');
            if (this.checked) {
                profileCard.classList.add('opacity-50');
                showNotification('Profile hidden from search results', 'info');
            } else {
                profileCard.classList.remove('opacity-50');
                showNotification('Profile visible in search results', 'success');
            }
        });
    });

    // Search functionality (if search page exists)
    const searchForm = document.querySelector('#searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const searchParams = Object.fromEntries(formData);

            // Simulate search
            showNotification('Searching for matches...', 'info');
            setTimeout(() => {
                showNotification('Found 25 matches! Check your results below.', 'success');
            }, 2000);
        });
    }

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function () {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute z-50 px-2 py-1 text-sm text-white bg-gray-800 rounded shadow-lg';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.top = this.offsetTop - 30 + 'px';
            tooltip.style.left = this.offsetLeft + 'px';
            document.body.appendChild(tooltip);
            this.tooltipElement = tooltip;
        });

        element.addEventListener('mouseleave', function () {
            if (this.tooltipElement) {
                this.tooltipElement.remove();
                this.tooltipElement = null;
            }
        });
    });

    // Loading states for buttons
    document.querySelectorAll('button[data-loading]').forEach(button => {
        button.addEventListener('click', function () {
            const originalText = this.textContent;
            this.innerHTML = '<div class="spinner inline-block mr-2"></div>Loading...';
            this.disabled = true;

            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
            }, 2000);
        });
    });

    // Initialize counter animation when stats section is visible
    const statsSection = document.querySelector('#stats-section');
    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.unobserve(entry.target);
                }
            });
        });
        statsObserver.observe(statsSection);
    }

    // Cookie consent (GDPR compliance)
    if (!localStorage.getItem('cookieConsent')) {
        const cookieBanner = document.createElement('div');
        cookieBanner.className = 'fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50';
        cookieBanner.innerHTML = `
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <p class="text-sm">We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>
                <button id="acceptCookies" class="bg-pink-600 px-4 py-2 rounded text-sm hover:bg-pink-700">Accept</button>
            </div>
        `;
        document.body.appendChild(cookieBanner);

        document.getElementById('acceptCookies').addEventListener('click', function () {
            localStorage.setItem('cookieConsent', 'true');
            cookieBanner.remove();
        });
    }

    // Add submit button click handler as backup
    const submitBtn = document.getElementById('submitForm');
    if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
            if (!window.isEmailVerified) {
                e.preventDefault();
                showMessage('Please verify your email address before submitting', 'error');
                return false;
            }
        });
    }
});

function initializeEventListeners() {
    // Email verification buttons
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const resendOtpBtn = document.getElementById('resend-otp-btn');

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', sendOTP);
    }
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', verifyOTP);
    }
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', sendOTP);
    }

    // Step navigation buttons
    const nextStep1Btn = document.getElementById('nextStep1');
    const nextStep2Btn = document.getElementById('nextStep2');
    const prevStep2Btn = document.getElementById('prevStep2');
    const prevStep3Btn = document.getElementById('prevStep3');

    // nextStep1 click handler handled by register.html
    /*
    if (nextStep1Btn) {
        nextStep1Btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!window.isEmailVerified) {
                showMessage('Please verify your email address first', 'error');
                return;
            }
            showStep(2);
        });
    }
    */

    if (nextStep2Btn) {
        nextStep2Btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (validateStep2()) {
                showStep(3);
            }
        });
    }

    if (prevStep2Btn) {
        prevStep2Btn.addEventListener('click', function (e) {
            e.preventDefault();
            showStep(1);
        });
    }

    if (prevStep3Btn) {
        prevStep3Btn.addEventListener('click', function (e) {
            e.preventDefault();
            showStep(2);
        });
    }
}

// Show step function
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(stepElement => {
        stepElement.classList.add('hidden');
    });

    // Show current step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }

    // Update progress indicator
    updateProgress(stepNumber);
}

function updateProgress(currentStep) {
    const progressSteps = document.querySelectorAll('.step-indicator');
    progressSteps.forEach((stepElement, index) => {
        if (index < currentStep) {
            stepElement.classList.remove('bg-gray-300', 'text-gray-600');
            stepElement.classList.add('bg-pink-600', 'text-white');
        } else if (index === currentStep - 1) {
            stepElement.classList.remove('bg-gray-300', 'text-gray-600');
            stepElement.classList.add('bg-pink-600', 'text-white');
        } else {
            stepElement.classList.remove('bg-pink-600', 'text-white');
            stepElement.classList.add('bg-gray-300', 'text-gray-600');
        }
    });
}

// Validate step 2
function validateStep2() {
    const profilePicture = document.getElementById('profilePicture');
    const aadharCard = document.querySelector('input[name=" aadharCard"]');
    const panCard = document.querySelector('input[name="panCard"]');

    if (!profilePicture || profilePicture.files.length === 0) {
        showMessage('Please upload your profile picture', 'error');
        return false;
    }

    if (!aadharCard || aadharCard.files.length === 0) {
        showMessage('Please upload your Aadhar card', 'error');
        return false;
    }

    if (!panCard || panCard.files.length === 0) {
        showMessage('Please upload your PAN card', 'error');
        return false;
    }

    return true;
}


// User Session Management Functions
function updateNavbarBasedOnSession() {
    const userSession = localStorage.getItem('userSession');
    const userData = localStorage.getItem('userData');
    const navbar = document.querySelector('nav .flex.items-center.space-x-4');

    if (!navbar) return;

    // Check if user is logged in
    const isLoggedIn = userSession && userData;

    if (isLoggedIn) {
        // User is logged in - show profile dropdown
        try {
            const user = JSON.parse(userData);
            const profilePic = user.profilePicture || 'https://via.placeholder.com/40x40/ec4899/ffffff?text=U';

            navbar.innerHTML = `
                <a href="index.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Home</a>
                <a href="matches.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Matches</a>
                <a href="requests.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Requests</a>
                <a href="membership.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Premium Plans</a>
                <a href="chatbot.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Ask AI</a>
                <a href="active-members.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Contact</a>

                <!-- Profile Dropdown -->
                <div class="relative" id="profileDropdown">
                    <button class="flex items-center space-x-2 text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md" onclick="toggleProfileDropdown()">
                        <img src="${profilePic}" alt="Profile" class="w-8 h-8 rounded-full border-2 border-pink-300 object-cover">
                        <span class="hidden sm:block">${user.fullName || 'User'}</span>
                        <i class="fas fa-chevron-down text-sm"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    <div id="dropdownMenu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div class="py-1">
                            <a href="home.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                                <i class="fas fa-tachometer-alt mr-2"></i>
                                Dashboard
                            </a>
                            <a href="account-settings.html" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                                <i class="fas fa-edit mr-2"></i>
                                Edit Profile
                            </a>
                            <div class="border-t border-gray-100"></div>
                            <button onclick="logoutUser()" class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <i class="fas fa-sign-out-alt mr-2"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error parsing user data:', error);
            showLoggedOutNavbar();
        }
    } else {
        // User is not logged in - show register/login buttons
        showLoggedOutNavbar();
    }
}

function showLoggedOutNavbar() {
    const navbar = document.querySelector('nav .flex.items-center.space-x-4');
    if (!navbar) return;

    navbar.innerHTML = `
        <a href="index.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Home</a>
        <a href="membership.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Membership</a>
        <a href="about.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">About</a>
        <a href="faq.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">FAQ</a>
        <a href="contact.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Contact</a>
        <a href="register.html" class="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md">Register</a>
        <a href="login.html" class="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700">Login</a>
    `;
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const profileDropdown = document.getElementById('profileDropdown');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (profileDropdown && dropdownMenu && !profileDropdown.contains(event.target)) {
        dropdownMenu.classList.add('hidden');
    }
});

function logoutUser() {
    if (confirm('Are you sure you want to log out?')) {
        // Clear all user data from localStorage
        localStorage.removeItem('userSession');
        localStorage.removeItem('userData');
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('profilePic');
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedMembershipPlan');

        // Clear sessionStorage as well
        sessionStorage.clear();

        // Show notification
        showMessage('Logged out successfully!', 'info');

        // Update navbar
        updateNavbarBasedOnSession();

        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Utility Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const re = /^[6-9]\d{9}$/;
    return re.test(phone);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN');
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        } text-white`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Step Navigation Functions
function nextStep() {
    // Check if email is verified for step 1
    if (currentStep === 1 && !isEmailVerified) {
        showMessage('Please verify your email first.', 'error');
        return;
    }

    const currentStepEl = document.getElementById(`step-${currentStep}`);
    const nextStepEl = document.getElementById(`step-${currentStep + 1}`);

    if (currentStepEl && nextStepEl) {
        currentStepEl.style.display = 'none';
        nextStepEl.style.display = 'block';
        currentStep++;
        updateStepIndicator();
    }
}

function prevStep() {
    const currentStepEl = document.getElementById(`step-${currentStep}`);
    const prevStepEl = document.getElementById(`step-${currentStep - 1}`);

    if (currentStepEl && prevStepEl && currentStep > 1) {
        currentStepEl.style.display = 'none';
        prevStepEl.style.display = 'block';
        currentStep--;
        updateStepIndicator();
    }
}

function updateStepIndicator() {
    const indicators = document.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, index) => {
        if (index + 1 <= currentStep) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}



// Search suggestion dropdown functionality
function initializeSearchDropdown() {
    const searchInputs = document.querySelectorAll('#searchInput, #mobileSearchInput');

    searchInputs.forEach(searchInput => {
        if (!searchInput) return;

        // Create suggestion dropdown
        const suggestionDropdown = createSuggestionDropdown(searchInput);

        // Show suggestions on focus
        searchInput.addEventListener('focus', () => {
            suggestionDropdown.style.display = 'block';
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionDropdown.contains(e.target)) {
                suggestionDropdown.style.display = 'none';
            }
        });

        // Hide suggestions on escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                suggestionDropdown.style.display = 'none';
                searchInput.blur();
            }
        });
    });
}

function createSuggestionDropdown(searchInput) {
    // Remove existing dropdown if any
    const existingDropdown = searchInput.parentElement.querySelector('.search-suggestions');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'search-suggestions absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 hidden';
    dropdown.style.display = 'none';

    const suggestions = [
        {
            icon: 'fas fa-heart',
            text: 'Search your match',
            subtitle: 'Find your perfect life partner',
            action: () => window.location.href = 'advanced-search.html'
        },
        {
            icon: 'fas fa-users',
            text: 'Browse profiles',
            subtitle: 'View active members',
            action: () => window.location.href = 'active-members.html'
        },
        {
            icon: 'fas fa-star',
            text: 'Premium members',
            subtitle: 'View premium profiles',
            action: () => window.location.href = 'membership.html'
        },
        {
            icon: 'fas fa-info-circle',
            text: 'About us',
            subtitle: 'Learn more about vevahamatrimony',
            action: () => window.location.href = 'about.html'
        },
        {
            icon: 'fas fa-envelope',
            text: 'Contact us',
            subtitle: 'Get in touch with vevahamatrimony',
            action: () => window.location.href = 'contact.html'
        }
    ];

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'flex items-center p-3 hover:bg-pink-50 cursor-pointer border-b border-gray-100 last:border-b-0';
        item.innerHTML = `
            <div class="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full mr-3">
                <i class="${suggestion.icon} text-pink-600"></i>
            </div>
            <div class="flex-1">
                <div class="font-medium text-gray-800">${suggestion.text}</div>
                <div class="text-sm text-gray-500">${suggestion.subtitle}</div>
            </div>
            <i class="fas fa-arrow-right text-gray-400"></i>
        `;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            suggestion.action();
        });

        dropdown.appendChild(item);
    });

    // Position dropdown relative to search input container
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(dropdown);

    return dropdown;
}

// Global rupee symbol formatting function
function formatRupeeAmount(amount) {
    const formattedAmount = typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount;
    return `<span class="rupee-symbol">₹${formattedAmount}</span>`;
}

// Apply rupee formatting to all currency displays on page load
document.addEventListener('DOMContentLoaded', function () {
    // Find all elements with rupee symbols and apply consistent styling
    const rupeeElements = document.querySelectorAll('*');
    rupeeElements.forEach(element => {
        if (element.textContent && element.textContent.includes('₹') && !element.classList.contains('rupee-symbol')) {
            const text = element.innerHTML;
            if (text.match(/₹[\d,]+/)) {
                element.innerHTML = text.replace(/₹([\d,]+)/g, '<span class="rupee-symbol">₹$1</span>');
            }
        }
    });
});

// Enhanced search functionality
function performSearch() {
    const searchInput = document.getElementById('searchInput') || document.getElementById('mobileSearchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        showNotification('Please enter a search term.', 'error');
        return;
    }

    // Check if user is logged in for profile searches
    const isLoggedIn = userData && userSession === 'active';

    // Enhanced website navigation mappings
    const navigationMappings = {
        // Primary pages
        'home': 'index.html',
        'homepage': 'index.html',
        'main': 'index.html',
        'welcome': 'index.html',

        // About and information
        'about': 'about.html',
        'about us': 'about.html',
        'company': 'about.html',
        'info': 'about.html',
        'information': 'about.html',

        // Contact
        'contact': 'contact.html',
        'contact us': 'contact.html',
        'reach': 'contact.html',
        'support': 'contact.html',
        'help': 'faq.html',

        // FAQ and Help
        'faq': 'faq.html',
        'frequently asked questions': 'faq.html',
        'questions': 'faq.html',
        'help center': 'help-center.html',

        // Authentication
        'register': 'register.html',
        'signup': 'register.html',
        'sign up': 'register.html',
        'join': 'register.html',
        'create account': 'register.html',
        'login': 'login.html',
        'signin': 'login.html',
        'sign in': 'login.html',
        'log in': 'login.html',

        // Membership and plans
        'membership': 'membership.html',
        'plans': 'membership.html',
        'premium': 'membership.html',
        'premium plans': 'membership.html',
        'vip': 'membership.html',
        'vip plans': 'membership.html',
        'pricing': 'membership.html',
        'packages': 'membership.html',
        'subscription': 'membership.html',

        // Core functionality
        'find': 'advanced-search.html',
        'search': 'advanced-search.html',
        'find match': 'advanced-search.html',
        'search match': 'advanced-search.html',
        'matches': 'matches.html',
        'profile': 'profile.html',
        'dashboard': 'home.html',
        'panel': 'home.html',
        'messages': 'messages.html',
        'chat': 'messages.html',
        'inbox': 'messages.html',
        'requests': 'requests.html',
        'interests': 'requests.html',

        // Additional pages
        'active members': 'active-members.html',
        'members': 'active-members.html',
        'users': 'active-members.html',
        'payment': 'payment.html',
        'pay': 'payment.html',
        'billing': 'payment.html',

        // Account management
        'forgot password': 'forgot-password.html',
        'reset password': 'forgot-password.html',
        'password reset': 'forgot-password.html',
        'edit profile': 'account-settings.html',
        'update profile': 'account-settings.html',
        'modify profile': 'account-settings.html',

        // Legal and policies
        'privacy': 'privacy-policy.html',
        'privacy policy': 'privacy-policy.html',
        'terms': 'terms.html',
        'terms and conditions': 'terms.html',
        'conditions': 'terms.html',
        'safety': 'safety-tips.html',
        'safety tips': 'safety-tips.html',
        'security': 'safety-tips.html',

        // Communication features
        'video call': 'video-call.html',
        'voice call': 'voice-call.html',
        'call': 'video-call.html',
        'video': 'video-call.html',
        'voice': 'voice-call.html',

        // Verification
        'verification': 'verification.html',
        'verify': 'verification.html',
        'validate': 'verification.html',

        // General matrimony terms
        'marriage': 'index.html',
        'matrimony': 'index.html',
        'wedding': 'index.html',
        'bride': 'advanced-search.html',
        'groom': 'advanced-search.html',
        'partner': 'advanced-search.html',
        'spouse': 'advanced-search.html',
        'life partner': 'advanced-search.html'
    };

    // Website Navigation: Check if search term matches any page
    const targetPage = navigationMappings[searchTerm];
    if (targetPage) {
        window.location.href = targetPage;
        return;
    }

    // Profile/User Search: Redirect to search results if logged in
    if (isLoggedIn) {
        window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
        return;
    }

    // Not logged in - show all possible matches
    showNotification(`Searching for "${searchTerm}"... Redirecting to login for profile searches.`, 'info');
    setTimeout(() => {
        if (targetPage) {
            window.location.href = targetPage;
        } else {
            window.location.href = `login.html?redirect=search-results.html?q=${encodeURIComponent(searchTerm)}`;
        }
    }, 1500);
}

// Mobile search functions
function handleMobileSearchKeyPress(event) {
    if (event.key === 'Enter') {
        performMobileSearch();
    }
}

function performMobileSearch() {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (!mobileSearchInput) return;

    const query = mobileSearchInput.value.trim();
    if (query) {
        // Use the same enhanced search logic
        performEnhancedSearch(query);
    } else {
        showMessage('Please enter a search term', 'error');
    }
}

// Search functionality
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function showSearchSuggestions() {
    const dropdown = document.getElementById('searchSuggestions');
    if (dropdown) {
        dropdown.classList.remove('hidden');
        dropdown.style.display = 'block';
    }
}

function hideSearchSuggestions() {
    setTimeout(() => {
        const dropdown = document.getElementById('searchSuggestions');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.style.display = 'none';
        }
    }, 200);
}

function navigateToPage(url) {
    window.location.href = url;
}

// Settings integration - use global settings script
// Fallback functions if global settings script is not loaded
window.changeLanguage = window.changeLanguage || function (lang) {
    localStorage.setItem('preferred_language', lang);
    document.documentElement.setAttribute('data-lang', lang);

    // Update language elements
    const englishElements = document.querySelectorAll('.lang-en');
    const tamilElements = document.querySelectorAll('.lang-ta');

    if (lang === 'ta') {
        englishElements.forEach(el => el.style.display = 'none');
        tamilElements.forEach(el => el.style.display = 'block');
    } else {
        englishElements.forEach(el => el.style.display = 'block');
        tamilElements.forEach(el => el.style.display = 'none');
    }

    showMessage;
};

window.toggleTheme = window.toggleTheme || function () {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = themeToggle ? themeToggle.checked : false;
    const newTheme = isDark ? 'dark' : 'light';

    localStorage.setItem('theme_preference', newTheme);

    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    }

    showMessage;
};

// Mobile menu toggle function
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-nav-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// Make functions globally available
window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;
window.sendMobileOTP = sendMobileOTP;
window.verifyMobileOTP = verifyMobileOTP;
window.showMessage = showMessage;
window.toggleProfileDropdown = toggleProfileDropdown;
window.logoutUser = logoutUser;
window.handleSearchKeyPress = handleSearchKeyPress;
window.performSearch = performSearch;
window.showSearchSuggestions = showSearchSuggestions;
window.hideSearchSuggestions = hideSearchSuggestions;
window.navigateToPage = navigateToPage;
window.toggleMobileMenu = toggleMobileMenu;
