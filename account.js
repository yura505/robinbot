
var n = require('numbro');

module.exports = {
    download: function(cb) {
        console.log("Downloading account information...");
        global.Robinhood.accounts(
            function(err, response, body){
                if (err) return cb(err);
                _cash = n(body.results[0].margin_balances.unallocated_margin_cash).value()
                cb();
        })
    },
    
    get cash() {
        return _cash;
    }
}

var _cash;

