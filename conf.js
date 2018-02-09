var c = module.exports = { }

// maximum pertfolio allocation per possition (7%)
c.POSITION_SIZING = 0.07;

// maximum loss of whole portfolio per position (0.5%)
c.MAX_LOSS_THRESHOLD = 0.005;

// obtain token from www.quandl.com (free)
c.quandl_token = "";

// Robinhood credentials
c.robinhood_credentials = {
    username: '',
    password: ''
};

c.list = { }
// stocks to trade long
c.list.long = ["^IXIC","^GSPC","UGA","SMH","XLY","DBC","VGT","IYT","EEM","XOP","DIA","QQQ","XLF","XRT","XLB","XLI","XHB","MOO","PDP","SPY","IWB","PHO",
    "XLE","IWM","MDY","PID","EFA","FXE","PBW","XLV","EWA","EWC","RWX","SLV","EPI","IBB","EWT","GDX","BOND","JNK","AGG","XLP","TLT","IEF",
    "UUP","PFF","DBA","VNQ","XLU","BOTZ","MTUM","LIT","XBI","XLV","FFTY","PPA","IGV","JETS"];
    
c.list.short = ["^IXIC","^GSPC","PSQ", "SH", "DOG", "TBF"];
