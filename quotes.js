
var dates = require('./isodate.js');
var series = require("run-series");
var yahooFinance = require('yahoo-finance');

module.exports = {
    download: function(list, cb) {
        historical_list = list.slice();
        today_list = list.slice();
        series([download_historical, download_today], function(err, result) {
            cb(err, result);
        });
    },

    today: function(symbol) {
        return quotes_today[symbol];
    },
    
    historical: function(symbol) {
        return quotes_historical[symbol];
    },
    
    full: function(symbol) {
        return [quotes_today[symbol], ...quotes_historical[symbol]];
    }
}

var quotes_today;
var quotes_historical = { };
var historical_list;
var today_list;

function download_historical(cb) {
    console.log("Downloading historical quotes...");
    yahooFinance.historical({
        symbols: historical_list,
        from: dates.year_ago,
        to: dates.yesterday,
        period: 'd'
    }, function (err, quotes) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_historocal(cb);
            }, 10000);
        }
        for (let quote in quotes) {
            if (quotes[quote].length == 0) {
                console.log("Yahoo returned empty array for "+quote);
                delete quotes[quote];
            } else {
                historical_list.splice(historical_list.indexOf(quote), 1);
                quotes_historical[quote] = quotes[quote];
            }
        }
        if (historical_list.length > 0) {
            download_historical(cb);                
        } else
            cb();
    })
}

function download_today(cb) {
    console.log("Downloading today quotes...");
    yahooFinance.quote({
         symbols: today_list
    }, function (err, quotes) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_today(cb);
            }, 10000);
        }
        quotes_today = normalize_quotes(quotes);
        cb();
    })
}

function normalize_quotes(quotes) {
    for (let symbol in quotes) {
      if (quotes[symbol].summaryDetail) {
        quotes[symbol].high = quotes[symbol].summaryDetail.dayHigh;
        quotes[symbol].low = quotes[symbol].summaryDetail.dayLow;
        quotes[symbol].open = quotes[symbol].summaryDetail.open;
        if ((quotes[symbol].summaryDetail.ask != 0) && (quotes[symbol].summaryDetail.bid != 0)) {
           quotes[symbol].bid = quotes[symbol].summaryDetail.bid;
           quotes[symbol].ask = quotes[symbol].summaryDetail.ask;
           quotes[symbol].close = (quotes[symbol].summaryDetail.ask+quotes[symbol].summaryDetail.bid)/2
        } else {
           quotes[symbol].bid = quotes[symbol].ask = quotes[symbol].close = quotes[symbol].summaryDetail.regularMarketPreviousClose;
        }
        quotes[symbol].volume = quotes[symbol].summaryDetail.volume;
      } else {
        quotes[symbol].high = quotes[symbol].price.regularMarketDayHigh;
        quotes[symbol].low = quotes[symbol].price.regularMarketDayLow;
        quotes[symbol].open = quotes[symbol].price.regularMarketOpen;
        quotes[symbol].bid = quotes[symbol].ask = quotes[symbol].close = quotes[symbol].price.regularMarketPreviousClose;
        quotes[symbol].volume = quotes[symbol].price.regularMarketVolume;
      }
    }
    return quotes;
}

