
var dates = require('./isodate.js');
var series = require("run-series");
var request = require('request');
var n = require('numbro');

module.exports = {
    download: function(list, cb) {
        historical_list = list.slice();
        today_list = list.slice();
        series([download_historical, download_today, download_realtime], function(err, result) {
            cb(err, result);
        });
    },

    get: function(symbol) {
        return (global.backtest_offset > 0) ? 
            quotes_historical[symbol].slice(global.backtest_offset) :
            [quotes_today[symbol], ...quotes_historical[symbol]];
    }
}

var quotes_today = { };
var quotes_historical = { };
var historical_list;
var today_list;

function download_historical(cb) {
    console.log("Downloading historical quotes...");
    let url = "https://api.iextrading.com/1.0/stock/market/batch?symbols="+
              historical_list.join(',')+"&types=chart&range=2y";
    request(url, function(err, resp, body) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_historocal(cb);
            }, 10000);
        }
        parse_historical(body);
        cb();
    })
}

function download_today(cb) {
    console.log("Downloading delayed today quotes...");
    let url = "https://api.iextrading.com/1.0/stock/market/batch?symbols="+
              today_list.join(',')+"&types=quote";
    request(url, function(err, resp, body) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_today(cb);
            }, 10000);
        }
        parse_today(body);
        cb();
    })
}

function download_realtime(cb) {
    if (global.Robinhood === undefined) {
        return cb();
    }
    console.log("Downloading real-time quotes...");
    global.Robinhood.quote_data(today_list, function(err, resp, body) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_realtime(cb);
            }, 10000);
        }
        parse_realtime(body);
        cb();
    });
}

function parse_historical(jquotes) {
    let quotes = JSON.parse(jquotes);
    for (symbol in quotes) {
        let charts = quotes[symbol].chart.sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        });
        quotes_historical[symbol] = charts;
    }
}

function parse_today(jquotes) {
    let quotes = JSON.parse(jquotes);
    for (symbol in quotes) {
        let quote = quotes[symbol].quote;
        quote.volume = quote.latestVolume;
        quotes_today[symbol] = quote;
    }
}

function parse_realtime(body) {
    //console.log(body);
    body.results.forEach(function(item) {
        // adjust today quotes with real-time data
        var quote = quotes_today[item.symbol];
        quote.close = n(item.last_trade_price).value();
        quote.high = Math.max(quote.high, quote.close);
        quote.low = Math.min(quote.low, quote.close);
    });
}
