const en = require('./en');
const da = require('./da');
const sk = require('./sk');

const locales = { en, da, sk };

function getLocale(lang) {
  if (!lang) return en;
  const short = lang.split('-')[0];
  return locales[short] || en;
}

module.exports = { getLocale };