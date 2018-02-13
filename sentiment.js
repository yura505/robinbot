
// Sentiment Survey

var dates = require('./isodate.js');

var Sentiment = module.exports = {
    download: 
        function(cb) {
            console.log("Downloading sentiment survey...");
            global.quandl.dataset({ source: "AAII", table: "AAII_SENTIMENT" },
                { start_date: dates.year_ago },
                function(err, response) {
                    if (err) return cb(err);
                    var data = JSON.parse(response);
                    if (data.quandl_error !== undefined) {
                        console.error(data.quandl_error.code + " " + data.quandl_error.message);
                        setTimeout(function() {
                            Sentiment.download(cb);
                        }, 10000);
                    } else {
                        analyse(data);
                        setTimeout(cb, 1000);
                    }
                })
        },
        
    get result() {
        return result;
    }
}

var result;

function analyse(data) {
    let cBullish = data.dataset.column_names.indexOf("Bullish");
    let cBullishPlus = data.dataset.column_names.indexOf("Bullish Average + St. Dev");
    let cBullishMinus = data.dataset.column_names.indexOf("Bullish Average - St. Dev");
    
    let signal;
    
    for (let i=0; i<data.dataset.data.length; i++) {
        if (data.dataset.data[i+1][cBullish] > data.dataset.data[i][cBullish]) {
            if ((i > 0) && (data.dataset.data[i][cBullish] < data.dataset.data[i-1][cBullish]))
                break;
            if ((data.dataset.data[i+1][cBullish] > data.dataset.data[i+1][cBullishPlus]) &&
                (data.dataset.data[i][cBullish] < data.dataset.data[i][cBullishPlus])) {
               signal = "SELL";
               break;
            }
        } else {
            if ((i > 0) && (data.dataset.data[i][cBullish] > data.dataset.data[i-1][cBullish]))
                break;
            if ((data.dataset.data[i+1][cBullish] < data.dataset.data[i+1][cBullishMinus]) &&
                (data.dataset.data[i][cBullish] > data.dataset.data[i][cBullishMinus])) {
               signal = "BUY";
               break;
            }
        }
    }

    result = { signal: signal, value: data.dataset.data[0][cBullish] };
}

