---
name: Flat 2.0 Utilitarian
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#534434'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#5c5e65'
  on-secondary: '#ffffff'
  secondary-container: '#dedfe8'
  on-secondary-container: '#60626a'
  tertiary: '#00658b'
  on-tertiary: '#ffffff'
  tertiary-container: '#1abdff'
  on-tertiary-container: '#004966'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e1e2ea'
  secondary-fixed-dim: '#c4c6ce'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474d'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
  bg-light: '#FAFAF8'
  bg-dark: '#14161A'
  surface-light: '#FFFFFF'
  surface-dark: '#1E2126'
  text-primary-light: '#1A1D23'
  text-primary-dark: '#ECEDEE'
  text-secondary: '#6B7280'
  text-muted: '#9CA3AF'
  border-light: '#E5E7EB'
  border-dark: '#2D3138'
  border-hover: '#D1D5DB'
  accent-amber: '#F59E0B'
  accent-amber-hover: '#D97706'
  accent-amber-text: '#B45309'
  accent-amber-text-hover: '#92400E'
  accent-amber-highlight: '#FDE68A'
  surface-neutral-active: '#F3F4F6'
  surface-neutral-hover: '#F9FAFB'
  success-remember: '#16A34A'
  danger-forgot: '#DC2626'
  danger-active: '#991B1B'
  danger-surface: '#FEF2F2'
  danger-border: '#FCA5A5'
  scrim-backdrop: rgba(26, 29, 35, 0.4)
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-h2:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-default:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-semibold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  label-small:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-small-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-small-semibold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  caption-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
---

## Brand & Style

### Personality & Emotional Tenor
The design system is structured around three core tenets: **Focused**, **Warm**, and **Fast & Agile**.
- **Focused:** Prioritizes daily retention habits without distraction mechanics, vanity gamification, or social noise. The interface functions as an unobtrusive precision instrument.
- **Warm:** Failure is treated as data, not judgment. Amber accents bring an approachable, human balance to structural grays and stark white surfaces.
- **Fast & Agile:** Interactions demand immediate tactile clarity. Visual feedback is crisp, snappy (150ms–250ms), and free of decorative latency or gratuitous micro-interactions.

### Design Movement
The system implements **Flat 2.0 with Utilitarian Minimalism**. Visual architecture is defined by flat structural surfaces (`#FFFFFF` on `#FAFAF8`), crisp `1px` borders (`#E5E7EB`), and deliberate geometric typography. 

Shadows are strictly non-decorative and restricted to two functional levels (`shadow.sm` and `shadow.md`) used exclusively to signal depth during interaction or modality. Neumorphism, glassmorphism (`backdrop-filter`), skeletal claymorphism, and neon gradients are explicitly prohibited.

## Colors

### Semantic Color System
The color architecture enforces strict role definitions to eliminate interface ambiguity:
- **Primary Accent (`#F59E0B`):** Reserved for primary interactive controls, active streaks, brand marks, and active input boundaries. When applied to text or text links against light backgrounds, it systematically shifts to `#B45309` (hover: `#92400E`) to ensure strict WCAG AA contrast conformance.
- **Success (`#16A34A`):** Strictly locked to affirmative retention outcomes (the "Remembered" swipe action or manual control). It must never be used for generic alerts or standard confirmations.
- **Danger (`#DC2626`):** Strictly restricted to negative retention outcomes (the "Forgotten" swipe action) and destructive permanent deletion triggers.
- **Neutral Boundaries & Layering:** Standard containers sit on `#FFFFFF` against `#FAFAF8`, articulated by `#E5E7EB` borders. In dark mode, `#1E2126` containers reside on `#14161A` against `#2D3138` borders.

## Typography

### Type Philosophy
A single, self-hosted typographic engine—**Inter**—is utilized across all screen densities. Text rendering must always enable `-webkit-font-smoothing: antialiased`. 

Hierarchy is established via weight discipline (`400`, `500`, `600`, `700`) and letter spacing rather than disparate font combinations. Display styles feature slight negative tracking (`-0.02em`) to bind headline rhythm, while metadata cap overlines leverage open tracking (`0.08em`) to maintain legibility at 12px.

## Layout & Spacing

### 4px Strict Grid Rhythm
All component spacing, gutters, and page padding adhere to multiples of 4px: `4px` (`space-xs`), `8px` (`space-sm`), `12px` (`space-md`), `16px` (`space-base`), `24px` (`space-lg`), `32px` (`space-xl`), `48px` (`space-2xl`), and `64px` (`space-3xl`).

### Responsive Boundaries
- **Mobile (`< 640px`):** Single-column layout. Viewport outer gutter is fixed at `16px` (`margin`). Flashcards scale fluidly up to screen margins with swipe gesture thresholds set at `96px`.
- **Tablet (`640px – 1024px`):** Centered layouts with maximum content width capped at `560px` for retention/card workflows.
- **Desktop (`> 1024px`):** Content container conforms to a maximum width of `1120px` (`margin: 0 auto;`). For core study workflows, the review module retains the centered `560px` tablet constraint to prevent horizontal line length degradation, pairing physical button shortcuts with arrow key fallbacks.

## Elevation & Depth

### Flat 2.0 Architectural Depth
Elevation is generated through high-contrast boundary separation and deliberate tonal backgrounds rather than soft visual blurs:
- **Level 0 (Canvas Base):** Plain base fill (`#FAFAF8` light / `#14161A` dark).
- **Level 1 (Structural Panels & Base Surfaces):** Surface white fill (`#FFFFFF` light / `#1E2126` dark) encased in a `1px solid #E5E7EB` border. Box shadow: `shadow.sm` (`0 1px 2px rgba(0, 0, 0, 0.05)`). Applied to list views, setting blocks, and default cards.
- **Level 2 (Interactive Floating & Active Cards):** Surface white with `1px solid #E5E7EB` paired with `shadow.md` (`0 4px 6px rgba(0, 0, 0, 0.07)`). Used specifically for active review cards, dialogs, and floating toasts.
- **Backdrop Scrim:** Modal overlays strictly utilize `rgba(26, 29, 35, 0.4)` without backdrop blur filters.

## Shapes

### Corner Curvature Scale
The design system employs a bounded scale calibrated to component sizing:
- **`4px` (`radius.sm`):** Inline code blocks (`<code>`), progress bars, and skeletal placeholders.
- **`8px` (`radius.md`):** Buttons, standard text fields, textareas, toasts, and alert callouts.
- **`12px` (`radius.lg`):** Standard data panels, preview shells, and list containers.
- **`16px` (`radius.xl`):** Core active swipe review cards and confirmation modals.

## Components

### Buttons
- **Touch Target & Sizing:** Minimum dimension of `44px` height across primary, secondary, and destructive controls; horizontal padding is `16px` (`space-base`). Roundedness is fixed at `8px` (`radius.md`).
- **Primary:** Background `#F59E0B`, text `#1A1D23` (font weight 600). Hover `#D97706`, active `#B45309`. Focus ring: `2px solid #1A1D23` with a `2px` offset.
- **Secondary:** Background `#FFFFFF`, border `1px solid #E5E7EB`, text `#1A1D23`. Hover background `#F9FAFB` and border `#D1D5DB`. Active background `#F3F4F6`.
- **Danger:** Background `#DC2626`, text `#FFFFFF`. Hover/active `#991B1B`.
- **Disabled State:** Opacity `0.4`, pointer-events disabled, zero elevation.

### Form Inputs & TextAreas
- Height: `44px` (TextAreas scale dynamically with vertical padding of `12px`).
- Surface: `#FFFFFF`, border `1px solid #E5E7EB`, radius `8px`.
- Typography: Inter 16px (`body-default`), placeholder color `#9CA3AF`.
- Focus State: Border color becomes `#F59E0B` with an immediate outer focus outline of `2px solid #1A1D23` with a `2px` offset.
- Error State: Border color `#DC2626`. Error message appears beneath the input at `12px` (`caption`) with `#DC2626`.

### Panels & Cards
- Basic structural containers use a `1px solid #E5E7EB` border, `#FFFFFF` fill, `12px` border radius, and `shadow.sm`.
- Padding: `16px` internal padding for mobile, expanding to `24px` on desktop viewports.

### Interactive Flashcard (`SwipeableCard`)
- Border radius `16px` (`radius.xl`), surface `#FFFFFF`, `1px solid #E5E7EB`, `shadow.md`.
- Interaction: Single tap flips between prompt and answer. Horizontal swipe triggers directional color reveals: threshold set to `96px`. Releasing under the threshold triggers a `160ms` snap-back spring.
- Accessibility Fallback: Dual physical buttons ("Quên" with `#DC2626` outline, "Nhớ" with `#16A34A` outline) always accompany the review view.

### Alerts & Banners
- Non-modal status messages: surface `#FEF2F2`, border `1px solid #FCA5A5`, text `#991B1B`, radius `8px`, internal padding `12px 16px`.