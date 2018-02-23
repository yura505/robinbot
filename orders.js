
var series = require("run-series");
var n = require('numbro');

var dates = require('./isodate.js');
var instruments = require('./instruments.js');
var account = require('./account.js');
var positions = require('./positions.js');
var conf = require('./conf.js');
var quotes = require('./quotes.js');

module.exports = {

    download(cb) {
        console.log("Downloading today orders...");
        global.Robinhood.orders({ updated_at: dates.today },
            (err, response, body) => {
                if (err) return cb(err);
                today_orders = body.results;
                cb();
        });
    },
    
    isSoldToday(symbol) {
        if (!global.backtest) {
            for (let order of today_orders) {
                if ((instruments.getSymbol(order.instrument) == symbol) &&
                    (order.side == 'sell') && ((order.state == 'partially_filled') || (order.state == 'filled')))
                return true;
            }
        }
        return false;
    },
    
    getStopOrder(symbol) {
        if (global.backtest) {
            for (let order of backtest_orders) {
                if (order.symbol === symbol) return order;
            }
        } else {
            for (let order of today_orders) {
                if ((instruments.getSymbol(order.instrument) == symbol) &&
                   (order.side == 'sell') && (order.state == 'confirmed') && (order.trigger == 'stop'))
                return order;
            }
        }
    },
    
    keepStopOrder(order) {
        if (global.backtest) {
            order.keep = true;
        } else {
            today_orders = today_orders.filter(item => item !== order);
        }
    },
    
    cancelStopOrders(cb) {
        let orders = [], tasks = [];
        today_orders.forEach(order => {
            if ((order.trigger == "stop") && (['queued', 'unconfirmed', 'confirmed', 'partially_filled'].includes(order.state))) {
                let symbol = instruments.getSymbol(order.instrument);
                if (conf.list[conf.strategy].includes(symbol)) {
                    console.log("Cancel stop order: "+order.id);
                    orders.push(order);
                    tasks.push(cb => {
                        if (conf.trade) {
                            global.Robinhood.cancel_order(orders.pop(), (err, resp, body) => {
                                if (err) return cb(err);
                                cb();
                            });
                        } else cb();
                    });
                }
            }
        });
        if ((orders.length > 0) && (conf.trade)) {
            tasks.push(cb => {
                console.log("Waiting until stop orders cancelled...");
                setTimeout(() => {
                    cb();
                }, 10000);
            })
        }
        series(tasks, (err, results) => {
            if (err) console.error(err);
            cb();
        });
    },

    prepare(sell, buy, stop) {
        sell.forEach(action => {
            if (action.count > 0) {
                sell_orders.push(cb => {
                    let action = sell.pop();
                    let options = {
                        quantity: action.count,
                        //bid_price: normalize_price(action.price),
                        instrument: {
                            url: instruments.getInstrument(action.symbol),
                            symbol: action.symbol
                        }
                    }
                    console.log("SALE ORDER: "+JSON.stringify(options));
                    if (conf.trade) {
                        global.Robinhood.place_sell_order(options, (err, response, body) => {
                            if (err) return cb(err);
                            console.log(body);
                            cb(null, body);
                        });
                    } else cb(); 
                });
            }
        });
        if ((sell_orders.length > 0) && (conf.trade)) {
            sell_orders.push(cb => {
            console.log("Waiting until sale orders executed...");
                setTimeout(() => {
                    cb();
                }, 10000);
            })
        }

        buy.forEach(action => {
            if (action.count > 0) {
                buy_orders.push(cb => {
                    let action = buy.pop();
                    let options = {
                        quantity: action.count,
                        bid_price: normalize_price(action.price),
                        instrument: {
                            url: instruments.getInstrument(action.symbol),
                            symbol: action.symbol
                        }
                    }
                    console.log("BUY ORDER: "+JSON.stringify(options));
                    if (conf.trade) {
                        global.Robinhood.place_buy_order(options, (err, response, body) => {
                            if (err) return cb(err);
                            console.log(body);
                            cb(null, body);
                        });
                    } else cb(); 
                });
            }
        });
        if ((buy_orders.length > 0) && (conf.trade)) {
            buy_orders.push(cb => {
                console.log("Waiting until buy orders executed...");
                setTimeout(() => {
                    cb();
                }, 10000);
            })
        }

        stop.forEach(action => {
            stop_orders.push(cb => {
                let action = stop.pop();
                let options = {
                    trigger: "stop",
                    time: "gtc",
                    stop_price: n(action.price).format('0.00'),
                    quantity: action.count,
                    instrument: {
                        url: instruments.getInstrument(action.symbol),
                        symbol: action.symbol
                    }
                }
                console.log("STOP ORDER: "+JSON.stringify(options));
                if (conf.trade) {
                    global.Robinhood.place_sell_order(options, (err, response, body) => {
                        if (err) return cb(err);
                        console.log(body);
                        cb(null, body);
                    });
                } else cb(); 
            });
        });
    },
    
    place() {
        var orders = [this.cancelStopOrders, ...sell_orders, ...buy_orders, ...stop_orders];
        series(orders, (err, result) => {
            if (err) {
                console.error("Error placing order:");
                console.error(err);
                process.exit();
             }
             console.log("Completed");
        });
    },
    
    /* backtest methods */

    backtest(sell, buy, stop) {
        backtest_orders = backtest_orders.filter(order => order.keep === true);
        sell.forEach(action => {
            if (action.count > 0) {
                account.cash += positions.remove(action.symbol, action.price, action.count);
            }
        });
        buy.forEach(action => {
            if (action.count > 0) {
                account.cash -= positions.add(action.symbol, normalize_price(action.price), action.count);
            }
        });
        stop.forEach(action => {
            if (action.count > 0) {
                backtest_orders.push({
                    symbol: action.symbol,
                    stop_price: action.price,
                    quantity: action.count
                });
            }        
        });
    },
    
    triggerStops() {
        backtest_orders.forEach(order => {
            let quote = quotes.get(order.symbol)[0];
            if (order.stop_price > quote.open) {
                account.cash += positions.remove(order.symbol, quote.open, order.quantity);
                order.executed = true;
                console.log("STOP triggered: "+order.symbol);
            } else if (order.stop_price > quote.low) {
                account.cash += positions.remove(order.symbol, order.stop_price, order.quantity);
                order.executed = true;
                console.log("STOP triggered: "+order.symbol);
            }
            order.keep = false;
        });
        backtest_orders = backtest_orders.filter(order => order.executed !== true);
    }
}

var today_orders;
var sell_orders = [ ];
var buy_orders = [ ];
var stop_orders = [ ];

var backtest_orders = [ ];

function normalize_price(price) {
    let p = (Math.ceil(price*20)/20).toFixed(2);
    return n(p).format("0.00");
}

