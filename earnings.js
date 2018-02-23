
var request = require('request');
var series = require("run-series");

var dates = require('./isodate.js');
var markets = require('./markets.js');

module.exports = {
    download(list, cb) {
        series([cb => {
            _list = list.slice();
            download_recent_earnings(cb);
        }, cb => {
            download_earnings(cb);
        }], (err, result) => {
            cb();
        });
    },
    
    getAnnouncement(symbol) {
        for (let element of earnings_announcements) {
            if ((element.symbol == symbol) && 
                (dates.diff(dates.today, element.report.date) <= 5) &&
                (new Date(dates.today) < new Date(element.report.date)))
                return { date: element.report.date, timing: element.report.timing };
        }
    },
    
    isEpsGrow(symbol) {
        let reports = earnings_history[symbol];
        let field = "actualEPS";
        return reports[0][field] > reports[1][field] && reports[0][field] > reports[reports.length-1][field];
    },
    
    soon(symbol) {
        let e = this.getAnnouncement(symbol);
        if (e !== undefined) {
           return ((e.date == dates.today && e.timing == "pm") || (e.date == markets.nextDate && e.timing == "am"))
        }
    }
}

var earnings_announcements = [ ];
var earnings_history = { };
var _list;

function download_earnings(cb) {
    if (global.Robinhood !== undefined) {
        let days = dates.diff(dates.today, markets.nextDate) + 1;
        console.log("Downloading earning announcements for "+days+" days...");
        global.Robinhood.earnings({ range: days },
            (err, resp, body) => {
                if (err) return cb(err);
                earnings_announcements = body.results;
                cb();
        });    
    } else cb();
}

function download_recent_earnings(cb) {
    console.log("Downloading recent earnings...");
    let url = "https://api.iextrading.com/1.0/stock/market/batch?symbols="+
              _list.slice(0,99).join(',')+"&types=earnings";
    request(url, (err, resp, body) => {
        if (err) {
            console.error(err);
            return setTimeout(() => {
                download_recent_earnings(list, cb);
            }, 10000);
        }
        let jbody = JSON.parse(body);
        for (let symbol in jbody) {
            let lst = jbody[symbol].earnings.earnings;
            earnings_history[symbol] = lst;
            if (global.backtest) {
                lst.forEach(earning => {
                    earnings_announcements.push({
                        symbol: symbol,
                        report : { date: earning.EPSReportDate, timing: "am" }
                    });
                });
            }
            _list.splice(_list.indexOf(symbol), 1);
        }
        if (_list.length > 0)
            return download_recent_earnings(cb);
        cb();
    })
}
