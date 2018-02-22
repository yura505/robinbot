#! /usr/local/bin/node

var series = require('run-series');
var n = require('numbro');

var rsa = require('./rsa.js');
var dates = require('./isodate.js');
var ta = require('./technical.js');
var sentiment = require('./sentiment.js');
var markets = require('./markets.js');
var quotes = require('./quotes.js');
var strategy = require('./strategy.js');
var actions = require('./actions.js');
var account = require('./account.js');
var orders = require('./orders.js');
var positions = require('./positions.js');
var earnings = require('./earnings.js');
var conf = require('./conf.js');

var opt = require('node-getopt').create([
  ['s' , 'strategy=ARG'        , 'macd, sar, k39, slow_stoch (default k39)'],
  ['h' , 'help'                , 'display this help'],
]).bindHelp().parseSystem();

global.backtest = true;
conf.trade = opt.options.trade;
conf.strategy = (opt.options.strategy) ? opt.options.strategy : 'default';
var clist = conf.list;

console.log("*** BACKTEST today: "+
    dates.today+" "+(new Date).toLocaleTimeString());
    
global.quandl = new require('quandl')({ auth_token: conf.quandl_token });

// download backtest data
var downloads = [
       function(cb) {
        sentiment.download(cb);
    }, function(cb) {
        quotes.download(clist, cb);
    }, function(cb) {
        markets.download(cb);
    }, function(cb) {
        earnings.download(clist, cb);
    }
];

series(downloads, function(err, results)
{
    // run the backtest simulation
    account.cash = conf.backtest.cash;
    for (let i = 252; i > 0; i--) {
        global.backtest_offset = i-1;
        markets._hours = [ { next_open_date: quotes.get(clist[0])[0].date } ];
        global.backtest_offset = i;
        dates._today_date = quotes.get(clist[0])[0].date;
        console.log("**Day:"+i+" "+dates.today);
        
        markets.analyse();
        orders.triggerStops();
        rsa.calculate(clist);
        strategy.run(clist.sort(rsa.sort));
        actions.align();
        actions.distribute_cash();
        actions.allocate_stops();
        orders.backtest(actions.sell, actions.buy, actions.stop);
        
        actions.clear();
    }
    // output the simulation results
    let final_cash = (account.cash + positions.value);
    console.log("Final cash: " + final_cash);
    console.log("Last year profit: " + (final_cash / conf.backtest.cash - 1) * 100 + " %");
    
});