$("body").css('background-image', `url('https://89c8658d.ngrok.io/backgroundb')`);
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