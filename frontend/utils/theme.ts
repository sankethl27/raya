// New color theme based on reference image
export const theme = {
  colors: {
    // Primary - Dark navy/black (from reference image 4)
    primary: '#0A0E27',
    primaryDark: '#000000',
    primaryLight: '#1a1f3a',
    
    // Secondary - Muted gold/beige (less prominent)
    secondary: '#C9A865',
    secondaryDark: '#A68954',
    secondaryLight: '#E8D4A8',
    accent: '#D4AF37',
    
    // Background
    background: '#0A0E27',
    surface: '#131829',
    surfaceLight: '#1E2338',
    surfaceElevated: '#252B42',
    
    // Text
    text: '#FFFFFF',
    textSecondary: '#E5E5E5',
    textTertiary: '#9AA6B2',
    
    // Status
    error: '#FF6B6B',
    success: '#4ECDC4',
    warning: '#FFD93D',
    
    // Borders
    border: '#2F3442',
    borderLight: '#3F4452',
    
    // Others
    white: '#FFFFFF',
    offWhite: '#F9F9F9',
    black: '#000000',
    overlay: 'rgba(10, 14, 39, 0.9)',
    goldGradient: ['#E8D4A8', '#C9A865', '#A68954'],
  },
  fonts: {
    heading: 'Cormorant Garamond',
    body: 'Poppins',
    alt: 'Montserrat',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    round: 999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    hero: 48,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    gold: {
      shadowColor: '#C9A865',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

// Bangalore locations
export const BANGALORE_LOCATIONS = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'Electronic City',
  'HSR Layout',
  'BTM Layout',
  'Marathahalli',
  'Jayanagar',
  'Malleshwaram',
  'Rajajinagar',
  'JP Nagar',
  'Banashankari',
  'Yelahanka',
  'Hebbal',
  'MG Road',
  'Brigade Road',
  'Bellandur',
  'Sarjapur Road',
];