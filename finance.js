'use strict';

const config = require('./config.json');
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

(async () => {

  const dataFile = "./data.json";
  var dataExist = true; 
  await fs.access(dataFile, fs.F_OK, function (err) {
    if (err) {
      dataExist = false;
    }
  }).catch(error =>  dataExist=false);

  var data = {
    "ask" : 0,
    "bid" : 0,
    "spBid" : 0,
    "spAsk" : 0,
    "USD" : 0,
    "NZD" : 0
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
  await page.setViewport({ width: 1024, height: 768 });

  var NZDcost = config.NZDcost;
  var cost = config.goldCost;
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
  
  var message = "<br>";
  if(data.NZD !== NZD) {
    message += "NZD : " + NZD + "<br>";
    message += "報酬率 : " + ((NZD - NZDcost) * 100 / NZDcost).toFixed(2) + "%<br>";
    message += "=====<br>";
    data.NZD = NZD;
  }
  if(data.ask !== ask || data.bid !== bid ) {
    message += "台銀賣出 : " + ask + "<br>";
    message += "台銀買進 : " + bid + "<br>";
    message += "價差 : " + (askNum - bidNum) + "<br>";
    message += "報酬率 : " + ((bidNum - cost) * 100 / cost).toFixed(2) + "%<br>";
    message += "=====<br>";
    data.ask = ask;
    data.bid = bid;
  }
  if(data.spAsk !== spAsk || data.spBid !== spBid || data.USD !== USD) {
    message += "國際賣出 : " + spAsk + "<br>";
    message += "國際買進 : " + spBid + "<br>";
    message += "報酬率 : " + ((USDozCost - cost) * 100 / cost).toFixed(2) + "%<br>";
    message += "=====<br>";
    data.spAsk = spAsk;
    data.spBid = spBid;
    data.USD = USD;
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
