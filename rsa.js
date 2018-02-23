const quotes = require("./quotes.js");
const markets = require("./markets.js");

module.exports = {
  m1(symbol) {
    return this.rsa(symbol, 22);
  },

  m3(symbol) {
    return this.rsa(symbol, 63);
  },

  m6(symbol) {
    return this.rsa(symbol, 126);
  },

  rsa(symbol, length) {
    let sp = markets.compqIndex[0].close / markets.compqIndex[length].close;
    let diff = quotes.get(symbol)[0].close / quotes.get(symbol)[length].close;
    return (diff / sp - 1) * 100;
  },

  calculate(list) {
    for (let element of list) {
      ranks[element] = this.m6(element);
    }
  },

  sort(a, b) {
    return ranks[b] - ranks[a];
  },

  get(symbol) {
    return ranks[symbol];
  }
};

var ranks = {};
