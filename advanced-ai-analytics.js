
// Advanced AI Analytics and Performance Tracking System
// Monitors and optimizes AI performance across both VevahaAI and VevahaHoroscopicAI

class AdvancedAIAnalytics {
    constructor() {
        this.analytics = {
            responseQuality: new Map(),
            userSatisfaction: new Map(),
            conversationFlow: new Map(),
            culturalAccuracy: new Map(),
            matchmakingSuccess: new Map()
        };
        
        this.performanceMetrics = {
            averageResponseTime: 0,
            trainingCompliance: 0,
            userEngagement: 0,
            conversionRates: {
                registration: 0,
                membership: 0,
                profile_completion: 0
            }
        };
    }
    
    // Track response quality
    trackResponseQuality(sessionId, response, userFeedback = null) {
        const quality = {
            timestamp: new Date(),
            responseLength: response.length,
            culturalTermsUsed: this.countCulturalTerms(response),
            trainingCompliant: this.validateTrainingCompliance(response),
            userFeedback: userFeedback,
            helpfulness: this.assessHelpfulness(response)
        };
        
        this.analytics.responseQuality.set(sessionId, quality);
    }
    
    // Track user satisfaction indicators
    trackUserSatisfaction(sessionId, indicators) {
        const satisfaction = {
            timestamp: new Date(),
            continuedConversation: indicators.continuedConversation || false,
            positiveLanguage: indicators.positiveLanguage || false,
            goalAchievement: indicators.goalAchievement || false,
            returnUser: indicators.returnUser || false
        };
        
        this.analytics.userSatisfaction.set(sessionId, satisfaction);
    }
    
    // Analyze conversation flow effectiveness
    analyzeConversationFlow(session) {
        const flow = {
            messageCount: session.messages?.length || 0,
            averageResponseTime: this.calculateAverageResponseTime(session),
            topicCoherence: this.assessTopicCoherence(session),
            naturalProgression: this.assessNaturalProgression(session),
            userEngagement: this.calculateEngagement(session)
        };
        
        this.analytics.conversationFlow.set(session.sessionId, flow);
        return flow;
    }
    
    // Generate comprehensive performance report
    generatePerformanceReport() {
        const report = {
            timestamp: new Date(),
            totalSessions: this.analytics.responseQuality.size,
            performanceMetrics: this.performanceMetrics,
            insights: this.generateInsights(),
            recommendations: this.generateRecommendations()
        };
        
        console.log('📊 AI Performance Report Generated:', report);
        return report;
    }
    
    // Count cultural terms usage
    countCulturalTerms(response) {
        const culturalTerms = [
            'vanakkam', 'rasi', 'nakshatra', 'porutham', 'gotra', 'caste',
            'tamil', 'hindu', 'vedic', 'matrimony', 'family', 'tradition'
        ];
        
        const lowerResponse = response.toLowerCase();
        return culturalTerms.filter(term => lowerResponse.includes(term)).length;
    }
    
    // Validate training compliance
    validateTrainingCompliance(response) {
        const hasVanakkam = response.toLowerCase().includes('vanakkam') || response.includes('வணக்கம்');
        const hasMatrimonialContext = response.toLowerCase().includes('matrimon') || 
                                     response.toLowerCase().includes('match') ||
                                     response.toLowerCase().includes('marriage');
        
        return hasVanakkam && (hasMatrimonialContext || response.length < 100);
    }
    
    // Assess response helpfulness
    assessHelpfulness(response) {
        let helpfulnessScore = 0;
        
        // Check for actionable advice
        if (response.includes('step') || response.includes('tip') || response.includes('guide')) {
            helpfulnessScore += 2;
        }
        
        // Check for contact information
        if (response.includes('+91') || response.includes('contact')) {
            helpfulnessScore += 1;
        }
        
        // Check for empathy and support
        if (response.includes('understand') || response.includes('help') || response.includes('support')) {
            helpfulnessScore += 1;
        }
        
        // Check for comprehensive information
        if (response.length > 200 && response.includes('because') || response.includes('reason')) {
            helpfulnessScore += 1;
        }
        
        return Math.min(helpfulnessScore, 5); // Max score of 5
    }
    
    // Calculate average response time for session
    calculateAverageResponseTime(session) {
        if (!session.messages || session.messages.length < 2) return 0;
        
        let totalTime = 0;
        let pairs = 0;
        
        for (let i = 1; i < session.messages.length; i++) {
            if (session.messages[i-1].role === 'user' && session.messages[i].role === 'assistant') {
                const timeDiff = new Date(session.messages[i].timestamp) - new Date(session.messages[i-1].timestamp);
                totalTime += timeDiff;
                pairs++;
            }
        }
        
        return pairs > 0 ? totalTime / pairs : 0;
    }
    
    // Assess topic coherence in conversation
    assessTopicCoherence(session) {
        if (!session.sessionMetadata?.topics) return 0;
        
        const topics = session.sessionMetadata.topics;
        const relatedTopicGroups = [
            ['membership', 'payment', 'plan'],
            ['profile', 'photo', 'bio'],
            ['match', 'search', 'partner'],
            ['safety', 'privacy', 'security']
        ];
        
        let coherenceScore = 0;
        for (const group of relatedTopicGroups) {
            const groupTopicsInSession = topics.filter(topic => 
                group.some(groupTopic => topic.includes(groupTopic))
            );
            if (groupTopicsInSession.length > 1) {
                coherenceScore += groupTopicsInSession.length;
            }
        }
        
        return Math.min(coherenceScore / topics.length, 1);
    }
    
    // Assess natural conversation progression
    assessNaturalProgression(session) {
        if (!session.messages || session.messages.length < 4) return 0.5;
        
        // Check for natural flow: greeting -> information gathering -> advice/action
        let progressionScore = 0;
        const messages = session.messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
        
        // Check for greeting at start
        if (messages[0] && (messages[0].includes('hello') || messages[0].includes('hi') || messages[0].length < 20)) {
            progressionScore += 0.3;
        }
        
        // Check for information sharing in middle
        const middleMessages = messages.slice(1, -1);
        if (middleMessages.some(msg => msg.length > 30 && (msg.includes('my') || msg.includes('i')))) {
            progressionScore += 0.4;
        }
        
        // Check for action-oriented questions at end
        const lastMessages = messages.slice(-2);
        if (lastMessages.some(msg => msg.includes('how') || msg.includes('what') || msg.includes('help'))) {
            progressionScore += 0.3;
        }
        
        return progressionScore;
    }
    
    // Calculate user engagement level
    calculateEngagement(session) {
        if (!session.messages) return 0;
        
        const userMessages = session.messages.filter(m => m.role === 'user');
        if (userMessages.length === 0) return 0;
        
        let engagementScore = 0;
        
        // Message frequency (more messages = higher engagement)
        engagementScore += Math.min(userMessages.length / 10, 0.4);
        
        // Message length (detailed messages = higher engagement)
        const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
        engagementScore += Math.min(avgLength / 100, 0.3);
        
        // Question asking (engaged users ask questions)
        const questionsAsked = userMessages.filter(msg => msg.content.includes('?')).length;
        engagementScore += Math.min(questionsAsked / 5, 0.3);
        
        return Math.min(engagementScore, 1);
    }
    
    // Generate insights from analytics data
    generateInsights() {
        const insights = [];
        
        // Response quality insights
        const qualityScores = Array.from(this.analytics.responseQuality.values());
        if (qualityScores.length > 0) {
            const avgCompliance = qualityScores.reduce((sum, q) => sum + (q.trainingCompliant ? 1 : 0), 0) / qualityScores.length;
            insights.push(`Training compliance rate: ${(avgCompliance * 100).toFixed(1)}%`);
            
            const avgHelpfulness = qualityScores.reduce((sum, q) => sum + q.helpfulness, 0) / qualityScores.length;
            insights.push(`Average helpfulness score: ${avgHelpfulness.toFixed(1)}/5`);
        }
        
        // Conversation flow insights
        const flowData = Array.from(this.analytics.conversationFlow.values());
        if (flowData.length > 0) {
            const avgEngagement = flowData.reduce((sum, f) => sum + f.userEngagement, 0) / flowData.length;
            insights.push(`Average user engagement: ${(avgEngagement * 100).toFixed(1)}%`);
        }
        
        return insights;
    }
    
    // Generate optimization recommendations
    generateRecommendations() {
        const recommendations = [];
        
        // Based on compliance rates
        const qualityScores = Array.from(this.analytics.responseQuality.values());
        if (qualityScores.length > 0) {
            const avgCompliance = qualityScores.reduce((sum, q) => sum + (q.trainingCompliant ? 1 : 0), 0) / qualityScores.length;
            
            if (avgCompliance < 0.9) {
                recommendations.push("Improve training compliance - ensure all responses start with 'Vanakkam'");
            }
            
            const avgCulturalTerms = qualityScores.reduce((sum, q) => sum + q.culturalTermsUsed, 0) / qualityScores.length;
            if (avgCulturalTerms < 2) {
                recommendations.push("Increase usage of cultural terms for better Tamil matrimony context");
            }
        }
        
        // Based on engagement data
        const flowData = Array.from(this.analytics.conversationFlow.values());
        if (flowData.length > 0) {
            const avgEngagement = flowData.reduce((sum, f) => sum + f.userEngagement, 0) / flowData.length;
            
            if (avgEngagement < 0.6) {
                recommendations.push("Implement more engaging conversation techniques and proactive suggestions");
            }
        }
        
        return recommendations;
    }
}

// Global analytics instance
const aiAnalytics = new AdvancedAIAnalytics();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedAIAnalytics, aiAnalytics };
}

if (typeof window !== 'undefined') {
    window.AdvancedAIAnalytics = AdvancedAIAnalytics;
    window.aiAnalytics = aiAnalytics;
}
