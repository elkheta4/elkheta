/**
 * 📋 Application Constants
 * Centralized configuration for the Sales Dashboard
 */

// ============================================
// 🎓 FORM CONFIGURATION
// ============================================
export const FORM_CONFIG = {
  // Data Sources
  sources: [
    "Facebook",
    "Referral", 
    "Youtube",
    "Instagram",
    "Google",
    "Other"
  ],

  // Order States
  orderStates: [
    "Installment",
    "Remaining",
    "OverPayment",
    "Completed"
  ],

  // Available Classes (Grade Levels)
  classes: [
    // Junior (J4-J6)
    "J4-AR", "J4-EN", "J5-AR", "J5-EN", "J6-AR", "J6-EN",
    // Middle (M1-M3)
    "M1-AR", "M1-EN", "M2-AR", "M2-EN", "M3-AR", "M3-EN",
    // Secondary 1
    "S1-AR", "S1-EN",
    // Secondary 2
    "S2-AR-ART", "S2-EN-ART", "S2-AR-SCIENTIFIC", "S2-EN-SCIENTIFIC",
    // Secondary 3
    "S3-AR-ART", "S3-EN-ART", "S3-AR-SCIENCE", "S3-EN-SCIENCE", "S3-AR-MATH", "S3-EN-MATH"
  ],

  // Subscription Packages
  packages: [
    // Full Package
    "Follow up - Year", "Content - Year",
    "Follow up - Term", "Content - Term",
    "Follow up - Month", "Content - Month",
    // Subject Package
    "Subject - followup - Year", "Subject - Content - Year",
    "Subject - followup - Term", "Subject - Content - Term",
    "Subject - Followup - Month", "Subject - Content - Month"
  ],

  // Subject Logic - Maps class triggers to available subjects
  subjectLogic: [
    {
      id: "junior",
      triggers: ["J4", "J5", "J6", "M1", "M2", "M3"],
      subjects: ["SCIENCE", "MATH", "SOCIAL", "ARABIC", "ENGLISH", "ICT"]
    },
    {
      id: "s1",
      triggers: ["S1"],
      subjects: ["Science", "PHILOSOPHY", "HISTORY", "MATH", "ENGLISH", "ITALIANO", "ARABIC", "DEUTSCH", "FRENCH"]
    },
    {
      id: "s2_art",
      triggers: ["S2-AR-ART", "S2-EN-ART"],
      subjects: ["HISTORY", "ENGLISH", "MATH", "GEOGRAPHY", "ITALIANO", "PSYCHOLOGY", "DEUTSCH", "FRENCH", "ARABIC"]
    },
    {
      id: "s2_sci",
      triggers: ["S2-AR-SCIENTIFIC", "S2-EN-SCIENTIFIC"],
      subjects: ["ENGLISH", "BIOLOGY", "CHEMISTRY", "PHYSICS", "MATH", "ARABIC", "FRENCH", "DEUTSCH", "ITALIANO", "HISTORY"]
    },
    {
      id: "s3_art",
      triggers: ["S3-AR-ART", "S3-EN-ART"],
      subjects: ["GEOGRAPHY", "ENGLISH", "DEUTSCH", "FRENCH", "ARABIC", "ITALIANO", "Statistics", "HISTORY"]
    },
    {
      id: "s3_sci_math",
      triggers: ["S3-AR-SCIENCE", "S3-EN-SCIENCE", "S3-AR-MATH", "S3-EN-MATH"],
      subjects: ["PHYSICS", "BIOLOGY", "MATH", "CHEMISTRY", "ITALIANO", "ENGLISH", "DEUTSCH", "FRENCH", "ARABIC"]
    }
  ]
};

// ============================================
// 💰 PRICING (if needed in future)
// ============================================
export const PRICING = {
  currency: "EGP",
  // Add pricing tiers here if needed
};

// ============================================
// ⚙️ APP SETTINGS
// ============================================
export const APP_SETTINGS = {
  pagination: {
    userOrdersPageSize: 50,
    adminOrdersPageSize: 50
  },
  cache: {
    ordersTTL: 5 * 60 * 1000,    // 5 minutes
    usersTTL: 60 * 60 * 1000     // 1 hour
  }
};
