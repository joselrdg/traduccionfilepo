import fs from "fs";
import inquirer from "inquirer";
import readdirp from "readdirp";
import chalk from "chalk";
import po2json from "po2json";
// const inquirer = import("inquirer");
// const readdirp = require("readdirp");
// const chalk = require("chalk");
const pathBase = process.cwd();

import { filewalker } from "./src/scripts/common/filewalker.js";
import { queryParams } from "./src/scripts/common/queryParams.js";
import { translatePh } from "./src/scripts/common/translate.js";

const searchDirs = async () => {
  const { type } = await queryParams("list", "Selecciona archivo:", [
    ".po",
    ".pot"
  ]);
  const pathArr = await filewalker(pathBase, {
    directoryFilter: ["!.git", "!*modules"],
    type: "files",
    fileFilter: `*${type}`
  });
  return pathArr;
};

const splitPo = async (data) => {
  const apartados = data.toString().split("#");
  const apartadosTraducidos = [];
  for (let index = 0; index < apartados.length; index++) {
    const apartado = apartados[index];
    console.log(
      "\n" +
        chalk.green.bold(index + 1) +
        " de " +
        chalk.blue.bold(apartados.length) +
        " apartados." +
        "\n"
    );
    console.log(apartado);

    if (apartado.includes("msgid")) {
      if (apartado.includes("msgid_plural")) {
        const txt = apartado.slice(
          apartado.indexOf("msgid") + 6,
          apartado.indexOf("msgid_plural")
        );
        const txtPlural = apartado.slice(
          apartado.indexOf("msgid_plural") + 13,
          apartado.indexOf("msgstr")
        );
        console.log(txt);
        console.log(txtPlural);
      } else {
        const txt = apartado.slice(
          apartado.indexOf("msgid") + 6,
          apartado.indexOf("msgstr")
        );
        const fraseTraducida = await translatePh(txt);


        
        console.log(txt);
        console.log(fraseTraducida);

      }
    } else {
      apartadosTraducidos.push(apartado);
    }

    // const lineas = apartado.split(/\r?\n|\r/);
    // console.log(lineas);
    // const apartadoTraducido = [];
    // for (let iLinea = 0; iLinea < lineas.length; iLinea++) {
    //   const linea = lineas[iLinea];
    //   let traducido = false;
    //   if (iLinea === 0) {
    //     apartadoTraducido.push(linea + "\n");
    //   } else {
    //     if (linea.includes("msgid")) {
    //     } else if (linea.includes("msgid_plural")) {
    //     }
    //   }
    // }

    // for (let indApartado = 0; indApartado < apartado.length; indApartado++) {
    // }
  }

  return "final";
};

const options = async function (a, b) {
  const paths = await searchDirs();
  if (paths[0]) {
    const { type } = await queryParams("list", "Selecciona archivo:", paths);

    fs.readFile(pathBase + "/" + type, "utf-8", (err, data) => {
      if (err) console.log(err);
      else {
        const objeto = splitPo(data);
        console.log(objeto);
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
