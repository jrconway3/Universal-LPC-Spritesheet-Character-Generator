### Contributing

#### Submissions

**Important: all art submitted to this project must be available under one of the supported licenses, see above section `Licensing and Attribution (Credits)`.**

- If you are submitting art that was made by (or derived from work made by) someone else, please be sure that you have the rights to distribute that art under the licenses you choose.

- When adding new artwork to this project, please add valid licensing information inside the json files as well (part of the *credits* object). Note the entire list of authors for that image, a URL for each piece of art from which this image is derived, and a list of licenses under which the art is available.

- While it is recommended that all new artwork follows either the refined [style guide](https://bztsrc.gitlab.io/lpc-refined/), or the [revised guide](https://github.com/ElizaWy/LPC/wiki/Style-Guide), it is not required.

This information must be part of the JSON definition for the assets, for instance:

```
  "credits": [
    {
      "file": "arms/hands/ring/stud",
      "notes": "",
      "authors": [
        "bluecarrot16"
      ],
      "licenses": [
        "CC0"
      ],
      "urls": [
        "https://opengameart.org/content/lpc-jewelry"
      ]
    }
  ]
```

If you don't add license information for your newly added files, the generation of the site sources will fail.

To add sheets to an existing category, add the sheets to the correct folder(s) in `spritesheets/`.
In addition, locate the correct `sheet_definition` in `sheet_definitions/`, and add the name of your added sheet to the `variants` array.

#### Adding a new category / sheet definition

To add a new category, add the sheets to the correct folder(s) in `spritesheets/`.
In addition, create a json file in `sheet_definitions/`, and define the required properties.
For example, you have created at this point:

`body_robot.json`

A category can exist of n-layers. For each layer, define the z-position the sheet needs to be drawn at.
For an example of a multi-layered definition, refer here [here](/sheet_definitions/tail_lizard.json).

You can optionally also specify the available animations the asset supports. You do not have to feel obligated to fill out all animations, and some assets may not work well on all animations anyway. In the sheet definition, you can add the "animations" array below "variants". Again, refer here [here](/sheet_definitions/tail_lizard.json):
```
  "animations": [
    "spellcast",
    "thrust",
    ...etc
  ]
```

If you add this animations list, users can filter the results based on the animations supported. If this list is not included in your sheet definition, then it is assumed the default list of animations are all supported:
```
    "spellcast",
    "thrust",
    "walk",
    "slash",
    "shoot",
    "hurt",
    "watering",
```

As such, if you wish to include less than this list, such as only walk and slash, you should still include the animations definition to restrict it to just those assets. Users will still be able to access your asset, but it won't appear if the animations filter is used and you did not include that animation in your sheet definition.

#### Renaming an Asset

While rare, sometimes it may be deemed that a specific asset should get renamed or moved. In such situations, the aliases key comes into play.

Aliases are a way to forward one asset path into another in order to maintain backward compatibility. This comes in the form of key=value pairs in the current url hash:
```
#sex=male&body=Body_Color_light&head=Human_Male_light&expression=Neutral_light
```

The hash tag is everything after `#` in the address bar. This shows the currently selected assets. The keys are before the equals sign and the values are after.

For example, `expression=Neutral_light` shows the type_name of `expression`, the selected item as `Neutral` and the variant as `light`.

##### When should an asset be renamed?

Asset renames should happen rarely, only if it makes sense. Sometimes older assets have generic names. Please discuss any renames in an issue with us before implementing in a PR, as renaming assets require us to carefully consider backward compatibility.

For some examples, we have belts, which show off aliases in action:
```
  "aliases": {
    "Other_belts_white": "white",
    "Other_belts_teal": "teal"
  },
```

The Other Belts category was removed in favor of shifting these belts to separate categories.

##### How to Forward Assets Using Aliases?

Aliases is an object which may be added to sheet definitions (represented by curly brackets `{` and `}`).

As an example, here's how aliases look in action:
```
  "aliases": {
    "Other_belts_white": "white",
    "Other_belts_teal": "teal"
  },
```

You can see the [full Robe Belt sheet definitions here.](./sheet_definitions/torso/waist/belt_robe.json)


The key is the exact name of the old asset and its variant, in this case:
`Other_belts_white`

`Other Belts` was the old asset name, and white was the variant.

The value tells it which variant on the current sheet definition to use. However, this value can take a full key-value pair, like so:
`"Other_belts_white": "Robe_Belt_white",`

If you include the asset name before the variant, it will manually choose which asset to implement instead of assuming the current asset is the one that is being forwarded to.

You can even include a custom type name, both in the original source asset and the forwarded asset:
```
  "belt=Other_belts_white": "Robe_Belt_white",
  "Other_belts_white": "belt=Robe_Belt_white",
```

If the type_name is NOT included, the type_name from the current sheet definition is assumed for both the origin asset and target asset.

It is highly recommended to simply drop the aliases on the sheet definition that the alias was moved to, in which case you do not need to include the type name.


#### File Generation

Finally, to get your sheet to appear, in `source_index.html`, add your new category at the desired position by adding a `div_sheet_` like this:

`div_sheet_body_robot`

Make sure the name starts with `div_sheet_`, and match the postfix with the name of your json, in this case `body_robot`.

At this point, you will need to run a script that will generate the final `index.html`.
In order to do that, run:

`node scripts/generate_sources.mjs` 

This will generate the `index.html` from the `source_index.html`.

In case you want to push your changes, be sure to run this script and never change the `index.html` manually.
The CI will reject any PR's that contain manual changes made on the `index.html`.

#### Running Tests

The project includes automated tests for the Mithril components that run directly in the browser.

**Running Tests Locally**:

From the project root, run:

```bash
npm run test
```

This uses [Testem](https://github.com/testem/testem) in CI mode (`testem ci`), launches **Chrome** and **Firefox** headlessly, and loads `tests_run.html`. Results are printed in the terminal.

**`DEBUG` environment variable (optional):** By default the test page is opened with `?debug=false` so application debug logging (`debugLog` / `debugWarn` in `sources/utils/debug.js`) stays **off** and the run stays quiet. To enable the same verbose debug output you would get when developing on localhost without that query flag, run:

```bash
DEBUG=1 npm run test
# or
DEBUG=true npm run test
```

**Interactive mode (`test:server`):** To use Testem’s dev UI (file watching, visible browsers, keyboard shortcuts), run:

```bash
npm run test:server
```

By default this follows `testem.js` and opens **Chrome**, **Firefox**, and **Safari** (where available) as configured for dev. The same **`DEBUG`** rules apply as for `npm run test` (`?debug=false` unless you set `DEBUG=1` or `DEBUG=true` when starting Testem).

To run **only one** browser in that mode, pass Testem’s **`--launch`** (`-l`) flag after `--` (arguments after `--` are forwarded to `testem`):

```bash
npm run test:server -- --launch Chrome
npm run test:server -- --launch Firefox
```

You can also pass a comma-separated list if you want a subset, for example `--launch Chrome,Firefox`.

**Manual static server:** Alternatively, start any HTTP server in the project root (for example `python -m http.server 8080`) and open `http://localhost:<port>/tests_run.html` in a browser. That path does not apply Testem’s `?debug=false` URL; on localhost, debug logging follows the normal URL rules in `getDebugParam()`.

**CI Integration**: Tests run automatically in GitHub Actions on every push and pull request using Chrome headless and Firefox headless, matching the CI browser launch configuration in `testem.js`. All tests must pass before a PR can be merged.

#### Visual regression tests (Playwright + Argos)

Full-page screenshots at several viewports live under `tests/visual/` and run with [Playwright](https://playwright.dev/). Captures are sent to [Argos](https://argos-ci.com/) only when `ARGOS_TOKEN` is set (CI uses a repository secret; locally you export the token from your Argos project if you want uploads).

**Run locally**

1. Install dependencies and the Chromium browser for Playwright (once per machine or after upgrading Playwright):

   ```bash
   npm ci
   npx playwright install chromium
   ```

2. Run the visual suite (starts a static server on port **4173** automatically via `webServer` in `playwright.config.mjs`):

   ```bash
   npm run test:visual
   ```

   By default Playwright uses **headless** Chromium: **no browser window opens**, so you only see results in the terminal—but the page is still loaded and **your site’s JavaScript runs** in that invisible browser (including the `type="module"` app in `index.html`). To **watch** the tests in a real window, run `npm run test:visual:headed` (same tests, `--headed`).

   Visual tests wait for `networkidle` (best-effort), a visible preview `canvas`, preview panels to finish showing their `.loading` state, and a paint frame before Argos screenshots—so captures happen after the main async render, not immediately on `load`.

   Without `ARGOS_TOKEN`, tests still load the homepage at each viewport but **do not** take Argos screenshots or upload builds. With `ARGOS_TOKEN` set to a non-empty value, `argosScreenshot` runs and the Argos reporter uploads to Argos.

   To use a different base URL than `http://127.0.0.1:4173`, set `PLAYWRIGHT_TEST_BASE_URL` and change `webServer` in `playwright.config.mjs` (or use a local override) so you only run one static server.

**Test framework**: Browser tests use [Mocha](https://mochajs.org/) in BDD style with [Chai](https://www.chaijs.com/) assertions. Mocha’s BDD helpers (`describe`, `it`, `beforeEach`, and so on) are installed on `globalThis` by the runner, but **ES modules do not see them as free globals**, so each spec imports them from the `mocha-globals` alias (see `tests/bdd-globals.js` and `tests_run.html`):

```javascript
import { describe, it, beforeEach, afterEach } from "mocha-globals";
```

**Registering test files**: The runner loads `tests/tests.js`, which **imports every spec file** in order. When you add a new spec, add a line such as `import "./path/to/MyComponent_spec.js";` there so Mocha picks it up.

**Adding new tests**: Put specs under `tests/` using a `*_spec.js` name (for example `tests/components/MyComponent_spec.js`). Typical patterns:

- Import the component from `sources/…`, `assert` (or `expect`) from `chai`, and the Mocha hooks you need from `mocha-globals`.
- Use `describe` / `it` for structure; use `beforeEach` / `afterEach` to create and remove DOM containers.
- Render with `m.render(…)`; **`m` is provided globally** by the test page (same as the app).
- Assert with Chai and query the DOM with `querySelector`, etc.

Example:
```javascript
import { MyComponent } from "../sources/components/MyComponent.js";
import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha-globals";

describe("MyComponent", function () {
  let container;

  beforeEach(function () {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(function () {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it("renders correctly", function () {
    m.render(container, m(MyComponent, { prop: "value" }));
    const element = container.querySelector(".expected-class");
    assert.notEqual(element, null);
    assert.strictEqual(element.textContent, "expected content");
  });
});
```

#### z-positions

In order to facilitate easier management of the z-positions of the assets in this repo, there is a [script](/scripts/zPositioning/parse_zpos.js) that traverses all JSON files and write's the layer's z-position to a CSV.

To run this script, use:

`node scripts/zPositioning/parse_zpos.js`

This [CSV file](/scripts/zPositioning/z_positions.csv) will be regenerated each time one invokes:

`node scripts/generate_sources.mjs`

Therefore, before creating a PR, make sure you have committed the CSV to the repo as well.

Using this CSV, one can more clearly see the overview of all the z-position used per asset's layer.

Moreover, one can adjust the z-position from within the CSV, and then run:

`node scripts/zPositioning/update_zpos.js`

In order to reflect the changes made back into the JSON files.

**Concluding, please remember that the JSON files will always contain the source of truth with regard to the z-position an asset will be rendered at. The CSV is there to give an overview of the z-positions in use, and provides a mean to easily alter them from a single file.**
