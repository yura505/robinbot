
var n = require('numbro');

var orders = require('./orders.js');
var positions = require('./positions.js');
var account = require('./account.js');
var quotes = require('./quotes.js');
var rsa = require('./rsa.js');
var conf = require('./conf.js');
var markets = require('./markets.js');

var actions = module.exports = {
    create: function(symbol, signal, ta, count, price) {
        return {
            symbol: symbol,
            signal: signal,
            ta: ta,
            count: count,
            price: price
        }
    },
    
    align: function() {
        _actions.forEach(function(action) {
            // reset action.signal if needed
            if (((action.signal == "BUY") && (orders.isSoldToday(action.symbol) || markets.breadth !== "BUY")) ||
                ((action.signal == "SELL") && (positions.exists(action.symbol) === undefined)))
                action.signal = null;
        });
    },
    
    add: function(action) {
        _actions.push(action);
    },

    
    get buy() {
        return _actions.filter(action => action.signal == 'BUY');
    },
    
    get sell() {
        return _actions.filter(action => action.signal == 'SELL');
    },
    
    get hold() {
        return _actions.filter(action => action.signal == 'HOLD');
    },
    
    get stop() {
        return _actions.filter(action => action.signal == 'STOP');
    },
    
    get keep() {
        return _actions.filter(action => action.signal == 'KEEP');
    },
    
    sum: function(actions) {
        return (actions.length > 0) ? actions.reduce(function(total, action) {
            return total + ((action.count !== undefined && action.price !== undefined) ? 
                action.count * action.price : 0);
        }, 0) : 0;
    },
    
    distribute_cash: function() {
        let cash = account.cash;
        console.log("CASH="+cash);
        let portfolio_value = this.asset_value + cash;
        console.log("PORTFOLIO VALUE="+portfolio_value);

        this.buy.forEach(function(action) {
            let price = quotes.get(action.symbol)[0].close;
            if (portfolio_value * conf.POSITION_SIZING > price) {
                action.price = price * 1.005;
                action.count = 0;
            } else {
                action.signal = null;
            }
        });
        this.sell.forEach(function(action) {
            let price = quotes.get(action.symbol)[0].close;
            let count = positions.quantity(action.symbol);
            action.price = price * 0.995;
            action.count = count;
            cash += count * price;
        });
        this.hold.forEach(function(action) {
            let count = positions.quantity(action.symbol);
            action.count = count;
        });
    
        if (this.buy.length > Math.trunc( 1 / conf.POSITION_SIZING)) {
            this.buy.sort(function(a, b) {
                return rsa.get(b.symbol) - rsa.get(a.symbol);
            }).slice(Math.trunc( 1 / conf.POSITION_SIZING)).forEach(function(action) {
                action.signal = null;
            });
        }


        do {
            var min_action = (function(){
                var ret_action;
                var min_allocated;
                actions.buy.forEach(function(action) {
                    let allocated = (positions.quantity(action.symbol) + action.count + 1) * action.price;
                    if (((!min_allocated) || (allocated < min_allocated)) && (allocated < portfolio_value * conf.POSITION_SIZING) && (!action.full)) {
                        min_allocated = allocated;
                        ret_action = action;
                    }
                });
                return ret_action;
            })();
            if (min_action) {
                if (min_action.price < cash) {
                    min_action.count++;
                    cash -= min_action.price;
                } else {
                    min_action.full = true;
                }
            }
        } while (min_action);

        console.log("SUM FROM SALE="+this.sum(this.sell));
        console.log("SUM TO BUY="+this.sum(this.buy));
    },
    
    get asset_value() {
        return positions.sum() - this.sum(this.sell) + this.sum(this.buy);
    },
    
    allocate_stops: function() {
        var stop_list = { };
        [...this.buy, ...this.hold].forEach(function(action) {
            if (action.symbol in stop_list) {
                stop_list[action.symbol].count += action.count;
            } else {
                stop_list[action.symbol] = { count: action.count, ta: action.ta };
            }
        });
        for (let symbol in stop_list) {
            this.stopLoss(symbol, stop_list[symbol].count, stop_list[symbol].ta);
        }
    },

    stopLoss: function(symbol, count, ta) {    
        let position_ratio = (quotes.get(symbol)[0].close * count) / this.asset_value;
        let max_possible_loss = this.asset_value * conf.MAX_LOSS_THRESHOLD * position_ratio / conf.POSITION_SIZING;
        let max_loss = quotes.get(symbol)[0].close - max_possible_loss / count;
        /* let atr_loss = quotes.get(symbol)[0].close - 3 * ta.atr;
           let sar_loss = (ta.sar !== undefined && ta.sar.bull) ? ta.sar.psar : -1; */
        // use max_loss, however ATR and SAR also can be considered
        let stop_loss = max_loss;
        let stop_order = orders.getStopOrder(symbol);
        if (stop_order) {
            let stop_price = n(stop_order.stop_price).value();
            let quantity = n(stop_order.quantity).value();
            if (stop_price > stop_loss) stop_loss = stop_price;
            if ((quantity == count) && (stop_loss == stop_price)) {
                actions.add(actions.create(symbol, "KEEP", ta, count, stop_price));
                orders.keepStopOrder(stop_order);
                return;
            }
        }
        if (stop_loss < quotes.get(symbol)[0].close) {
            var action = this.create(symbol, "STOP", ta, count, stop_loss);
            this.add(action);
        }
    },
    
    get stop_risk() {
        let today_sum = 
            [...this.keep, ...this.stop].reduce(function(total, action) {
                return total + quotes.get(action.symbol)[0].close * action.count;
            }, 0);
        let stop_sum = this.sum(this.stop) + this.sum(this.keep);
        return today_sum - stop_sum;
    },

    /* backtest methods */
        
    get all() { return _actions },
    
    clear: function() { _actions = [ ] },
    
}
    
var _actions = [ ];
    