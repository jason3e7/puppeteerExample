'use strict';

const puppeteer = require('puppeteer');
const request = require("request");
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
  // chromeArgs.push("--proxy-server=127.0.0.1:8080");
  const browser = await puppeteer.launch({
    // slowMo: 100,
    // headless: false, 
    // devtools: true, 
    args: chromeArgs, ignoreHTTPSErrors:true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  // weather
  await page.goto('https://www.cwb.gov.tw/V8/C/W/Town/Town.html?TID=6300900');
  var GT_C_T = await page.$eval('#GT_C_T', e => e.innerText);
  var GT_C_AT = await page.$eval('#GT_C_AT', e => e.innerText);
  var GT_RH = await page.$eval('#GT_RH', e => e.innerText);

  var temC1 = await page.$eval('td[headers="d1t09 three_hr_atemp"] .tem-C', e => e.innerText);
  var temC3 = await page.$eval('td[headers="d1t12 three_hr_atemp"] .tem-C', e => e.innerText);
  var temC4 = await page.$eval('td[headers="d1t18 three_hr_atemp"] .tem-C', e => e.innerText);

  var rain1 = await page.$eval('tr.rain_wrap td:nth-child(1)', e => e.innerText);
  var rain3 = await page.$eval('tr.rain_wrap td:nth-child(2)', e => e.innerText);
  var rain4 = await page.$eval('tr.rain_wrap td:nth-child(3)', e => e.innerText);
  
  var humidty1 = await page.$eval('td[headers="d1t09 three_hr_humidty"]', e => e.innerText);
  var humidty3 = await page.$eval('td[headers="d1t12 three_hr_humidty"]', e => e.innerText);
  var humidty4 = await page.$eval('td[headers="d1t18 three_hr_humidty"]', e => e.innerText);

  // console.log("GT_C_T : " + GT_C_T);
  // console.log("GT_C_AT : " + GT_C_AT);
  // console.log("GT_RH : " + GT_RH);
 
  // console.log("temC1 : " + temC1);
  // console.log("temC3 : " + temC3);
  // console.log("temC4 : " + temC4);

  // console.log("rain1 : " + rain1);
  // console.log("rain3 : " + rain3);
  // console.log("rain4 : " + rain4);

  // console.log("humidty1 : " + humidty1);
  // console.log("humidty3 : " + humidty3);
  // console.log("humidty4 : " + humidty4);

  // AQI
  await page.goto('https://taqm.epa.gov.tw/taqm/aqs.ashx?lang=tw&act=aqi-epa');
  // text = await page.content();
  var text = await page.$eval('body', e => e.innerText);
  var aqiJson = JSON.parse(text);

  // console.log("AQI : " + aqiJson['Data'][16]['AQI'] + "(" + aqiJson['Data'][16]['MonobjName'] + ")");

  var message = "<br>"
  message += "溫度 : " + GT_C_T + "℃<br>"
  message += "體感 : " + GT_C_AT + "℃<br>"
  message += "濕度 : " + GT_RH + "%<br>"
  message += "AQI : " + aqiJson['Data'][16]['AQI'] + "(" + aqiJson['Data'][16]['MonobjName'] + ")<br>"
  message += "==| 溫度 | 濕度 | 降雨 |<br>"
  message += "09: | " + temC1 + " | " + humidty1 + " | " + rain1 + "<br>"
  message += "12: | " + temC3 + " | " + humidty3 + " | " + rain3 + "<br>"
  message += "18: | " + temC4 + " | " + humidty4 + " | " + rain4 + "<br>"

  // await page.setRequestInterception(true);
  // page.on('request', interceptedRequest => {
  //   const headers = interceptedRequest.headers();
  //   headers['Content-Type'] = 'application/json';

  //   var data = {
  //     'method': 'POST',
  //     'postData': '{"value1":"' + message + '"}',
  //     'headers': headers
  //   };
  //   interceptedRequest.continue(data);
  // });

  // await page.goto('https://maker.ifttt.com/trigger//with/key/');

  await browser.close();

  request({
    method: 'POST',
    uri: 'https://maker.ifttt.com/trigger//with/key/',
    headers: {
      "Content-Type" : "application/json",
    },
    json: {
      value1: message
    },
  }, function(e,r,b) {
    if(!e) console.log(b);
  });
  
})();


