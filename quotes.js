var dates = require("./isodate.js");
var series = require("run-series");
var request = require("request");
var n = require("numbro");

module.exports = {
  download(list, cb) {
    historical_list = list.slice();
    today_list = list.slice();
    rt_list = list.slice();
    series(
      [download_historical, download_today, download_realtime],
      (err, result) => {
        cb(err, result);
      }
    );
  },

  get(symbol) {
    return global.backtest_offset > 0
      ? quotes_historical[symbol].slice(global.backtest_offset)
      : [quotes_today[symbol], ...quotes_historical[symbol]];
  }
};

var quotes_today = {};
var quotes_historical = {};
var historical_list;
var today_list;
var rt_list;

// historical from iextrading
function download_historical(cb) {
  console.log("Downloading historical quotes...");
  let url =
    "https://api.iextrading.com/1.0/stock/market/batch?symbols=" +
    historical_list.slice(0, 99).join(",") +
    "&types=chart&range=2y";
  request(url, (err, resp, body) => {
    if (err) {
      console.error(err);
      return setTimeout(() => {
        download_historocal(cb);
      }, 10000);
    }
    parse_historical(body);
    if (historical_list.length > 0) return download_historical(cb);
    cb();
  });
}

// today from iextrading
function download_today(cb) {
  console.log("Downloading delayed today quotes...");
  let url =
    "https://api.iextrading.com/1.0/stock/market/batch?symbols=" +
    today_list.slice(0, 99).join(",") +
    "&types=quote";
  request(url, (err, resp, body) => {
    if (err) {
      console.error(err);
      return setTimeout(() => {
        download_today(cb);
      }, 10000);
    }
    parse_today(body);
    if (today_list.length > 0) return download_today(cb);
    cb();
  });
}

// realtime from robinhood
function download_realtime(cb) {
  if (global.Robinhood === undefined) {
    return cb();
  }
  console.log("Downloading real-time quotes...");
  global.Robinhood.quote_data(rt_list, (err, resp, body) => {
    if (err) {
      console.error(err);
      return setTimeout(() => {
        download_realtime(cb);
      }, 10000);
    }
    parse_realtime(body);
    cb();
  });
}

// parse iextrading historical response
function parse_historical(jquotes) {
  let quotes = JSON.parse(jquotes);
  for (symbol in quotes) {
    let charts = quotes[symbol].chart.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    quotes_historical[symbol] = charts;
    historical_list.splice(historical_list.indexOf(symbol), 1);
  }
}

// parse iextrading today response
function parse_today(jquotes) {
  let quotes = JSON.parse(jquotes);
  for (symbol in quotes) {
    let quote = quotes[symbol].quote;
    quote.volume = quote.latestVolume;
    quotes_today[symbol] = quote;
    today_list.splice(today_list.indexOf(symbol), 1);
  }
}

// parse realtime robinhood response
function parse_realtime(body) {
  //console.log(body);
  body.results.forEach(item => {
    // adjust today quotes with real-time data
    var quote = quotes_today[item.symbol];
    quote.close = n(item.last_trade_price).value();
    quote.high = Math.max(quote.high, quote.close);
    quote.low = Math.min(quote.low, quote.close);
  });
}
