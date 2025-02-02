const fs = require("fs");
const readline = require("readline");

const DEBUG = false; // change this to print debug log
const onlyIfTemplate = true; // print debugging log only if there is a template

require("child_process").fork("scripts/zPositioning/parse_zpos.js");

// copied from https://github.com/mikemaccana/dynamic-template/blob/046fee36aecc1f48cf3dc454d9d36bb0e96e0784/index.js
const es6DynamicTemplate = (templateString, templateVariables) =>
  templateString.replace(/\${(.*?)}/g, (_, g) => templateVariables[g]);

const licensesFound = [];
function searchCredit(fileName, credits, origFileName) {
  if (credits.count <= 0) {
    console.error("no credits for filename:", fileName);
    return undefined;
  }
  if (credits.count === 1) {
    if (!credits[0].file.includes(fileName)) {
      console.error("Wrong credit at filename:", fileName);
    }
    return undefined;
  }

  for (let creditsIndex = 0; creditsIndex < credits.length; creditsIndex++) {
    const credit = credits[creditsIndex];
    if (
      credit.file === fileName ||
      credit.file === fileName + ".png" ||
      credit.file + "/" === fileName
    ) {
      return credit;
    }
  }

  const index = fileName.lastIndexOf("/");
  if (index > -1) {
    return searchCredit(fileName.substring(0, index), credits, origFileName);
  } else {
    console.error(
      "missing credit after searching recursively filename:",
      origFileName
    );
    return undefined;
  }
}

function parseJson(json) {
  const templateIndex = json.lastIndexOf("%");
  let searchFileName = json;
  let queryObj = null;
  if (templateIndex > -1) {
    searchFileName = searchFileName.substring(0, templateIndex);
    const query = json.substring(templateIndex + 1);
    queryObj = Object.fromEntries(new URLSearchParams(query));
    const replObj = Object.fromEntries(
      Object.keys(queryObj).map((key) => [key, ""])
    );
    searchFileName = es6DynamicTemplate(searchFileName, replObj)
      .replace(/_+/, "_");
  }
  const filePath = `sheet_definitions/${searchFileName}.json`;
  if (DEBUG && (!onlyIfTemplate || queryObj))
    console.log(`Parsing ${filePath}`);
  const definition = JSON.parse(fs.readFileSync(filePath));
  const { variants, name, credits, template } = definition;
  const typeName = definition.type_name;
  const defaultAnimations = [
    "spellcast",
    "thrust",
    "walk",
    "slash",
    "shoot",
    "hurt",
    "watering",
  ];

  const requiredSexes = [];
  const animations = definition.animations ?? defaultAnimations;

  const previewRow = definition.preview_row ?? 2;
  const previewColumn = definition.preview_column ?? 0;
  const previewXOffset = definition.preview_x_offset ?? 0;
  const previewYOffset = definition.preview_y_offset ?? 0;

  const sexes = ["male", "female", "teen", "child", "muscular", "pregnant"];
  for (const sex of sexes) {
    if (definition.layer_1[sex]) {
      requiredSexes.push(sex);
    }
  }

  const requiredSex = requiredSexes.join(",");
  const supportedAnimations = animations.join(",");

  const startHTML =
    `<li data-required="[REQUIRED_SEX]" data-animations="[SUPPORTED_ANIMATIONS]"><span class="condensed">${name}</span><ul>`
      .replace("[REQUIRED_SEX]", requiredSex)
      .replace("[SUPPORTED_ANIMATIONS]", supportedAnimations);
  const templateHTML = fs.readFileSync("scripts/template-general.html", "utf8");

  const endHTML = "</ul></li>";

  let listItemsHTML = `<li><input type="radio" id="${typeName}-none_${name}" name="${typeName}"> <label for="${typeName}-none">No ${typeName}</label></li>`;
  let listItemsCSV = "";
  const addedCreditsFor = [];
  for (const variant of variants) {
    const snakeName = name.replaceAll(" ", "_");
    const snakeItemName = variant.replaceAll(" ", "_")
    const itemIdFor = `${typeName}-${snakeName}_${snakeItemName}`;
    let matchBodyColor = false;
    if (definition[`match_body_color`] !== undefined) {
      matchBodyColor = true;
    }
    let dataFiles = "";
    for (const sex of requiredSexes) {
      for (jdx = 1; jdx < 10; jdx++) {
        const layerDefinition = definition[`layer_${jdx}`];
        if (layerDefinition !== undefined) {
          if (sex === requiredSexes[0]) {
            const zPos = definition[`layer_${jdx}`].zPos;
            dataFiles += `data-preview_row=${previewRow} data-preview_column=${previewColumn} data-preview_x_offset=${previewXOffset} data-preview_y_offset=${previewYOffset} data-layer_${jdx}_zpos=${zPos} `;
            const custom_animation = layerDefinition.custom_animation;
            if (custom_animation !== undefined) {
              dataFiles += `data-layer_${jdx}_custom_animation=${custom_animation} `;
            }
          }
          const file = layerDefinition[sex];
          if (file !== null && file !== "") {
            let imageFileName =
              '"' + file + snakeItemName + '.png" ';
            let fileNameForCreditSearch = file + snakeItemName;
            if (queryObj) {
              fileNameForCreditSearch = es6DynamicTemplate(
                fileNameForCreditSearch,
                queryObj
              );
              imageFileName = es6DynamicTemplate(imageFileName, queryObj);
            }
            if (DEBUG && (!onlyIfTemplate || queryObj))
              console.log(
                `Searching for credits to use for ${imageFileName} in ${fileNameForCreditSearch} for layer ${jdx}`
              );
            const creditToUse = searchCredit(
              fileNameForCreditSearch,
              credits,
              fileNameForCreditSearch
            );
            if (DEBUG && (!onlyIfTemplate || queryObj))
              console.log(
                `file name set for ${sex} is ${imageFileName} for layer ${jdx}`
              );
            dataFiles += `data-layer_${jdx}_${sex}=${imageFileName} `;
            if (template) {
              const mungedTemplate = JSON.stringify(template)
                .replace(/"/g, "'");
              dataFiles += `data-layer_${jdx}_template="${mungedTemplate}" `;
            }
            if (creditToUse !== undefined) {
              for (license in creditToUse.licenses) {
                if (!licensesFound.includes(license)) {
                  licensesFound.push(license);
                }
              }
              const licenses = '"' + creditToUse.licenses.join(",") + '" ';
              dataFiles += `data-layer_${jdx}_${sex}_licenses=${licenses} `;
              const authors = '"' + creditToUse.authors.join(",") + '" ';
              dataFiles += `data-layer_${jdx}_${sex}_authors=${authors} `;
              const urls = '"' + creditToUse.urls.join(",") + '" ';
              dataFiles += `data-layer_${jdx}_${sex}_urls=${urls} `;
              const notes =
                '"' + creditToUse.notes.replaceAll('"', "**") + '" ';
              dataFiles += `data-layer_${jdx}_${sex}_notes=${notes} `;
              if (!addedCreditsFor.includes(imageFileName)) {
                const quotedShortName = '"' + file + variant + '.png"';
                listItemsCSV += `${quotedShortName},${notes},${authors},${licenses},${urls}\n`;
                addedCreditsFor.push(imageFileName);
              }
            } else {
              throw Error(`missing credit inside ${json}`);
            }
          }
        } else {
          break;
        }
      }
    }
    listItemsHTML += templateHTML
      .replaceAll("[ID_FOR]", itemIdFor)
      .replaceAll("[TYPE_NAME]", typeName)
      .replaceAll("[NAME]", variant)
      .replaceAll("[PARENT_NAME]", name)
      .replaceAll("[MATCH_BODY_COLOR]", matchBodyColor)
      .replaceAll("[VARIANT]", variant)
      .replaceAll("[DATA_FILE]", dataFiles);
  }
  const html = startHTML + listItemsHTML + endHTML;
  let parsed = {};
  parsed.html = html;
  parsed.csv = listItemsCSV;
  return parsed;
}

const lineReader = readline.createInterface({
  input: fs.createReadStream("sources/source_index.html"),
});
let htmlGenerated =
  "<!-- THIS FILE IS AUTO-GENERATED. PLEASE DONT ALTER IT MANUALLY -->\n";
let csvGenerated = "filename,notes,authors,licenses,urls\n";

lineReader.on("line", function (line) {
  if (line.includes("div_sheet_")) {
    const definition = line.replace("div_sheet_", "");
    const parsedResult = parseJson(definition.replaceAll("\t", ""));
    const newLineHTML = parsedResult.html;
    htmlGenerated += newLineHTML + "\n";
    csvGenerated += parsedResult.csv;
  } else {
    htmlGenerated += line + "\n";
  }
});

lineReader.on("close", function (line) {
  fs.writeFile("index.html", htmlGenerated, function (err) {
    if (err) {
      return console.error(err);
    } else {
      console.log("HTML Updated!");
    }
  });
  fs.writeFile("CREDITS.csv", csvGenerated, function (err) {
    if (err) {
      return console.error(err);
    } else {
      console.log("CSV Updated!");
      console.log("Found licenses:", licensesFound);
    }
  });
});
