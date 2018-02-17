
var quotes = require('./quotes.js');
var markets = require('./markets.js');

module.exports = {
    m1: function(symbol) {
        return this.rsa(symbol, 22);
    },
    
    m3: function(symbol) {
        return this.rsa(symbol, 63);
    },
    
    m6: function(symbol) {
        return this.rsa(symbol, 126);
    },
    
    rsa: function(symbol, length) {
        let sp = (markets.compqIndex[0].close / markets.compqIndex[length].close);
        let diff = (quotes.get(symbol)[0].close / quotes.get(symbol)[length].close);
        return ((diff / sp) - 1) * 100;
    },
    
    calculate: function(list) {
        for (let element of list) {
            ranks[element] = this.m6(element);
        }
    },
    
    sort: function(a, b) {
        return ranks[b] - ranks[a];
    },
    
    get: function(symbol) {
        return ranks[symbol];
    }
}

var ranks = { };
