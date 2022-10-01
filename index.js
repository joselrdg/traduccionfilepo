import fs from "fs";
import inquirer from "inquirer";
import readdirp from "readdirp";
import chalk from "chalk";
// import gettextParser from "gettext-parser";
// const inquirer = import("inquirer");
// const readdirp = require("readdirp");
// const chalk = require("chalk");
const pathBase = process.cwd();

import { filewalker } from "./src/scripts/common/filewalker.js";
import { queryParams } from "./src/scripts/common/queryParams.js";
import { translatePh } from "./src/scripts/common/translate.js";

const correcciones = [];

const checkPhrase = async (phrase, res, modo) => {
  let tipo = "Traducción: ";
  if (res.from.text.autoCorrected) {
    correcciones.push({
      phrase,
      autoCorrected: true,
      didYouMean: false,
      value: res.from.text.value,
      rext: res.text,
      res
    });
    console.log("Auto-Corrección: " + chalk.red.bold(res.from.text.value));
  } else if (res.from.text.didYouMean) {
    correcciones.push({
      phrase,
      autoCorrected: false,
      didYouMean: true,
      value: res.from.text.value,
      rext: res.text,
      res
    });
    console.log("Querías decir?: " + chalk.red.bold(res.from.text.value));
  }
  let traduccion = res.text.replace(/^"/, "");
  traduccion = traduccion.replace(/"$/, "");
  let save = false;
  while (!save) {
    console.log("Frase: " + chalk.blue.bold(phrase));
    console.log(tipo + chalk.yellow.bold(traduccion) + "\n");
    if (modo === "Manual") {
      const { type } = await queryParams("list", "Guardar esta traducción:", [
        "Sí",
        "No",
        "Mantener original"
      ]);
      if (type === "Sí") {
        save = true;
      } else if (type === "No") {
        const { type } = await queryParams("input", "Introduce tu traducción:");
        traduccion = type;
      } else {
        traduccion = phrase;
      }
    } else save = true;
  }
  return traduccion;
};

const recorrerApartados = async (apartado, modo, idiomaDoc, idiomaTraduc) => {
  const indexMsgid = apartado.indexOf("msgid") + 6;
  const indexMsgstr = apartado.indexOf("msgstr");
  if (apartado.includes("msgid")) {
    if (apartado.includes("msgid_plural")) {
      const texto = apartado.slice(
        indexMsgid,
        apartado.indexOf("msgid_plural")
      );
      const txtPlural = apartado.slice(
        apartado.indexOf("msgid_plural") + 13,
        indexMsgstr
      );
      console.log(chalk.bold.yellow("Contiene Singular y Plural"));
      const res1 = await translatePh(texto, idiomaDoc, idiomaTraduc);
      const res2 = await translatePh(txtPlural, idiomaDoc, idiomaTraduc);
      const correctedText1 = await checkPhrase(texto, res1, modo);
      const correctedText2 = await checkPhrase(txtPlural, res2, modo);
      console.log("Texto en Singular: " + chalk.bold.green(correctedText1));
      console.log("Texto en Plural: " + chalk.bold.green(correctedText2));
      return { msgid: true, singular: correctedText1, plural: correctedText2 };
    } else {
      const texto = apartado.slice(indexMsgid, indexMsgstr);
      const res = await translatePh(texto, idiomaDoc, idiomaTraduc);
      const correctedText = await checkPhrase(texto, res, modo);
      console.log(
        chalk.bold.green("\nTexto traduccido: " + correctedText + "\n")
      );
      return { msgid: true, singular: correctedText, plural: false };
    }
  } else return { msgid: false };
};

const msmRest = (i, total) => {
  console.log(
    "\n" +
      chalk.green.bold(i + 1) +
      " de " +
      chalk.blue.bold(total) +
      " apartados." +
      "\n"
  );
};

const addTranslation = async (apartado, traduccion, modo) => {
  console.log(traduccion);
  let apartadoTraduccido = apartado;
  if (!traduccion.plural) {
    const indiceMsgstr = apartado.indexOf("msgstr") + 7;
    let final = apartado.slice(indiceMsgstr);
    const iEmplazamiento = final.indexOf('"') + 1;
    final = final.slice(iEmplazamiento);
    const principio = apartado.slice(0, indiceMsgstr + iEmplazamiento);
    apartadoTraduccido = principio + traduccion.singular + final;
    console.log("\n");
    console.log(chalk.yellow(apartado));
    console.log(chalk.green(apartadoTraduccido));
  } else {
    const indiceMsgstr1 = apartado.indexOf("msgstr[0]") + 10;
    let final = apartado.slice(indiceMsgstr1);
    const iEmplazamiento = final.indexOf('"') + 1;
    final = final.slice(iEmplazamiento);
    let principio = apartado.slice(0, indiceMsgstr1 + iEmplazamiento);
    apartadoTraduccido = principio + traduccion.singular + final;
    const indiceMsgstr2 = apartadoTraduccido.indexOf("msgstr[1]") + 10;
    final = apartadoTraduccido.slice(indiceMsgstr2);
    const iEmplazamiento2 = final.indexOf('"') + 1;
    final = final.slice(iEmplazamiento2);
    principio = apartadoTraduccido.slice(0, indiceMsgstr2 + iEmplazamiento2);
    apartadoTraduccido = principio + traduccion.plural + final;
    console.log("\n");
    console.log(chalk.yellow(apartado));
    console.log(chalk.green(apartadoTraduccido));
  }
  if (modo !== "Automatico") {
    const { type } = await queryParams("list", "Guardar este apartado:", [
      "Sí",
      "No",
      "Mantener original"
    ]);
    if (type === "Sí") {
      return apartadoTraduccido;
    } else if (type === "No") {
      return false;
    } else {
      return apartado;
    }
  } else return apartadoTraduccido;
};

const writeFile = async (data, typeFile, nameFile, idiomaDoc, idiomaTraduc) => {
  const { type } = await queryParams("list", "Guardar archivo?:", ["Sí", "No"]);
  //   let name = "";
  if (type !== "No") {
    try {
      //   name = await queryParams("input", "Introduce nombre del archivo:");
      const path = pathBase + "/" + nameFile;
      fs.writeFileSync(path, data, {
        mode: 0o777
      });
    } catch (err) {
      console.error(err);
      return;
    } finally {
      console.log(`
         ${chalk.green.bold("------ CREATED CORRECTLY ------")}\n
         The following item has been created\n
         - File: ${chalk.green.bold(nameFile)}\n
         - Path: ${chalk.green.bold(pathBase + "/" + nameFile)}\n
         ----------------------------------\n`);
      console.log(correcciones);
    }
  } else chalk.green.bold("No se guardo...");
};

const formatTexto = async (
  data,
  modo,
  typeFile,
  nameFile,
  idiomaDoc,
  idiomaTraduc
) => {
  data = data.replaceAll('"#', ";I:<");
  const apartados = data.toString().split("#");
  const apartadosTraducidos = [];
  for (let index = 0; index < apartados.length; index++) {
    const apartado = apartados[index].replaceAll(";I:<", '"#');
    msmRest(index, apartados.length);
    const traduccion = await recorrerApartados(
      apartado,
      modo,
      idiomaDoc,
      idiomaTraduc
    );
    if (!traduccion.msgid) {
      console.log(chalk.red(apartado));
      apartadosTraducidos.push(apartado);
    } else {
      let apartadoTraduccido = await addTranslation(apartado, traduccion, modo);
      let save = false;
      while (!save) {
        if (apartadoTraduccido) {
          save = true;
          apartadosTraducidos.push(apartadoTraduccido);
        } else {
          const traduccion = await recorrerApartados(
            apartado,
            "Manual",
            idiomaDoc,
            idiomaTraduc
          );
          apartadoTraduccido = await addTranslation(apartado, traduccion, modo);
        }
      }
    }
  }

  const dataFormat = apartadosTraducidos
    .join("#")
    .replaceAll('msgstr " ', 'msgstr ""');
  console.log(dataFormat);
  await writeFile(dataFormat, typeFile, nameFile, idiomaDoc, idiomaTraduc);
  return "Fin...";
};

// const splitPo = async (data) => {
//   const dataFormat = formatTexto(data);
//   return "final";
// };

const searchDirs = async (type) => {
  const pathArr = await filewalker(pathBase, {
    directoryFilter: ["!.git", "!*modules"],
    type: "files",
    fileFilter: `*${type}`
  });
  return pathArr;
};

const options = async function (a, b) {
  const typeFile = await queryParams("list", "Selecciona archivo:", [
    ".pot",
    ".po"
  ]);
  const idiomaDoc = await queryParams(
    "input",
    'Introduce las siglas del idioma del documento "en":'
  );
  const idiomaTraduc = await queryParams(
    "input",
    'Introduce las siglas del idioma de la traducción por ejemplo "es":'
  );
  const paths = await searchDirs(typeFile.type);
  if (paths[0]) {
    const { type } = await queryParams("list", "Selecciona archivo:", paths);
    const modo = await queryParams("list", "Selecciona Modo:", [
      "Automatico",
      "Manual",
      "Semi-Automático"
    ]);

    const nameFile =
      type.slice(type.lastIndexOf("/") + 1).replace(typeFile.type, "") +
      "-" +
      idiomaTraduc.type +
      typeFile.type;

    fs.readFile(pathBase + "/" + type, "utf-8", (err, data) => {
      if (err) console.log(err);
      else {
        const dataFormat = formatTexto(
          data,
          modo.type,
          typeFile.type,
          nameFile,
          idiomaDoc.type,
          idiomaTraduc.type
        );
        console.log(dataFormat);
      }
    });
  } else console.log("No se encontraron archivos");
};

export default function start() {
  console.log("Empezamos...");
  options();
}

// po2json.parseFile(pathBase + "/" + type, function (err, jsonData) {
//   if (err) console.log(err);
//   else {
//     console.log(jsonData);
//     // for (const property in jsonData) {
//     //     console.log(`${property}: ${jsonData[property]}`);
//     //   }
//   }
// });
