
var series = require("run-series");
var n = require('numbro');
var pad = require('pad');
var colors = require('colors');
var request = require('request');

var ta = require('./technical.js');
var dates = require('./isodate.js');
var quotes = require('./quotes.js');
var sentiment = require('./sentiment.js');

var compq_index = [ ];
var nasdaq_adv, nasdaq_dec;

var Markets = module.exports = {
    _hours: [ { next_open_date: null } ],
    
    download: function(cb) {
        series([download_adv, download_dec, download_index, download_hours],
                (err, result) => {
                    cb(err, result);
                });
    },
    
    download_index: function(cb) {
        download_index(cb);
    },
    
    get isOpen() {
        let now = new Date();
        return this._hours.forEach.reduce((total, cur) => total && (cur.is_open && (now < cur.closes_at) && (now > cur.opens_at)), true);
    },
    
    get nextDate() {
        return this._hours[0].next_open_date;
    },
    
    get prevDate() {
        return this._hours[0].previous_open_date;
    },
    
    get compqIndex() {
        return compq_index;
    },
    
    analyse: function() {
        let nasdaq_composite = (global.backtest_offset !== undefined) ?
            compq_index.slice(global.backtest_offset) : compq_index;
        let nasi = NASI();
        let sent = sentiment.analyse(); // do the analysis
        let macdh = ta.MACDH(nasdaq_composite);

        let sma100 = ta.SMA(nasdaq_composite, 100);
        let buy = 0, sell = 0;

        // determine BUY strength
        if (nasdaq_composite[0].close > sma100) buy++;
        if (macdh > 0) buy++;
        if (sent.signal == "BUY") buy++;
        if ((nasi.msi > nasi.ema5) && (nasi.macd > nasi.signal)) buy++;

        // determine SELL strength
        if (nasdaq_composite[0].close < sma100) sell++;
        if (macdh < 0) sell++;
        if (sent.signal == "SELL") sell++;
        if ((nasi.msi < nasi.ema5) && (nasi.macd < nasi.signal)) sell++;

        // determine the signal string, BUY or SELL
        let signal = (buy >= 3) ? "BUY" : (sell >= 3) ? "SELL" : "HOLD";

        // log the results
        let log = "MARKET: ";
        log += "close: "+n(nasdaq_composite[0].close).format("0")[nasdaq_composite[0].close >= nasdaq_composite[1].close ? "green" : "red"] + " ";
        log += "sentiment: "+n(sent.value).format("0.00")[sent.signal == "BUY" ? "green" : sent.signal == "SELL" ? "red" : "reset"] + " ";
        log += "nasi: (msi:"+n(nasi.msi).format("0.0")[nasi.msi > nasi.msi0 ? "green" : "red"]+
                    ", ema:"+n(nasi.ema5).format("0.0")[nasi.ema5 < nasi.msi ? "green" : "red"]+
                   ", macdh:"+n(nasi.macd-nasi.signal).format("0.0")[nasi.signal < nasi.macd ? "green" : "red"]+") ";
        log += "macdh: "+n(macdh).format("0.0")[macdh > 0 ? "green" : "red"]+" ";
        log += "sma: "+n(sma100).format("0")[sma100 < nasdaq_composite[0].close ? "green" : "red"] + " ";
        log += "signal: "+(signal ? signal : "")[(signal == "BUY") ? 'green' : (signal == "SELL") ? 'red' : 'reset'];
        console.log("");
        console.log(log);
        console.log("");

        this.breadth = signal;    
    }
}

// prices advancing (from quandl)
function download_adv(cb) {
    console.log("Downloading number of stocks with Prices Advancing...");
    global.quandl.dataset({ source: "URC", table: "NASDAQ_ADV" },
        { start_date: dates.two_years_ago },
        (err, response) => {
            if (err) return cb(err);
            let data = JSON.parse(response);
            if (data.quandl_error !== undefined) {
                console.error(data.quandl_error.code + " " + data.quandl_error.message);
                setTimeout(() => {
                    download_adv(cb);
                }, 10000);
            } else {
                nasdaq_adv = data;
                setTimeout(cb, 1000);
            }
    })
}

// prices declining (from quandl)
function download_dec(cb) {
    console.log("Downloading number of stocks with Prices Declining...");
    global.quandl.dataset({ source: "URC", table: "NASDAQ_DEC" },
        { start_date: dates.two_years_ago },
        (err, response) => {
            if (err) return cb(err);
            let data = JSON.parse(response);
            if (data.quandl_error !== undefined) {
                console.error(data.quandl_error.code + " " + data.quandl_error.message);
                setTimeout(() => {
                    download_dec(cb);
                }, 10000);
            } else {
                nasdaq_dec = data;
                setTimeout(cb, 1000);
            }
    })
}

// composite index (from iextrading)
function download_index(cb) {
    console.log("Downloading NASDAQ Composite index...")
    let url = "https://api.iextrading.com/1.0/stock/ONEQ/batch?types=quote,chart&range=2y";
    request(url, (err, resp, body) => {
        if (err) {
            console.error(err);
            return setTimeout(download_index, 10000);
        }
        let jbody = JSON.parse(body);
        let quote = jbody.quote;
        let chart = jbody.chart;
        compq_index = chart.sort((a, b) => new Date(b.date) - new Date(a.date));
        quote.close = n(quote.latestPrice).value();
        compq_index.unshift(quote);
        cb();
    })
}

// date/time (from robinhood)
function download_hours(cb) {
    if (global.Robinhood === undefined) {
        return cb();
    }
    console.log("Downloading markets date/time...");
    global.Robinhood.markets((err, resp, body) => {
        if (err) return cb(err);
        let tasks = [];
        body.results.forEach(result => {
            tasks.push(cb => {
                request(result.todays_hours, (err, resp, body) => {
                    if (err) return cb(err);
                    let jbody = JSON.parse(body);
                    let hours = {
                        is_open: jbody.is_open,
                        closes_at: Date.parse(jbody.closes_at),
                        opens_at: Date.parse(jbody.opens_at),
                        previous_open_date: parseDateUrl(jbody.previous_open_hours),
                        next_open_date: parseDateUrl(jbody.next_open_hours)
                    };
                    cb(null, hours);
                })
            })
        });
        series(tasks, (err, result) => {
            if (err) cb(err);
            Markets._hours = result;
            cb();
        });
    });
}

function NASI() {
    let length = Math.min(nasdaq_adv.dataset.data.length, nasdaq_dec.dataset.data.length);
    let rana = [ ];
    let signal;
    for (let i=0; i<length; i++) {
        if (nasdaq_adv.dataset.data[i][0] === nasdaq_dec.dataset.data[i][0]) {
            let value = 1000 * (nasdaq_adv.dataset.data[i][1] - nasdaq_dec.dataset.data[i][1]) / 
                (nasdaq_adv.dataset.data[i][1] + nasdaq_dec.dataset.data[i][1]);
            if (!isNaN(value)) rana.push({ date: nasdaq_adv.dataset.data[i][0], close: value });
        }
    }
    ta.EMA(rana, 19, 'e1');
    ta.EMA(rana, 39, 'e2');
    rana.forEach(period => {
        if (period['e1'] !== undefined && period['e2'] !== undefined) 
            period['mo'] = period['e1'] - period['e2'];
    });
    for (let i=rana.length-2; i>=0; i--) {
        if (rana[i]['mo'] !== undefined) {
            rana[i]['msi'] = ((rana[i+1]['msi'] === undefined) ? 0 : rana[i+1]['msi']) + rana[i]['mo'];
        }
        rana[i]['msi0'] = rana[i+1]['msi'];
    }
    ta.EMA(rana, 5, 'ema5', 'msi');
    ta.MACDH(rana, 0, 'msi');

    return (global.backtest_offset !== undefined) ? 
        rana[global.backtest_offset] : rana[0];
}

function parseDateUrl(url) {
    let parts = url.split('/');
    return parts.pop() || parts.pop();
}

