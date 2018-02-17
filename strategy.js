
var n = require('numbro');
var pad = require('pad');
var colors = require('colors');

var ta = require('./technical.js');
var markets = require('./markets.js');
var quotes = require('./quotes.js');
var earnings = require('./earnings.js');
var positions = require('./positions.js');
var dates = require('./isodate.js');
var rsa = require('./rsa.js');
var actions = require('./actions.js');
var conf = require('./conf.js');

var strategy = module.exports = {
    run: function(list) {
        console.log("SYMBOL  RANK   CLOSE  SMA50  SMA200  SS.K  ADX  MACD0   MACD     SAR      ATR   OBV/MA  RSI    EARNINGS   RESULT");
        console.log("------ ------ ------- ------ ------ ------ --- ------- ------ --------- ------- ------ ----- ------------ ------");

        list.forEach(function(symbol) {
            let q = quotes.get(symbol);
            let e = earnings.get(symbol);
            let TA = {
                close: q[0].close,
                percentage: (ta.ohlc4(q[0]) - ta.ohlc4(q[1])) / ta.ohlc4(q[0]),
                ss: ta.slow_stochastic(q, 39, 1),
                adx: ta.ADX(q),
                macdh: ta.MACDH(q),
                macdh0: ta.MACDH(q, 1),
                macd: q[0].macd,
                sma50: ta.SMA(q, 50),
                sma100: ta.SMA(q, 100),
                sma200: ta.SMA(q, 200),
                atr: ta.ATR(q, 14),
                sar: ta.SAR(q),
                obv: ta.OBV(q),
                obv_ma: ta.SMA(q, 30, 'OBV'),
                diPlus: q[0].DIPlus,
                diMinus: q[0].DIMinus,
                rsi: ta.RSI(q),
                m1: rsa.m1(symbol)
            }

            let signal = strategy[conf.strategy](symbol, TA);
            if (positions.quantity(symbol) > 0) {
                if (signal == null) signal = "HOLD";
                if (signal == "BUY") actions.add(actions.create(symbol, "HOLD", ta));
            }
                
            actions.add(actions.create(symbol, signal, TA));

            let log = pad(symbol, 6) + " ";
            log += pad(6, n(rsa.get(symbol)).format('0.00')) + " ";
            log += pad(7, n(TA.close).format('0.00'))[TA.percentage > 0 ? 'green' : 'red' ] + " ";
            log += pad(6, n(TA.sma50).format('0.0'))[TA.sma50 < TA.sma200 ? 'red' : 'reset'] + " ";
            log += pad(6, n(TA.sma200).format('0.0'))[TA.sma50 < TA.sma200 ? 'red' : 'reset'] + " ";
            log += pad(6, n(TA.ss.K).format('0.0'))[TA.ss.K > 50 ? 'green' : 'red'] + " ";
            log += pad(3, n(TA.adx).format('0'))[TA.adx > 20 ? 'yellow' : 'reset'] + " ";
            log += pad(7, n(TA.macdh0).format('0.00'))[TA.macdh0 > 0 ? 'green' : 'red'] + " ";
            log += pad(6, n(TA.macdh).format('0.00'))[TA.machd > 0 ? 'green' : 'red'][((TA.macd0 < 0) && (TA.macd > 0) || (TA.macd0 > 0) && (TA.macd < 0)) ? 'inverse' : 'reset'] + " "; 
            log += pad(9, n(TA.sar.psar).format('0.00') + (TA.sar.bull?"^":"v") + (TA.sar.reverse?"R":" "))[TA.sar.bull ? 'green' : 'red'][TA.sar.reverse ? 'inverse' : 'reset'] + " ";
            log += pad(7, n(TA.atr).format('0.00')) + " ";
            log += pad(6, n(TA.obv/TA.obv_ma).format('0.000'))[TA.obv > TA.obv_ma ? 'green' : 'red'] + " ";
            log += pad(5, n(TA.rsi).format('0.00'))[TA.rsi > 50 ? 'green' : 'red'] + " ";
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
        let q = quotes.get(symbol);
        
        if (earnings.soon(symbol) || (markets.breadth == "SELL")) 
        {
            /* SELL if earnings announcement soon OR market downgrade is going */
            signal = "SELL";
        } 
        else
        {
            if (
                (markets.breadth == "BUY") &&
                (TA.percentage > 0) && 
                (TA.sma50 > TA.sma200)
                && (TA.close > TA.sma100)
                && (TA.macd > 0)
                && ((TA.rsi > 50) && (TA.rsi < 70))
                && (TA.ss.K > 50)
                && (TA.diPlus > TA.diMinus)
                && (q[0].close > q[1].low)
                && (TA.obv > TA.obv_ma)
                && (TA.sar && TA.sar.bull)
                && (TA.m1 > 0)
                ) { 
                      signal = "BUY";
                  }
             else
                if (
                    ((TA.ss.K < 50) && (TA.obv < TA.obv_ma))
                   )
                  {
                      signal = "SELL";
                  }
        }
    
        return signal;
    }
    
}
