import fs from "fs";
import chalk from "chalk";
import gettextParser from "gettext-parser";

import { filewalker } from "./src/scripts/common/filewalker.js";
import { queryParams } from "./src/scripts/common/queryParams.js";
import { translatePh } from "./src/scripts/common/translate.js";

const pathBase = process.cwd();

const correcciones = [];

const searchDirs = async (type) => {
  const pathArr = await filewalker(pathBase, {
    directoryFilter: ["!.git", "!*modules"],
    type: "files",
    fileFilter: `*${type}`
  });
  return pathArr;
};

const writeFileCorrecciones = async () => {
  const name = "correction.json";
  try {
    const path = pathBase + "/" + name;
    const output = JSON.stringify(correcciones);
    fs.writeFileSync(path, output);
  } catch (err) {
    console.error(err);
    return;
  } finally {
    console.log(`
       ${chalk.green.bold("------ CREATED CORRECTLY ------")}\n
       The following item has been created\n
       - File: ${chalk.green.bold(name)}\n
       - Path: ${chalk.green.bold(pathBase + "/" + name)}\n
       ----------------------------------\n`);
  }
};

const writeFileMo = async (data, nameFile) => {
  const name = nameFile + ".mo";
  try {
    const path = pathBase + "/" + name;
    const output = gettextParser.mo.compile(data);
    fs.writeFileSync(path, output);
  } catch (err) {
    console.error(err);
    return;
  } finally {
    console.log(`
       ${chalk.green.bold("------ CREATED CORRECTLY ------")}\n
       The following item has been created\n
       - File: ${chalk.green.bold(name)}\n
       - Path: ${chalk.green.bold(pathBase + "/" + name)}\n
       ----------------------------------\n`);
  }
};

const writeFile = async (data, nameFile) => {
  const { type } = await queryParams("list", "Guardar archivo?:", ["Sí", "No"]);
  if (type !== "No") {
    const name = nameFile + ".po";
    try {
      const path = pathBase + "/" + name;
      const output = gettextParser.po.compile(data);
      fs.writeFileSync(path, output);
    } catch (err) {
      console.error(err);
      return;
    } finally {
      console.log(`
         ${chalk.green.bold("------ CREATED CORRECTLY ------")}\n
         The following item has been created\n
         - File: ${chalk.green.bold(name)}\n
         - Path: ${chalk.green.bold(pathBase + "/" + name)}\n
         ----------------------------------\n`);
      await writeFileMo(data, nameFile);
      await writeFileCorrecciones();
    }
  } else chalk.green.bold("No se guardo...");
};

const formatTexto = async (
  path,
  typeFile,
  nameFile,
  idiomaDoc,
  idiomaTraduc,
  modo
) => {
  console.log(path);
  const input = fs.readFileSync(path);
  const po = gettextParser.po.parse(input);
  const total = Object.keys(po.translations[""]).length;
  let cont = 1;
  for (const key in po.translations[""]) {
    if (Object.hasOwnProperty.call(po.translations[""], key)) {
      console.log(
        chalk.bold.greenBright(cont) + " de " + chalk.bold.yellow(total)
      );
      cont++;
      const element = po.translations[""][key];

      if (element.msgid !== "") {
        const translation = await translatePh(
          element.msgid,
          idiomaDoc,
          idiomaTraduc
        );
        if (element.msgstr[0] === "") {
          element.msgstr[0] = translation.text;
        } else element.msgstr.push(translation.text);
        if (
          translation.from.text.autoCorrected ||
          translation.from.text.didYouMean
        ) {
          correcciones.push({ element, translation });
        }
        if (element.msgid_plural) {
          if (element.msgid_plural !== "") {
            const translation = await translatePh(
              element.msgid_plural,
              idiomaDoc,
              idiomaTraduc
            );
            if (element.msgstr[1] === "") {
              element.msgstr[1] = translation.text;
            } else element.msgstr.push(translation.text);
            if (
              translation.from.text.autoCorrected ||
              translation.from.text.didYouMean
            ) {
              correcciones.push({ element, translation });
            }
          }
        }
      }
      console.log(element);
    }
  }
  await writeFile(po, nameFile);
};

const compila = async (path) => {
  console.log(path);
  var input = fs.createReadStream(path);
  var po = gettextParser.po.createParseStream();
  input.pipe(po);
  po.on("data", function (data) {
    console.log(data.translations[""]); // output translations for the default context
  });
};

const options = async function (a, b) {
  const compilar = await queryParams("list", "Selecciona Modo:", [
    "Traducir",
    "Compilar"
  ]);
  const typeFile = await queryParams("list", "Selecciona archivo:", [
    ".pot",
    ".po"
  ]);
  const paths = await searchDirs(typeFile.type);

  if (paths[0]) {
    const { type } = await queryParams("list", "Selecciona archivo:", paths);
    let idiomaTraduc = await queryParams(
      "input",
      'Introduce las siglas del idioma de la traducción. Por defecto "es":'
    );

    idiomaTraduc = idiomaTraduc.type !== "" ? idiomaTraduc.type : "es";
    const nameFile =
      type.slice(type.lastIndexOf("/") + 1).replace(typeFile.type, "") +
      "-" +
      idiomaTraduc +
      "_" +
      idiomaTraduc.toUpperCase();

    if (compilar.type === "Traducir") {
      const nameFileTrad = nameFile;
      let idiomaDoc = await queryParams(
        "input",
        'Introduce las siglas del idioma del documento. Por defecto "en":'
      );
      idiomaDoc = idiomaDoc.type !== "" ? idiomaDoc.type : "en";
      const modo = await queryParams("list", "Selecciona Modo:", [
        "Automatico",
        "Manual",
        "Semi-Automático"
      ]);

      const po = formatTexto(
        pathBase + "/" + type,
        typeFile.type,
        nameFileTrad,
        idiomaDoc.type,
        idiomaTraduc,
        modo.type
      );
      console.log(po);
    } else {
      const dataFormat = await compila(pathBase + "/" + type);
    }
  } else console.log("No se encontraron archivos");
};

export default function start() {
  console.log("Empezamos...");
  options();
}
