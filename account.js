
var n = require('numbro');
var conf = require('./conf');

module.exports = {
    download(cb) {
        console.log("Downloading account information...");
        global.Robinhood.accounts(
            (err, response, body) => {
                if (err) return cb(err);
                _cash = n(body.results[0].margin_balances.unallocated_margin_cash).value()
                cb();
        })
    },
    
    get cash() { return _cash },
    set cash(c) { _cash = c }
    
}

var _cash = 0;
