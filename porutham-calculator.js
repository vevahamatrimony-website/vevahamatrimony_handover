
// VEVAHA HOROSCOPIC AI - Porutham Calculator
// Traditional Tamil Vedic astrology compatibility calculations

class PoruthamCalculator {
    constructor() {
        // Rasi mappings (Moon Signs)
        this.rasiList = [
            'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
            'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
        ];

        // Nakshatra mappings
        this.nakshatraList = [
            'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
            'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
            'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
            'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
            'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
        ];

        // Gana classifications for each nakshatra
        this.nakshatraGana = {
            'Ashwini': 'Deva', 'Bharani': 'Manushya', 'Krittika': 'Rakshasa',
            'Rohini': 'Manushya', 'Mrigashira': 'Deva', 'Ardra': 'Manushya',
            'Punarvasu': 'Deva', 'Pushya': 'Deva', 'Ashlesha': 'Rakshasa',
            'Magha': 'Rakshasa', 'Purva Phalguni': 'Manushya', 'Uttara Phalguni': 'Manushya',
            'Hasta': 'Deva', 'Chitra': 'Rakshasa', 'Swati': 'Deva',
            'Vishakha': 'Rakshasa', 'Anuradha': 'Deva', 'Jyeshtha': 'Rakshasa',
            'Mula': 'Rakshasa', 'Purva Ashadha': 'Manushya', 'Uttara Ashadha': 'Manushya',
            'Shravana': 'Deva', 'Dhanishta': 'Rakshasa', 'Shatabhisha': 'Rakshasa',
            'Purva Bhadrapada': 'Manushya', 'Uttara Bhadrapada': 'Manushya', 'Revati': 'Deva'
        };

        // Rajju classifications for each nakshatra
        this.nakshatraRajju = {
            'Ashwini': 'Pada', 'Bharani': 'Pada', 'Krittika': 'Pada',
            'Rohini': 'Kati', 'Mrigashira': 'Kati', 'Ardra': 'Kati',
            'Punarvasu': 'Nabhi', 'Pushya': 'Nabhi', 'Ashlesha': 'Nabhi',
            'Magha': 'Uru', 'Purva Phalguni': 'Uru', 'Uttara Phalguni': 'Uru',
            'Hasta': 'Kantha', 'Chitra': 'Kantha', 'Swati': 'Kantha',
            'Vishakha': 'Shira', 'Anuradha': 'Shira', 'Jyeshtha': 'Shira',
            'Mula': 'Pada', 'Purva Ashadha': 'Pada', 'Uttara Ashadha': 'Pada',
            'Shravana': 'Kati', 'Dhanishta': 'Kati', 'Shatabhisha': 'Kati',
            'Purva Bhadrapada': 'Nabhi', 'Uttara Bhadrapada': 'Nabhi', 'Revati': 'Nabhi'
        };

        // Yoni (animal) classifications for each nakshatra
        this.nakshatraYoni = {
            'Ashwini': 'Horse', 'Bharani': 'Elephant', 'Krittika': 'Goat',
            'Rohini': 'Serpent', 'Mrigashira': 'Serpent', 'Ardra': 'Dog',
            'Punarvasu': 'Cat', 'Pushya': 'Goat', 'Ashlesha': 'Cat',
            'Magha': 'Rat', 'Purva Phalguni': 'Rat', 'Uttara Phalguni': 'Cow',
            'Hasta': 'Buffalo', 'Chitra': 'Tiger', 'Swati': 'Buffalo',
            'Vishakha': 'Tiger', 'Anuradha': 'Deer', 'Jyeshtha': 'Deer',
            'Mula': 'Dog', 'Purva Ashadha': 'Monkey', 'Uttara Ashadha': 'Mongoose',
            'Shravana': 'Monkey', 'Dhanishta': 'Lion', 'Shatabhisha': 'Horse',
            'Purva Bhadrapada': 'Lion', 'Uttara Bhadrapada': 'Cow', 'Revati': 'Elephant'
        };

        // Yoni compatibility matrix
        this.yoniCompatibility = {
            'Horse': ['Tiger', 'Dog', 'Goat'],
            'Elephant': ['Rat', 'Cow', 'Deer'],
            'Goat': ['Horse', 'Monkey', 'Cat'],
            'Serpent': ['Mongoose', 'Buffalo', 'Lion'],
            'Dog': ['Horse', 'Deer', 'Cat'],
            'Cat': ['Goat', 'Dog', 'Rat'],
            'Rat': ['Elephant', 'Cat', 'Cow'],
            'Cow': ['Elephant', 'Rat', 'Buffalo'],
            'Buffalo': ['Serpent', 'Cow', 'Tiger'],
            'Tiger': ['Horse', 'Buffalo', 'Monkey'],
            'Deer': ['Elephant', 'Dog', 'Lion'],
            'Monkey': ['Goat', 'Tiger', 'Lion'],
            'Mongoose': ['Serpent'],
            'Lion': ['Serpent', 'Deer', 'Monkey']
        };
    }

    /**
     * Calculate all 11 Porutham scores between two users (including Lagnam)
     * @param {Object} user1 - First user profile
     * @param {Object} user2 - Second user profile
     * @returns {Object} Compatibility analysis with all 11 Poruthams
     */
    calculatePoruthamScore(user1, user2) {
        const poruthams = {
            rajju: this.checkRajjuPorutham(user1, user2),
            dina: this.checkDinaPorutham(user1, user2),
            gana: this.checkGanaPorutham(user1, user2),
            yoni: this.checkYoniPorutham(user1, user2),
            mahendra: this.checkMahendraPorutham(user1, user2),
            vedha: this.checkVedhaPorutham(user1, user2),
            vasya: this.checkVasyaPorutham(user1, user2),
            varna: this.checkVarnaPorutham(user1, user2),
            nadi: this.checkNadiPorutham(user1, user2),
            rasi: this.checkRasiPorutham(user1, user2),
            lagnam: this.checkLagnamPorutham(user1, user2)
        };

        const totalScore = Object.values(poruthams).reduce((sum, score) => sum + score, 0);
        const maxScore = 11;

        return {
            score: totalScore,
            maxScore: maxScore,
            percentage: Math.round((totalScore / maxScore) * 100),
            breakdown: poruthams,
            verdict: this.getVerdict(totalScore)
        };
    }

    /**
     * Main calculatePorutham function for external usage
     * @param {Object} user1 - First user profile
     * @param {Object} user2 - Second user profile
     * @returns {Object} Simplified Porutham result
     */
    calculatePorutham(user1, user2) {
        const result = this.calculatePoruthamScore(user1, user2);
        
        return {
            poruthams: {
                rajju: result.breakdown.rajju === 1,
                dina: result.breakdown.dina === 1,
                gana: result.breakdown.gana === 1,
                yoni: result.breakdown.yoni === 1,
                mahendra: result.breakdown.mahendra === 1,
                vedha: result.breakdown.vedha === 1,
                vasya: result.breakdown.vasya === 1,
                varna: result.breakdown.varna === 1,
                nadi: result.breakdown.nadi === 1,
                rasi: result.breakdown.rasi === 1,
                lagnam: result.breakdown.lagnam === 1
            },
            score: result.score
        };
    }

    /**
     * Check Rajju Porutham - Longevity of marriage
     */
    checkRajjuPorutham(user1, user2) {
        const rajju1 = this.nakshatraRajju[user1.nakshatra];
        const rajju2 = this.nakshatraRajju[user2.nakshatra];
        
        // Same Rajju is not compatible
        return rajju1 !== rajju2 ? 1 : 0;
    }

    /**
     * Check Dina Porutham - Health and happiness
     */
    checkDinaPorutham(user1, user2) {
        const rasi1Index = this.rasiList.indexOf(user1.rasi);
        const rasi2Index = this.rasiList.indexOf(user2.rasi);
        
        if (rasi1Index === -1 || rasi2Index === -1) return 0;
        
        const distance = Math.abs(rasi2Index - rasi1Index);
        const normalizedDistance = Math.min(distance, 12 - distance);
        
        // Compatible if distance is 2, 4, 6, 8, 9, or 12 positions apart
        const compatibleDistances = [2, 4, 6, 8, 9, 0]; // 0 for 12 positions apart
        return compatibleDistances.includes(normalizedDistance) ? 1 : 0;
    }

    /**
     * Check Gana Porutham - Temperament match
     */
    checkGanaPorutham(user1, user2) {
        const gana1 = this.nakshatraGana[user1.nakshatra];
        const gana2 = this.nakshatraGana[user2.nakshatra];
        
        // Compatibility matrix for Gana
        const ganaCompatibility = {
            'Deva': ['Deva', 'Manushya'],
            'Manushya': ['Deva', 'Manushya', 'Rakshasa'],
            'Rakshasa': ['Manushya', 'Rakshasa']
        };
        
        return ganaCompatibility[gana1]?.includes(gana2) ? 1 : 0;
    }

    /**
     * Check Yoni Porutham - Sexual compatibility
     */
    checkYoniPorutham(user1, user2) {
        const yoni1 = this.nakshatraYoni[user1.nakshatra];
        const yoni2 = this.nakshatraYoni[user2.nakshatra];
        
        if (yoni1 === yoni2) return 1; // Same yoni is compatible
        
        return this.yoniCompatibility[yoni1]?.includes(yoni2) ? 1 : 0;
    }

    /**
     * Check Mahendra Porutham - Growth and prosperity
     */
    checkMahendraPorutham(user1, user2) {
        const rasi1Index = this.rasiList.indexOf(user1.rasi);
        const rasi2Index = this.rasiList.indexOf(user2.rasi);
        
        if (rasi1Index === -1 || rasi2Index === -1) return 0;
        
        // Male's rasi should be in 4th, 7th, 10th positions from female's rasi
        const distance = (rasi1Index - rasi2Index + 12) % 12;
        const mahendraPositions = [4, 7, 10];
        
        return mahendraPositions.includes(distance) ? 1 : 0;
    }

    /**
     * Check Vedha Porutham - Conflict or harm
     */
    checkVedhaPorutham(user1, user2) {
        const rasi1Index = this.rasiList.indexOf(user1.rasi);
        const rasi2Index = this.rasiList.indexOf(user2.rasi);
        
        if (rasi1Index === -1 || rasi2Index === -1) return 0;
        
        // Vedha pairs (these combinations should be avoided)
        const vedhaPairs = [
            [0, 6], [1, 5], [2, 8], [3, 9], [4, 10], [7, 11] // Index pairs
        ];
        
        const isVedha = vedhaPairs.some(([a, b]) => 
            (rasi1Index === a && rasi2Index === b) || 
            (rasi1Index === b && rasi2Index === a)
        );
        
        return isVedha ? 0 : 1;
    }

    /**
     * Check Vasya Porutham - Mutual attraction and control
     */
    checkVasyaPorutham(user1, user2) {
        // Vasya compatibility based on Rasi
        const vasyaRelations = {
            'Mesha': ['Simha', 'Vrischika'],
            'Vrishabha': ['Karka', 'Tula'],
            'Mithuna': ['Kanya'],
            'Karka': ['Vrischika', 'Dhanus'],
            'Simha': ['Tula'],
            'Kanya': ['Mithuna', 'Meena'],
            'Tula': ['Makara', 'Kumbha'],
            'Vrischika': ['Karka', 'Kanya'],
            'Dhanus': ['Meena'],
            'Makara': ['Mesha', 'Kumbha'],
            'Kumbha': ['Meena'],
            'Meena': ['Makara']
        };

        const user1Rasi = user1.rasi;
        const user2Rasi = user2.rasi;
        
        // Check mutual Vasya or same Rasi compatibility
        const user1Compatible = vasyaRelations[user1Rasi]?.includes(user2Rasi);
        const user2Compatible = vasyaRelations[user2Rasi]?.includes(user1Rasi);
        const sameRasi = user1Rasi === user2Rasi;
        
        return (user1Compatible || user2Compatible || sameRasi) ? 1 : 0;
    }

    /**
     * Check Varna Porutham - Social/spiritual compatibility
     */
    checkVarnaPorutham(user1, user2) {
        // Varna classification based on Rasi
        const varnaClassification = {
            'Mesha': 'Kshatriya',
            'Vrishabha': 'Vaishya',
            'Mithuna': 'Shudra',
            'Karka': 'Brahmin',
            'Simha': 'Kshatriya',
            'Kanya': 'Vaishya',
            'Tula': 'Shudra',
            'Vrischika': 'Brahmin',
            'Dhanus': 'Kshatriya',
            'Makara': 'Vaishya',
            'Kumbha': 'Shudra',
            'Meena': 'Brahmin'
        };

        const varna1 = varnaClassification[user1.rasi];
        const varna2 = varnaClassification[user2.rasi];
        
        // Varna hierarchy: Brahmin > Kshatriya > Vaishya > Shudra
        const varnaOrder = ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra'];
        const varna1Index = varnaOrder.indexOf(varna1);
        const varna2Index = varnaOrder.indexOf(varna2);
        
        // Male's varna should be equal or higher than female's varna
        return varna1Index <= varna2Index ? 1 : 0;
    }

    /**
     * Check Nadi Porutham - Genetic/health compatibility
     */
    checkNadiPorutham(user1, user2) {
        // Nadi classification for each nakshatra
        const nadiClassification = {
            'Ashwini': 'Vata', 'Bharani': 'Pitta', 'Krittika': 'Kapha',
            'Rohini': 'Vata', 'Mrigashira': 'Pitta', 'Ardra': 'Kapha',
            'Punarvasu': 'Vata', 'Pushya': 'Pitta', 'Ashlesha': 'Kapha',
            'Magha': 'Vata', 'Purva Phalguni': 'Pitta', 'Uttara Phalguni': 'Kapha',
            'Hasta': 'Vata', 'Chitra': 'Pitta', 'Swati': 'Kapha',
            'Vishakha': 'Vata', 'Anuradha': 'Pitta', 'Jyeshtha': 'Kapha',
            'Mula': 'Vata', 'Purva Ashadha': 'Pitta', 'Uttara Ashadha': 'Kapha',
            'Shravana': 'Vata', 'Dhanishta': 'Pitta', 'Shatabhisha': 'Kapha',
            'Purva Bhadrapada': 'Vata', 'Uttara Bhadrapada': 'Pitta', 'Revati': 'Kapha'
        };

        const nadi1 = nadiClassification[user1.nakshatra];
        const nadi2 = nadiClassification[user2.nakshatra];
        
        // Same Nadi is not compatible (genetic issues)
        return nadi1 !== nadi2 ? 1 : 0;
    }

    /**
     * Check Rasi Porutham - Moon sign compatibility
     */
    checkRasiPorutham(user1, user2) {
        const rasi1Index = this.rasiList.indexOf(user1.rasi);
        const rasi2Index = this.rasiList.indexOf(user2.rasi);
        
        if (rasi1Index === -1 || rasi2Index === -1) return 0;
        
        const distance = Math.abs(rasi2Index - rasi1Index);
        const normalizedDistance = Math.min(distance, 12 - distance);
        
        // Favorable distances: 1, 3, 5, 7, 9, 11 positions apart
        const favorableDistances = [1, 3, 5, 7, 9, 11];
        return favorableDistances.includes(normalizedDistance) ? 1 : 0;
    }

    /**
     * Check Lagnam Porutham - Ascendant compatibility
     */
    checkLagnamPorutham(user1, user2) {
        const lagnam1 = user1.lagnam;
        const lagnam2 = user2.lagnam;
        
        // If either Lagnam is missing, return neutral (0.5 weighted as 0)
        if (!lagnam1 || !lagnam2) return 0;
        
        // Simple compatibility: Different Lagnams are generally better
        // Same Lagnam can create similar nature which may lead to conflicts
        return lagnam1 !== lagnam2 ? 1 : 0;
    }

    /**
     * Get compatibility verdict based on score (updated for 11 Poruthams including Lagnam)
     */
    getVerdict(score) {
        if (score >= 9) return "Excellent Match";
        if (score >= 7) return "Strong Match";
        if (score >= 5) return "Good Match";
        if (score >= 3) return "Consider with Caution";
        return "Not Advised";
    }

    /**
     * Calculate hobby alignment score
     */
    calculateHobbyAlignment(hobbies1, hobbies2) {
        if (!hobbies1 || !hobbies2 || hobbies1.length === 0 || hobbies2.length === 0) {
            return { shared: [], score: 0 };
        }

        const shared = hobbies1.filter(hobby => hobbies2.includes(hobby));
        const score = Math.round((shared.length / Math.max(hobbies1.length, hobbies2.length)) * 100);
        
        return { shared, score };
    }

    /**
     * Check partner preference alignment
     */
    checkPreferenceAlignment(user1, user2) {
        const prefs1 = user1.partner_preferences || [];
        const prefs2 = user2.partner_preferences || [];
        
        if (prefs1.length === 0 || prefs2.length === 0) {
            return { matches: [], score: 50 }; // Neutral if no preferences specified
        }

        // Simple keyword matching for preferences
        const matches = [];
        const keywords = ['calm', 'vegetarian', 'working', 'educated', 'family-oriented', 'spiritual'];
        
        keywords.forEach(keyword => {
            const user1Has = prefs1.some(pref => pref.toLowerCase().includes(keyword));
            const user2Has = prefs2.some(pref => pref.toLowerCase().includes(keyword));
            
            if (user1Has && user2Has) {
                matches.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            }
        });

        const score = Math.round((matches.length / keywords.length) * 100);
        return { matches, score };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoruthamCalculator;
    
    // Export the calculatePorutham function directly
    module.exports.calculatePorutham = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePorutham(user1, user2);
    };
    
    // Export calculatePoruthamScore function
    module.exports.calculatePoruthamScore = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePoruthamScore(user1, user2);
    };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.PoruthamCalculator = PoruthamCalculator;
    
    // Export calculatePorutham function globally
    window.calculatePorutham = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePorutham(user1, user2);
    };
    
    // Export calculatePoruthamScore function globally
    window.calculatePoruthamScore = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePoruthamScore(user1, user2);
    };
    
    console.log('✅ PoruthamCalculator loaded and registered globally');
}

// For Node.js/CommonJS environments
if (typeof global !== 'undefined') {
    global.PoruthamCalculator = PoruthamCalculator;
    global.calculatePorutham = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePorutham(user1, user2);
    };
    global.calculatePoruthamScore = function(user1, user2) {
        const calculator = new PoruthamCalculator();
        return calculator.calculatePoruthamScore(user1, user2);
    };
}
