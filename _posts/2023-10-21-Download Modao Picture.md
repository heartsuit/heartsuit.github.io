---
layout: post
title: NodeJS爬取墨刀上的设计图片
tags: Spider
---

## 背景

设计人员分享了一个墨刀的原型图，但是给的是只读权限，无法下载其中的素材；开发时想下载里面的一张动图，通过浏览器的F12工具在页面结构找到了图片地址。

![2023-10-21-1-HTML.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-10-21-1-HTML.jpg)

但是浏览器直接访问后发现没权限： `Nginx` 的 `403` 页面。。然后就想用其他方式下载这个图片。

![2023-10-21-2-Nginx.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-10-21-2-Nginx.jpg)

## 失败的尝试：通过浏览器请求另存为图片

从前面的403报错可以知道，访问这个图片的链接应该需要带头信息，那就先看下网络中的这个请求的头信息（我这里用图片作为条件过滤了一下），找见请求后右键有个**另存为图片**，以为这就大功告成了，但是保存后发现大小只有1M（1024KB，而从浏览器的请求中可以看到，实际的文件大小差不多10M），这很可能是浏览器哪里做了限制，导致下载的图片不是原图或者不完整。

![2023-10-21-3-Save.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-10-21-3-Save.jpg)

## 成功的尝试：NodeJS发送Fetch请求

在开发者工具中的网络请求右键中，还有一个选项：**在控制台中Fetch**，点击之后会在控制台中生成一段代码，用于发送请求获取图片，并且带了头信息。

![2023-10-21-4-Fetch.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-10-21-4-Fetch.png)

![2023-10-21-5-Console.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-10-21-5-Console.jpg)

看到这个代码，我立即就联想到可以通过 `Node.js` 来发送请求，然后下载保存图片，说干就干，以下是完整代码。

```javascript
const fs = require("fs");

const downloadFile = (async (url, path) => {
    const res = await fetch("https://modao.cc/x/y/z.gif", {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Accept": "image/avif,image/webp,*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "same-origin",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        "referrer": "https://modao.cc/abc/opq&from=sharing",
        "method": "GET",
        "mode": "cors"
    });
    fs.writeFile(path, Buffer.from(await res.arrayBuffer()), 'binary', function(err) {
        if (err) throw err;
        console.log("OK");
    });
});

downloadFile(1, "./1.gif")
```

以上代码主要用到了 `Node.js` 的 `fetch` 方法来发送资源请求，以及 `fs` 模块来存储图片，简单直接有效。

## 可能遇到的问题

不过，通过上述方式并不能下载所有的素材，有的图片下载返回了状态码： `304 Not Modified` ；我们知道，如果服务器返回状态码为 `304 Not Modified` ，这意味着请求的资源在服务器上没有发生变化，服务器告诉客户端可以使用缓存的版本。这是一种优化机制，可以减少网络流量和提高性能。

当浏览器或其他客户端首次请求资源时，服务器会返回资源的完整内容和一个响应头（Response Header），其中包含一个叫做"ETag"的字段。 `ETag` 是一个唯一标识符，表示资源的版本。当客户端再次请求相同的资源时，会在请求头（Request Header）中包含一个叫做"If-None-Match"的字段，该字段的值就是上次请求返回的 `ETag` 值。

如果服务器收到了带有"If-None-Match"字段的请求，并且发现资源的 `ETag` 值与请求头中的值相匹配，服务器就会返回 `304 Not Modified` 状态码，告诉客户端可以使用缓存的版本。这样可以节省带宽和服务器资源，因为客户端可以直接从缓存中获取资源，而不需要重新下载。

解决方法：更新请求头部，尝试在 `fetch` 请求中添加 `Cache-Control: no-cache` 头部，这将告诉服务器不使用缓存版本，强制返回实际的资源内容。或者直接去掉浏览器生成的头信息中的 `If-Modified-Since` 与 `If-None-Match` ：

```
    "If-Modified-Since": "Fri, 21 Jul 2023 07:05:31 GMT",
    "If-None-Match":"\"64ba2e3b-14711"\"
```

```javascript
const fs = require("fs");

const downloadFile = (async (url, path) => {
    const res = await fetch("https://modao.cc/x/y/z.png", {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Accept": "image/avif,image/webp,*/*",
            "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "same-origin",
        },
        "referrer": "https://modao.cc/abc/opq&from=sharing",
        "method": "GET",
        "mode": "cors"
    });
    fs.writeFile(path, Buffer.from(await res.arrayBuffer()), 'binary', function(err) {
        if (err) throw err;
        console.log("OK");
    });
});

downloadFile(2, "./2.png")
```

## 小总结

以上记录了使用 `NodeJS` 爬取**墨刀**上的设计图片的过程。

1. 当使用 `Node.js` 的爬虫 `fetch` 请求时，返回状态码 `304 Not Modified` 表示请求的资源在服务器上没有发生变化，因此服务器不会返回实际的资源内容，而是告诉客户端可以使用缓存的版本。

2. 这种情况通常发生在客户端发送了一个带有 `If-Modified-Since` 或 `If-None-Match` 头部的请求，这些头部包含了之前请求时服务器返回的资源的相关信息，用于判断资源是否发生了变化。

3. 要解决这个问题，可以尝试在 `fetch` 请求中添加 `Cache-Control: no-cache` 头部，这将告诉服务器不使用缓存版本，强制返回实际的资源内容。

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
