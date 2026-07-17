import { dartsManifest } from "@/modules/darts/manifest";
import { listsManifest } from "@/modules/lists/manifest";
import type { ModuleManifest } from "@/platform/module-manifest";


/**
 * The platform's single module registry (ADR-0001, ADR-0013). Every module
 * registers its manifest here; the app reads only this array, never a specific
 * module folder (one-way imports, ADR-0003). Adding a module is adding its
 * folder under `modules/<slug>/` and one entry to this list.
 */
export const modules: ModuleManifest[] = [listsManifest, dartsManifest];
