const n = require("numbro");

const instruments = require("./instruments.js");
const quotes = require("./quotes.js");

const nonzero_positions = [];

module.exports = {
  download: function(cb) {
    console.log("Downloading nonzero positions...");
    global.Robinhood.nonzero_positions(function(err, response, body) {
      if (err) return cb(err);
      nonzero_positions = body.results;
      cb();
    });
  },

  quantity: function(symbol) {
    for (let pos of nonzero_positions) {
      let ticker = instruments.getSymbol(pos.url);
      if (ticker == symbol) {
        return n(pos.quantity).value();
      }
    }
    return 0;
  },

  exists: function(symbol) {
    for (let pos of nonzero_positions) {
      if (symbol == instruments.getSymbol(pos.url)) return pos;
    }
  },

  sum: function() {
    return this.value;
  },

  /* backtest methods */
  add: function(symbol, price, count) {
    const pos = this.exists(symbol);
    if (pos === undefined) {
      let url = instruments.addSymbol(symbol);
      nonzero_positions.push({
        url: url,
        quantity: count,
        average_buy_price: price
      });
    } else {
      pos.quantity += count;
    }
    console.log(
      "BUY: " +
        count +
        " " +
        symbol +
        " at " +
        price +
        " (" +
        price * count +
        ")"
    );
    return price * count;
  },

  remove: function(symbol, price, count) {
    const pos = this.exists(symbol);
    if (pos !== undefined) {
      if (pos.quantity == count) {
        nonzero_positions = nonzero_positions.filter(item => item !== pos);
      } else {
        pos.quantity -= count;
      }
      console.log(
        "SELL: " +
          count +
          " " +
          symbol +
          " at " +
          price +
          " (" +
          price * count +
          ")"
      );
      return price * count;
    } else {
      console.error("Trying to sell zero position: " + symbol + " " + count);
    }
    return 0;
  },

  get value() {
    return nonzero_positions.reduce(function(total, pos) {
      let symbol = instruments.getSymbol(pos.url);
      return (
        total +
        (symbol !== undefined
          ? n(pos.quantity)
              .multiply(quotes.get(symbol)[0].close)
              .value()
          : 0)
      );
    }, 0);
  }
};
