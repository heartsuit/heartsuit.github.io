$("body").css('background-image', `url('https://sfkj666.com/backgroundb')`);
$("body").css('background-repeat', `no-repeat`);
$("body").css('background-size', `cover`);

// $.ajax({  
//   url: 'https://89c8658d.ngrok.io/backgroundj',
//   // url: 'http://dataapi.ngrok.cc/background',
//   type: "GET",
//   dataType: "jsonp",
//   jsonpCallback: 'jsonpCallback',
//   data: {},
//   error: function (err) {
//     console.log(err.status);
//     console.log(err.readyState);
//     console.log(err.responseText);
//     console.log(err.statusText);
//   },
//   success: function (data) {
//     console.log(data);
//     $("body").css('background-image', `url(${data.background})`);
//     $("body").css('background-repeat', `no-repeat`);
//     $("body").css('background-size', `cover`);

//   }
// });

// var request = window.superagent;
// request.get('http://cn.bing.com').end(function(err, res){
//   if(err) {
//     console.log(err);
//   }
//   console.log(res);
// });

//获取指定位数的随机字符串(包含小写字母、大写字母、数字,0<length)  
// function randomString(length) {
//   //随机字符串的随机字符库  
//   var KeyString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   var sb = "";
//   var len = KeyString.length;
//   for (var i = 0; i < length; i++) {
//     sb += KeyString.charAt(Math.round(Math.random() * (len - 1)));
//   }
//   return sb;
// }
// var appKey = "GDdJCbJf8BSC1QWL4Qwfpq761vubYG";
// var secret = "D6ddcEI8o05hCrw7eudL5B25i5SGOt";
// var nonce = randomString(10);
// var curTime = new Date().getTime();
// var checkSum = hex_sha1(secret + nonce + curTime);   //SHA1算法加密  

// $.ajax({
//   type: "GET",
//   url: "https://api.jsonstore.cn/api/DataAPI/background",  //API调用地址  
//   headers: {
//     "Content-Type": "application/json",
//     "App-Key": appKey,
//     "Nonce": nonce,
//     "Cur-Time": curTime,
//     "Check-Sum": checkSum,
//   },
//   success: function (data) {
//     console.log(data.imageURL);
//     if(data.imageURL) {
//       $("body").css('background-image', `url('${data.imageURL}')`);
//       $("body").css('background-repeat', 'no-repeat');
//       $("body").css('background-size', 'cover');
//     }
//   },
//   error: function (err) {
//     console.log(err.status);
//     console.log(err.responseText);
//   }
// })