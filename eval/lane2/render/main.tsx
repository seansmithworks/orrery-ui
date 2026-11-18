// One entry for all three servers. The orrery server pre-bundles the kit's dependencies through `optimizeDeps.entries`
// (kit/index.ts) and the shadcn server through the fixture's components, so no solution triggers a late re-bundle.
import { mount } from "./host";

mount();
