/**
 * Typography utility for Inter font family
 * Maps font weights to Inter font family names
 */

export type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';

/**
 * Get the Inter font family name based on weight and italic style
 */
export function getInterFont(weight: FontWeight = '400', italic: boolean = false): string {
  const suffix = italic ? 'Italic' : '';
  
  switch (weight) {
    case '100':
      return italic ? 'Inter-ThinItalic' : 'Inter-Regular'; // Thin not available, fallback to Regular
    case '200':
      return italic ? 'Inter-ExtraLightItalic' : 'Inter-Regular'; // ExtraLight not in main set
    case '300':
      return `Inter-Light${suffix}`;
    case '400':
    case 'normal':
      return italic ? 'Inter-Italic' : 'Inter-Regular';
    case '500':
      return `Inter-Medium${suffix}`;
    case '600':
      return `Inter-SemiBold${suffix}`;
    case '700':
    case 'bold':
      return `Inter-Bold${suffix}`;
    case '800':
      return `Inter-ExtraBold${suffix}`;
    case '900':
      return `Inter-Black${suffix}`;
    default:
      return italic ? 'Inter-Italic' : 'Inter-Regular';
  }
}

/**
 * Common font families for easy access
 */
export const InterFonts = {
  thin: 'Inter-Regular', // Fallback
  extraLight: 'Inter-Regular', // Fallback
  light: 'Inter-Light',
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
  
  // Italic variants
  thinItalic: 'Inter-ThinItalic',
  extraLightItalic: 'Inter-ExtraLightItalic',
  lightItalic: 'Inter-LightItalic',
  italic: 'Inter-Italic',
  mediumItalic: 'Inter-MediumItalic',
  semiBoldItalic: 'Inter-SemiBoldItalic',
  boldItalic: 'Inter-BoldItalic',
  extraBoldItalic: 'Inter-ExtraBoldItalic',
  blackItalic: 'Inter-BlackItalic',
} as const;

/**
 * Typography scale with Inter fonts
 */
export const Typography = {
  h1: {
    fontFamily: InterFonts.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: InterFonts.bold,
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontFamily: InterFonts.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: InterFonts.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  h5: {
    fontFamily: InterFonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  h6: {
    fontFamily: InterFonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  body1: {
    fontFamily: InterFonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    fontFamily: InterFonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: InterFonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: InterFonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: InterFonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
} as const;