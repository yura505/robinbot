
var dates = require('./isodate.js');
var markets = require('./markets.js');

module.exports = {
    download: function(cb) {
        let days = dates.diff(dates.today, markets.nextDate) + 1;
        console.log("Downloading earnings for "+days+" days...");
        global.Robinhood.earnings({ range: days },
            function(err, resp, body) {
                if (err) return cb(err);
                _earnings = body.results;
                cb();
        });    
    },
    
    get: function(symbol) {
        for (let element of _earnings) {
            if (element.symbol == symbol)
                return { date: element.report.date, timing: element.report.timing };
        }
    }
}

var _earnings;
