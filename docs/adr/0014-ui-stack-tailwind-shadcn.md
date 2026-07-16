# UI is Tailwind CSS plus shadcn/ui

The app styles with Tailwind CSS and builds its component layer from shadcn/ui. shadcn components are copied into the repo (not consumed as a versioned dependency), so they are ordinary owned source that any module composes and that carries the platform's design tokens — including the light/dark theming and per-member accent from the visual-identity decision ([#18](https://github.com/Temel00/emelbros-app/issues/18)). Modules build their screens and the widgets/profile sections they expose ([ADR-0005](0005-widget-and-profile-section-contract.md)) from this shared set so the whole platform reads as one product.

## Considered Options

**A pre-packaged component library** (MUI, Chakra, Mantine) was rejected: those ship as opaque dependencies with their own theming systems, which fights a from-scratch brand identity and makes per-component tweaks awkward. shadcn/ui gives the components as editable source over Tailwind, so the design system is fully owned.

**Plain CSS / CSS Modules with no component layer** was rejected as needless re-implementation of buttons, dialogs, and form controls that shadcn/ui already provides accessibly.
