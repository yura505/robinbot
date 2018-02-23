# robinbot

## Description

Robinbot is a command-line swing trading bot using Node.js and unofficial Robinhood API. It features:

- Fully-automated [technical-analysis](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:introduction_to_technical_indicators_and_oscillators)-based trading approach
- "Paper" trading mode, just suggesting what's to buy, sell, hold and which stops should be
- Risk management based portfolio allication
- Configurable (trailing) profit stops automatic allocation
- Earnings announcements impacts
- Market breadth analysis
- User defined strategies
- Fundamental analysis
- Last year backtest

The bot performs technical analysis and places orders, for best results it should be run once a day at the end of market day, ex. 15 minutes before close.

## Quick-start

### Step 1) Requirements

- Linux / MacOS
- [Node.js](https://nodejs.org/) (version 8.9 or higher)

### Step 2) Install Robinbot

Run in your console,

```
git clone https://github.com/yura505/robinbot.git
```

Create your configuration file by copying `conf-sample.js` to `conf.js`:

```
cp conf-sample.js conf.js
```

- View and edit `conf.js`.
- You must add your Robinhood login/password and Quandl API key to configuration file for paper and live trading.
- For backtesting you have to provide only your Quandl API key to conf.js, no Robinhood credentials needed.
- Quandl API key can be free obtained from quandl.com

Install dependencies:

```
npm install
```

## Run a previous year backtest of default strategy
```
./backtest.js
```

## Run a default strategy in paper mode

```
./robinbot.js
```

After you've simulated, you can place real orders:

```
./robinbot.js --trade
```

For a list of options use:

```
./robinbot.js -h

```

## Implement custom strategy

Feel free to implement custom strategy in `strategy.js` file and use it on you own risk.
Default strategies there just for information and they should not be used as is for live trading.


## Changelog

- v0.0.1
    - Initial version

## TODO

- Use neural networks, genetic algorithms, machine learning
- Add more strategies, include adaptive
- Add stock screener to find securities to trade
- More accurate backtest with slippages and liqudity
- Adopt it for different brokers
- Improve usability and documentation

Thanks!

- - -

### License: MIT

- Copyright (C) 2018 Yury Kotlyarov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
