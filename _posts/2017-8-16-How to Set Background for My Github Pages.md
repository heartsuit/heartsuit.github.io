---
layout: post
title: 如何为Github Pages设置动态的背景图片？
tags: Node.js
---
### 准备做什么？
使用必应词典时，一次无意的点击，跳到了必应搜索引擎界面，突然眼前一亮，我看到一张图片，没错，高清大图！还可以往前翻几页，有的图片非常震撼；更有意思的是，在必应搜索首页，每张图片的背后都会有一个故事。然而，我对大部分故事并无兴趣。我只想把图片搞过来😍。。其实，必应已经提供了一个下载按钮的，可以一张一张下载，可我，只要链接~
> 实际上，我的目标是把这些漂亮的图片设置为博客背景，那怎么做呢？

### 怎么做？
按照思考的先后顺序，有以下两种方式：

### 思路一：前端发出`ajax jsonp`请求，提供单独服务器进行响应
——（这是各类数据API请求通用方法）
1. 在Github Pages的静态页面脚本（前端）发起请求，因为请求的是外部链接，这里存在跨域的问题，解决方案：
  - 直接向必应发起请求，通过iframe实现本域与他域的相互访问（总感觉iframe这种方式不够优雅，没有尝试）；
  - Github Pages本身仅提供静态页面的部署，那么我可不可以给它加个后台，通过自己在服务器端爬取image url，然后，Github Pages前端发起`jsonp`请求，获取数据？可不可行，一试便知。

- 前端：

``` javascript
$.ajax({  
  url: 'https://89c8658d.ngrok.io/backgroundj', // server url
  type: "GET",
  dataType: "jsonp",
  jsonpCallback: 'jsonpCallback',
  data: {},
  error: function (err) {
    console.log(err.status);
    console.log(err.readyState);
    console.log(err.responseText);
  },
  success: function (data) {
    console.log(data);
    $("body").css('background-image', `url(${data.background})`);
    $("body").css('background-repeat', `no-repeat`);    
    $("body").css('background-size', `cover`);
  }
});
```

- 后端

``` javascript
/*route: task.js*/
const bing = require('../core/bing');
module.exports = {
  // Get Bing daily background image using jsonp
  'GET /backgroundj': async (ctx) => {
    let img = await bing.getBackground(ctx);
    ctx.response.body = `jsonpCallback({"background":"${img}"})` // build jsonp string
  },
}

/*controller: bing.js*/
const superagent = require("superagent");
const fs = require('mz/fs');

const headerInfo = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
};

const url = 'http://cn.bing.com';
module.exports = {
  getBackground: async function (ctx) {
    return await getImageURL();
  },
}

// Send request to bing and parse image url in web page
async function getImageURL() {
  let returnPage = (await sendGet(url)).text;
  let images = returnPage.match(/\/az\/hprichbg\/rb\/(.){1,50}_1920x1080\.jpg/g); // regular expression
  console.log(images);
  let imageURL = `https://cn.bing.com${images[0]}`; // here must be https
  return imageURL;
}

// Get target content using superagent
function sendGet(target) {
  return new Promise((resolve, reject) => {
    try {
      superagent.get(target).set(headerInfo)
        .end(function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
    } catch (err) {
      reject(err);
    }
  })
}
```

- Note
1. 注意`jsonp`异步请求的方式，`jsonpCallback: 'jsonpCallback'`，前后端字符串需要一致；
2. 提供的服务器链接地址以及链接内容必须为https，否则浏览器会发出警告`已阻止载入混合活动内容“http://...”`，同时导致背景图片无法显示；
3. 服务端采用koa, koa-router, superagent等实现；
4. 这里的`https://89c8658d.ngrok.io/backgroundj`，将本地服务端程序映射到公网，是使用ngrok反向代理生成的临时域名，仅供测试。

### 思路二：由于前端仅显示背景图片，那么可提供单独服务器直接响应图片数据
——（针对当前需求的特殊方法）

2. 直接用代码说明：

- 前端

``` javascript
$("body").css('background-image', `url('https://89c8658d.ngrok.io/backgroundb')`); // server url
$("body").css('background-repeat', `no-repeat`);
$("body").css('background-size', `cover`);
```

- 后端（附加了保存图片至服务器、保存图片URL至json文件等功能）

``` javascript
/*route: task.js*/
module.exports = {
  // Get Bing daily background image using buffer
  'GET /backgroundb': async (ctx) => {
    let buffer = await bing.getBackgroundBuffer(ctx);
    ctx.response.type = 'image/jpeg'; // if type is not set, browser will try to download the image
    ctx.response.body = buffer;
  }
}

/*controller: bing.js*/
module.exports = {
  getBackgroundBuffer: async function (ctx) {
    // save image to server disk
    let imageURL = await getImageURL();
    let today = new Date().toLocaleDateString();
    let imageName = imageURL.substr(imageURL.lastIndexOf('/') + 1);
    let imagePath = `./logs/${today}_${imageName}`;
    try {
      superagent.get(imageURL).pipe(fs.createWriteStream(imagePath));
    } catch (err) {
      console.log(err);
    }

    // if the url has not been saved, save it to json file
    let jsonData = JSON.parse(await fs.readFile(`./logs/imageURL.json`));
    if (jsonData.images.indexOf(imageURL) == -1) {
      jsonData.images.push(imageURL);
      await fs.writeFile('./logs/imageURL.json', JSON.stringify(jsonData));
    }

    // binary response data is in res.body as a buffer
    return (await sendGet(imageURL)).body;
  }
}
```

### 总结
- [superagent](http://visionmedia.github.io/superagent/)在这里究竟做了什么？请求网页内容与请求图片数据，这些只是最基本的操作，其功能还有很多；
- 这样，通过两种方式实现了将必应搜索每日图片设置为Github Pages的背景；
- 思路一的方式算是较为通用的，可以实现对Github Pages提供数据API，实现自己的各类需求。虽然不是所有人都要为博客设置背景图片，但是可能会有涉及到向服务端动态请求数据的情况，那么这将是一种可行的方式——给自己的博客提供`后台`。

### 效果
[Blog with daily background image(from Bing)](https://heartsuit.github.io/2017/08/16/How-to-Set-Background-for-My-Github-Pages.html)

### Source Code: [Github（back-end）](https://github.com/heartsuit/DataAPI-for-Github-Pages)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***