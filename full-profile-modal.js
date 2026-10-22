/**
 * Full Profile Modal Component for VevahaMatrimony
 * - FIXED: UI Visibility & Scrolling
 * - NEW: Gated View (Blur details until Interest is sent)
 * - NEW: Full Data Integration (Family, Physical, Lifestyle)
 */

class FullProfileModal {
    constructor() {
        this.modal = null;
        this.currentProfile = null;
        this.status = 'locked'; // 'locked' | 'unlocked'
        this.options = {};
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('fpm-styles')) return;
        const styles = `
            <style id="fpm-styles">
                /* Robust Modal UI */
                #fpm-overlay {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    background-color: rgba(0, 0, 0, 0.85) !important;
                    z-index: 999999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: hidden !important;
                    backdrop-filter: blur(4px);
                    animation: fpm-fade 0.3s ease-out;
                }
                #fpm-container {
                    background-color: #ffffff !important;
                    width: 100% !important;
                    max-width: 960px !important;
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    position: relative !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    animation: fpm-slide 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    color: #1a1a1a !important;
                }
                @media (min-width: 768px) {
                    #fpm-container {
                        height: 92vh !important;
                        border-radius: 24px !important;
                    }
                }
                
                /* Layout Sections */
                #fpm-header { flex-shrink: 0; background-color: #f9fafb; border-bottom: 2px solid #f3f4f6; position: relative; }
                #fpm-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px; scroll-behavior: smooth; }
                #fpm-footer { flex-shrink: 0; padding: 20px; background-color: #ffffff; border-top: 2px solid #f3f4f6; text-align: center; }

                /* Blur Effect for Gated View */
                .fpm-blur-section {
                    position: relative;
                    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .fpm-blur-section.locked {
                    filter: blur(12px) grayscale(100%) !important;
                    pointer-events: none !important;
                    opacity: 0.5 !important;
                    user-select: none !important;
                }

                /* UI Elements */
                .fpm-field-label { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
                .fpm-field-value { font-size: 14px; font-weight: 700; color: #111827; }
                .fpm-close-btn { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; z-index: 1000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .fpm-close-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; transform: rotate(90deg); }

                /* Animations */
                @keyframes fpm-fade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fpm-slide { from { transform: translateY(50px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                
                /* Custom Scrollbar */
                #fpm-body::-webkit-scrollbar { width: 8px; }
                #fpm-body::-webkit-scrollbar-track { background: #f3f4f6; }
                #fpm-body::-webkit-scrollbar-thumb { background: #db2777; border-radius: 10px; border: 2px solid #f3f4f6; }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    async open(memberId, options = {}) {
        if (!memberId) return;
        this.options = options;

        try {
            const token = localStorage.getItem('vm_token') || localStorage.getItem('authToken');
            
            this.renderLoading();

            const [profileRes, sentRes] = await Promise.all([
                fetch(`/api/profile/${memberId}`, { headers: { 'Authorization': `Bearer ${token}` }}),
                fetch(`/api/requests/sent`, { headers: { 'Authorization': `Bearer ${token}` }})
            ]);

            const profileData = await profileRes.json();
            const sentData = await sentRes.json();

            if (!profileRes.ok) throw new Error(profileData.error || 'Failed to load profile');

            this.currentProfile = profileData.profile;
            this.contactStats = profileData.contact_stats || {};

            // Check if already interested or is own profile
            let exists = (sentData.requests || []).some(r => r.receiver_id === this.currentProfile.id);
            const isOwn = (localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).id === this.currentProfile.id : false);
            
            // Check localStorage for offline members interest
            if (!exists && this.currentProfile.id.toString().startsWith('offline_')) {
                const offlineInterests = JSON.parse(localStorage.getItem('vm_offline_interests') || '{}');
                if (offlineInterests[this.currentProfile.id]) exists = true;
            }

            this.status = 'unlocked'; // All members can view full profiles

            this.render();
        } catch (error) {
            console.error('FPM Error:', error);
            this.showNotification(error.message || 'Error occurred', 'error');
            this.close();
        }
    }

    renderLoading() {
        this.close();
        const html = `
            <div id="fpm-overlay">
                <div id="fpm-container" style="max-width: 400px; height: auto; padding: 40px; text-align: center; border-radius: 24px;">
                    <div style="width: 50px; height: 50px; border: 4px solid #db2777; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px;"></div>
                    <p style="font-weight: 800; color: #4b5563; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px;">Full Data Integration in progress...</p>
                </div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        document.body.style.overflow = 'hidden';
    }

    render() {
        const profile = this.currentProfile;
        const existing = document.getElementById('fpm-overlay');
        if (existing) existing.remove();

        // Resolve Image URLs
        const profilePic = this.resolveImageUrl(profile.profile_picture_url, 'profile-pictures');
        const horoscopeImg = this.resolveImageUrl(profile.horoscope_file_path || profile.horoscope_path, 'horoscopes');

        let currentUser = {};
        try {
            currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        } catch (e) {}
        const isSelf = profile.id === currentUser.id;
        const isPhotoLocked = !isSelf && (
            profile.hide_photo === true || 
            profile.hide_photo === 'true' || 
            profile.profile_photo_locked === true || 
            profile.profile_photo_locked === 'true'
        );
        const isHoroscopeLocked = !isSelf && (
            profile.hide_horoscope === true || 
            profile.hide_horoscope === 'true'
        );

        const html = `
<div id="fpm-overlay">
    <div id="fpm-container">
        
        <!-- Header: STATIC / UNBLURRED -->
        <div id="fpm-header" style="padding: 30px;">
            <div class="fpm-close-btn" onclick="window.fullProfileModal.close()"><i class="fas fa-times"></i></div>
            
            <div style="display: flex; align-items: flex-start; gap: 30px; flex-wrap: wrap; justify-content: center;">
                <div style="width: 14rem; height: 14rem; border-radius: 2rem; overflow: hidden; border: 4px solid #fff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); background: #eee; position: relative;">
                    <img src="${profilePic}" style="width: 100%; height: 100%; object-fit: cover; ${isPhotoLocked ? 'filter: blur(12px) grayscale(50%); pointer-events: none; -webkit-user-drag: none;' : ''}" onerror="this.src='/images/placeholder-profile.svg'">
                    ${profile.is_managed ? `
                        <div style="position: absolute; bottom: 10px; right: 10px; background: #10b981; color: #fff; padding: 4px 10px; border-radius: 10px; font-size: 10px; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-check-circle"></i> VERIFIED
                        </div>
                    ` : ''}
                </div>

                <div style="flex: 1; min-width: 300px; text-align: left;">
                    <div style="margin-bottom: 20px;">
                        <span style="background: ${profile.is_managed ? '#10b981' : '#db2777'}; color: #fff; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                            ${profile.is_managed ? 'Premium Uploaded' : (profile.plan_name || 'Free')} Member
                        </span>
                        <h2 style="font-size: 2.2rem; font-weight: 900; margin-top: 10px; color: #111827; line-height: 1;">${profile.full_name || 'Member'}</h2>
                        <p style="color: #db2777; font-weight: 800; font-size: 18px; margin-top: 4px; margin-bottom: 0;">${profile.member_id}</p>
                        <div id="fpm-contact-box">
                        ${profile.mobile_number ? `
                            ${(() => {
                                const primaryNum = (profile.mobile_number || '').split(',')[0].replace(/\D/g, '');
                                return `
                            <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 10px 15px; border-radius: 12px; margin-top: 12px; display: inline-flex; align-items: center; gap: 8px;">
                                <i class="fas fa-check-circle text-emerald-600"></i>
                                <div>
                                    <p style="font-size: 11px; color: #047857; font-weight: 700; margin: 0 0 2px 0; font-family: 'Poppins', sans-serif;">Verified Contact Number</p>
                                    <p style="font-size: 14px; color: #065f46; font-weight: 800; margin: 2px 0 0 0; font-family: 'Poppins', sans-serif;">
                                        <a href="tel:${primaryNum}" style="color: inherit; text-decoration: none; font-family: 'Poppins', sans-serif; font-weight: 800;"><i class="fas fa-phone-alt mr-1"></i> ${profile.mobile_number}</a>
                                        <span style="margin: 0 8px; color: #a7f3d0;">|</span>
                                        <a href="https://wa.me/${primaryNum}" target="_blank" style="color: inherit; text-decoration: none; font-family: 'Poppins', sans-serif; font-weight: 800;"><i class="fab fa-whatsapp mr-1 text-emerald-500"></i> WhatsApp</a>
                                    </p>
                                </div>
                            </div>`;
                            })()}
                        ` : `
                            ${!isSelf ? `
                            <div style="background: #fdf2f8; border: 1.5px dashed #f472b6; padding: 10px 16px; border-radius: 16px; margin-top: 12px; display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <div>
                                    <p style="font-size: 11px; color: #9d174d; font-weight: 700; margin: 0 0 2px 0;">
                                        <i class="fas fa-lock text-pink-600 mr-1"></i> Contact Details Locked
                                    </p>
                                    <p style="font-size: 13px; color: #64748b; font-weight: 800; margin: 0; letter-spacing: 1px;">
                                        +91 98••••••••
                                    </p>
                                </div>
                                <button id="fpm-unlock-btn" onclick="window.fullProfileModal.confirmContactUnlock()" style="background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(219,39,119,0.25); display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                                    <i class="fas fa-phone-alt"></i> View Contact Details
                                </button>
                                ${this.contactStats && this.contactStats.total !== undefined ? `
                                    <span id="fpm-quota-badge" style="font-size: 10px; font-weight: 700; color: #831843; background: #fce7f3; padding: 4px 10px; border-radius: 12px;">
                                        ${this.contactStats.total === Infinity ? 'Unlimited Views' : `${this.contactStats.remaining} of ${this.contactStats.total} views left`}
                                    </span>
                                ` : ''}
                            </div>
                            ` : ''}
                        `}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        ${this.row('Age', this.getAge(profile) + ' Yrs', true)}
                        ${this.row('Location', (profile.city || '') + (profile.state ? ', ' + profile.state : ''), true)}
                        ${this.row('Community', (profile.religion || '') + (profile.caste ? ' (' + profile.caste + ')' : ''), true)}
                    </div>
                </div>
            </div>
        </div>

        <!-- Body: GATED / BLURRED -->
        <div id="fpm-body">
            <div id="fpm-sensitive-content" class="fpm-blur-section ${this.status === 'locked' ? 'locked' : ''}">
                
                <!-- Section 1: Appearance & Lifestyle -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div style="background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #db2777; padding-bottom: 6px; margin-bottom: 12px; color: #db2777; text-transform: uppercase; letter-spacing: 0.05em;">Appearance & Physical</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            ${this.row('Marital Status', profile.marital_status)}
                            ${(profile.marital_status === 'Awaiting Divorce' && profile.divorce_case_number) ? this.row('Divorce Case No.', profile.divorce_case_number) : ''}
                            ${this.row('Body Type', profile.body_type)}
                            ${this.row('Skin Color', profile.skin_colour)}
                            ${this.row('Height', profile.height || (profile.height_custom ? profile.height_custom + ' cm' : ''))}
                            ${this.row('Weight', profile.weight ? profile.weight + ' kg' : '')}
                            ${this.row('Disability', profile.disability === 'yes' ? profile.disability_other || 'Yes' : 'None')}
                            ${this.row('Children', (profile.number_of_children && profile.number_of_children > 0) ? (profile.number_of_children + ' (' + (profile.children_living_status || 'Living with me') + ')') : 'None')}
                            ${(profile.number_of_children && profile.number_of_children > 0 && profile.children_gender) ? this.row('Children Gender', profile.children_gender) : ''}
                            ${(profile.divorce_decree_path && profile.divorce_decree_path !== 'null' && profile.divorce_decree_path !== 'undefined' && profile.divorce_decree_path !== '[]') ? `
                                <div style="grid-column: span 2; margin-top: 5px;">
                                    <p class="fpm-field-label">Divorce Decree</p>
                                    <a href="${this.resolveImageUrl(profile.divorce_decree_path, 'documents')}" target="_blank" style="font-size: 11px; font-weight: 800; color: #db2777; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; border: 1.5px solid #db2777; padding: 6px 12px; border-radius: 8px; background: #fff5f8; transition: all 0.2s; max-width: 100%; box-sizing: border-box;" onmouseover="this.style.background='#db2777'; this.style.color='#fff';" onmouseout="this.style.background='#fff5f8'; this.style.color='#db2777';">
                                        <i class="fas fa-file-pdf"></i> View Divorce Decree
                                    </a>
                                </div>
                            ` : ''}
                            ${(profile.death_certificate_path && profile.death_certificate_path !== 'null' && profile.death_certificate_path !== 'undefined' && profile.death_certificate_path !== '[]') ? `
                                <div style="grid-column: span 2; margin-top: 5px;">
                                    <p class="fpm-field-label">Death Certificate</p>
                                    <a href="${this.resolveImageUrl(profile.death_certificate_path, 'documents')}" target="_blank" style="font-size: 11px; font-weight: 800; color: #db2777; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; border: 1.5px solid #db2777; padding: 6px 12px; border-radius: 8px; background: #fff5f8; transition: all 0.2s; max-width: 100%; box-sizing: border-box;" onmouseover="this.style.background='#db2777'; this.style.color='#fff';" onmouseout="this.style.background='#fff5f8'; this.style.color='#db2777';">
                                        <i class="fas fa-file-pdf"></i> View Death Certificate
                                    </a>
                                </div>
                            ` : ''}
                            ${(profile.court_order_path && profile.court_order_path !== 'null' && profile.court_order_path !== 'undefined' && profile.court_order_path !== '[]') ? `
                                <div style="grid-column: span 2; margin-top: 5px;">
                                    <p class="fpm-field-label">Court Order</p>
                                    <a href="${this.resolveImageUrl(profile.court_order_path, 'documents')}" target="_blank" style="font-size: 11px; font-weight: 800; color: #db2777; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; border: 1.5px solid #db2777; padding: 6px 12px; border-radius: 8px; background: #fff5f8; transition: all 0.2s; max-width: 100%; box-sizing: border-box;" onmouseover="this.style.background='#db2777'; this.style.color='#fff';" onmouseout="this.style.background='#fff5f8'; this.style.color='#db2777';">
                                        <i class="fas fa-file-pdf"></i> View Court Order
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div style="background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #10b981; padding-bottom: 6px; margin-bottom: 12px; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em;">Habits & Lifestyle</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            ${this.row('Eating Hab.', profile.eating_habits)}
                            ${this.row('Smoking Hab.', profile.smoking_habits)}
                            ${this.row('Drinking Hab.', profile.drinking_habits)}
                            ${this.row('Mother Tongue', profile.mother_tongue)}
                            ${this.row('Spoken Lang.', profile.spoken_language)}
                            ${this.row('Registered By', profile.registering_on_behalf_of)}
                        </div>
                    </div>
                </div>

                <!-- Section 2: Birth & Professional -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div style="background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; margin-bottom: 12px; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em;">Birth & Location</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            ${this.row('Date of Birth', profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : '')}
                            ${this.row('Native Place', profile.native_place)}
                        </div>
                    </div>

                    <div style="background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px; margin-bottom: 12px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.05em;">Professional Profile</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            ${this.row('Education', profile.education)}
                            ${this.row('Studied At', profile.studied_at)}
                            ${this.row('Occupation', profile.job_roles || profile.occupation)}
                            ${this.row('Works At', profile.works_at)}
                            ${this.row('Employment', profile.employment_status)}
                            ${this.row('Annual Income', profile.annual_income)}
                        </div>
                    </div>
                </div>

                <!-- Section 3: Family Details (Expanded) -->
                <div style="background: #fff; padding: 25px; border-radius: 20px; border: 1px solid #f3f4f6; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #f43f5e; padding-bottom: 6px; margin-bottom: 15px; color: #f43f5e; text-transform: uppercase; letter-spacing: 0.05em;">Family Background</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                        <!-- Parents -->
                        <div style="grid-column: span 3; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-bottom: 15px; border-bottom: 1px dashed #eee;">
                            <div>
                                <p class="fpm-field-label">Father Details</p>
                                <p class="fpm-field-value">${profile.father_name || 'Not Specified'} (${profile.father_status || 'Unknown'})</p>
                                <p style="font-size: 11px; color: #6b7280; font-weight: 600;">Occ: ${profile.father_occupation || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="fpm-field-label">Mother Details</p>
                                <p class="fpm-field-value">${profile.mother_name || 'Not Specified'} (${profile.mother_status || 'Unknown'})</p>
                                <p style="font-size: 11px; color: #6b7280; font-weight: 600;">Occ: ${profile.mother_occupation || 'N/A'}</p>
                            </div>
                        </div>
                        <!-- Siblings -->
                        <div>
                            <p class="fpm-field-label">Brothers</p>
                            <p class="fpm-field-value">${profile.number_of_brothers || '0'} Brother(s)</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600; line-height: 1.2;">${profile.brothers_age_relation || ''} ${profile.brothers_marital_status || ''}</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600;">${profile.brothers_occupation_notes || ''}</p>
                        </div>
                        <div>
                            <p class="fpm-field-label">Sisters</p>
                            <p class="fpm-field-value">${profile.number_of_sisters || '0'} Sister(s)</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600; line-height: 1.2;">${profile.sisters_age_relation || ''} ${profile.sisters_marital_status || ''}</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600;">${profile.sisters_occupation_notes || ''}</p>
                        </div>
                        <div>
                            <p class="fpm-field-label">Family Overview</p>
                            <p class="fpm-field-value">
                                ${(() => {
                                    const type = this.beautifyValue(profile.family_type);
                                    const status = this.beautifyValue(profile.family_status);
                                    const parts = [type, status].filter(p => p !== 'Not Specified');
                                    return parts.length > 0 ? parts.join(' | ') : 'Not Specified';
                                })()}
                            </p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600;">Lifestyle: ${profile.family_lifestyle ? this.beautifyValue(profile.family_lifestyle) : 'Not Specified'}</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600;">Values: ${profile.family_values ? this.beautifyValue(profile.family_values) : 'Not Specified'}</p>
                            <p style="font-size: 10px; color: #6b7280; font-weight: 600;">Income: ${profile.family_income ? this.beautifyValue(profile.family_income) : 'Not Specified'}</p>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Religious, Astro & Jathagam -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div style="background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #f59e0b; padding-bottom: 6px; margin-bottom: 12px; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em;">Religious & Astro</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            ${this.row('Religion', profile.religion)}
                            ${this.row('Caste', profile.caste)}
                            ${this.row('Subcaste', profile.subcaste)}
                            ${this.row('Gotra', profile.gotra)}
                            ${this.row('Lagnam', profile.lagnam)}
                            ${this.row('Dosham', profile.dosham || 'No Dosham')}
                        </div>
                    </div>
                    <!-- Jathagam Image -->
                    <div style="background: #fff; padding: 15px; border-radius: 20px; border: 2px dashed #fcd34d; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <p class="fpm-field-label" style="margin-bottom: 12px; font-size: 11px;">Jathagam (Horoscope)</p>
                        <div style="background: #fff; padding: 10px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                            <img src="${horoscopeImg}" style="max-width: 100%; max-height: 100%; object-fit: contain; ${isHoroscopeLocked ? 'filter: blur(12px) grayscale(50%); pointer-events: none; -webkit-user-drag: none;' : 'cursor: pointer;'}" ${isHoroscopeLocked ? '' : 'onclick="window.open(this.src)"'} title="${isHoroscopeLocked ? 'Horoscope is hidden by member' : 'Click to view full image'}" onerror="this.src='/images/placeholder-jathagam.svg'">
                            ${isHoroscopeLocked ? `
                                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.4);">
                                    <i class="fas fa-lock text-gray-600 text-lg"></i>
                                </div>
                            ` : ''}
                        </div>
                        ${profile.horoscope_file_path || profile.horoscope_path ? `
                            <p style="font-size: 9px; color: #9ca3af; margin-top: 8px; font-weight: 600;">Verified Document attached</p>
                        ` : ''}
                    </div>
                </div>

                <!-- Section 5: Partner Preferences -->
                <div style="background: #eff6ff; padding: 25px; border-radius: 24px; border: 1px solid #dbeafe; margin-bottom: 25px;">
                    <h4 style="font-size: 11px; font-weight: 900; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; margin-bottom: 15px; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em;">Expected Partner Preferences</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        ${this.row('Age Range', (profile.preferred_age_from || '-') + ' to ' + (profile.preferred_age_to || '-') + ' Yrs')}
                        ${this.row('Height Range', (profile.preferred_height_from || '-') + ' to ' + (profile.preferred_height_to || '-') + ' cm')}
                        ${this.row('Marital Status', profile.preferred_marital_status)}
                        ${this.row('Location', profile.preferred_location)}
                        ${this.row('Community', profile.preferred_caste)}
                        ${this.row('Education', profile.preferred_education)}
                        ${this.row('Profession', profile.preferred_profession)}
                        ${this.row('Annual Income', profile.preferred_income)}
                        ${this.row('Family Type', profile.preferred_family_type)}
                        ${this.row('Family Values', profile.preferred_family_values)}
                        ${this.row('Horoscope Match', profile.preferred_horoscope_matching)}
                    </div>
                </div>

                <!-- Section 6: Bio / About -->
                <div style="background: #fff5f8; padding: 30px; border-radius: 24px; border: 1px solid #fce7f3; margin-bottom: 30px;">
                    <p class="fpm-field-label" style="text-align: center; color: #db2777;">About Myself</p>
                    <p style="text-align: center; font-weight: 600; line-height: 1.6; color: #4b5563; font-style: italic; font-size: 15px;">
                        "${profile.about_myself || 'No detailed description provided by member.'}"
                    </p>
                </div>

                <!-- Section 7: PRIVACY & DOCUMENTS -->
                <div style="background: #111827; padding: 30px; border-radius: 24px; color: #fff; text-align: center;">
                    <i class="fas fa-shield-alt" style="font-size: 24px; color: #db2777; margin-bottom: 15px;"></i>
                    <h5 style="font-weight: 900; margin-bottom: 8px;">Trust & Safety Verification</h5>
                    <p style="font-size: 13px; color: #9ca3af; max-width: 500px; margin: 0 auto 20px;">Direct contact details and ID proofs are encrypted. Only verified members can initiate secure communication.</p>
                    <div id="fpm-sec7-contacts" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                        ${profile.email_address ? `
                            <span style="background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #10b981; border: 1.5px solid rgba(16,185,129,0.4); font-family: 'Poppins', sans-serif;"><i class="fas fa-envelope mr-1.5 text-emerald-400"></i> Email Address: ${profile.email_address}</span>
                        ` : `
                            <span onclick="window.fullProfileModal.confirmContactUnlock()" style="background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 700; color: #db2777; border: 1px solid rgba(219,39,119,0.3); font-family: 'Poppins', sans-serif; cursor: pointer;"><i class="fas fa-lock mr-1"></i> Email Address: Click to Unlock</span>
                        `}
                        ${profile.mobile_number ? `
                            <span style="background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #10b981; border: 1.5px solid rgba(16,185,129,0.4); font-family: 'Poppins', sans-serif;"><i class="fas fa-phone-alt mr-1.5 text-emerald-400"></i> Contact Number: ${profile.mobile_number}</span>
                        ` : `
                            <span onclick="window.fullProfileModal.confirmContactUnlock()" style="background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 700; color: #db2777; border: 1px solid rgba(219,39,119,0.3); font-family: 'Poppins', sans-serif; cursor: pointer;"><i class="fas fa-lock mr-1"></i> Contact Number: Click to Unlock</span>
                        `}
                        <span style="background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 12px; font-size: 11px; font-weight: 800; color: ${profile.is_verified || profile.is_managed ? '#10b981' : '#9ca3af'}; border: 1px solid ${profile.is_verified || profile.is_managed ? '#10b981' : 'rgba(156,163,175,0.3)'};">
                            <i class="fas ${(profile.is_verified || profile.is_managed) ? 'fa-check-circle' : 'fa-clock'} mr-1"></i> ${(profile.is_verified || profile.is_managed) ? 'KYC Verified' : 'KYC Pending'}
                        </span>
                    </div>
                </div>

            </div>

            <!-- Profile Bottom Actions -->
            ${(!this.options.hideActions && !isSelf) ? `
            <div style="padding: 24px 20px 10px; text-align: center; display: flex; gap: 15px; justify-content: center; max-width: 500px; margin: 0 auto;">
                <button onclick="window.fullProfileModal.close()" style="flex: 1; padding: 14px; border-radius: 16px; background: #f3f4f6; color: #4b5563; font-weight: 800; border: none; cursor: pointer;">
                    Close
                </button>
                <button onclick="window.fullProfileModal.handleInterest()" style="flex: 2; padding: 14px; border-radius: 16px; background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 10px 15px rgba(219, 39, 119, 0.25);">
                    💖 Express Interest
                </button>
            </div>
            ` : ''}

        </div>

    </div>
</div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        this.modal = document.getElementById('fpm-overlay');
        document.body.style.overflow = 'hidden';
    }

    resolveImageUrl(path, bucket) {
        if (!path || path === 'null' || path === 'undefined' || path === '[]') return '/images/placeholder-' + (bucket === 'horoscopes' ? 'jathagam' : 'profile') + '.svg';
        
        // If it's already a full URL, return it
        if (path.startsWith('http')) return path;
        
        // If it starts with /images, treat it as a local path
        if (path.startsWith('/images')) return path;
        
        // Otherwise, assume it's a Supabase relative path (e.g., VM12345/horoscope.png)
        const supabaseBase = 'https://kpmbiatjlfdbuerzxpch.supabase.co/storage/v1/object/public/';
        return `${supabaseBase}${bucket}/${path}`;
    }

    beautifyValue(val) {
        if (!val || 
            val === 'null' || 
            val === 'undefined' || 
            val === '[]' ||
            val === '' || 
            val === '-' ||
            val === 'N/A' ||
            val === 'n/a') {
            return 'Not Specified';
        }
        
        const mappers = {
            'never-married': 'Never Married',
            'divorced': 'Divorced',
            'widowed': 'Widowed',
            'separated': 'Separated',
            'awaiting-divorce': 'Awaiting Divorce',
            'veg': 'Vegetarian',
            'vegetarian': 'Vegetarian',
            'non-veg': 'Non-Vegetarian',
            'non-vegetarian': 'Non-Vegetarian',
            'eggetarian': 'Eggetarian',
            'vegan': 'Vegan',
            'live': 'Alive',
            'pass-away': 'Passed Away',
            'passed-away': 'Passed Away',
            'nuclear': 'Nuclear',
            'joint': 'Joint',
            'no': 'No',
            'yes': 'Yes'
        };
        const lowerVal = String(val).trim().toLowerCase();
        return mappers[lowerVal] || val;
    }

    row(label, val, isPrimary = false) {
        const displayVal = this.beautifyValue(val);
        const finalVal = displayVal === 'Not Specified' ? (isPrimary ? 'Not Specified' : '—') : displayVal;

        return `
            <div style="min-width: 0;">
                <p class="fpm-field-label" style="${isPrimary?'color:#6b7280; margin-bottom:2px;':''}">${label}</p>
                <p class="fpm-field-value" style="${isPrimary?'font-size:15px; color:#111827;':''}">${finalVal}</p>
            </div>
        `;
    }

    getAge(profile) {
        if (profile.age) return profile.age;
        if (profile.date_of_birth) return Math.floor((Date.now() - new Date(profile.date_of_birth)) / 31557600000);
        return '-';
    }

    confirmContactUnlock() {
        if (!this.currentProfile) return;
        const profile = this.currentProfile;

        let currentUser = {};
        try { currentUser = JSON.parse(localStorage.getItem('userData') || '{}'); } catch(e){}
        const plan = (currentUser.plan_name || 'free').toLowerCase();

        // 1. If Free Plan: prompt to upgrade
        if (plan === 'free') {
            this.showUpgradeModal(
                'Upgrade Required to View Contacts',
                'Viewing verified contact numbers and WhatsApp requires an active membership plan (Silver, Gold, Diamond, or VIP).',
                'Upgrade Now'
            );
            return;
        }

        // 2. Check remaining views
        const remaining = this.contactStats?.remaining;
        const total = this.contactStats?.total;

        if (total !== Infinity && (remaining === 0 || remaining === undefined)) {
            this.showUpgradeModal(
                'Contact Views Exhausted',
                `You have used all ${total || ''} contact views in your ${plan.toUpperCase()} plan. Please upgrade to Gold, Diamond, or VIP to view more contacts.`,
                'Upgrade Plan'
            );
            return;
        }

        // 3. Show confirmation modal
        const planDisplay = plan.toUpperCase();
        const viewsLeftText = total === Infinity ? 'Unlimited' : remaining;

        const oldDialog = document.getElementById('fpm-confirm-dialog');
        if (oldDialog) oldDialog.remove();

        const modalHtml = `
            <div id="fpm-confirm-dialog" style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 1000000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fpm-fade 0.2s ease;">
                <div style="background: #fff; border-radius: 24px; max-width: 440px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
                    <div style="width: 60px; height: 60px; background: #fdf2f8; border: 2px solid #f472b6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #db2777; font-size: 24px;">
                        <i class="fas fa-address-book"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 800; color: #111827; margin: 0 0 8px 0;">View Contact Details?</h3>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 16px 0;">
                        You have <strong style="color: #db2777;">${viewsLeftText}</strong> contact views remaining on your <strong>${planDisplay}</strong> plan.
                    </p>
                    <p style="font-size: 13px; color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 12px; margin: 0 0 24px 0; border: 1px solid #e5e7eb;">
                        Viewing <strong>${profile.full_name || profile.member_id}</strong>'s contact details will consume <strong>1 contact view</strong> from your plan.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="document.getElementById('fpm-confirm-dialog').remove()" style="flex: 1; padding: 12px 18px; border-radius: 14px; background: #f3f4f6; color: #4b5563; font-weight: 700; border: none; cursor: pointer;">
                            Cancel
                        </button>
                        <button id="fpm-do-unlock-btn" onclick="window.fullProfileModal.executeContactUnlock()" style="flex: 1.3; padding: 12px 18px; border-radius: 14px; background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(219,39,119,0.3);">
                            Confirm & View
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async executeContactUnlock() {
        const dialog = document.getElementById('fpm-confirm-dialog');
        const btn = document.getElementById('fpm-do-unlock-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Unlocking...';
            btn.disabled = true;
        }

        try {
            const token = localStorage.getItem('vm_token') || localStorage.getItem('authToken');
            const res = await fetch('/api/profile/unlock-contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ member_id: this.currentProfile.member_id })
            });

            const data = await res.json();
            if (dialog) dialog.remove();

            if (!res.ok) {
                if (data.error === 'UPGRADE_REQUIRED') {
                    this.showUpgradeModal('Upgrade Required', data.message, 'Upgrade Plan');
                    return;
                }
                throw new Error(data.message || data.error || 'Failed to unlock contact');
            }

            // Update local profile state
            this.currentProfile.mobile_number = data.mobile_number || data.phone;
            this.currentProfile.email_address = data.email_address;
            this.currentProfile.is_contact_unlocked = true;
            if (this.contactStats) {
                this.contactStats.remaining = data.contacts_remaining;
            }

            // Dynamically update UI
            const primaryNum = (this.currentProfile.mobile_number || '').split(',')[0].replace(/\D/g, '');
            const contactBox = document.getElementById('fpm-contact-box');
            if (contactBox) {
                contactBox.innerHTML = `
                    <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 10px 15px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; animation: fpm-fade 0.3s ease;">
                        <i class="fas fa-check-circle text-emerald-600"></i>
                        <div>
                            <p style="font-size: 11px; color: #047857; font-weight: 700; margin: 0 0 2px 0; font-family: 'Poppins', sans-serif;">Verified Contact Number</p>
                            <p style="font-size: 14px; color: #065f46; font-weight: 800; margin: 2px 0 0 0; font-family: 'Poppins', sans-serif;">
                                <a href="tel:${primaryNum}" style="color: inherit; text-decoration: none; font-family: 'Poppins', sans-serif; font-weight: 800;"><i class="fas fa-phone-alt mr-1"></i> ${this.currentProfile.mobile_number}</a>
                                <span style="margin: 0 8px; color: #a7f3d0;">|</span>
                                <a href="https://wa.me/${primaryNum}" target="_blank" style="color: inherit; text-decoration: none; font-family: 'Poppins', sans-serif; font-weight: 800;"><i class="fab fa-whatsapp mr-1 text-emerald-500"></i> WhatsApp</a>
                            </p>
                        </div>
                    </div>
                `;
            }

            // Update Section 7
            const sec7 = document.getElementById('fpm-sec7-contacts');
            if (sec7) {
                sec7.innerHTML = `
                    ${this.currentProfile.email_address ? `
                        <span style="background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #10b981; border: 1.5px solid rgba(16,185,129,0.4); font-family: 'Poppins', sans-serif;"><i class="fas fa-envelope mr-1.5 text-emerald-400"></i> Email Address: ${this.currentProfile.email_address}</span>
                    ` : ''}
                    <span style="background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #10b981; border: 1.5px solid rgba(16,185,129,0.4); font-family: 'Poppins', sans-serif;"><i class="fas fa-phone-alt mr-1.5 text-emerald-400"></i> Contact Number: ${this.currentProfile.mobile_number}</span>
                    <span style="background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 12px; font-size: 11px; font-weight: 800; color: #10b981; border: 1px solid #10b981;">
                        <i class="fas fa-check-circle mr-1"></i> Contact Unlocked
                    </span>
                `;
            }

            const leftMsg = data.contacts_remaining !== undefined ? `${data.contacts_remaining} views remaining` : '';
            this.showNotification(`Contact unlocked! ${leftMsg}`, 'success');

        } catch (err) {
            console.error('Execute unlock error:', err);
            this.showNotification(err.message, 'error');
        }
    }

    showUpgradeModal(title, msg, btnText = 'Upgrade Plan') {
        const old = document.getElementById('fpm-upgrade-dialog');
        if (old) old.remove();

        const html = `
            <div id="fpm-upgrade-dialog" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fpm-fade 0.2s ease;">
                <div style="background: #fff; border-radius: 24px; max-width: 420px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f9a8d4, #ec4899); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #fff; font-size: 24px;">
                        <i class="fas fa-crown"></i>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 800; color: #111827; margin: 0 0 10px 0;">${title}</h3>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0;">${msg}</p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="document.getElementById('fpm-upgrade-dialog').remove()" style="flex: 1; padding: 12px 18px; border-radius: 14px; background: #f3f4f6; color: #4b5563; font-weight: 700; border: none; cursor: pointer;">
                            Maybe Later
                        </button>
                        <a href="membership.html" style="flex: 1.3; padding: 12px 18px; border-radius: 14px; background: linear-gradient(135deg, #ec4899, #db2777); color: #fff; font-weight: 800; text-decoration: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(219,39,119,0.3);">
                            ${btnText}
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async handleInterest() {
        const btn = event?.currentTarget;
        const profile = this.currentProfile;

        let currentUser = {};
        try { currentUser = JSON.parse(localStorage.getItem('userData') || '{}'); } catch(e){}
        const userPlan = (currentUser.plan_name || 'free').toLowerCase();

        // Check if free tier (including female free profiles): must upgrade to express interest
        if (userPlan === 'free') {
            this.showUpgradeModal(
                'Upgrade Required to Express Interest',
                'Sending interest requests to profiles requires an active membership plan. Please upgrade your plan to connect.',
                'Upgrade Plan'
            );
            return;
        }

        try {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
                btn.disabled = true;
            }

            const token = localStorage.getItem('vm_token') || localStorage.getItem('authToken');
            const res = await fetch('/api/requests/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiver_id: profile.id })
            });

            const result = await res.json();
            if (!res.ok) {
                if (result.error === 'UPGRADE_REQUIRED') {
                    this.showUpgradeModal('Upgrade Required', result.message, 'Upgrade Plan');
                    if (btn) { btn.innerHTML = '💖 Express Interest'; btn.disabled = false; }
                    return;
                }
                throw new Error(result.error || 'Request failed');
            }

            // Persist offline interest in localStorage
            if (profile.id.toString().startsWith('offline_')) {
                const offlineInterests = JSON.parse(localStorage.getItem('vm_offline_interests') || '{}');
                offlineInterests[profile.id] = true;
                localStorage.setItem('vm_offline_interests', JSON.stringify(offlineInterests));
            }

            if (btn) {
                btn.innerHTML = '<i class="fas fa-check mr-1"></i> Interest Sent';
                btn.style.background = '#10b981';
            }
            this.showNotification('Interest request sent successfully!', 'success');
        } catch (err) {
            console.error('Interest Error:', err);
            this.showNotification(err.message, 'error');
            if (btn) {
                btn.innerHTML = '💖 Express Interest';
                btn.disabled = false;
            }
        }
    }

    handleDecline() {
        this.showNotification('Profile skipped.', 'info');
        this.close();
        if (typeof loadMembers === 'function') loadMembers();
        if (typeof loadMatches === 'function') loadMatches();
    }

    showNotification(msg, type) {
        if (window.showNotification) return window.showNotification(msg, type);
        alert(msg);
    }

    close() {
        const overlay = document.getElementById('fpm-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease-out';
            setTimeout(() => {
                overlay.remove();
                this.modal = null;
                document.body.style.overflow = '';
            }, 200);
        }
    }
}

// Global exposure
window.fullProfileModal = new FullProfileModal();
window.showUpgradeModal = function(title, msg, btnText) {
    if (window.fullProfileModal) {
        window.fullProfileModal.showUpgradeModal(title, msg, btnText);
    } else {
        alert(msg || 'Upgrade your plan to unlock this feature.');
        window.location.href = 'membership.html';
    }
};

// ESC listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.fullProfileModal.modal) {
        window.fullProfileModal.close();
    }
});
