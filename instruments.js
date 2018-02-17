
var series = require("run-series");

module.exports = {
    download: function(list, cb) {
        var tickers = [];
        var instruments_tasks = [];
        process.stdout.write("Downloading instruments: [ ");
        list.forEach(function(symbol) {
            tickers.push(symbol);
            instruments_tasks.push(function(cb) {
                 let ticker = tickers.shift();
                 process.stdout.write(ticker+" ");
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
            process.stdout.write("]\n");
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
    },
    
    /* backtest methods */
    addSymbol: function(symbol) {
        let url = "/"+symbol+"/";
        ticker_instrument[symbol] = url; 
        instrument_ticker[symbol] = symbol;
        return url;
    }
    
}

var ticker_instrument = { };
var instrument_ticker = { };

