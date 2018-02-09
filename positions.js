
var n = require('numbro');

var instruments = require('./instruments.js');

module.exports = {
    download: function(cb) {
        console.log("Downloading nonzero positions...");
        global.Robinhood.nonzero_positions(
            function(err, response, body){
                if (err) return cb(err);
                nonzero_positions = body.results;
                cb();
        })
    },

    quantity: function(symbol) {
        for (let pos of nonzero_positions) {
            let ticker = instruments.getSymbol(pos.url);
            if (ticker == symbol) {
                return n(pos.quantity).value();
            }
        }
        return 0;
    },
    
    exists: function(symbol) {
        let found = false;
        nonzero_positions.forEach(function(pos) {
            if (symbol == instruments.getSymbol(pos.url)) found = true;
        });
        return found;
    },
    
    sum: function() {
        return nonzero_positions.reduce(function(total, pos) {
            return total + n(pos.quantity).multiply(pos.average_buy_price).value();
        }, 0);    
    },
    
}

var nonzero_positions;
