// Orrery system scales and motion: everything outside the Artifact contract.
// Source: base/scales.tokens.json, base/motion.tokens.json, brands/<brand>/elevation.tokens.json.
// A top-level group flagged $extensions.com.orrery.system is skipped by the Artifact emitters (emit.mjs)
// and written here instead, into css/<brand>.system.css, js/orrery.motion.mjs and new Swift enums.
import { dim } from './emit.mjs';

const ext = (node) => node?.$extensions?.['com.orrery'] ?? {};
const aliasOf = (v) => (typeof v === 'string' && /^\{([^}]+)\}$/.exec(v)?.[1]) || null;
const leaves = (g) => Object.entries(g ?? {}).filter(([k]) => !k.startsWith('$'));
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const typeName = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());

export const HIT_TARGET_FLOOR = 44;
const HIT_TARGET = 'target.hit-target-min';

// ---- Springs. Stored in the form they were dialled in. One conversion rule per platform:
//   web:   a Motion transition object, { type: "spring", ...the stored numbers } (what src/motion.ts mergeTransition builds).
//   Swift: OrrerySpring(mass, stiffness, damping) -> Animation.interpolatingSpring; a spring with no mass gets 1, Motion's default.
// Only the stiffness/damping(/mass) form has a rule. Any other form stops the build.
const SPRING_KEYS = ['stiffness', 'damping', 'mass'];
export const REDUCED_FORMS = ['opacity', 'none', 'instant'];
const springs = (doc) => Object.entries(ext(doc).motion?.spring ?? {}).map(([name, s]) => [name, Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('$')))]);
const springProblem = (s) => {
  const keys = Object.keys(s);
  const unknown = keys.filter((k) => !SPRING_KEYS.includes(k));
  if (unknown.length || !('stiffness' in s) || !('damping' in s)) return `has no conversion rule for { ${keys.join(', ')} }; only stiffness, damping and optional mass are converted`;
  const bad = keys.find((k) => typeof s[k] !== 'number' || !(s[k] > 0));
  return bad ? `${bad} must be a number above 0` : null;
};

// ---- Elevation. Level names are shared; each brand picks how a level is drawn.
const DRAW = { fill: ['fill'], hairline: ['fill', 'line', 'line-width'] };
const levels = (doc) => leaves(doc.elevation).map(([name, node]) => ({ name, n: name.replace(/^level-/, ''), node, draw: ext(node).draw })).filter((l) => l.draw !== undefined);

/** Failure lines for every spring that does not declare its reduced-motion form ($reduced) as one of REDUCED_FORMS. */
export function reducedMotionGate(doc, where) {
  const bad = [];
  for (const name of Object.keys(ext(doc).motion?.spring ?? {})) {
    const form = ext(doc).motion.spring[name].$reduced;
    if (!REDUCED_FORMS.includes(form)) bad.push(`reduced motion form missing: ${name} (${where}) has $reduced ${form === undefined ? 'unset' : JSON.stringify(form)}; use ${REDUCED_FORMS.join(', ')}`);
  }
  return bad;
}

/** Failure lines for one mode: hit target under the floor, a spring with no conversion rule, an elevation level the emitters cannot draw. */
export function systemGate(tokens, doc, where) {
  const bad = [];
  const hit = tokens[HIT_TARGET];
  if (!hit) bad.push(`hit target missing: ${HIT_TARGET} (${where})`);
  else if (hit.value.unit !== 'px' || !(hit.value.value >= HIT_TARGET_FLOOR)) bad.push(`hit target too small: ${HIT_TARGET} (${where}) is ${dim(hit.value)}; the floor is ${HIT_TARGET_FLOOR}px`);
  for (const [name, s] of springs(doc)) {
    const why = springProblem(s);
    if (why) bad.push(`spring not converted: ${name} (${where}) ${why}`);
  }
  bad.push(...reducedMotionGate(doc, where));
  for (const l of levels(doc)) {
    const id = `elevation.${l.name}`;
    if (l.draw === 'shadow') bad.push(`elevation not drawn: ${id} (${where}) chooses "shadow", which the source allows but the emitters do not build yet`);
    else if (!DRAW[l.draw]) bad.push(`elevation not drawn: ${id} (${where}) has draw "${l.draw}"; use fill, hairline or shadow`);
    else for (const part of DRAW[l.draw]) {
      if (!aliasOf(tokens[`${id}.${part}`]?.original)) bad.push(`elevation not drawn: ${id}.${part} (${where}) must point at a role, for example {color.layer-1}`);
    }
  }
  return bad;
}

const stepOrder = (a, b) => parseFloat(a.replace('-', '.')) - parseFloat(b.replace('-', '.'));
const typeSteps = (tokens) => Object.keys(tokens).filter((id) => id.startsWith('type.line-height.')).map((id) => id.split('.').pop()).filter((k) => tokens[`type.size.${k}`]).sort(stepOrder)
  .map((k) => ({ k, size: tokens[`type.size.${k}`].value, lineHeight: tokens[`type.line-height.${k}`].value }));
const cssValue = (t) => (t.type === 'number' ? String(t.value) : dim(t.value));
const leafOf = (t) => aliasOf(t.original).split('.').pop();

/** CSS custom properties for the system scales. Elevation points at the color and border tokens in css/<brand>.css. */
export function systemCss(modes, brandName) {
  const [{ doc, tokens }] = modes;
  const L = [
    `/* Orrery system scales, brand ${brandName}. Generated by npm run tokens:build from tokens/. Do not edit.`,
    `   Load after ${brandName}.css: elevation points at its color and border tokens.`,
    '   Breakpoints are here for scripts and docs; a media query cannot read a custom property. */',
    ':root {',
  ];
  for (const s of typeSteps(tokens)) L.push(`  --type-size-${s.k}: ${dim(s.size)};`, `  --type-line-height-${s.k}: ${s.lineHeight};`);
  for (const gname of ['grid', 'breakpoint', 'target']) for (const [name] of leaves(doc[gname])) L.push(`  --${name}: ${cssValue(tokens[`${gname}.${name}`])};`);
  for (const l of levels(doc)) {
    const part = (p) => `var(--${leafOf(tokens[`elevation.${l.name}.${p}`])})`;
    L.push(`  --elevation-${l.n}-fill: ${part('fill')};`);
    L.push(`  --elevation-${l.n}-border: ${l.draw === 'hairline' ? `${part('line-width')} solid ${part('line')}` : 'none'};`);
    L.push(`  --elevation-${l.n}-shadow: none;`);
  }
  for (const [name, s] of springs(doc)) for (const k of SPRING_KEYS) if (k in s) L.push(`  --spring-${name}-${k}: ${s[k]};`);
  L.push('}');
  return L.join('\n') + '\n';
}

/** Motion (motion.dev) transition objects, one export per spring. */
export function motionModule(doc) {
  const L = ['// Orrery motion. Generated by npm run tokens:build from tokens/. Do not edit.', '// One Motion transition object per dialled spring.'];
  for (const [name, s] of springs(doc)) {
    const node = ext(doc).motion.spring[name];
    L.push(`/** ${node.$description} */`, `export const ${camel(name)} = { type: "spring", ${SPRING_KEYS.filter((k) => k in s).map((k) => `${k}: ${s[k]}`).join(', ')} };`);
  }
  return L.join('\n') + '\n';
}

const SWIFT_SYSTEM_HEADER = `
// ---- Orrery system scales and motion (outside the Artifact contract).
public struct OrreryTypeStep: Sendable {
    public let size: CGFloat
    /// Line height as a multiple of size.
    public let lineHeight: CGFloat
}

public struct OrreryElevation: Sendable {
    public enum Draw: Sendable { case fill, hairline }
    public let draw: Draw
    public let fill: Color
    /// The hairline color; nil when the level is drawn as fill only.
    public let line: Color?
    public let lineWidth: CGFloat
}
`;

function swiftSystemBrand(modes, brandName) {
  const [{ doc, tokens }] = modes;
  const L = [`public extension OrreryTokens.${typeName(brandName)} {`];
  const open = (name) => L.push(`    enum ${name} {`);
  const line = (text) => L.push(`        ${text}`);
  const value = (id) => tokens[id].value;
  open('TypeSteps');
  for (const s of typeSteps(tokens)) line(`public static let step${s.k.replace('-', '_')} = OrreryTypeStep(size: ${s.size.value}, lineHeight: ${s.lineHeight})`);
  L.push('    }');
  open('Grid');
  for (const [name] of leaves(doc.grid)) {
    const t = tokens[`grid.${name}`];
    line(`public static let ${camel(name.replace(/^grid-/, ''))}: ${t.type === 'number' ? 'Int' : 'CGFloat'} = ${t.type === 'number' ? t.value : t.value.value}`);
  }
  L.push('    }');
  open('Breakpoints');
  for (const [name] of leaves(doc.breakpoint)) line(`public static let ${camel(name.replace(/^breakpoint-/, 'min-'))}: CGFloat = ${value(`breakpoint.${name}`).value}`);
  L.push('    }');
  open('HitTarget');
  line(`public static let min: CGFloat = ${value(HIT_TARGET).value}`);
  L.push('    }');
  open('Elevation');
  for (const l of levels(doc)) {
    const role = (p, group) => `${group}.${camel(leafOf(tokens[`elevation.${l.name}.${p}`]))}`;
    const hairline = l.draw === 'hairline';
    line(`/// ${l.node.$description}`);
    line(`public static let ${camel(l.name)} = OrreryElevation(draw: .${l.draw}, fill: ${role('fill', 'Colors')}, line: ${hairline ? role('line', 'Colors') : 'nil'}, lineWidth: ${hairline ? role('line-width', 'Border') : '0'})`);
  }
  L.push('    }');
  open('Springs');
  for (const [name, s] of springs(doc)) line(`public static let ${camel(name)} = OrrerySpring(mass: ${s.mass ?? 1}, stiffness: ${s.stiffness}, damping: ${s.damping})`);
  L.push('    }', '}');
  return L.join('\n') + '\n';
}

/** New Swift types and, per brand, new enums. Appended to the file swift() writes. */
export const systemSwift = (brands) => [SWIFT_SYSTEM_HEADER, ...brands.map((b) => swiftSystemBrand(b.modes, b.name))].join('\n');
