const request = require("request");
const earnings = require("./earnings.js");

var financials = {};

let financials_list;

module.exports = {
  download: function(list, cb) {
    financials_list = list.slice();
    download_financials(cb);
  },

  criteria: function(symbol) {
    let cashFlowNotReduce = !isReduce(symbol, "cashFlow");
    let operatingIncomeNotReduce = !isReduce(symbol, "operatingIncome");
    let grossProfitNotReduce = !isReduce(symbol, "grossProfit");
    let netIncomeGrow = isGrow(symbol, "netIncome");

    let lastReport = financials[symbol][0];

    return (
      earnings.isEpsGrow(symbol) &&
      netIncomeGrow &&
      cashFlowNotReduce &&
      operatingIncomeNotReduce &&
      grossProfitNotReduce &&
      (lastReport.totalDebt - lastReport.currentDebt) /
        lastReport.shareholderEquity <
        0.5
    );
  }
};

function download_financials(cb) {
  console.log("Downloading financials...");
  let url =
    "https://api.iextrading.com/1.0/stock/market/batch?symbols=" +
    financials_list.slice(0, 99).join(",") +
    "&types=financials";
  request(url, function(err, resp, body) {
    if (err) {
      console.error(err);
      return setTimeout(function() {
        download_historocal(cb);
      }, 10000);
    }
    let data = JSON.parse(body);
    for (symbol in data) {
      financials[symbol] = data[symbol].financials.financials;
      financials_list.splice(financials_list.indexOf(symbol), 1);
    }
    if (financials_list.length > 0) return download_financials(cb);
    cb();
  });
}

function isGrow(symbol, field) {
  let reports = financials[symbol];
  return (
    reports[0][field] > reports[1][field] &&
    reports[0][field] > reports[reports.length - 1][field]
  );
}

function isReduce(symbol, field) {
  let reports = financials[symbol];
  return (
    reports[0][field] < reports[1][field] &&
    reports[0][field] < reports[reports.length - 1][field]
  );
}
