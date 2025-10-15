export const theme = {
  colors: {
    primary: '#000e27',        // Deep navy blue background
    primaryDark: '#000510',    // Even darker navy
    primaryLight: '#001a3d',   // Lighter navy
    secondary: '#D4AF37',      // Gold (main)
    secondaryDark: '#B98E1D',  // Shadow gold
    secondaryLight: '#F9E28C', // Highlight gold
    accent: '#E1C05B',         // Mid gold
    background: '#000e27',     // Deep navy background
    surface: '#001a3d',        // Navy surface (no gray!)
    surfaceLight: '#002550',   // Lighter navy
    surfaceElevated: '#003366', // Even lighter navy for cards
    text: '#FFFFFF',           // Pure white
    textSecondary: '#F9F9F9',  // Off-white
    textTertiary: '#9AA6B2',
    error: '#FF6B6B',
    success: '#4ECDC4',
    border: '#2F3442',
    borderLight: '#3F4452',
    white: '#FFFFFF',
    offWhite: '#F9F9F9',
    black: '#000000',
    overlay: 'rgba(11, 18, 33, 0.85)',
    goldGradient: ['#F9E28C', '#E1C05B', '#B98E1D'], // Highlight → Mid → Shadow
  },
  fonts: {
    heading: 'Cormorant Garamond',  // For headings/hero text
    body: 'Poppins',                // For body/buttons/UI
    alt: 'Montserrat',              // Alternative body font
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
      shadowColor: '#C9A55C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};
