#! /usr/local/bin/node

const series = require("run-series");
const n = require("numbro");

const rsa = require("./rsa.js");
const dates = require("./isodate.js");
const ta = require("./technical.js");
const sentiment = require("./sentiment.js");
const markets = require("./markets.js");
const quotes = require("./quotes.js");
const strategy = require("./strategy.js");
const actions = require("./actions.js");
const account = require("./account.js");
const orders = require("./orders.js");
const positions = require("./positions.js");
const earnings = require("./earnings.js");
const conf = require("./conf.js");

const opt = require("node-getopt")
  .create([
    ["s", "strategy=ARG", "macd, sar, k39, slow_stoch (default k39)"],
    ["h", "help", "display this help"]
  ])
  .bindHelp()
  .parseSystem();

global.backtest = true;
conf.trade = opt.options.trade;
conf.strategy = opt.options.strategy ? opt.options.strategy : "default";
const clist = conf.list;

console.log(
  "*** BACKTEST today: " + dates.today + " " + new Date().toLocaleTimeString()
);

global.quandl = new require("quandl")({ auth_token: conf.quandl_token });

// download backtest data
const downloads = [
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
  // run the backtest simulation
  account.cash = conf.backtest.cash;
  for (let i = 252; i > 0; i--) {
    global.backtest_offset = i - 1;
    markets._hours = [{ next_open_date: quotes.get(clist[0])[0].date }];
    global.backtest_offset = i;
    dates._today_date = quotes.get(clist[0])[0].date;
    console.log("**Day:" + i + " " + dates.today);

    markets.analyse();
    orders.triggerStops();
    rsa.calculate(clist);
    strategy.run(clist.sort(rsa.sort));
    actions.align();
    actions.distribute_cash();
    actions.allocate_stops();
    orders.backtest(actions.sell, actions.buy, actions.stop);

    actions.clear();
  }
  // output the simulation results
  let final_cash = account.cash + positions.value;
  console.log("Final cash: " + final_cash);
  console.log(
    "Last year profit: " + (final_cash / conf.backtest.cash - 1) * 100 + " %"
  );
});
