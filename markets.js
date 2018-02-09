
var series = require("run-series");
var n = require('numbro');
var pad = require('pad');
var colors = require('colors');
var request = require('request');

var ta = require('./technical.js');
var dates = require('./isodate.js');
var quotes = require('./quotes.js');
var sentiment = require('./sentiment.js');


var Markets = module.exports = {
    download: function(cb) {
        series([function(cb) {
                    console.log("Downloading number of stocks with Prices Advancing...");
                    global.quandl.dataset({ source: "URC", table: "NASDAQ_ADV" },
                        { start_date: dates.year_ago },
                        function(err, response) {
                            if (err) return cb(err);
                            nasdaq_adv = JSON.parse(response);
                            cb();
                        })
                }, 
                function(cb) {
                    console.log("Downloading number of stocks with Prices Declining...");
                    global.quandl.dataset({ source: "URC", table: "NASDAQ_DEC" },
                        { start_date: dates.year_ago },
                        function(err, response) {
                            if (err) return cb(err);
                            nasdaq_dec = JSON.parse(response);
                            cb();
                        })
                },
                function(cb) {
                    console.log("Downloading markets date/time...");
                    global.Robinhood.markets(function(err, resp, body){
                        if (err) return cb(err);
                        let tasks = [];
                        body.results.forEach(function(result) {
                            tasks.push(function(cb) {
                                request(result.todays_hours, function(err, resp, body) {
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
                        series(tasks, function(err, result) {
                            if (err) cb(err);
                            hours = result;
                            cb();
                        });
                    });
                }], 
                function(err, result) {
                    Markets.analyse();
                    cb(err, result);
                });
    },
    
    get isOpen() {
        let now = new Date();
        return hours.forEach.reduce(function(total, cur) {
            return total && (cur.is_open && (now < cur.closes_at) && (now > cur.opens_at));
        }, true);
    },
    
    get nextDate() {
        return hours[0].next_open_date;
    },
    
    get prevDate() {
        return hours[0].previous_open_date;
    },
    
    analyse: function() {
        let nasdaq_composite = quotes.full("^IXIC");
        let nasi = NASI();
        let macd = ta.MACD(nasdaq_composite);
        let sma100 = ta.SMA(nasdaq_composite, 100);
        let buy = 0, sell = 0;
    
        if (nasdaq_composite[0].close > sma100) buy++;
        if (macd > 0) buy++;
        if (sentiment.result.signal == "BUY") buy++;
        if ((nasi.msi > nasi.ema5) && (nasi.macd > nasi.signal)) buy++;

        if (nasdaq_composite[0].close < sma100) sell++;
        if (macd < 0) sell++;
        if (sentiment.result.signal == "SELL") sell++;
        if ((nasi.msi < nasi.ema5) && (nasi.macd < nasi.signal)) sell++;
    
        let signal = (buy >= 3) ? "BUY" : (sell >= 3) ? "SELL" : "HOLD";
    
        let log = "MARKET: ";
        log += "close: "+n(nasdaq_composite[0].close).format("0")[nasdaq_composite[0].close >= nasdaq_composite[1].close ? "green" : "red"] + " ";
        log += "sentiment: "+n(sentiment.result.value).format("0.00")[sentiment.result.signal == "BUY" ? "green" : sentiment.result.signal == "SELL" ? "red" : "reset"] + " ";
        log += "nasi: (msi:"+n(nasi.msi).format("0.0")[nasi.msi > nasi.msi0 ? "green" : "red"]+
                    ", ema:"+n(nasi.ema5).format("0.0")[nasi.ema5 < nasi.msi ? "green" : "red"]+
                   ", macd:"+n(nasi.macd-nasi.signal).format("0.0")[nasi.signal < nasi.macd ? "green" : "red"]+") ";
        log += "macd: "+n(macd).format("0.0")[macd > 0 ? "green" : "red"]+" ";
        log += "sma: "+n(sma100).format("0")[sma100 < nasdaq_composite[0].close ? "green" : "red"] + " ";
        log += "signal: "+(signal ? signal : "")[(signal == "BUY") ? 'green' : (signal == "SELL") ? 'red' : 'reset'];
        console.log("");
        console.log(log);
        console.log("");

        this.breadth = signal;    
    }
}

var nasdaq_adv, nasdaq_dec;
var hours;

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
    rana.forEach(function(period) {
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
    ta.MACD(rana, 0, 'msi');

    return rana[0];
}

function parseDateUrl(url) {
    let parts = url.split('/');
    return parts.pop() || parts.pop();
}

