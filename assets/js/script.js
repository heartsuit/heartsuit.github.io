$("body").css('background-size', `cover`);
$("body").css('background-image', `url('https://89c8658d.ngrok.io/background')`);
$("body").css('background-repeat', `no-repeat`);

// $.ajax({
//   // url: 'https://3ae3192a.ngrok.io/background',
//   url: 'http://dataapi.ngrok.cc/background',
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
//     $("body").css('background-size', `cover`);
//     $("body").css('background-image', `url(${data.background})`);
//     $("body").css('background-repeat', `no-repeat`);
//   }
// });

// var request = window.superagent;
// request.get('http://cn.bing.com').end(function(err, res){
//   if(err) {
//     console.log(err);
//   }
//   console.log(res);
// });