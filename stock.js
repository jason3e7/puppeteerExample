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

(async () => {

  const dataFile = __dirname + "/data.json";
  var dataExist = true; 
  await fs.access(dataFile, fs.F_OK, function (err) {
    if (err) {
      dataExist = false;
    }
  }).catch(error =>  dataExist=false);

  var data = {
    "TXprice" : 0,
    "VIXprice" : 0 
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
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36');
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

  if(data.TXprice !== TXprice) {
    console.log(TXprice);
    data.TXprice = TXprice;
  }

  if(data.VIXprice !== VIXprice) {
    console.log(VIXprice);
    data.VIXprice = VIXprice;
  }

  await browser.close();
  await fs.writeFile(dataFile, JSON.stringify(data), 'utf8');

})();
