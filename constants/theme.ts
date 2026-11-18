import tokens from '../design/tokens.json';

/**
 * The single source of truth for every colour in the app. `tailwind.config.js`
 * reads the same JSON, so a colour used in a class and a colour passed to an
 * icon (e.g. `<Ionicons color={palette.navy} />`) can never drift apart.
 */
export const palette = tokens.colors;

export const radii = tokens.radii;

/**
 * iOS renders these as squircles instead of circular arcs. Android and web
 * ignore the property, so it is safe to apply everywhere a non-capsule radius
 * exists. Spread it into a component's style prop.
 */
export const curve = { borderCurve: 'continuous' } as const;
