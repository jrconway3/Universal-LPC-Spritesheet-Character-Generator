import { ANIMATIONS, ANIMATION_CONFIGS, FRAME_SIZE } from "./constants.js";
import {
  extractAnimationFromCanvas,
  renderSingleItem,
  renderSingleItemAnimation,
  SHEET_HEIGHT,
  canvas,
  layers,
  customAreaItems,
  addedCustomAnimations,
} from "../canvas/renderer.js";
import { getMultiRecolors } from "../recolors/recolors.js";
import { getAllCredits, creditsToTxt, creditsToCsv } from "../utils/credits.js";
import { getItemFileName } from "../utils/fileName.js";
import { loadImage } from "../canvas/load-image.js";
import { exportStateAsJSON } from "./json.js";
import {
  customAnimations,
  customAnimationSize,
  isCustomAnimationBasedOnStandardAnimation,
} from "../custom-animations.js";
import { getSortedLayers } from "./meta.js";
import { canvasToBlob, image2canvas } from "../canvas/canvas-utils.js";
import {
  addAnimationToZipFolder,
  addStandardAnimationToZipCustomFolder,
  extractFramesFromAnimation,
  extractFramesFromCustomAnimation,
  newAnimationFromSheet,
} from "../utils/zip-helpers.js";
import { debugLog, debugWarn } from "../utils/debug.js";

// Export ZIP - Split by animation
export const exportSplitAnimations = async () => {
  if (!window.canvasRenderer || !window.JSZip) {
    alert("JSZip library not loaded");
    return;
  }

  let state;

  try {
    const zip = new window.JSZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    state = (await import("./state.js")).state; // Ensure state is loaded
    state.zipByAnimation.isRunning = true;
    m.redraw();
    const bodyType = state.bodyType;

    // Create folder structure to match original
    const standardFolder = zip.folder("standard");
    const customFolder = zip.folder("custom");
    const creditsFolder = zip.folder("credits");

    // Get available animations from canvas renderer
    const animationList = ANIMATIONS;
    const exportedStandard = [];
    const failedStandard = [];

    // Create animation PNGs in standard folder
    for (const anim of animationList) {
      try {
        const animCanvas = extractAnimationFromCanvas(anim.value);
        await addAnimationToZipFolder(
          standardFolder,
          `${anim.value}.png`,
          animCanvas,
          new DOMRect(0, 0, animCanvas.width, animCanvas.height),
        );
      } catch (err) {
        console.error(`Failed to export animation ${anim.value}:`, err);
        failedStandard.push(anim.value);
      }
    }

    // Handle custom animations
    const exportedCustom = [];
    const failedCustom = [];
    let y = SHEET_HEIGHT;

    for (const animName of addedCustomAnimations) {
      try {
        const anim = customAnimations[animName];
        if (!anim) {
          throw new Error("Animation definition not found");
        }

        const srcRect = { x: 0, y, ...customAnimationSize(anim) };
        const animCanvas = await addAnimationToZipFolder(
          customFolder,
          `${animName}.png`,
          canvas,
          srcRect,
        );

        if (animCanvas) exportedCustom.push(animName);

        y += srcRect.height;
      } catch (err) {
        console.error(`Failed to export custom animation ${animName}:`, err);
        failedCustom.push(animName);
      }
    }

    // Add character.json at root
    zip.file("character.json", exportStateAsJSON(state, layers));

    // Add credits in credits folder
    const allCredits = getAllCredits(state.selections, state.bodyType);
    creditsFolder.file("credits.txt", creditsToTxt(allCredits));
    creditsFolder.file("credits.csv", creditsToCsv(allCredits));

    // Add metadata.json in credits folder
    const metadata = {
      exportTimestamp: timestamp,
      bodyType: bodyType,
      standardAnimations: {
        exported: exportedStandard,
        failed: failedStandard,
      },
      customAnimations: {
        exported: exportedCustom,
        failed: failedCustom,
      },
      frameSize: FRAME_SIZE,
      frameCounts: {}, // Would need to map animation frame counts
    };
    creditsFolder.file("metadata.json", JSON.stringify(metadata, null, 2));

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lpc_${bodyType}_animations_${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    if (failedStandard.length > 0 || failedCustom.length > 0) {
      alert(
        `Export completed with some issues:\nFailed to export animations: ${failedStandard.join(
          ", ",
        )}`,
      );
    } else {
      alert("Export complete!");
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert(`Export failed: ${err.message}`);
  } finally {
    state.zipByAnimation.isRunning = false;
    m.redraw();
  }
};

// Export ZIP - Split by item
export const exportSplitItemSheets = async () => {
  if (!window.canvasRenderer || !window.JSZip) {
    alert("JSZip library not loaded");
    return;
  }

  let state;

  try {
    const zip = new window.JSZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    state = (await import("./state.js")).state; // Ensure state is loaded
    state.zipByItem.isRunning = true;
    m.redraw();
    const bodyType = state.bodyType;

    // Create folder structure
    const itemsFolder = zip.folder("items");
    const creditsFolder = zip.folder("credits");

    const exportedItems = [];
    const failedItems = [];

    // Render each item individually
    for (const [, selection] of Object.entries(state.selections)) {
      const { itemId, variant, name } = selection;
      const layers = getSortedLayers(itemId, true);

      // Get Multiple Recolors If Available
      const recolors = getMultiRecolors(itemId, state.selections);

      // Render each layer of the item separately
      for (const layer of layers) {
        if (layer.custom_animation) continue;
        const fileName = getItemFileName(itemId, variant, name, layer.layerNum);
        try {
          // Render just this one item
          const itemCanvas = await renderSingleItem(
            itemId,
            variant,
            recolors,
            bodyType,
            state.selections,
            layer.layerNum,
          );

          if (itemCanvas) {
            await addAnimationToZipFolder(
              itemsFolder,
              `${fileName}.png`,
              itemCanvas,
            );
            exportedItems.push(fileName);
          }
        } catch (err) {
          console.error(`Failed to export item ${fileName}:`, err);
          failedItems.push(fileName);
        }
      }
    }

    // Add character.json at root
    zip.file("character.json", exportStateAsJSON(state, layers));

    // Add credits in credits folder
    const allCredits = getAllCredits(state.selections, state.bodyType);
    creditsFolder.file("credits.txt", creditsToTxt(allCredits));
    creditsFolder.file("credits.csv", creditsToCsv(allCredits));

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lpc_${bodyType}_item_spritesheets_${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    if (failedItems.length > 0) {
      alert(
        `Export completed with some issues:\nFailed items: ${failedItems.join(
          ", ",
        )}`,
      );
    } else {
      alert("Export complete!");
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert(`Export failed: ${err.message}`);
  } finally {
    state.zipByItem.isRunning = false;
    m.redraw();
  }
};

// Export ZIP - Split by animation and item
export const exportSplitItemAnimations = async () => {
  if (!window.canvasRenderer || !window.JSZip) {
    alert("JSZip library not loaded");
    return;
  }

  let state;

  try {
    const zip = new window.JSZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    state = (await import("./state.js")).state; // Ensure state is loaded
    state.zipByAnimimationAndItem.isRunning = true;
    m.redraw();
    const bodyType = state.bodyType;

    // Create folder structure
    const standardFolder = zip.folder("standard");
    const customFolder = zip.folder("custom");
    const creditsFolder = zip.folder("credits");

    // Get available animations
    const animationList = ANIMATIONS;
    const exportedStandard = {};
    const failedStandard = {};
    const exportedCustom = {};
    const failedCustom = {};

    // For each animation, create a folder and export each item
    for (const anim of animationList) {
      if (anim.noExport) continue;
      const animFolder = standardFolder.folder(anim.value);
      if (!animFolder) continue;

      exportedStandard[anim.value] = [];
      failedStandard[anim.value] = [];

      // Export each item for this animation
      for (const [, selection] of Object.entries(state.selections)) {
        const { itemId, variant, name } = selection;
        const meta = window.itemMetadata[itemId];
        if (!meta || !meta.animations.includes(anim.value)) {
          debugLog(
            "Skipping item ",
            itemId,
            " without the animation: ",
            anim.value,
          );
          continue;
        }

        // Get Multiple Recolors If Available
        const recolors = getMultiRecolors(itemId, state.selections);

        // Render each layer of the item separately
        const layers = getSortedLayers(itemId, true);
        for (const layer of layers) {
          const fileName = getItemFileName(
            itemId,
            variant,
            name,
            layer.layerNum,
          );

          try {
            // Render just this item for this animation
            const animCanvas = await renderSingleItemAnimation(
              itemId,
              variant,
              recolors,
              bodyType,
              anim.value,
              state.selections,
              layer.layerNum,
            );

            if (animCanvas) {
              await addAnimationToZipFolder(
                animFolder,
                `${fileName}.png`,
                animCanvas,
              );
              exportedStandard[anim.value].push(fileName);
            }

            for (const custAnimName of addedCustomAnimations) {
              const custAnim = customAnimations[custAnimName];
              if (!isCustomAnimationBasedOnStandardAnimation(custAnim, name))
                continue;

              const custExportedItems = exportedCustom[custAnimName] ?? [];
              exportedCustom[custAnimName] = custExportedItems;
              const custFailedItems = failedCustom[custAnimName] ?? [];
              const itemFileName = fileName;
              try {
                const custAnimFolder = customFolder.folder(custAnimName);
                const spritePath = layer.spritePath;
                const img = await loadImage(spritePath, false);
                if (
                  await addStandardAnimationToZipCustomFolder(
                    custAnimFolder,
                    itemFileName,
                    img,
                    custAnim,
                  )
                )
                  custExportedItems.push(itemFileName);
              } catch (err) {
                console.error(
                  `Failed to export item ${itemFileName} in custom animation ${custAnimName}:`,
                  err,
                );
                custFailedItems.push(itemFileName);
                failedCustom[custAnimName] = custFailedItems;
              }
            }
          } catch (err) {
            console.error(
              `Failed to export ${fileName} for ${anim.value}:`,
              err,
            );
            failedStandard[anim.value].push(fileName);
          }
        }
      }
    }

    debugLog(customAreaItems);

    for (const customAnimName of Object.keys(customAreaItems)) {
      // Export items exclusive to custom animations
      for (const layer of customAreaItems[customAnimName]) {
        const custName = layer.animation;

        debugLog("Processing layer for custom animation only export:", layer);

        const spritePath = layer.spritePath;
        const itemFileName = getItemFileName(
          layer.itemId,
          layer.variant,
          layer.name,
          1,
          layer.zPos,
        );
        const custExportedItems = exportedCustom[custName] ?? [];
        exportedCustom[custName] = custExportedItems;
        const custFailedItems = failedCustom[custName] ?? [];

        try {
          debugLog(
            `Exporting item ${itemFileName} for custom animation ${custName}`,
          );
          const img = await loadImage(spritePath, false);
          if (!img) continue;

          const imgCanvas = image2canvas(img);
          const custAnim = customAnimations[custName];
          if (!custAnim)
            throw new Error(
              "Custom animation not found for item: " + layer.itemId,
            );
          const custSize = customAnimationSize(custAnim);
          const srcRect = { x: 0, y: 0, ...custSize };
          const animFolder = customFolder.folder(custName);
          if (
            await addAnimationToZipFolder(
              animFolder,
              itemFileName,
              imgCanvas,
              srcRect,
            )
          )
            custExportedItems.push(itemFileName);
        } catch (err) {
          console.error(
            `Failed to export item ${itemFileName} in custom animation ${custName}:`,
            err,
          );
          custFailedItems.push(itemFileName);
          failedCustom[custName] = custFailedItems;
        }
      }
    }

    // Add character.json at root
    zip.file("character.json", exportStateAsJSON(state, layers));

    // Add credits in credits folder
    const allCredits = getAllCredits(state.selections, state.bodyType);
    creditsFolder.file("credits.txt", creditsToTxt(allCredits));
    creditsFolder.file("credits.csv", creditsToCsv(allCredits));

    // Add metadata.json in credits folder
    const metadata = {
      exportTimestamp: timestamp,
      bodyType: bodyType,
      standardAnimations: {
        exported: exportedStandard,
        failed: failedStandard,
      },
      customAnimations: {
        exported: exportedCustom,
        failed: failedCustom,
      },
      frameSize: FRAME_SIZE,
      frameCounts: {},
    };
    creditsFolder.file("metadata.json", JSON.stringify(metadata, null, 2));

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lpc_${bodyType}_item_animations_${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    // Report failures if any
    const failedCount = Object.values(failedStandard).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    if (failedCount > 0) {
      let msg = "Export completed with some issues:\n";
      for (const [anim, items] of Object.entries(failedStandard)) {
        if (items.length > 0) {
          msg += `${anim}: ${items.join(", ")}\n`;
        }
      }
      alert(msg);
    } else {
      alert("Export complete!");
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert(`Export failed: ${err.message}`);
  } finally {
    state.zipByAnimimationAndItem.isRunning = false;
    m.redraw();
  }
};

// Export ZIP - Individual animation frames
export const exportIndividualFrames = async () => {
  if (!window.canvasRenderer || !window.JSZip) {
    alert("JSZip library not loaded");
    return;
  }

  let state;

  try {
    const zip = new window.JSZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    state = (await import("./state.js")).state;
    state.zipIndividualFrames = state.zipIndividualFrames || {
      isRunning: false,
    };
    state.zipIndividualFrames.isRunning = true;
    m.redraw();
    const bodyType = state.bodyType;

    // Create folder structure
    const standardFolder = zip.folder("standard");
    const customFolder = zip.folder("custom");
    const creditsFolder = zip.folder("credits");

    const exportedAnimations = [];
    const failedAnimations = [];
    const directions = ["up", "down", "left", "right"];

    // Pre-extract all animations with caching enabled for better performance
    const animationCanvases = new Map();
    for (const anim of ANIMATIONS) {
      try {
        const animationName = anim.value;
        const animCanvas = extractAnimationFromCanvas(animationName, true); // Enable caching
        if (animCanvas) {
          animationCanvases.set(animationName, animCanvas);
        }
      } catch (err) {
        console.error(`Failed to extract animation ${anim.value}:`, err);
        failedAnimations.push(anim.value);
      }
    }

    // Batch blob creation promises for parallel processing
    const blobTasks = [];

    // Process standard animations with optimized frame extraction
    for (const anim of ANIMATIONS) {
      try {
        const animationName = anim.value;
        const animCanvas = animationCanvases.get(animationName);

        if (animCanvas) {
          const animFolder = standardFolder.folder(animationName);
          const frames = extractFramesFromAnimation(
            animCanvas,
            animationName,
            directions,
          );

          for (const [direction, frameList] of Object.entries(frames)) {
            if (frameList.length > 0) {
              const directionFolder = animFolder.folder(direction);

              // Queue blob creation tasks instead of awaiting each one
              for (const { canvas: frameCanvas, frameNumber } of frameList) {
                blobTasks.push({
                  promise: canvasToBlob(frameCanvas),
                  folder: directionFolder,
                  filename: `${frameNumber}.png`,
                  debugPath: `standard/${animationName}/${direction}/${frameNumber}.png`,
                });
              }
            }
          }
          exportedAnimations.push(animationName);
        }
      } catch (err) {
        console.error(
          `Failed to process frames for animation ${anim.value}:`,
          err,
        );
        failedAnimations.push(anim.value);
      }
    }

    // Process custom animations
    const exportedCustom = [];
    const failedCustom = [];
    let y = SHEET_HEIGHT;

    for (const animName of addedCustomAnimations) {
      try {
        const customAnimDef = customAnimations[animName];
        if (!customAnimDef) {
          throw new Error("Custom animation definition not found");
        }

        const custSize = customAnimationSize(customAnimDef);
        const srcRect = { x: 0, y, ...custSize };

        debugLog(`Processing custom animation: ${animName}`, {
          frameSize: customAnimDef.frameSize,
          frames: customAnimDef.frames,
          srcRect: srcRect,
        });

        // Extract custom animation from main canvas
        const custAnimCanvas = newAnimationFromSheet(canvas, srcRect);
        if (custAnimCanvas) {
          const animFolder = customFolder.folder(animName);
          const frames = extractFramesFromCustomAnimation(
            custAnimCanvas,
            customAnimDef,
            directions,
          );

          debugLog(`Extracted frames for ${animName}:`, frames);

          for (const [direction, frameList] of Object.entries(frames)) {
            if (frameList.length > 0) {
              const directionFolder = animFolder.folder(direction);

              // Queue blob creation tasks for custom animations too
              for (const { canvas: frameCanvas, frameNumber } of frameList) {
                blobTasks.push({
                  promise: canvasToBlob(frameCanvas),
                  folder: directionFolder,
                  filename: `${frameNumber}.png`,
                  debugPath: `custom/${animName}/${direction}/${frameNumber}.png`,
                });
              }
            }
          }
          exportedCustom.push(animName);
        } else {
          debugWarn(`No canvas generated for custom animation: ${animName}`);
        }

        y += srcRect.height;
      } catch (err) {
        console.error(
          `Failed to export frames for custom animation ${animName}:`,
          err,
        );
        failedCustom.push(animName);
      }
    }

    // Process all blob creation in parallel for much better performance
    debugLog(`Converting ${blobTasks.length} frames to blobs...`);
    const blobResults = await Promise.all(
      blobTasks.map(async (task) => {
        try {
          const blob = await task.promise;
          return { ...task, blob, success: true };
        } catch (err) {
          console.error(`Failed to create blob for ${task.debugPath}:`, err);
          return { ...task, blob: null, success: false };
        }
      }),
    );

    // Add all successful blobs to ZIP
    let successCount = 0;
    for (const result of blobResults) {
      if (result.success && result.blob) {
        result.folder.file(result.filename, result.blob);
        successCount++;
        debugLog(`Added frame: ${result.debugPath}`);
      }
    }

    debugLog(
      `Successfully processed ${successCount}/${blobTasks.length} frames`,
    );

    // Add character.json at root
    zip.file("character.json", exportStateAsJSON(state, layers));

    // Add credits in credits folder
    const allCredits = getAllCredits(state.selections, state.bodyType);
    creditsFolder.file("credits.txt", creditsToTxt(allCredits));
    creditsFolder.file("credits.csv", creditsToCsv(allCredits));

    // Add metadata.json with frame structure info
    const metadata = {
      exportTimestamp: timestamp,
      bodyType: bodyType,
      frameSize: FRAME_SIZE,
      structure: {
        standard: {
          exported: exportedAnimations,
          failed: failedAnimations,
        },
        custom: {
          exported: exportedCustom,
          failed: failedCustom,
        },
      },
      animationConfigs: ANIMATION_CONFIGS,
      directions: directions,
      note: "Individual animation frames organized by standard/custom > animation > direction > frame number",
    };
    creditsFolder.file("metadata.json", JSON.stringify(metadata, null, 2));

    // Generate and download ZIP
    debugLog("Generating ZIP file...");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lpc_${bodyType}_individual_frames_${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    // Report results
    const totalFailed = failedAnimations.length + failedCustom.length;
    if (totalFailed > 0) {
      let msg = "Export completed with some issues:\n";
      if (failedAnimations.length > 0) {
        msg += `Failed standard animations: ${failedAnimations.join(", ")}\n`;
      }
      if (failedCustom.length > 0) {
        msg += `Failed custom animations: ${failedCustom.join(", ")}\n`;
      }
      alert(msg);
    } else {
      alert("Individual frames export complete!");
    }
  } catch (err) {
    console.error("Individual frames export failed:", err);
    alert(`Export failed: ${err.message}`);
  } finally {
    if (state && state.zipIndividualFrames) {
      state.zipIndividualFrames.isRunning = false;
    }
    m.redraw();
  }
};
