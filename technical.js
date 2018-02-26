// ----------------------------- Technical Analysis --------------------------------------

module.exports = {
  ADX: function(x) {
    let length = 14;
    for (let i = x.length - 2; i >= 0; i--) {
      let TrueRange = Math.max(
        Math.max(x[i].high - x[i].low, Math.abs(x[i].high - x[i + 1].close)),
        Math.abs(x[i].low - x[i + 1].close)
      );
      let DirectionalMovementPlus =
        x[i].high - x[i + 1].high > x[i + 1].low - x[i].low
          ? Math.max(x[i].high - x[i + 1].high, 0)
          : 0;
      let DirectionalMovementMinus =
        x[i + 1].low - x[i].low > x[i].high - x[i + 1].high
          ? Math.max(x[i + 1].low - x[i].low, 0)
          : 0;
      x[i]["SmoothedTrueRange"] =
        x[i + 1]["SmoothedTrueRange"] == undefined
          ? TrueRange
          : x[i + 1]["SmoothedTrueRange"] -
            x[i + 1]["SmoothedTrueRange"] / length +
            TrueRange;
      x[i]["SmoothedDirectionalMovementPlus"] =
        x[i + 1]["SmoothedDirectionalMovementPlus"] == undefined
          ? DirectionalMovementPlus
          : x[i + 1]["SmoothedDirectionalMovementPlus"] -
            x[i + 1]["SmoothedDirectionalMovementPlus"] / length +
            DirectionalMovementPlus;
      x[i]["SmoothedDirectionalMovementMinus"] =
        x[i + 1]["SmoothedDirectionalMovementMinus"] == undefined
          ? DirectionalMovementMinus
          : x[i + 1]["SmoothedDirectionalMovementMinus"] -
            x[i + 1]["SmoothedDirectionalMovementMinus"] / length +
            DirectionalMovementMinus;
      x[i]["DIPlus"] =
        x[i]["SmoothedDirectionalMovementPlus"] /
        x[i]["SmoothedTrueRange"] *
        100;
      x[i]["DIMinus"] =
        x[i]["SmoothedDirectionalMovementMinus"] /
        x[i]["SmoothedTrueRange"] *
        100;
    }
    if (x.length > length) {
      let adx = x.slice(0, length).reduce((sum, cur) => {
        let DX =
          Math.abs(cur["DIPlus"] - cur["DIMinus"]) /
          (cur["DIPlus"] + cur["DIMinus"]) *
          100;
        return sum + DX;
      }, 0);
      return adx / length;
    }
  },

  SMA: function(x, length, source_key) {
    if (!source_key) source_key = "close";
    let sma = x.slice(0, length).reduce((sum, cur) => {
      return sum + cur[source_key];
    }, 0);
    return sma / length;
  },

  EMA: function(x, length, key, source_key) {
    if (!source_key) source_key = "close";
    for (let i = x.length - length; i >= 0; i--) {
      let prev_ema = x[i + 1][key];
      if (typeof prev_ema === "undefined" || isNaN(prev_ema)) {
        let sum = 0;
        x.slice(i, i + length - 1).forEach(function(period) {
          sum += period[source_key];
        });
        prev_ema = sum / length;
      }
      const multiplier = 2 / (length + 1);
      x[i][key] = (x[i][source_key] - prev_ema) * multiplier + prev_ema;
    }
    return x[0][key];
  },

  OBV: function(x) {
    for (let i = x.length - 2; i >= 0; i--) {
      let prev_obv = x[i + 1]["OBV"] !== undefined ? x[i + 1]["OBV"] : 0;
      if (x[i].close > x[i + 1].close) {
        x[i]["OBV"] = prev_obv + x[i].volume;
      }
      if (x[i].close < x[i + 1].close) {
        x[i]["OBV"] = prev_obv - x[i].volume;
      }
      if (x[i].close == x[i + 1].close) {
        x[i]["OBV"] = prev_obv;
      }
    }
    return x[0]["OBV"];
  },

  TR: function(x0, x) {
    return Math.max(
      x.high - x.low,
      Math.abs(x.high - x0.close),
      Math.abs(x.low - x0.close)
    );
  },

  ATR: function(x, length) {
    for (let i = x.length - length - 2; i >= 0; i--) {
      let prev_atr = x[i + 1]["ATR"];
      if (typeof prev_atr === "undefined" || isNaN(prev_atr)) {
        let sum = 0;
        for (j = i + 1; j < x.length - 1; j++) {
          sum += this.TR(x[j + 1], x[j]);
        }
        prev_atr = sum / length;
      }
      x[i]["ATR"] =
        (prev_atr * (length - 1) + this.TR(x[i + 1], x[i])) / length;
    }
    return x[0]["ATR"];
  },

  MACDH: function(x, offset, source_key) {
    if (!offset) offset = 0;
    if (!source_key) source_key = "close";
    this.EMA(x, 12, "ema_short", source_key);
    this.EMA(x, 26, "ema_long", source_key);
    x.forEach(function(period) {
      if (period["ema_short"] !== undefined && period["ema_long"] !== undefined)
        period["macd"] = period["ema_short"] - period["ema_long"];
    });
    this.EMA(x, 9, "signal", "macd");
    return x[offset]["macd"] - x[offset]["signal"];
  },

  SAR: function(x) {
    let iaf = 0.02,
      maxaf = 0.2;
    let bull = true;
    let af = iaf;
    let lp = x[x.length - 1].low;
    let hp = x[x.length - 1].high;
    for (let i = x.length - 3; i >= 0; i--) {
      if (x[i + 1].psar === undefined) x[i + 1].psar = x[i + 1].close;
      if (bull) x[i].psar = x[i + 1].psar + af * (hp - x[i + 1].psar);
      else x[i].psar = x[i + 1].psar + af * (lp - x[i + 1].psar);
      let reverse = false;
      if (bull) {
        if (x[i].low < x[i].psar) {
          bull = false;
          reverse = true;
          x[i].psar = hp;
          lp = x[i].low;
          af = iaf;
        }
      } else {
        if (x[i].high > x[i].psar) {
          bull = true;
          reverse = true;
          x[i].psar = lp;
          hp = x[i].high;
          af = iaf;
        }
      }
      if (!reverse) {
        if (bull) {
          if (x[i].high > hp) {
            hp = x[i].high;
            af = Math.min(af + iaf, maxaf);
          }
          if (x[i + 1].low < x[i].psar) x[i].psar = x[i + 1].low;
          if (x[i + 2].low < x[i].psar) x[i].psar = x[i + 2].low;
        } else {
          if (x[i].low < lp) {
            lp = x[i].low;
            af = Math.min(af + iaf, maxaf);
          }
          if (x[i + 1].high > x[i].psar) x[i].psar = x[i + 1].high;
          if (x[i + 2].high > x[i].psar) x[i].psar = x[i + 2].high;
        }
      }
    }
    return { psar: x[0].psar, bull: bull, reverse: reverse };
  },

  slow_stochastic: function(x, k, d) {
    if (!k) k = 14;
    if (!d) d = 3;
    let stochK = [];
    for (let j = 0; j < d; j++) {
      let stochs = [];
      for (let i = 0; i < d; i++)
        stochs.push(
          (function(x, length) {
            let low = [],
              high = [];
            x.slice(0, length).forEach(function(period) {
              low.push(period.low);
              high.push(period.high);
            });
            return (
              100 *
              (x[0].close - Math.min(...low)) /
              (Math.max(...high) - Math.min(...low))
            );
          })(x.slice(i + j), k)
        );
      stochK.push(
        stochs.reduce((sum, cur) => {
          return sum + cur;
        }, 0) / d
      );
    }
    let stochD =
      stochK.reduce((sum, cur) => {
        return sum + cur;
      }, 0) / d;
    return { K: stochK[0], D: stochD };
  },

  ohlc4: function(x) {
    return (x.open + x.high + x.low + x.close) / 4;
  },

  RSI: function(x) {
    let length = 14;
    for (let i = x.length - length; i >= 0; i--) {
      const avg_gain = x[i + 1]["rsi_avg_gain"];
      const avg_loss = x[i + 1]["rsi_avg_loss"];
      if (typeof avg_gain === "undefined") {
        let gain_sum = 0;
        let loss_sum = 0;
        let last_close;
        x.slice(0, i + length - 1).forEach(function(period) {
          if (last_close) {
            if (period.close > last_close) {
              gain_sum += period.close - last_close;
            } else {
              loss_sum += last_close - period.close;
            }
          }
          last_close = period.close;
        });
        x[i]["rsi_avg_gain"] = gain_sum / length;
        x[i]["rsi_avg_loss"] = loss_sum / length;
      } else {
        const current_gain = x[i].close - x[i + 1].close;
        x[i]["rsi_avg_gain"] =
          (avg_gain * (length - 1) + (current_gain > 0 ? current_gain : 0)) /
          length;
        const current_loss = x[i + 1].close - x[i].close;
        x[i]["rsi_avg_loss"] =
          (avg_loss * (length - 1) + (current_loss > 0 ? current_loss : 0)) /
          length;
      }
      const rs = x[i]["rsi_avg_gain"] / x[i]["rsi_avg_loss"];
      x[i]["rsi"] = Math.round(100 - 100 / (1 + rs));
    }
    return x[0]["rsi"];
  }
};
