// Search control component
import m from "mithril";
import * as catalog from "../../state/catalog.js";
import { state } from "../../state/state.js";

export const SearchControl = {
  view: function () {
    const liteReady = catalog.isLiteReady();
    return m("div.field", [
      m("label.label", "Search:"),
      m("input.input[type=search][placeholder=Search]", {
        value: state.searchQuery,
        disabled: !liteReady,
        title: liteReady ? undefined : "Loading item list…",
        oninput: (e) => {
          state.searchQuery = e.target.value;
        },
      }),
    ]);
  },
};
