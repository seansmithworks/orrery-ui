#!/usr/bin/env node
// node kit/catalog/test.mjs: the catalog check passes on the real tree and fails on a seeded bad input, one or more per check.
// Most seeds change the catalog in memory; the type and aggregate seeds work on a temp copy of kit/. Nothing in the repo is changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REPO, AGGREGATE, loadCatalog, readKit, catalogProblems, schemaProblems, coverageProblems, propsProblems,
  defaultsProblems, partsProblems, exampleProblems, proseProblems, aggregateProblems,
} from './check.mjs';

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-catalog-test-')));
const real = loadCatalog();
const kit = readKit(real);
// A deep copy of the real catalog with one change. `change` gets the folder files by folder name.
const seeded = (change) => {
  const c = structuredClone(real);
  const byFolder = Object.fromEntries(c.map((f) => [f.folder, f.data]));
  change(byFolder);
  for (const f of c) f.text = JSON.stringify(f.data, null, 2);
  return c;
};
const has = (lines, re) => assert.ok(lines.some((l) => re.test(l)), `expected a line matching ${re}, got:\n${lines.join('\n') || '(none)'}`);
// A temp copy of the repo's kit/ and tsconfig.json, sharing node_modules, with one text change in one file.
function seededTree(name, file, from, to) {
  const root = path.join(tmp, name);
  fs.mkdirSync(root);
  fs.cpSync(path.join(REPO, 'kit'), path.join(root, 'kit'), { recursive: true });
  fs.copyFileSync(path.join(REPO, 'tsconfig.json'), path.join(root, 'tsconfig.json'));
  fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  if (file) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(text.split(from).length, 2, `${file} should hold ${from} exactly once`);
    fs.writeFileSync(path.join(root, file), text.replace(from, to));
  }
  return root;
}
const EM = String.fromCharCode(0x2014);

const tests = {
  'real tree: catalog:check passes'() {
    assert.deepEqual(catalogProblems(REPO, real), []);
  },

  'schema: an unknown key on an entry fails, naming the entry and the key'() {
    const bad = schemaProblems(seeded((f) => { f.button.components.Button.variants = ['primary']; }));
    has(bad, /^catalog: kit\/button\/button\.catalog\.json Button has unknown key variants$/);
  },

  '[catalog-matches-kit] coverage: an export with no entry fails, and an entry for no export fails'() {
    const bad = coverageProblems(kit, seeded((f) => {
      delete f.button.components.IconButton;
      f.button.components.Link = structuredClone(f.button.components.Button);
    }));
    has(bad, /^catalog: kit\/index\.ts exports IconButton, which has no catalog entry$/);
    has(bad, /^catalog: kit\/button\/button\.catalog\.json Link is not a value export of kit\/index\.ts$/);
  },

  '[catalog-matches-kit] coverage: an entry in another folder\'s catalog fails, naming the folder it belongs in'() {
    const bad = coverageProblems(kit, seeded((f) => {
      f.field.components.IconButton = f.button.components.IconButton;
      delete f.button.components.IconButton;
    }));
    has(bad, /IconButton is declared in kit\/button\/, so its entry belongs in kit\/button\/button\.catalog\.json/);
  },

  '[catalog-matches-kit] props: an enum missing a value of the literal union fails, naming the prop and both lists'() {
    const bad = propsProblems(kit, seeded((f) => { f.button.components.Button.props.properties.variant.enum = ['primary', 'secondary']; }));
    has(bad, /Button\.props\.variant enum is primary, secondary, but the type allows primary, secondary, quiet$/);
  },

  '[catalog-matches-kit] props: a kit-owned prop left out fails, and a listed prop the type lacks fails'() {
    const bad = propsProblems(kit, seeded((f) => {
      const p = f.dialog.components.Dialog.parts.Trigger.props.properties;
      delete p.size;
      p.loading = { type: 'boolean', description: 'Not on the trigger.' };
    }));
    has(bad, /Dialog\.parts\.Trigger: kit-owned prop size \(declared under kit\/\) is not listed$/);
    has(bad, /Dialog\.parts\.Trigger\.props\.loading is listed, but the component's props type has no loading$/);
  },

  '[catalog-matches-kit] props: a union props type with no anyOf fails, and a wrong type fails'() {
    const bad = propsProblems(kit, seeded((f) => {
      delete f.button.components.IconButton.props.anyOf;
      f.button.components.Button.props.properties.loading.type = 'string';
    }));
    has(bad, /IconButton: the props type is a union whose members require different props \(\{aria-label\} or \{aria-labelledby\}\); state it as props\.anyOf$/);
    has(bad, /Button\.props\.loading type is string, but the component's type is boolean/);
  },

  '[catalog-matches-kit] props: a library prop not marked x-from fails, and open is a real Dialog.Root prop'() {
    const bad = propsProblems(kit, seeded((f) => { delete f.dialog.components.Dialog.parts.Root.props.properties.open['x-from']; }));
    has(bad, /Dialog\.parts\.Root\.props\.open is not declared under kit\/; mark it "x-from": "ui-sdk"/);
    assert.ok(kit.exports.get('Dialog').parts.get('Root').names.has('open'), 'Dialog.Root has no open prop');
    const gone = propsProblems(kit, seeded((f) => { f.dialog.components.Dialog.parts.Popup.props.properties.returnFocus = { 'x-type': 'object', 'x-from': 'ui-sdk', description: 'No such prop.' }; }));
    has(gone, /Dialog\.parts\.Popup\.props\.returnFocus is listed, but the component's props type has no returnFocus$/);
  },

  '[catalog-matches-kit] props: a new variant added to the Button type fails catalog:check, naming the prop'() {
    const root = seededTree('variant', 'kit/button/Button.tsx', '"primary" | "secondary" | "quiet"', '"primary" | "secondary" | "quiet" | "danger"');
    const bad = catalogProblems(root);
    has(bad, /^catalog: kit\/button\/button\.catalog\.json Button\.props\.variant enum is primary, secondary, quiet, but the type allows primary, secondary, quiet, danger$/);
  },

  '[catalog-matches-kit] props: a UI SDK component passthrough resolves to its props; a misspelt one fails, and an unknown x-from fails, the retired library included'() {
    assert.ok(kit.passthrough.get('@ui-sdk/react/button#Button')?.props?.has('focusableWhenDisabled'), 'the UI SDK Button passthrough has no focusableWhenDisabled');
    const c = seeded((f) => { f.button.components.Button.passthrough = '@ui-sdk/react/button#Buton'; });
    has(propsProblems(readKit(c), c), /^catalog: kit\/button\/button\.catalog\.json Button\.passthrough @ui-sdk\/react\/button#Buton does not resolve: /);
    has(schemaProblems(seeded((f) => { f.button.components.Button.props.properties.disabled['x-from'] = 'radix'; })), /Button\.props\.properties\.disabled\.x-from may only be "ui-sdk"$/);
    has(schemaProblems(seeded((f) => { f.button.components.Button.props.properties.disabled['x-from'] = ['base', 'ui'].join('-'); })), /Button\.props\.properties\.disabled\.x-from may only be "ui-sdk"$/);
  },

  '[catalog-matches-kit] props: className false on a part that takes className fails, and a missing false where it takes none fails'() {
    const bad = propsProblems(kit, seeded((f) => {
      const parts = f.dialog.components.Dialog.parts;
      parts.Title.className = false;
      delete parts.CloseIcon.className;
    }));
    has(bad, /Dialog\.parts\.Title says className: false, but the component takes className$/);
    has(bad, /Dialog\.parts\.CloseIcon: the component takes no className; say "className": false/);
  },

  '[catalog-matches-kit] props: a prop of several JSON types fails with a wrong anyOf branch enum, and as a single type'() {
    const bad = propsProblems(kit, seeded((f) => {
      f.field.components.Field.parts.Error.props.properties.match.anyOf[1].enum = ['valid', 'valueMissing'];
    }));
    has(bad, /Field\.parts\.Error\.props\.match anyOf string branch enum is valid, valueMissing, but the type allows valueMissing, /);
    const single = propsProblems(kit, seeded((f) => {
      const m = f.field.components.Field.parts.Error.props.properties.match;
      delete m.anyOf;
      m.type = 'boolean';
    }));
    has(single, /Field\.parts\.Error\.props\.match type is boolean, but the component's type is /);
  },

  '[catalog-matches-kit] defaults: a default that differs from the initializer fails, and an unstated one fails'() {
    const bad = defaultsProblems(kit, seeded((f) => {
      f.button.components.Button.props.properties.size.default = 's';
      delete f.dialog.components.Dialog.parts.CloseIcon.props.properties.label.default;
    }));
    has(bad, /Button\.props\.size\.default is "s", but the component defaults it to "m"$/);
    has(bad, /Dialog\.parts\.CloseIcon\.props\.label: the component defaults it to "Close"; state "default": "Close"$/);
  },

  '[catalog-matches-kit] parts: a missing part, an invented part and an inside that names no part fail'() {
    const bad = partsProblems(kit, seeded((f) => {
      const parts = f.dialog.components.Dialog.parts;
      parts.Footer = parts.Actions;
      delete parts.Actions;
      parts.Close.inside = ['Footer'];
    }));
    has(bad, /Dialog\.parts is missing Actions, a member of Dialog$/);
    has(bad, /Dialog\.parts\.Footer is not a member of Dialog/);
    has(bad, /Dialog\.parts\.Close\.inside names Footer, which is not a part of Dialog$/);
  },

  '[golden-example-valid] example: a missing component, a missing required part and a deep kit import fail'() {
    const file = 'kit/dialog/Dialog.example.tsx';
    const text = fs.readFileSync(path.join(REPO, file), 'utf8').replace('from "../index"', 'from "./Dialog"').replace(/<Dialog\.Title>[\s\S]*?<\/Dialog\.Title>/, '');
    const bad = exampleProblems(real, REPO, (f) => (f === file ? text : fs.readFileSync(path.join(REPO, f), 'utf8')));
    has(bad, /^catalog: kit\/dialog\/Dialog\.example\.tsx imports \.\/Dialog; import the kit only from "\.\.\/index"/);
    has(bad, /^catalog: kit\/dialog\/Dialog\.example\.tsx does not use Dialog\.Title, a required part$/);
    const noIcon = exampleProblems(real, REPO, (f) => fs.readFileSync(path.join(REPO, f), 'utf8').replace(/<IconButton[\s\S]*?<\/IconButton>/, ''));
    has(noIcon, /Button\.example\.tsx does not use IconButton; the golden example uses every component in its folder$/);
  },

  '[golden-example-valid] example: no default export, or a missing file, fails'() {
    const bad = exampleProblems(real, REPO, (f) => (f.endsWith('Field.example.tsx') ? fs.readFileSync(path.join(REPO, f), 'utf8').replace('export default function', 'export function') : f.endsWith('Dialog.example.tsx') ? null : fs.readFileSync(path.join(REPO, f), 'utf8')));
    has(bad, /^catalog: kit\/field\/Field\.example\.tsx must default-export a component/);
    has(bad, /^catalog: kit\/dialog\/Dialog\.example\.tsx does not exist/);
  },

  '[catalog-matches-kit] prose: a long description, too many items, an unknown instead and an em dash fail'() {
    const bad = proseProblems(seeded((f) => {
      const b = f.button.components.Button;
      b.description = `${'A very long description. '.repeat(3)}And more`;
      b.a11y = ['one', 'two', 'three', 'four', 'five'];
      b.avoidWhen[0].instead = 'Hyperlink';
      b.useWhen[0] = `Saving ${EM} or sending.`;
    }));
    has(bad, /Button\.description must be one sentence ending in a full stop$/);
    has(bad, /Button\.a11y has 5 items; the limit is 4$/);
    has(bad, /Button\.avoidWhen\[0\]\.instead names Hyperlink, which is neither a catalog entry nor a native element$/);
    has(bad, /^catalog: kit\/button\/button\.catalog\.json:\d+ em-dash em dash/);
  },

  '[catalog-matches-kit] aggregate: a committed kit/catalog.json that differs from the build fails'() {
    const root = seededTree('aggregate');
    const file = path.join(root, AGGREGATE);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"version": 1', '"version": 2'));
    has(aggregateProblems(loadCatalog(root), root), /^catalog: kit\/catalog\.json differs from what the folder catalogs and examples build/);
    fs.writeFileSync(path.join(root, 'kit/button/Button.example.tsx'), '// edited\n' + fs.readFileSync(path.join(REPO, 'kit/button/Button.example.tsx'), 'utf8'));
    fs.copyFileSync(path.join(REPO, AGGREGATE), file);
    has(aggregateProblems(loadCatalog(root), root), /differs from what the folder catalogs and examples build/);
  },

  '[catalog-matches-kit] coverage: a component folder with no catalog file fails'() {
    const root = seededTree('folder');
    // A folder name no real component uses (kit/tabs was used here until Tabs became a real component).
    fs.mkdirSync(path.join(root, 'kit/seeded'));
    fs.writeFileSync(path.join(root, 'kit/seeded/Seeded.tsx'), 'export function Seeded() { return null; }\n');
    has(coverageProblems(readKit(loadCatalog(root), root), loadCatalog(root), root), /^catalog: kit\/seeded\/ holds a component but no seeded\.catalog\.json$/);
  },
};

let failed = 0;
try {
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`ok    ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${name}\n      ${String(e.message).split('\n').join('\n      ')}`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`kit/catalog/test.mjs: ${Object.keys(tests).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
