
var n = require('numbro');

var instruments = require('./instruments.js');
var quotes = require('./quotes.js');

module.exports = {
    download(cb) {
        console.log("Downloading nonzero positions...");
        global.Robinhood.nonzero_positions(
            (err, response, body) => {
                if (err) return cb(err);
                nonzero_positions = body.results;
                cb();
        })
    },

    quantity(symbol) {
        for (let pos of nonzero_positions) {
            let ticker = instruments.getSymbol(pos.url);
            if (ticker == symbol) {
                return n(pos.quantity).value();
            }
        }
        return 0;
    },
    
    exists(symbol) {
        for (let pos of nonzero_positions) {
            if (symbol == instruments.getSymbol(pos.url)) return pos;
        }
    },
    
    sum() {
         return this.value;
    },
    
    /* backtest methods */
    add(symbol, price, count) {
        var pos = this.exists(symbol);
        if (pos === undefined) {
            let url = instruments.addSymbol(symbol);
            nonzero_positions.push({ url: url, quantity: count, average_buy_price: price });
        } else {
            pos.quantity += count;
        }
        console.log("BUY: "+count+" "+symbol+" at "+price+" ("+(price*count)+")");
        return price * count;
    },
    
    remove(symbol, price, count) {
        var pos = this.exists(symbol);
        if (pos !== undefined) {
            if (pos.quantity == count) {
                nonzero_positions = nonzero_positions.filter(item => item !== pos);
            } else {
                pos.quantity -= count;
            }
            console.log("SELL: "+count+" "+symbol+" at "+price+" ("+(price*count)+")");
            return price * count;
        } else {
            console.error("Trying to sell zero position: "+symbol+" "+count);
        }
        return 0;
    },
    
    get value() {
        return nonzero_positions.reduce((total, pos) => {
            let symbol = instruments.getSymbol(pos.url);
            return total + ((symbol !== undefined) ? n(pos.quantity).multiply(quotes.get(symbol)[0].close).value() : 0);
        }, 0);
    }
    
}

var nonzero_positions = [ ];
