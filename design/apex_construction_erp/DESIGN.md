---
name: Apex Construction ERP
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#0b1426'
  on-tertiary: '#ffffff'
  tertiary-container: '#20283c'
  on-tertiary-container: '#888fa7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  metric-stat:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-lg: 1rem
  margin: 1rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for civil engineering leaders, project executives, and site operations managers who demand instantaneous operational clarity across high-capital construction portfolios. The visual posture is **Corporate Modern with Industrial Precision**—utilizing dense information architecture, razor-sharp geometric alignment, and strict tabular legibility to replace sensory clutter with immediate situational awareness.

Every view conveys architectural stability, institutional reliability, and rigorous financial auditability. By pairing a deep slate and steel blue authority with high-contrast functional status indicators, the system balances executive-level progress oversight with site-level execution detail.

## Colors

The palette leverages a technical architectural structure where high-value data surfaces over an intentional neutral scale.

### Core Structure
- **Canvas Base (`#F8FAFC`)**: Soft cool off-white that suppresses eye fatigue under prolonged field and control-room monitoring.
- **Surface Elevation (`#FFFFFF`)**: Pure crisp white for cards, panels, and data grids.
- **Structural Dividers (`#E2E8F0` / `#CBD5E1`)**: Hairline 1px structural boundaries defining dense tables, grid cells, and toolbars without heavy drop shadows.
- **Deep Steel / Primary (`#1E293B`, `#0F172A`, `#2563EB`)**: Anchor points for active selection, high-level navigation, and key call-to-actions.

### Construction Status Matrix
To ensure immediate visual triage across schedules, budget margins, and safety KPIs:
- **Normal (`정상`, >= 0pp)**: Emerald `#059669` fill with subtle `#ECFDF5` background tint and `#A7F3D0` edge ring.
- **Caution (`주의`, -5pp to 0pp)**: Amber `#D97706` fill with soft `#FFFBEB` background tint and `#FDE68A` edge ring.
- **Critical / Inspection (`점검`, <= -5pp)**: Precision Red `#DC2626` fill with clear `#FEF2F2` background tint and `#FECACA` edge ring.

## Typography

The typography uses Inter (with direct fallback to system sans-serif/Pretendard for localized Korean terminology). It prioritizes scannability, compact vertical rhythm, and numeric consistency.

### Tabular Formatting Rule
Every monetary figure (KRW/USD), variance percentage, station chainage, and Gantt schedule timestamp must enforce `font-variant-numeric: tabular-nums` (or CSS `font-feature-settings: "tnum"`). This prevents optical shifting when values update dynamically in high-frequency monitoring tables.

## Layout & Spacing

This design system uses a fluid 12-column grid balanced for high-density enterprise displays:
- **Canvas Boundaries**: 16px (`1rem`) outer margin on standard viewports, expanding to 24px (`1.5rem`) on ultra-wide operations dashboards (≥1600px).
- **Column Gutters**: Compact 12px (`0.75rem`) to 16px (`1rem`) channels to allow dense multi-column metric layouts without clipping data.
- **Component Padding Rhythm**: Internal card and data table padding defaults to 12px (`0.75rem`) on vertical metrics and 16px (`1rem`) horizontally to maximize row counts per viewport fold.
- **Adaptive Reflow**: 
  - **Desktop (≥1280px)**: Persistent left sidebar (collapsible to 64px icon rail), sticky header filter bar, and multi-tier grid cards.
  - **Tablet/Field Laptop (768px - 1279px)**: 2-column KPI groupings, tables activate horizontal touch-scroll with pinned freeze-columns (Site Name & Code).
  - **Mobile/Handheld (<768px)**: Single-column stacked KPI blocks, filter bar compresses into a single slide-over drawer.

## Elevation & Depth

This system avoids soft, floating neomorphic shadows in favor of **low-contrast structural outlines and subtle tonal layering**:

- **Tier 0 (App Canvas)**: Ground plane in `#F8FAFC`.
- **Tier 1 (Surface Cards & Grids)**: Crisp `#FFFFFF` resting on a 1px solid border `#E2E8F0`. Elevation shadow is minimal: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Tier 2 (Popovers, Filter Menus & Dropdowns)**: Elevated panels use `#FFFFFF`, a 1px border of `#CBD5E1`, and a directional shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Tier 3 (Modals & Critical Alert Overlays)**: Surface `#FFFFFF` layered over a dimming slate scrim (`#0F172A` with 45% opacity), accompanied by an authoritative drop shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.15)`.

## Shapes

The interface embraces a **Soft (Level 1)** structural rounding profile. 

- Form inputs, segmented filter buttons, metric cards, and table borders use `0.25rem` (4px) radii to maintain a disciplined, structural look.
- Larger container panels, modals, and flyout sheets use a maximum radius of `0.5rem` (8px).
- Badges and status pills use a 4px corner radius instead of circular stadium pills to preserve industrial design consistency alongside tight tabular boundaries.

## Components

### Filter Toolbars
- Compact 36px height profile with inline segmented selectors: Year/Month (`YYYY.MM`), Region, Construction Division (`토목`, `건축`, `플랜트`), and Project Site Search.
- Active states feature `#1E293B` or `#2563EB` solid fill with white text; inactive items use ghost styling with `#64748B` label and `#E2E8F0` hairline boundary.

### KPI Metric Cards
- Metric cards feature a structured header with an uppercase label, secondary subtext, and a current metric value rendered at `26px` bold with tabular numerals.
- Each card embeds a status indicator badge along with an inline delta tag (e.g., `▲ +2.4pp` or `▼ -6.1pp`) and a bottom trend sparkline.

### Expandable Data Tables
- Header cells: `#F1F5F9` background, `11px` uppercase bold text (`#475569`), strictly right-aligned for amounts and percentages.
- Row density: 36px compact rows, 1px bottom border `#F1F5F9`. Hover row background `#F8FAFC`.
- Pinned left column for Site ID/Project Name. Chevron icon triggers collapsible child rows (sub-contractors, work packages, or cost accounts).

### Status Badges & Chips
- Compact dimensions (20px height, 6px horizontal padding).
- Monochromatic text paired with 10% opacity color fills and explicit 1px outline rings for immediate field accessibility under harsh lighting.

### Form Inputs & Checkboxes
- 32px to 36px height with inset background `#FFFFFF`, border `#CBD5E1`, and focus ring of `0 0 0 2px rgba(37, 99, 235, 0.2)`.
- Checkboxes: Square 16px with 2px corner radius, checking with solid `#2563EB` fill and crisp white checkmark icon.

### Modal & Empty State Layouts
- Modals feature a distinct header bar in `#F8FAFC` separated by a 1px border.
- Empty states feature structured blueprint outlines in `#94A3B8`, accompanied by concise system copy and a single high-priority action button.