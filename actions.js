
var n = require('numbro');

var orders = require('./orders.js');
var positions = require('./positions.js');
var account = require('./account.js');
var quotes = require('./quotes.js');
var ranks = require('./ranks.js');
var conf = require('./conf.js');

var actions = module.exports = {
    create: function(symbol, signal, ta) {
        return {
            symbol: symbol,
            signal: signal,
            ta: ta
        }
    },
    
    align: function() {
        _actions.forEach(function(action) {
            if ((action.signal == "BUY") && (orders.isSoldToday(action.symbol)))
                action.signal = null;
            if ((action.signal == "SELL") && (!positions.exists(action.symbol)))
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
    
    sum: function(actions) {
        return (actions.length > 0) ? actions.reduce(function(total, action) {
            return total + ((action.count !== undefined && action.price !== undefined) ? 
                action.count * action.price : 0);
        }, 0) : 0;
    },
    
    distribute_cash: function() {
        let cash = account.cash;
        let portfolio_value = this.asset_value + cash;
        console.log("PORTFOLIO VALUE="+portfolio_value);

        this.buy.forEach(function(action) {
            let price = quotes.today(action.symbol).ask;
            if (portfolio_value * conf.POSITION_SIZING > price) {
                action.price = price * 1.005;
                action.count = 0;
            } else {
                action.signal = null;
            }
        });
        this.sell.forEach(function(action) {
            let price = quotes.today(action.symbol).bid;
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
                return ranks.get(b.symbol) - ranks.get(a.symbol);
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
                    let lrs = this.low_rank_sale(min_action);
                    if (lrs > 0) {
                        cash += lrs;
                    } else {
                        min_action.full = true;
                    }
                }
            }
        } while (min_action);

        console.log("SUM FROM SALE="+this.sum(this.sell));
        console.log("SUM TO BUY="+this.sum(this.buy));
    },
    
    low_rank_sale: function(action) {
        let cash = 0;
        let lowest_action = action;
        actions.hold.forEach(function(hold_action) {
            if ((ranks.get(hold_action.symbol) < ranks.get(lowest_action.symbol)))
                lowest_action = hold_action;
        });
        if (lowest_action !== action) {
            let found;
            for (sell_action of this.sell) {
                if (sell_action.symbol == lowest_action.symbol) {
                    found = true;
                    if (lowest_action.count > 0) {
                        sell_action.count++;
                        lowest_action.count--;
                        cash += sell_action.price;
                    } else {
                        hold_actions = this.hold.filter(item => item !== lowest_action);
                        return this.low_rank_sale(action);
                    }
                }
            }
            if (!found) {
                let price = quotes.today(lowest_action.symbol).bid;
                let action = actions.create(symbol, "SELL", { });
                action.price = price * 0.995;
                action.count = 1;
                actions.add(action);
                lowest_action.count--;
                cash += price;
            }
        }
        return cash;
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
        let position_ratio = (quotes.today(symbol).close * count) / this.asset_value;
        let max_possible_loss = this.asset_value * conf.MAX_LOSS_THRESHOLD * position_ratio / conf.POSITION_SIZING;
        let max_loss = quotes.today(symbol).close - max_possible_loss / count;
        let atr_loss = quotes.today(symbol).close - 2 * ta.atr;
        let stop_loss = Math.max(atr_loss, max_loss, ta.sar.bull ? ta.sar.psar : -1);
        let stop_order = orders.getStopOrder(symbol);
        if (stop_order) {
            let stop_price = n(stop_order.stop_price).value();
            let quantity = n(stop_order.quantity).value();
            if (stop_price > stop_loss) stop_loss = stop_price;
            if ((quantity == count) && (stop_loss == stop_price)) {
                orders.keepStopOrder(stop_order);
                return;
            }
        }
        if (stop_loss < quotes.today(symbol).close) {
            var action = this.create(symbol, "STOP", ta);
            action.price = stop_loss;
            action.count = count;
            this.add(action);
        }
    },
    
    get stop_risk() {
        let today_sum = this.stop.reduce(function(total, action) {
            return total + quotes.today(action.symbol).close * action.count;
        }, 0);
        let stop_sum = this.sum(this.stop);
        return today_sum - stop_sum;
    }
}
    
var _actions = [ ];
