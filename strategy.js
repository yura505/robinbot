
var n = require('numbro');
var pad = require('pad');
var colors = require('colors');

var ta = require('./technical.js');
var markets = require('./markets.js');
var quotes = require('./quotes.js');
var earnings = require('./earnings.js');
var positions = require('./positions.js');
var dates = require('./isodate.js');
var ranks = require('./ranks.js');
var actions = require('./actions.js');
var conf = require('./conf.js');

var strategy = module.exports = {
    run: function(list) {
        console.log("SYMBOL  RANK   CLOSE  SMA50  SMA200  SS.K   SS.D  ADX  MACD0   MACD     SAR      ATR   OBV/MA   EARNINGS   RESULT");
        console.log("------ ------ ------- ------ ------ ------ ------ --- ------- ------ --------- ------- ------ ------------ ------");

        list.forEach(function(symbol) {
            if (symbol.charAt(0) == "^") return;
            let q = quotes.full(symbol);
            let e = earnings.get(symbol);
            let TA = {
                close: q[0].close,
                percentage: (ta.ohlc4(q[0]) - ta.ohlc4(q[1])) / ta.ohlc4(q[0]),
                ss: ta.slow_stochastic(q),
                adx: ta.ADX(q),
                macd: ta.MACD(q),
                macd0: ta.MACD(q, 1),
                sma50: ta.SMA(q, 50),
                sma200: ta.SMA(q, 200),
                atr: ta.ATR(q, 14),
                sar: ta.SAR(q),
                obv: ta.OBV(q),
                obv_ma: ta.EMA(q, 10, 'obvma10', 'OBV'),
                diPlus: q[0].DIPlus,
                diMinus: q[0].DIMinus
            }

            let signal = strategy[conf.strategy](symbol, TA);
            if (positions.quantity(symbol) > 0) {
                if (signal == null) signal = "HOLD";
                if (signal == "BUY") actions.add(actions.create(symbol, "HOLD", ta));
            }
                
            actions.add(actions.create(symbol, signal, TA));

            let log = pad(symbol, 6) + " ";
            log += pad(6, n(ranks.get(symbol)).format('0.00')) + " ";
            log += pad(7, n(TA.close).format('0.00'))[TA.percentage > 0 ? 'green' : 'red' ] + " ";
            log += pad(6, n(TA.sma50).format('0.0'))[TA.sma50 < TA.sma200 ? 'red' : 'reset'] + " ";
            log += pad(6, n(TA.sma200).format('0.0'))[TA.sma50 < TA.sma200 ? 'red' : 'reset'] + " ";
            log += pad(6, n(TA.ss.K).format('0.0'))[TA.ssd == 'BUY' ? 'bgGreen' : TA.ssd == 'SELL' ? 'bgRed' : 'reset'] + " ";
            log += pad(6, n(TA.ss.D).format('0.0'))[TA.ss.K > TA.ss.D ? 'green' : 'red'] + " ";
            log += pad(3, n(TA.adx).format('0'))[TA.adx > 20 ? 'yellow' : 'reset'] + " ";
            log += pad(7, n(TA.macd0).format('0.00'))[TA.macd0 > 0 ? 'green' : 'red'] + " ";
            log += pad(6, n(TA.macd).format('0.00'))[TA.macd > 0 ? 'green' : 'red'][((TA.macd0 < 0) && (TA.macd > 0) || (TA.macd0 > 0) && (TA.macd < 0)) ? 'inverse' : 'reset'] + " "; 
            log += pad(9, n(TA.sar.psar).format('0.00') + (TA.sar.bull?"^":"v") + (TA.sar.reverse?"R":" "))[TA.sar.bull ? 'green' : 'red'][TA.sar.reverse ? 'inverse' : 'reset'] + " ";
            log += pad(7, n(TA.atr).format('0.00')) + " ";
            log += pad(6, n(TA.obv/TA.obv_ma).format('0.000'))[TA.obv > TA.obv_ma ? 'green' : 'red'] + " ";
            log += pad(12, (e ? e.date + e.timing : "")) + " ";
            log += (signal ? signal : "")[(signal == "BUY") ? 'green' : (signal == "SELL") ? 'red' : 'reset'];
            console.log(log);
        });    
    },
    
    short: function(symbol, TA) {
        let signal = null;

        /* buy inverse ETFs if MACD positive, sell if MACD negative or market upgrade */   
        if (markets.breadth == "SELL") {
            if ((TA.adx > 20) && (TA.diPlus > TA.diMinus) && (TA.macd > 0) && (TA.obv > TA.obv_ma)) {
                signal = "BUY";
            } if (TA.macd < 0) {
                signal = "SELL";
            }
         } else {
            signal = "SELL";
         }
         return signal;
    },
    
    long: function(symbol, TA) {
        let signal = null;
        
        /* Implement your strategy here. Simple MACD strategy just for example, do not use it for live trading */
        
        let e = earnings.get(symbol);
        if (((e) && ((e.date == dates.today && e.timing == "pm") || (e.date == markets.nextDate && e.timing == "am"))) || 
            (markets.breadth == "SELL")) 
        {
            /* SELL if earnings announcement soon OR market downgrade is going */
            signal = "SELL";
        } 
        else
        {
            if ((TA.adx > 20) && (TA.diPlus > TA.diMinus) && (TA.macd0 < 0) && (TA.macd > 0) && (TA.obv > TA.obv_ma)) 
            { 
                  /* buy on MACD crossover */
                  signal = "BUY";
            }
            else if (TA.macd < 0)
            {
                  /* sell when MACD histogram below 0 */
                  signal = "SELL";
            }
        }
    
        return signal;
    }
    
}
