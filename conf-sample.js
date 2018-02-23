var c = (module.exports = {});

// maximum pertfolio allocation per possition (7%)
c.POSITION_SIZING = 0.07;

// maximum loss of whole portfolio per position (0.5%)
c.MAX_LOSS_THRESHOLD = 0.005;

// obtain token from www.quandl.com (free)
c.quandl_token = "";

// Robinhood credentials
c.robinhood_credentials = {
  username: "",
  password: ""
};

// List of securities to trade
c.list = [
  "AMZN",
  "NVDA",
  "HP",
  "MU",
  "ADBE",
  "PXD",
  "TROW",
  "STI",
  "BABA",
  "VGT",
  "PLNT",
  "CBOE",
  "FDX",
  "FFTY",
  "RHT",
  "QQQ",
  "UGA",
  "SMH",
  "DIA",
  "SPY",
  "LIT",
  "IWM",
  "XLF",
  "XBI",
  "XLV",
  "IBB"
];

// backtest
c.backtest = {};
c.backtest.cash = 10000;
