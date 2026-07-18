/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
          "secondary": "#c8c6c5",
          "primary-container": "#ffd700",
          "inverse-primary": "#705d00",
          "inverse-on-surface": "#2f3131",
          "on-surface": "#e2e2e2",
          "on-primary-fixed-variant": "#544600",
          "on-tertiary": "#2f3131",
          "secondary-container": "#474746",
          "on-tertiary-container": "#5e5f60",
          "secondary-fixed-dim": "#c8c6c5",
          "on-secondary-fixed-variant": "#474746",
          "on-error": "#690005",
          "surface-variant": "#333535",
          "surface-container": "#1e2020",
          "error": "#ffb4ab",
          "on-secondary-container": "#b7b5b4",
          "surface-tint": "#e9c400",
          "primary": "#fff6df",
          "secondary-fixed": "#e5e2e1",
          "on-tertiary-fixed-variant": "#454747",
          "surface-container-low": "#1a1c1c",
          "tertiary-fixed": "#e2e2e2",
          "primary-fixed": "#ffe16d",
          "on-tertiary-fixed": "#1a1c1c",
          "on-surface-variant": "#d0c6ab",
          "on-primary": "#3a3000",
          "tertiary-fixed-dim": "#c6c6c7",
          "surface-bright": "#38393a",
          "on-secondary": "#313030",
          "surface-container-lowest": "#0c0f0f",
          "tertiary-container": "#d9dada",
          "surface-container-high": "#282a2b",
          "background": "#121414",
          "on-primary-container": "#705e00",
          "surface-dim": "#121414",
          "error-container": "#93000a",
          "primary-fixed-dim": "#e9c400",
          "surface": "#121414",
          "on-secondary-fixed": "#1c1b1b",
          "outline-variant": "#4d4732",
          "on-primary-fixed": "#221b00",
          "tertiary": "#f6f6f6",
          "on-background": "#e2e2e2",
          "surface-container-highest": "#333535",
          "outline": "#999077",
          "inverse-surface": "#e2e2e2",
          "on-error-container": "#ffdad6"
      },
      "borderRadius": {
          "DEFAULT": "0.25rem",
          "lg": "0.5rem",
          "xl": "0.75rem",
          "full": "9999px"
      },
      "spacing": {
          "border-width": "4px",
          "container-max": "1280px",
          "base": "8px",
          "sm": "12px",
          "xs": "4px",
          "xl": "80px",
          "md": "24px",
          "lg": "48px"
      },
      "fontFamily": {
          "label-bold": ["Bebas Neue"],
          "body-md": ["Inter"],
          "display-lg": ["Bebas Neue"],
          "headline-md": ["Bebas Neue"],
          "display-lg-mobile": ["Bebas Neue"],
          "headline-lg": ["Bebas Neue"],
          "body-lg": ["Inter"]
      },
      "fontSize": {
          "label-bold": ["14px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "700"}],
          "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
          "display-lg": ["80px", {"lineHeight": "80px", "letterSpacing": "0.02em", "fontWeight": "400"}],
          "headline-md": ["24px", {"lineHeight": "28px", "letterSpacing": "0.05em", "fontWeight": "400"}],
          "display-lg-mobile": ["48px", {"lineHeight": "48px", "letterSpacing": "0.02em", "fontWeight": "400"}],
          "headline-lg": ["40px", {"lineHeight": "40px", "letterSpacing": "0.03em", "fontWeight": "400"}],
          "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
