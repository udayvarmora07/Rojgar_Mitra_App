/** @type {import('tailwindcss').Config} */
const tokens = require('./design/tokens.json');
const c = tokens.colors;

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only (app.json userInterfaceStyle). 'class' stops NativeWind on web
  // from throwing "Cannot manually set color scheme" when the OS is in dark mode.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "Employment Exchange Ledger" (DESIGN.md). Every pair measured, never guessed:
        //   navy      #14315B on white 12.96:1, white on navy 12.96:1
        //   ink       #101828 on paper 16.27:1
        //   ink-soft  #475467 on paper  7.05:1
        //   ink-mute  #667085 on white  4.97:1
        //   stamp     #9A1B12 on white  8.27:1 (urgency only, never decoration)
        // The values live in design/tokens.json so component code can share them.
        navy: {
          DEFAULT: c.navy,
          deep: c.navyDeep,
          tint: c.navyTint,
          line: c.navyLine,
        },
        ink: c.ink,
        'ink-soft': c.inkSoft,
        'ink-mute': c.inkMute,
        paper: c.paper,
        card: c.card,
        rule: c.rule,
        'rule-strong': c.ruleStrong,
        stamp: c.stamp,
        success: c.success,

        // Status surfaces. Each one always carries a written label, so colour reinforces
        // the message and is never the message (GIGW + our axe gate require this).
        'open-bg': c.openBg,
        'open-border': c.openBorder,
        'open-text': c.openText,
        'closing-bg': c.closingBg,
        'closing-border': c.closingBorder,
        'closing-text': c.closingText,
        'closed-bg': c.closedBg,
        'closed-border': c.closedBorder,
        'closed-text': c.closedText,
      },
      borderRadius: {
        card: `${tokens.radii.card}px`,
        control: `${tokens.radii.control}px`,
        stub: `${tokens.radii.stub}px`,
      },
      fontSize: {
        // Role scale, not a ratio. Body never drops below 18px for this audience.
        micro: '13px',
        label: '16px',
        body: '18px',
        title: '24px',
        display: '30px',
      },
      letterSpacing: {
        stamp: '0.08em',
        tight: '-0.02em',
      },
      lineHeight: {
        reading: '1.5',
        snug: '1.3',
      },
    },
  },
  plugins: [],
};
