// VEVAHA HOROSCOPIC AI - Matchmaking Database Functions
// Connects to Supabase to fetch user profiles and find compatible matches

class VevahaHoroscopicMatchmaker {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.tableName = 'users'; // Using existing users table from your schema
    }

    /**
     * Fetch user profile by matrimony_id
     * @param {string} matrimonyId - The matrimony ID to search for
     * @returns {Object} User profile data or null if not found
     */
    async fetchUserProfile(matrimonyId) {
        try {
            console.log(`🔍 Fetching profile for matrimony ID: ${matrimonyId}`);

            const { data, error } = await this.supabase
                .from(this.tableName)
                .select(`
                    matrimony_id,
                    full_name,
                    gender,
                    date_of_birth,
                    time_of_birth,
                    place_of_birth,
                    rasi,
                    nakshatra,
                    gotra,
                    caste,
                    partner_preference,
                    hobbies,
                    age,
                    height,
                    education,
                    profession,
                    city,
                    state,
                    profile_picture_url,
                    membership_plan
                `)
                .eq('matrimony_id', matrimonyId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log(`❌ No profile found with matrimony ID: ${matrimonyId}`);
                    return null;
                }
                throw error;
            }

            console.log(`✅ Profile found: ${data.full_name}`);
            return this.formatProfileData(data);

        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw new Error(`Failed to fetch profile: ${error.message}`);
        }
    }

    /**
     * Find potential matches for a user based on opposite gender
     * @param {Object} userProfile - The user's profile data
     * @returns {Array} Array of potential match profiles
     */
    async findPotentialMatches(userProfile) {
        try {
            const oppositeGender = userProfile.gender === 'Male' ? 'Female' : 'Male';
            console.log(`🔍 Finding ${oppositeGender} matches for ${userProfile.full_name}`);

            const { data, error } = await this.supabase
                .from(this.tableName)
                .select(`
                    matrimony_id,
                    full_name,
                    gender,
                    date_of_birth,
                    time_of_birth,
                    place_of_birth,
                    rasi,
                    nakshatra,
                    gotra,
                    caste,
                    partner_preference,
                    hobbies,
                    age,
                    height,
                    education,
                    profession,
                    city,
                    state,
                    profile_picture_url,
                    membership_plan
                `)
                .eq('gender', oppositeGender)
                .eq('profile_visible', true)
                .eq('profile_status', 'verified')
                .neq('matrimony_id', userProfile.matrimony_id)
                .limit(50);

            if (error) {
                throw error;
            }

            console.log(`✅ Found ${data.length} potential matches`);
            return data.map(profile => this.formatProfileData(profile));

        } catch (error) {
            console.error('Error finding potential matches:', error);
            throw new Error(`Failed to find matches: ${error.message}`);
        }
    }

    /**
     * Calculate horoscopic compatibility between two profiles using Porutham system
     * @param {Object} profile1 - First profile
     * @param {Object} profile2 - Second profile
     * @returns {Object} Compatibility analysis
     */
    calculateHoroscopicCompatibility(profile1, profile2) {
        // Initialize Porutham calculator
        const calculator = new PoruthamCalculator();

        // Check Gotra compatibility first (must be different)
        const gotraCompatible = profile1.gotra !== profile2.gotra;
        if (!gotraCompatible) {
            return {
                score: 0,
                maxScore: 6,
                percentage: 0,
                porutham: {},
                recommendations: ['❌ Same Gotra - Genetically not recommended'],
                verdict: '❌ Not Recommended (Same Gotra)',
                hobbyAlignment: { shared: [], score: 0 },
                preferenceAlignment: { matches: [], score: 0 }
            };
        }

        // Calculate Porutham scores
        const poruthams = calculator.calculatePoruthamScore(profile1, profile2);

        // Calculate additional compatibility factors
        const hobbyAlignment = calculator.calculateHobbyAlignment(profile1.hobbies, profile2.hobbies);
        const preferenceAlignment = calculator.checkPreferenceAlignment(profile1, profile2);

        // Generate recommendations
        const recommendations = [];
        recommendations.push('✅ Different Gotra - Genetically compatible');

        if (profile1.caste === profile2.caste) {
            recommendations.push('✅ Same Caste - Culturally aligned');
        } else {
            recommendations.push('⚠️ Different Caste - Consider family acceptance');
        }

        if (hobbyAlignment.shared.length > 0) {
            recommendations.push(`✅ Shared Interests: ${hobbyAlignment.shared.join(', ')}`);
        }

        if (preferenceAlignment.matches.length > 0) {
            recommendations.push(`✅ Preference Match: ${preferenceAlignment.matches.join(', ')}`);
        }

        return {
            score: poruthams.score,
            maxScore: poruthams.maxScore,
            percentage: poruthams.percentage,
            porutham: {
                'Rajju': poruthams.breakdown.rajju ? '✅' : '❌',
                'Dina': poruthams.breakdown.dina ? '✅' : '❌',
                'Gana': poruthams.breakdown.gana ? '✅' : '❌',
                'Yoni': poruthams.breakdown.yoni ? '✅' : '❌',
                'Mahendra': poruthams.breakdown.mahendra ? '✅' : '❌',
                'Vedha': poruthams.breakdown.vedha ? '✅' : '❌'
            },
            recommendations: recommendations,
            verdict: this.getEnhancedVerdict(poruthams.score),
            hobbyAlignment: hobbyAlignment,
            preferenceAlignment: preferenceAlignment
        };
    }

    /**
     * Get enhanced verdict based on Porutham score
     * @param {number} score - Porutham score out of 6
     * @returns {string} Verdict
     */
    getEnhancedVerdict(score) {
        if (score >= 5) {
            return '✅ Strongly Recommended';
        } else if (score >= 4) {
            return '✅ Recommended';
        } else if (score >= 3) {
            return '⚠️ Consider with Caution';
        } else {
            return '❌ Not Advised';
        }
    }

    /**
     * Get the best match for a user
     * @param {string} matrimonyId - User's matrimony ID
     * @returns {Object} Best match analysis
     */
    async getBestMatch(matrimonyId) {
        try {
            // Fetch user profile
            const userProfile = await this.fetchUserProfile(matrimonyId);
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            // Find potential matches
            const potentialMatches = await this.findPotentialMatches(userProfile);
            if (potentialMatches.length === 0) {
                return {
                    userProfile,
                    bestMatch: null,
                    message: 'No potential matches found at this time.'
                };
            }

            // Calculate compatibility for each match
            const compatibilityResults = potentialMatches.map(match => ({
                profile: match,
                compatibility: this.calculateHoroscopicCompatibility(userProfile, match)
            }));

            // Sort by compatibility score
            compatibilityResults.sort((a, b) => b.compatibility.score - a.compatibility.score);

            const bestMatch = compatibilityResults[0];

            return {
                userProfile,
                bestMatch: bestMatch.profile,
                compatibility: bestMatch.compatibility,
                allMatches: compatibilityResults.slice(0, 10), // Top 10 matches
                totalMatches: potentialMatches.length
            };

        } catch (error) {
            console.error('Error getting best match:', error);
            throw error;
        }
    }

    /**
     * Format profile data consistently
     * @param {Object} rawProfile - Raw profile data from database
     * @returns {Object} Formatted profile data
     */
    formatProfileData(rawProfile) {
        return {
            matrimony_id: rawProfile.matrimony_id,
            full_name: rawProfile.full_name,
            gender: rawProfile.gender,
            dob: rawProfile.date_of_birth,
            tob: rawProfile.time_of_birth || '12:00',
            pob: rawProfile.place_of_birth || rawProfile.city,
            rasi: rawProfile.rasi || 'Unknown',
            nakshatra: rawProfile.nakshatra || 'Unknown',
            gotra: rawProfile.gotra || 'Unknown',
            caste: rawProfile.caste,
            partner_preferences: this.parseStringArray(rawProfile.partner_preference),
            hobbies: this.parseStringArray(rawProfile.hobbies),
            age: rawProfile.age,
            height: rawProfile.height,
            education: rawProfile.education,
            profession: rawProfile.profession,
            city: rawProfile.city,
            state: rawProfile.state,
            profile_picture_url: rawProfile.profile_picture_url,
            membership_plan: rawProfile.membership_plan
        };
    }

    /**
     * Parse string array from database (handles both string and array formats)
     * @param {string|Array} value - Value to parse
     * @returns {Array} Parsed array
     */
    parseStringArray(value) {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value.split(',').map(item => item.trim()).filter(item => item);
            }
        }
        return [];
    }

    // Fetch opposite gender profiles for matching
    async getAllProfiles(userId) {
        const { data: userProfile, error: userError } = await this.supabase
            .from('users')
            .select('*')
            .eq('matrimony_id', userId)
            .single();

        if (userError || !userProfile) {
            throw new Error(`User profile ${userId} not found`);
        }

        const oppositeGender = userProfile.gender === 'Male' ? 'Female' : 'Male';

        const { data: profiles, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('gender', oppositeGender)
            .neq('matrimony_id', userId)
            .limit(20);

        if (error) {
            throw new Error('Error fetching profiles: ' + error.message);
        }

        return profiles || [];
    }

    async getBestMatch(userId) {
        try {
            const userProfile = await this.fetchUserProfile(userId);
            const potentialMatches = await this.getAllProfiles(userId);

            if (potentialMatches.length === 0) {
                return {
                    userProfile,
                    bestMatch: null,
                    allMatches: []
                };
            }

            const matchedProfiles = [];

            for (const profile of potentialMatches) {
                const compatibility = this.calculateHoroscopicCompatibility(userProfile, profile);

                if (compatibility.score >= 4) { // Minimum threshold
                    matchedProfiles.push({
                        profile,
                        compatibility
                    });
                }
            }

            // Sort by compatibility score
            matchedProfiles.sort((a, b) => b.compatibility.score - a.compatibility.score);

            const bestMatch = matchedProfiles[0]?.profile || null;

            return {
                userProfile,
                bestMatch,
                compatibility: matchedProfiles[0]?.compatibility || null,
                allMatches: matchedProfiles
            };

        } catch (error) {
            console.error('Error in getBestMatch:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VevahaHoroscopicMatchmaker;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.VevahaHoroscopicMatchmaker = VevahaHoroscopicMatchmaker;
}