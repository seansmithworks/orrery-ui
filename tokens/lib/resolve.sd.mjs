// Style Dictionary 5 adapter: resolve one merged mode document.
import StyleDictionary from 'style-dictionary';

export async function resolve(brand, mode) {
  const sd = new StyleDictionary({ tokens: mode.doc, usesDtcg: true, log: { verbosity: 'silent' }, platforms: { tokens: {} } });
  const { allTokens } = await sd.getPlatformTokens('tokens');
  return Object.fromEntries(allTokens.map((t) => [t.path.join('.'), { type: t.$type, value: t.$value, original: t.original.$value }]));
}
