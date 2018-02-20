
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
    default: function(...args) {
        return this.k39(...args);
    },
    run: function(list) {
        console.log("SYMBOL  RANK   CLOSE  SMA50  SMA200  SS.K  ADX  MACD0   MACD     SAR      ATR   OBV/MA  RSI    EARNINGS   RESULT");
        console.log("------ ------ ------- ------ ------ ------ --- ------- ------ --------- ------- ------ ----- ------------ ------");

        list.forEach(function(symbol) {
            let q = quotes.get(symbol);
            let e = earnings.get(symbol);
            let TA = {
                close: q[0].close,
                percentage: (ta.ohlc4(q[0]) - ta.ohlc4(q[1])) / ta.ohlc4(q[0]),
                ss391: ta.slow_stochastic(q, 39, 1),
                ss143: ta.slow_stochastic(q, 14, 3),
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
                obv_ma30: ta.SMA(q, 30, 'OBV'),
                obv_ma5: ta.SMA(q, 5, 'OBV'),
                diPlus: q[0].DIPlus,
                diMinus: q[0].DIMinus,
                rsi: ta.RSI(q),
                m1: rsa.m1(symbol)
            }

            let signal;
            if (earnings.soon(symbol) || (markets.breadth == "SELL")) {
                /* SELL if earnings announcement soon OR market downgrade is going */
                signal = "SELL";
            } else {
                signal = strategy[conf.strategy](symbol, TA);
            }
            
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
            log += pad(6, n(TA.ss143.K).format('0.0'))[TA.ss143.K > TA.ss143.D ? 'green' : 'red'] + " ";
            log += pad(3, n(TA.adx).format('0'))[TA.adx > 20 ? 'yellow' : 'reset'] + " ";
            log += pad(7, n(TA.macdh0).format('0.00'))[TA.macdh0 > 0 ? 'green' : 'red'] + " ";
            log += pad(6, n(TA.macdh).format('0.00'))[TA.machd > 0 ? 'green' : 'red'][((TA.macd0 < 0) && (TA.macd > 0) || (TA.macd0 > 0) && (TA.macd < 0)) ? 'inverse' : 'reset'] + " "; 
            log += pad(9, n(TA.sar.psar).format('0.00') + (TA.sar.bull?"^":"v") + (TA.sar.reverse?"R":" "))[TA.sar.bull ? 'green' : 'red'][TA.sar.reverse ? 'inverse' : 'reset'] + " ";
            log += pad(7, n(TA.atr).format('0.00')) + " ";
            log += pad(6, n(TA.obv/TA.obv_ma5).format('0.000'))[TA.obv > TA.obv_ma5 ? 'green' : 'red'] + " ";
            log += pad(5, n(TA.rsi).format('0.00'))[TA.rsi > 50 ? 'green' : 'red'] + " ";
            log += pad(12, (e ? e.date + e.timing : "")) + " ";
            log += (signal ? signal : "")[(signal == "BUY") ? 'green' : (signal == "SELL") ? 'red' : 'reset'];
            console.log(log);
        });    
    },
    
    // Strategies below. Use them as "robinbot -s ..."
    
    macd: function(symbol, TA) {
        let signal = null;

        if ((TA.adx > 20) && (TA.diPlus > TA.diMinus) && (TA.macdh0 < 0) && (TA.macdh > 0)) {
            signal = "BUY";
        } if (TA.macd < 0) {
            signal = "SELL";
        }
        return signal;
    },
    
    k39: function(symbol, TA) {
        let signal = null;
        let q = quotes.get(symbol);
        
        if (
            (TA.percentage > 0) && 
            (TA.sma50 > TA.sma200)
            && (TA.close > TA.sma100)
            && (TA.macd > 0)
            && ((TA.rsi > 50) && (TA.rsi < 70))
            && (TA.ss391.K > 50)
            && (TA.diPlus > TA.diMinus)
            && (q[0].close > q[1].low)
            && (TA.obv > TA.obv_ma30)
            && (TA.sar && TA.sar.bull)
            && (TA.m1 > 0)
            ) { 
                  signal = "BUY";
          }
         else
            if (
                ((TA.ss391.K < 50) && (TA.obv < TA.obv_ma30))
               )
              {
                  signal = "SELL";
          }
        return signal;
    },
    
    sar: function(symbol, TA) {
        let signal = null;
        if ((TA.sar) && (TA.sar.reverse)) {
            signal = (TA.sar.bull) ? "BUY" : "SELL";
        }
        return signal;
    },
    
    slow_stoch: function(symbol, TA) {
        let signal = null;
        let ssd = (function(x) {
            let status;
            for (let i=20; i>=0; i--) {
                let ss = ta.slow_stochastic(x.slice(i));
                if (ss.K < 20)
                     status = 'oversold'
                else if (ss.K > 80)
                    status = 'overbought'
                else if ((ss.K > 50) && (status == 'BUY'))
                    status = null
                else if ((ss.K < 50) && (status == 'SELL'))
                    status = null
                else if ((ss.K > 20) && (status == 'oversold'))
                    status = 'BUY'
                else if ((ss.K < 80) && (status == 'overbought'))
                    status = 'SELL';
            }
            return status;
        })(quotes.get(symbol));
        if ((TA.ss143.K > TA.ss143.D) && (ssd == "BUY") && (TA.obv < TA.obv_ma5) ) {
            signal = "BUY";
        } else if ((TA.ss143.K < TA.ss143.D) && (ssd == "SELL")) {
            signal = "SELL";
        }
        return signal;
    }
    
}
