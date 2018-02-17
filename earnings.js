
var request = require('request');

var dates = require('./isodate.js');
var markets = require('./markets.js');

module.exports = {
    download: function(cb, list) {
        if (global.backtest) {
            download_recent_earnings(cb, list);
        } else {
            download_earnings(cb);
        }
    },
    
    get: function(symbol) {
        if (_earnings === undefined) return;
        for (let element of _earnings) {
            if ((element.symbol == symbol) && 
                (dates.diff(dates.today, element.report.date) <= 5) &&
                (new Date(dates.today) < new Date(element.report.date)))
                return { date: element.report.date, timing: element.report.timing };
        }
    },
    
    soon: function(symbol) {
        let e = this.get(symbol);
        if (e !== undefined) {
           return ((e.date == dates.today && e.timing == "pm") || (e.date == markets.nextDate && e.timing == "am"))
        }
    }
}

var _earnings = [ ];

function download_earnings(cb) {
    let days = dates.diff(dates.today, markets.nextDate) + 1;
    console.log("Downloading earnings for "+days+" days...");
    global.Robinhood.earnings({ range: days },
        function(err, resp, body) {
            if (err) return cb(err);
            _earnings = body.results;
            cb();
    });    
}

function download_recent_earnings(cb, list) {
    console.log("Downloading recent earningss...");
    let url = "https://api.iextrading.com/1.0/stock/market/batch?symbols="+
              list.join(',')+"&types=earnings";
    request(url, function(err, resp, body) {
        if (err) {
            console.error(err);
            return setTimeout(function() {
                download_recent_earnings(list, cb);
            }, 10000);
        }
        let jbody = JSON.parse(body);
        for (let symbol in jbody) {
            let lst = jbody[symbol].earnings.earnings;
            lst.forEach(function(earning) {
                _earnings.push({
                    symbol: symbol,
                    report : { date: earning.EPSReportDate, timing: "am" }
                });
            });
        }
        cb();
    })
}
