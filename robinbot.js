#! /usr/local/bin/node

const series = require("run-series");
const n = require("numbro");

const dates = require("./isodate.js");
const ta = require("./technical.js");
const sentiment = require("./sentiment.js");
const markets = require("./markets.js");
const quotes = require("./quotes.js");
const instruments = require("./instruments.js");
const earnings = require("./earnings.js");
const strategy = require("./strategy.js");
const positions = require("./positions.js");
const rsa = require("./rsa.js");
const account = require("./account.js");
const actions = require("./actions.js");
const orders = require("./orders.js");
const conf = require("./conf.js");

const opt = require("node-getopt")
  .create([
    ["t", "trade", "trade mode (default = paper)"],
    ["s", "strategy=ARG", "macd, sar, k39, slow_stoch (default k39)"],
    ["h", "help", "display this help"]
  ])
  .bindHelp()
  .parseSystem();

conf.trade = opt.options.trade;
conf.strategy = opt.options.strategy ? opt.options.strategy : "default";
const clist = conf.list;

console.log(
  "*** ROBINBOT (" +
    (conf.trade ? "trade" : "paper") +
    " mode) today: " +
    dates.today +
    " " +
    new Date().toLocaleTimeString()
);

global.quandl = new require("quandl")({ auth_token: conf.quandl_token });

global.Robinhood = require("robinhood")(conf.robinhood_credentials, () => {
  const downloads = [
    cb => {
      instruments.download(clist, cb);
    },
    cb => {
      positions.download(cb);
    },
    cb => {
      account.download(cb);
    },
    cb => {
      orders.download(cb);
    },
    cb => {
      sentiment.download(cb);
    },
    cb => {
      quotes.download(clist, cb);
    },
    cb => {
      markets.download(cb);
    },
    cb => {
      earnings.download(clist, cb);
    }
  ];

  series(downloads, (err, results) => {
    if (err) {
      console.error("Error:");
      console.error(err);
      process.exit();
    }
    rsa.calculate(clist);
    markets.analyse();
    strategy.run(clist.sort(rsa.sort));

    actions.align();
    console.log("CASH VALUE: " + account.cash);
    console.log("ASSET VALUE: " + actions.asset_value);
    actions.distribute_cash();
    actions.allocate_stops();

    let risk_val = n(actions.stop_risk).format("0.00");
    let risk_percent = n(100 * (risk_val / actions.asset_value)).format("0.00");
    console.log("RISK: " + risk_val + " (" + risk_percent + "%)");

    orders.prepare(actions.sell, actions.buy, actions.stop);
    orders.place();
  });
});
