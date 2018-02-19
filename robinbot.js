#! /usr/local/bin/node

var series = require('run-series');
var n = require('numbro');

var dates = require('./isodate.js');
var ta = require('./technical.js');
var sentiment = require('./sentiment.js');
var markets = require('./markets.js');
var quotes = require('./quotes.js');
var instruments = require('./instruments.js');
var earnings = require('./earnings.js');
var strategy = require('./strategy.js');
var positions = require('./positions.js');
var rsa = require('./rsa.js');
var account = require('./account.js');
var actions = require('./actions.js');
var orders = require('./orders.js');
var conf = require('./conf.js');

var opt = require('node-getopt').create([
  ['t' , 'trade'               , 'trade mode (default = paper)'],
  ['s' , 'strategy=ARG'        , 'short / long (default long)'],
  ['h' , 'help'                , 'display this help'],
]).bindHelp().parseSystem();

conf.trade = opt.options.trade;
conf.strategy = (opt.options.strategy === 'short') ? 'short' : 'long';
var clist = conf.list[conf.strategy];

console.log("*** ROBINBOT ("+(conf.trade ? "trade" : "paper")+" mode) today: "+
    dates.today+" "+(new Date).toLocaleTimeString());
    
global.quandl = new require('quandl')({ auth_token: conf.quandl_token });

global.Robinhood = require('robinhood')(conf.robinhood_credentials, function(){
    var downloads = [
           function(cb) {
            instruments.download(clist, cb);
        }, function(cb) {
            positions.download(cb);
        }, function(cb) {
            account.download(cb);
        },function(cb) {
            orders.download(cb);
        }, function(cb) {
            sentiment.download(cb);
        }, function(cb) {
            quotes.download(clist, cb);
        }, function(cb) {
            markets.download(cb);
        },  function(cb) {
            earnings.download(clist, cb);
        }
    ];

    series(downloads, function(err, results) {
        if (err) { 
            console.error("Error:");
            console.error(err);
            process.exit();
        }
        rsa.calculate(clist);
        markets.analyse();
        strategy.run(clist.sort(rsa.sort));

        actions.align();
        console.log("CASH VALUE: "+account.cash);
        console.log("ASSET VALUE: "+actions.asset_value);
        actions.distribute_cash();
        actions.allocate_stops();
        
        let risk_val = n(actions.stop_risk).format('0.00')
        let risk_percent = n(100 * (risk_val / actions.asset_value)).format("0.00");
        console.log("RISK: "+risk_val+" ("+risk_percent+"%)");

        orders.prepare(actions.sell, actions.buy, actions.stop);
        orders.place();
    });
});
