
var series = require("run-series");

module.exports = {
    download(list, cb) {
        var tickers = [];
        var instruments_tasks = [];
        process.stdout.write("Downloading instruments: [ ");
        list.forEach(symbol => {
            tickers.push(symbol);
            instruments_tasks.push(cb => {
                 let ticker = tickers.shift();
                 process.stdout.write(ticker+" ");
                 global.Robinhood.instruments(ticker,(err, response, body) => {
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
        series(instruments_tasks, (err, result) => {
            process.stdout.write("]\n");
            cb(err, result);
        });
    },
    
    getSymbol(url) {
        let parts = url.split('/');
        let lastSegment = parts.pop() || parts.pop();
        return instrument_ticker[lastSegment];
    },
    
    getInstrument(symbol) {
        return ticker_instrument[symbol];
    },
    
    /* backtest methods */
    addSymbol(symbol) {
        let url = "/"+symbol+"/";
        ticker_instrument[symbol] = url; 
        instrument_ticker[symbol] = symbol;
        return url;
    }
    
}

var ticker_instrument = { };
var instrument_ticker = { };

