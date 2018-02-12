# robinbot

## Description

Robinbot is a command-line swing trading bot using Node.js and unofficial Robinhood API. It features:

- Fully-automated [technical-analysis](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:introduction_to_technical_indicators_and_oscillators)-based trading approach
- "Paper" trading mode, just suggesting what's to buy, sell, hold and which stops should be
- Risk management based portfolio allication
- Configurable (trailing) profit stops automatic allocation
- Earnings announcements impacts
- Market breadth analysis
- Long and Short strategies

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
- It's possible to use Robinbot in "paper trading" mode without making any changes.
- You must add your Robinhood login/password and quandl API key to configuration file.
- Quandl API key can be free obtained from quandl.com

Install dependencies:

```
npm install
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

- Fix defects
- Implement new features

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
