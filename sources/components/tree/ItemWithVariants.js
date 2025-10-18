// Item with variants component
import { state, getSelectionGroup, applyMatchBodyColor, getHashParamsforSelections } from '../../state/state.js';
import { variantToFilename, capitalize, es6DynamicTemplate } from '../../utils/helpers.js';
import { getImageToDraw } from '../../canvas/renderer.js';
import { getPaletteForItem } from '../../canvas/palette-recolor.js';

export const ItemWithVariants = {
	view: function(vnode) {
		const { itemId, meta, isSearchMatch } = vnode.attrs;
		const isExpanded = state.expandedNodes[itemId] || false;
		const compactDisplay = state.compactDisplay;
		const displayName = meta.name;
		const rootViewNode = vnode;

		return m("div", {
			class: isSearchMatch ? "search-result" : ""
		}, [
			m("div.tree-label", {
				onclick: () => {
					state.expandedNodes[itemId] = !isExpanded;
				},
				oninit: () => {
					rootViewNode.state.isLoading = meta.variants.length > 0;
					rootViewNode.state.imagesToLoad = meta.variants.length;
					rootViewNode.state.imagesLoaded = 0;
				},
				onupdate: () => {
					if (isExpanded && rootViewNode.state.isLoading) {
						if (rootViewNode.state.imagesLoaded >= rootViewNode.state.imagesToLoad) {
							rootViewNode.state.isLoading = false;
						}
					}
				}
			}, [
				m("span.tree-arrow", { class: isExpanded ? 'expanded' : 'collapsed' }),
				m("span", displayName)
			]),
			isExpanded ? m("div", [
				m("div", { class: rootViewNode.state.isLoading ? "loading" : "" }),
				m("div.variants-container.ml-5.is-flex.is-flex-wrap-wrap",
					meta.variants.map(variant => {
					const selectionGroup = getSelectionGroup(itemId);
					const isSelected = state.selections[selectionGroup]?.itemId === itemId &&
						state.selections[selectionGroup]?.variant === variant;
					const variantDisplayName = variant.replaceAll("_", " ");

					// Get preview metadata from item metadata
					const previewRow = meta.preview_row ?? 2;
					const previewCol = meta.preview_column ?? 0;
					const previewXOffset = meta.preview_x_offset ?? 0;
					const previewYOffset = meta.preview_y_offset ?? 0;

					return m("div.variant-item.is-flex.is-flex-direction-column.is-align-items-center.is-clickable", {
						key: variant,
						class: isSelected ? "has-background-link-light has-text-weight-bold has-text-link" : "",
						onmouseover: (e) => {
							const div = e.currentTarget;
							if (!isSelected) div.classList.add('has-background-white-ter');
						},
						onmouseout: (e) => {
							const div = e.currentTarget;

							if (!isSelected) div.classList.remove('has-background-white-ter');
						},
						onclick: () => {
							const selectionGroup = getSelectionGroup(itemId);

							if (isSelected) {
								delete state.selections[selectionGroup];
							} else {
								state.selections[selectionGroup] = {
									itemId: itemId,
									variant: variant,
									name: `${displayName} (${variantDisplayName})`
								};

								// If this item has matchBodyColor enabled, apply to all other body-colored items
								if (meta.matchBodyColor) {
									applyMatchBodyColor(variant);
								}
							}
						}
					}, [
						m("span.variant-display-name.has-text-centered.is-size-7",
							capitalize(variantDisplayName)),
						m("canvas.variant-canvas.box.p-0", {
							width: 64,
							height: 64,
							class: (compactDisplay ? " compact-display" : ""),
							style: (isSelected ? " hsl(217, 71%, 53%)" : " hsl(0, 0%, 86%)"),
							oncreate: (canvasVnode) => {
								const canvas = canvasVnode.dom;
								const ctx = canvas.getContext('2d');

								// Collect all layers for this item
								const layersToLoad = [];

								// Check if item uses a palette - if so, load the source variant
								const paletteConfig = getPaletteForItem(itemId, meta);
								const loadVariant = paletteConfig ? paletteConfig.sourceVariant : variant;

								for (let layerNum = 1; layerNum < 10; layerNum++) {
									const layer = meta.layers?.[`layer_${layerNum}`];
									if (!layer) break;

									let layerPath = layer[state.bodyType];
									if (!layerPath) continue;

									// Replace template variables like ${head}
									if (layerPath.includes('${')) {
										// get params from selections
										// TODO: this could be optimized to avoid recomputing every time
										// or to only do it when relevant selections change
										// or just use the selections directly instead of recomputing the hash params
										const hashParams = getHashParamsforSelections(state.selections || {});
										const replacements = Object.fromEntries(
											Object.entries(hashParams).map(([typeName, nameAndVariant]) => {
												// TODO: this works for head, eye color, and faces but probably not for everything
												const name = nameAndVariant.substr(0, nameAndVariant.lastIndexOf('_'));
												const replacement = meta.replace_in_path[typeName]?.[name];
												return [typeName, replacement];
											})
										);

										layerPath = es6DynamicTemplate(layerPath, replacements);
									}

									const hasCustomAnim = layer.custom_animation;
									let imagePath;
									if (hasCustomAnim) {
										imagePath = `spritesheets/${layerPath}${variantToFilename(loadVariant)}.png`;
									} else {
										const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
										imagePath = `spritesheets/${layerPath}${defaultAnim}/${variantToFilename(loadVariant)}.png`;
									}

									layersToLoad.push({
										zPos: layer.zPos || 100,
										path: imagePath
									});
								}

								// Sort by zPos
								layersToLoad.sort((a, b) => a.zPos - b.zPos);

								// Load and draw all layers
								Promise.all(layersToLoad.map(layer => {
									return new Promise((resolve) => {
										const img = new Image();
										img.onload = () => resolve({ img, layer });
										img.onerror = () => resolve({ img: null, layer });
										img.src = layer.path;
									});
								})).then(async loadedLayers => {
									// Draw each layer in zPos order at full 64x64 resolution
									for (const { img, layer } of loadedLayers) {
										if (img) {
											const imageToDraw = await getImageToDraw(img, itemId, variant);
											ctx.drawImage(
												imageToDraw,
												previewCol * 64 - previewXOffset, previewRow * 64 - previewYOffset, 64, 64,
												0, 0, 64, 64
											);
										}
									}
									rootViewNode.state.imagesLoaded++;
									m.redraw();
								});
							}
						})
					]);
				}))
			]) : null
		]);
	}
};
