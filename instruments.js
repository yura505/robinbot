
var series = require("run-series");

module.exports = {
    download: function(list, cb) {
        var tickers = [];
        var instruments_tasks = [];
        list.forEach(function(symbol) {
            if (symbol.charAt(0) == "^") return;
            tickers.push(symbol);
            instruments_tasks.push(function(cb) {
                 let ticker = tickers.shift();
                 console.log("Downloading instrument ["+ticker+"]...");
                 global.Robinhood.instruments(ticker,function(err, response, body){
                    if (err) return cb(err);
                    for (let t of body.results) {
                        if (t.symbol === ticker) {
                            ticker_instrument[ticker] = t.url;
                            instrument_ticker[t.id] = ticker;
                            return cb();
                        }
                    }
                });
            });
        });
        series(instruments_tasks, function(err, result) {
            cb(err, result);
        });
    },
    
    getSymbol: function(url) {
        let parts = url.split('/');
        let lastSegment = parts.pop() || parts.pop();
        return instrument_ticker[lastSegment];
    },
    
    getInstrument: function(symbol) {
        return ticker_instrument[symbol];
    }
    
}

var ticker_instrument = { };
var instrument_ticker = { };

