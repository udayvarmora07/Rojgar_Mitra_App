/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only (app.json userInterfaceStyle). 'class' stops NativeWind on web
  // from throwing "Cannot manually set color scheme" when the OS is in dark mode.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Direction set in PRODUCT.md. Every pair is measured, not guessed:
        //   primary #1E3A8A on white 10.36:1, white on primary 10.36:1
        //   accent  #047857 on white  5.48:1, white on accent  5.48:1, on emerald-50 5.21:1
        //   alert   #DC2626 on white  4.83:1 (borders/icons only, never body text)
        //   ink     #111827 on surface 16.98:1
        // UX4G (the Government of India design system) uses violet #4A2BC2 at 8.69:1 for its
        // primary. We stay on navy: it measures 10.36:1, and this audience reads outdoors in
        // daylight, so the extra contrast is worth more than matching the hex.
        primary: '#1E3A8A',
        'primary-dark': '#172554',
        accent: '#047857',
        alert: '#DC2626',
        surface: '#F9FAFB',
        ink: '#111827',

        // Status surfaces from the UX4G ramps. Every one of these carries a text label, so
        // colour is reinforcement and never the only signal.
        'open-bg': '#F2FCEF',
        'open-border': '#80DA88',
        'open-text': '#00522C',
        'closing-bg': '#FFF8F8',
        'closing-border': '#FFB3AE',
        'closing-text': '#8A1A16',
        'closed-bg': '#F5F5F5',
        'closed-border': '#D9D9D9',
        'closed-text': '#404040',
      },
      // One radius scale for the whole app, so cards, controls and badges share a system.
      // Pills are reserved for status badges; actions are rectangular (PRODUCT.md 4).
      borderRadius: {
        card: '14px',
        control: '12px',
      },
      // Devanagari and Gujarati carry marks above and below the baseline, so body text needs
      // more leading than Latin alone. 1.5 is the reading rhythm PRODUCT.md specifies.
      lineHeight: {
        reading: '1.5',
      },
    },
  },
  plugins: [],
};
