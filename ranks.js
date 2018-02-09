
var quotes = require('./quotes.js');

module.exports = {
    calculate: function(list) {
        let m6 = Math.round(quotes.historical("^GSPC").length/2);
        let sp = (quotes.today("^GSPC").close / quotes.historical("^GSPC")[m6].close);
        list.forEach(function(element) {
            let diff = (quotes.today(element).close / quotes.historical(element)[m6].close);
            ranks[element] = ((diff / sp) - 1) * 100;
        })
    },
    
    sort: function(a, b) {
        return ranks[b] - ranks[a];
    },
    
    get: function(symbol) {
        return ranks[symbol];
    }
}

var ranks = { };
