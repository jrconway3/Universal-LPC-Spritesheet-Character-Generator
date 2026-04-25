// Current selections component
import m from "mithril";
import * as catalog from "../../state/catalog.js";
import { state } from "../../state/state.js";
import {
  isItemLicenseCompatible,
  isItemAnimationCompatible,
} from "../../state/filters.js";

export const CurrentSelections = {
  view: function () {
    if (!catalog.isLiteReady()) {
      return m("div", [
        m("h3.title.is-5", "Current Selections"),
        m("p.is-size-7.has-text-grey", "Loading item list…"),
      ]);
    }

    const selectionCount = Object.keys(state.selections).length;

    if (selectionCount === 0) {
      return m("div", [
        m("h3.title.is-5", "Current Selections"),
        m("p.has-text-grey", "No items selected yet"),
      ]);
    }

    return m("div", [
      m("h3.title.is-5", "Current Selections"),
      m(
        "div.tags",
        Object.entries(state.selections).map(([selectionKey, selection]) => {
          const isLicenseCompatible = isItemLicenseCompatible(selection.itemId);
          const isAnimCompatible = isItemAnimationCompatible(selection.itemId);
          const isCompatible = isLicenseCompatible && isAnimCompatible;
          const meta = catalog.getItemMerged(selection.itemId);

          // Get all licenses for this item
          const allLicenses = new Set();
          if (meta?.credits) {
            meta.credits.forEach((credit) => {
              if (credit.licenses) {
                credit.licenses.forEach((lic) => allLicenses.add(lic.trim()));
              }
            });
          }
          const licensesText = !catalog.isCreditsReady()
            ? "License info loading…"
            : allLicenses.size > 0
              ? `Licenses: ${Array.from(allLicenses).join(", ")}`
              : "No license info";

          // Get supported animations for this item
          const supportedAnims = meta?.animations || [];
          const animsText =
            supportedAnims.length > 0
              ? `Animations: ${supportedAnims.join(", ")}`
              : "No animation info";

          // Build tooltip text
          let tooltipText = "";
          if (!isCompatible) {
            const issues = [];
            if (!isLicenseCompatible) issues.push("licenses");
            if (!isAnimCompatible) issues.push("animations");
            tooltipText = `⚠️ Incompatible with selected ${issues.join(" and ")}\n`;
          }
          tooltipText += `${licensesText}\n${animsText}`;

          return m(
            "span.tag.is-medium",
            {
              key: selectionKey,
              class: isCompatible ? "is-info" : "is-warning",
              title: catalog.isCreditsReady() ? tooltipText : undefined,
            },
            [
              m("span", selection.name),
              !isCompatible ? m("span.ml-1", "⚠️") : null,
              m("button.delete.is-small", {
                onclick: () => {
                  delete state.selections[selectionKey];
                },
              }),
            ],
          );
        }),
      ),
    ]);
  },
};
