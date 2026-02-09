# Theme System Documentation

## Overview

RouteMate uses a comprehensive design system built on a custom theme with full light/dark mode support. The theme is centralized in `constants/theme.ts` and provides consistent styling across the entire application.

## Brand Colors

### Primary Color
- **Main**: `#e86713` - Vibrant orange used for primary actions, active states, and branding
- **Dark Mode**: `#ff7a24` - Slightly brighter variant for better visibility on dark backgrounds

## Color Palette

### Light Mode
```typescript
{
  text: '#11181C',              // Primary text
  background: '#FFFFFF',         // Main background
  tint: '#e86713',              // Primary brand color
  icon: '#687076',              // Icon color
  tabIconDefault: '#9BA1A6',    // Inactive tab icons
  tabIconSelected: '#e86713',   // Active tab icons
  card: '#FFFFFF',              // Card backgrounds
  border: '#E5E7EB',            // Border color
  success: '#10B981',           // Success states (green)
  error: '#EF4444',             // Error states (red)
  warning: '#F59E0B',           // Warning states (amber)
  info: '#3B82F6',              // Info states (blue)
  textSecondary: '#6B7280',     // Secondary text
  backgroundSecondary: '#F9FAFB', // Secondary backgrounds
  shadow: '#000000',            // Shadow color
}
```

### Dark Mode
```typescript
{
  text: '#ECEDEE',              // Primary text
  background: '#151718',         // Main background
  tint: '#ff7a24',              // Primary brand color (lighter)
  icon: '#9BA1A6',              // Icon color
  tabIconDefault: '#6B7280',    // Inactive tab icons
  tabIconSelected: '#ff7a24',   // Active tab icons
  card: '#1F2937',              // Card backgrounds
  border: '#374151',            // Border color
  success: '#34D399',           // Success states (green)
  error: '#F87171',             // Error states (red)
  warning: '#FBBF24',           // Warning states (amber)
  info: '#60A5FA',              // Info states (blue)
  textSecondary: '#9CA3AF',     // Secondary text
  backgroundSecondary: '#111827', // Secondary backgrounds
  shadow: '#000000',            // Shadow color
}
```

## Spacing System

Consistent spacing values throughout the app:

```typescript
Spacing = {
  xs: 4,    // Extra small - minimal spacing
  sm: 8,    // Small - compact spacing
  md: 16,   // Medium - default spacing
  lg: 24,   // Large - section spacing
  xl: 32,   // Extra large - major section spacing
  xxl: 48,  // Extra extra large - screen-level spacing
}
```

## Border Radius

Rounded corners for various UI elements:

```typescript
BorderRadius = {
  sm: 4,    // Subtle rounding
  md: 8,    // Standard rounding
  lg: 12,   // Card rounding
  xl: 16,   // Modal rounding
  full: 9999, // Fully rounded (pills, circles)
}
```

## Shadow System

Pre-defined shadow styles for depth and elevation:

### Small Shadow
```typescript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,  // Android elevation
}
```

### Medium Shadow
```typescript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 4,
}
```

### Large Shadow
```typescript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 8,
}
```

## Usage Examples

### Using Theme Colors

```typescript
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function MyComponent() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={{ backgroundColor: colors.card }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
}
```

### Using Spacing

```typescript
import { Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
});
```

### Using Border Radius

```typescript
import { BorderRadius } from '@/constants/theme';

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
  },
  button: {
    borderRadius: BorderRadius.full,
  },
});
```

### Using Shadows

```typescript
import { Shadow } from '@/constants/theme';

const styles = StyleSheet.create({
  card: {
    ...Shadow.medium,
    backgroundColor: '#fff',
  },
});
```

## Component Styling Guidelines

### Cards
- Background: `colors.card`
- Border: 1px solid `colors.border`
- Border Radius: `BorderRadius.lg` (12px)
- Shadow: `Shadow.medium`
- Padding: `Spacing.lg` (24px)

### Buttons
- Primary: Background `colors.tint`, Text `#FFFFFF`
- Secondary: Background `colors.backgroundSecondary`, Text `colors.text`
- Danger: Background `colors.error`, Text `#FFFFFF`
- Border Radius: `BorderRadius.lg` or `BorderRadius.full`
- Padding: `Spacing.md` vertical, `Spacing.lg` horizontal
- Shadow: `Shadow.small`

### Input Fields
- Background: `colors.backgroundSecondary`
- Border: 1px solid `colors.border` (optional)
- Border Radius: `BorderRadius.lg`
- Padding: `Spacing.md`
- Text Color: `colors.text`
- Placeholder: `colors.textSecondary`

### Tab Bar
- Background: `colors.card`
- Active Icon: `colors.tabIconSelected`
- Inactive Icon: `colors.tabIconDefault`
- Height: 85px (iOS), 65px (Android)
- Shadow: `Shadow.medium`

### Headers
- Background: `colors.card`
- Border Bottom: 1px solid `colors.border`
- Title: 32px bold, `colors.text`
- Subtitle: 16px regular, `colors.textSecondary`

## Typography

### Font Weights
- Regular: `'400'` or `'normal'`
- Medium: `'500'`
- Semibold: `'600'`
- Bold: `'700'` or `'bold'`

### Font Sizes
- Caption: 12px
- Body Small: 14px
- Body: 16px
- Subtitle: 18px
- Title: 20px
- Heading: 24px
- Display: 32px
- Hero: 42px

### Text Styles
```typescript
// Page Title
{
  fontSize: 32,
  fontWeight: 'bold',
  color: colors.text,
}

// Section Title
{
  fontSize: 20,
  fontWeight: '700',
  color: colors.text,
}

// Body Text
{
  fontSize: 16,
  fontWeight: '400',
  color: colors.text,
}

// Secondary Text
{
  fontSize: 14,
  fontWeight: '500',
  color: colors.textSecondary,
}

// Caption
{
  fontSize: 12,
  fontWeight: '600',
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}
```

## Icon System

### Icon Sizes
- Small: 20px
- Medium: 24px
- Large: 28px
- Extra Large: 32px

### Icon Colors
- Default: `colors.icon`
- Active: `colors.tint`
- Success: `colors.success`
- Error: `colors.error`
- Warning: `colors.warning`

## Badge System

### Success Badge
```typescript
{
  backgroundColor: colors.success + '20', // 20% opacity
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.xs,
  borderRadius: BorderRadius.full,
}

// Text
{
  color: colors.success,
  fontSize: 13,
  fontWeight: '700',
}
```

### Warning Badge
```typescript
{
  backgroundColor: colors.warning + '20',
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.xs,
  borderRadius: BorderRadius.full,
}

// Text
{
  color: colors.warning,
  fontSize: 13,
  fontWeight: '700',
}
```

## Platform-Specific Adjustments

### iOS
- Tab bar height: 85px (includes safe area)
- Header padding top: 60px
- Use SF Symbols for icons when available

### Android
- Tab bar height: 65px
- Header padding top: 50px
- Material elevation for shadows

## Best Practices

1. **Always use theme colors** - Never hardcode colors
2. **Use spacing constants** - Maintain consistent spacing
3. **Respect dark mode** - Test both light and dark themes
4. **Use semantic colors** - Use `colors.error` for errors, not hardcoded red
5. **Apply shadows consistently** - Use predefined shadow styles
6. **Consider accessibility** - Ensure sufficient color contrast
7. **Use appropriate font weights** - Bold for emphasis, regular for body
8. **Round corners appropriately** - Cards use `lg`, buttons use `lg` or `full`

## Accessibility

### Color Contrast
All color combinations meet WCAG AA standards:
- Normal text (16px+): Minimum 4.5:1 contrast ratio
- Large text (24px+): Minimum 3:1 contrast ratio

### Touch Targets
- Minimum size: 44x44 points (iOS), 48x48 dp (Android)
- Adequate spacing between interactive elements

### Dark Mode
- All colors have appropriate dark mode variants
- Contrast ratios maintained in both modes

## Animation & Transitions

### Duration
- Fast: 150ms - Icon changes, small UI updates
- Normal: 250ms - View transitions, modal appearances
- Slow: 400ms - Screen transitions, complex animations

### Easing
- Default: `ease-in-out`
- Enter: `ease-out`
- Exit: `ease-in`

## Testing Checklist

When implementing new UI:
- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Verify color contrast
- [ ] Check touch target sizes
- [ ] Test with different text sizes
- [ ] Verify animations are smooth
- [ ] Check shadow rendering
- [ ] Validate spacing consistency