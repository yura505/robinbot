
var n = require('numbro');
var conf = require('./conf');

module.exports = {
    cash: 0,
    
    download: function(cb) {
        console.log("Downloading account information...");
        global.Robinhood.accounts(
            function(err, response, body){
                if (err) return cb(err);
                cash = n(body.results[0].margin_balances.unallocated_margin_cash).value()
                cb();
        })
    },
    
}

