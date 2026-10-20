/** The same palette as the web app (apps/web/src/styles/base.css), dark only. */
export const colors = {
  bg: '#0b0d12',
  surface: '#12161e',
  surface2: '#181d27',
  surface3: '#212734',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  text: '#e9ecf3',
  text2: '#a9b1c2',
  text3: '#737c90',
  accent: '#7c9cff',
  accentStrong: '#5f82f8',
  accentInk: '#0b0d12',
  gold: '#ffd166',
  success: '#3ddc84',
  danger: '#ff6b6b',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

/** Spacing on a 4-point grid: space(4) = 16. */
export const space = (n: number) => n * 4;

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.text2, lineHeight: 18 },
  eyebrow: { fontSize: 12, fontWeight: '700' as const, color: colors.text3, letterSpacing: 1, textTransform: 'uppercase' as const },
};
