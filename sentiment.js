// Sentiment Survey
const dates = require("./isodate.js");

let _data;

var Sentiment = (module.exports = {
  download: function(cb) {
    console.log("Downloading sentiment survey...");
    global.quandl.dataset(
      { source: "AAII", table: "AAII_SENTIMENT" },
      { start_date: dates.two_years_ago },
      function(err, response) {
        if (err) return cb(err);
        const data = JSON.parse(response);
        if (data.quandl_error !== undefined) {
          console.error(
            data.quandl_error.code + " " + data.quandl_error.message
          );
          setTimeout(function() {
            Sentiment.download(cb);
          }, 10000);
        } else {
          _data = data;
          setTimeout(cb, 1000);
        }
      }
    );
  },

  analyse: function() {
    return _analyse();
  }
});

function _analyse() {
  let cBullish = _data.dataset.column_names.indexOf("Bullish");
  let cBullishPlus = _data.dataset.column_names.indexOf(
    "Bullish Average + St. Dev"
  );
  let cBullishMinus = _data.dataset.column_names.indexOf(
    "Bullish Average - St. Dev"
  );

  let signal;

  let data = _data.dataset.data.slice();
  if (global.backtest) {
    while (new Date(data[0][0]) > new Date(dates.today)) {
      data = data.slice(1);
    }
  }
  for (let i = 0; i < data.length; i++) {
    if (data[i + 1][cBullish] > data[i][cBullish]) {
      if (i > 0 && data[i][cBullish] < data[i - 1][cBullish]) break;
      if (
        data[i + 1][cBullish] > data[i + 1][cBullishPlus] &&
        data[i][cBullish] < data[i][cBullishPlus]
      ) {
        signal = "SELL";
        break;
      }
    } else {
      if (i > 0 && data[i][cBullish] > data[i - 1][cBullish]) break;
      if (
        data[i + 1][cBullish] < data[i + 1][cBullishMinus] &&
        data[i][cBullish] > data[i][cBullishMinus]
      ) {
        signal = "BUY";
        break;
      }
    }
  }

  return { signal: signal, value: data[0][cBullish] };
}
