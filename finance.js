'use strict';

const config = require(__dirname + '/config.json');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const chromeArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--mute-audio',
  '--ignore-certificate-errors',
  '--ignore-certificate-errors-spki-list',
  '--ssl-version-max=tls1.3',
  '--ssl-version-min=tls1',
  '--disable-web-security',
  '--allow-running-insecure-content',
  '--proxy-bypass-list=<-loopback>',
  '--window-size=1024,768'
];

function getRate(price, cost) {
  return ((price - cost) * 100 / cost).toFixed(2);
}

function getRateStatus(oldRate, newRate) {
  if (parseFloat(newRate) >= parseFloat(oldRate)) {
    return "📈";
  }
  return "📉";
}

(async () => {

  const dataFile = __dirname + "/data.json";
  var dataExist = true; 
  await fs.access(dataFile, fs.F_OK, function (err) {
    if (err) {
      dataExist = false;
    }
  }).catch(error =>  dataExist=false);

  var data = {
    "NZDrate" : 0,
    "goldRate" : 0,
    "gGoldRate" : 0,
    "TXprice" : 0,
    "VIXrate" : 0,
  };

  if (dataExist === true) {
    data = require(dataFile);
  } 

  // chromeArgs.push("--proxy-server=127.0.0.1:8080");
  const browser = await puppeteer.launch({
    // slowMo: 100,
    // headless: false, 
    // devtools: true, 
    args: chromeArgs, ignoreHTTPSErrors:true,
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36');
  await page.setViewport({ width: 1024, height: 768 });

  var status = "day";
  const now = new Date();
  const hours = now.getUTCHours() + 8;
  const mins = now.getUTCMinutes();
  
  if (((hours == 8 && mins >= 45) || (hours > 8)) && (hours < 13 || (hours == 13 && mins < 45))) {
    status = "day";
  } else {
    status = "night";
  }

  var NZDcost = config.NZDcost;
  var cost = config.goldCost;
  var VIXcost = config.VIXcost;
  // var change = 0;
  // var diff = 0;

  // gold
  await page.goto('https://rate.bot.com.tw/gold');
  var ask = await page.$eval('.footable-detail-show:nth-child(1) td:nth-child(3)', e => e.innerText);
  var bid = await page.$eval('.footable-detail-show:nth-child(2) td:nth-child(3)', e => e.innerText);

  // console.log('ask : ' + ask);
  // console.log('bid : ' + bid);

  var askNum = parseInt(ask.replace(/,/g, ""));
  var bidNum = parseInt(bid.replace(/,/g, ""));

  // console.log('diff : ' + diff);
  // console.log('change : ' + ((bidNum - cost) * 100 / cost).toFixed(2) + "%");

  await page.goto('https://www.kitco.com/charts/livegold.html');
  var spBid = await page.$eval('#sp-bid', e => e.innerText);
  var spAsk = await page.$eval('#sp-ask', e => e.innerText);
  var spBidNum = parseFloat(spBid.replace(/,/g, ""));

  // exchange rate
  await page.goto('https://rate.bot.com.tw/xrt');
  var USD = await page.$eval('tr:nth-child(1) td:nth-child(2)', e => e.innerText);
  var NZD = await page.$eval('tr:nth-child(11) td:nth-child(4)', e => e.innerText);

  var USDozCost = (spBidNum * parseFloat(USD) / 28.35).toFixed(2);

  // Stock
  var TXprice = 0;
  if (status == "day") {
    await page.goto('https://info512.taifex.com.tw/Future/FusaQuote_Norl.aspx');
    var dayPrice = await page.$eval('#ctl00_ContentPlaceHolder1_uc_DgFusaQuote1_UpdatePanel00 tr:nth-child(2) td:nth-child(7)', e => e.innerText);
    var TXprice = parseInt(dayPrice.replace(/,/g, ""));
  } else {
    await page.goto('https://info512ah.taifex.com.tw/Future/FusaQuote_Norl.aspx');
    var nightPrice = await page.$eval('#ctl00_ContentPlaceHolder1_uc_DgFusaQuote1_UpdatePanel00 tr:nth-child(3) td:nth-child(7)', e => e.innerText);
    var TXprice = parseInt(nightPrice.replace(/,/g, ""));
  }

  var VIXprice = data.VIXprice;
  if (status == "day" || data.VIXprice == 0) {
    await page.goto('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_00677U.tw');
    const data = JSON.parse(await page.$eval('body', e => e.innerText));
    VIXprice = parseFloat(data['msgArray'][0]['z']);
  }

  // calculation rate
  var goldRate = getRate(bidNum, cost);
  var gGoldRate = getRate(USDozCost, cost);
  var NZDrate = getRate(NZD, NZDcost);
  var VIXrate = getRate(VIXprice, VIXcost);
  
  var message = "<br>";

  if(data.NZDrate == 0 || (Math.abs(data.NZDrate - NZDrate) > 0.25)) {
    message += "NZD : " + NZD + "<br>";
    message += "報酬率 : " + getRateStatus(data.NZDrate, NZDrate) + NZDrate + "%<br>";
    message += "=====<br>";
    data.NZDrate = NZDrate;
  }
  if(data.goldRate == 0 || (Math.abs(data.goldRate - goldRate) > 0.25)) {
    message += "gold<br>";
    message += "台銀賣出 : " + ask + "<br>";
    message += "台銀買進 : " + bid + "<br>";
    message += "價差 : " + (askNum - bidNum) + "<br>";
    message += "報酬率 : " + getRateStatus(data.goldRate, goldRate) + goldRate + "%<br>";
    message += "=====<br>";
    data.goldRate = goldRate;
  }
  if(data.gGoldRate == 0 || (Math.abs(data.gGoldRate - gGoldRate) > 0.25)) {
    message += "gold<br>";
    message += "國際賣出 : " + spAsk + "<br>";
    message += "國際買進 : " + spBid + "<br>";
    message += "報酬率 : " + getRateStatus(data.gGoldRate, gGoldRate) + gGoldRate + "%<br>";
    message += "=====<br>";
    data.gGoldRate = gGoldRate;
  }
  if(data.TXprice == 0 || (Math.abs(data.TXprice - TXprice) > 25)) {
    message += "TXprice<br>";
    message += "早臺指 & 晚臺指期 : " + getRateStatus(data.TXprice, TXprice) + TXprice + "<br>";
    message += "=====<br>";
    data.TXprice = TXprice;
  }
  if(data.VIXrate == 0 || (Math.abs(data.VIXrate - VIXrate) > 0.2)) {
    message += "VIX<br>";
    message += "富邦VIX (00677U) : " + VIXprice + "<br>";
    message += "報酬率 : " + getRateStatus(data.VIXrate, VIXrate) + VIXrate + "%<br>";
    message += "=====<br>";
    data.VIXrate = VIXrate;
  }

  if(message !== "<br>") {
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      const headers = interceptedRequest.headers();
      headers['Content-Type'] = 'application/json';

      var postData = {
        'method': 'POST',
        'postData': '{"value1":"' + message + '"}',
        'headers': headers
      };
      interceptedRequest.continue(postData);
    });

    await page.goto("https://maker.ifttt.com/trigger/" + config.ifttt.event + "/with/key/" + config.ifttt.key );
  }
  
  await browser.close();
  await fs.writeFile(dataFile, JSON.stringify(data), 'utf8');

})();
