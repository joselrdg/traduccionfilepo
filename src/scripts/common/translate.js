import translate from "@vitalets/google-translate-api";

export function translatePh(phrase) {
  return new Promise((resolve) => {
    translate(phrase, { from: "en", to: "es" })
      .then((res) => {
        // console.log(res);
        // console.log(res.text);
        // //=> Ik spea Nederlands!
        // console.log(res.from.text.autoCorrected);
        // //=> false
        // console.log(res.from.text.value);
        // //=> I [speak] Dutch!
        // console.log(res.from.text.didYouMean);
        // //=> true
        resolve(res.text);
      })
      .catch((err) => {
        console.error(err);
      });
  });
}
