---
layout: post
title: Chromium revision is not downloaded ：Puppeteer根据不同的操作系统下载对应的Chromium
tags: Node.js
---

### Problem: Chromium revision is not downloaded

``` json
  "scripts": {
    "start": "electron .",
    "packager": "electron-packager ./ awesome-app --platform=win32 --arch=all --out ./Executable --electronVersion 2.0.7 --overwrite --icon=./icon.ico"
  },
```

使用Electron在Windows64平台上打包为win64、ia32的应用，这在通常情况下应该都没问题；不过在这次的应用中使用了`Puppeteer`，打包后ia32应用在Windows32位系统上无法启动chrome，查看日志发现报错：**Error: Chromium revision is not downloaded**。

### Analysis

Puppeteer是在执行`npm install`过程中下载的，对应的路径为：`\node_modules\puppeteer\.local-chromium`

在`.local-chromium`下有`win64-579032\chrome-win32`，启动其中的chrome.exe，查看版本信息：

    Chromium
    70.0.3508.0（开发者内部版本） （64 位）

也就是说，打包后不论什么系统、平台，puppeteer启动的始终都是win64的这个`Chromium`（即在哪个平台上打包，默认只会有相应平台的`Chromium`），显然，问题来了，在32位的Windows系统上，是无法启动64位的`Chromium`的。

***那么，如何同时下载多个平台或者指定平台的`Chromium`呢？***

文件`\node_modules\puppeteer\install.js`将告诉我们答案。

### Solution

- 大概扫一下这个`install.js`文件，基本能断定，Chromium的版本信息由当前的操作系统确定。提取有用的部分代码。

``` javascript
let platform = 'win32'; // mac, linux, win32 or win64
const BrowserFetcher = require('puppeteer/lib/BrowserFetcher');
let browserFetcher = new BrowserFetcher({ platform: platform });
const revision = require('puppeteer/package').puppeteer.chromium_revision;
const revisionInfo = browserFetcher.revisionInfo(revision);

console.log(revision)
console.log(revisionInfo)

browserFetcher.download(revisionInfo.revision)
  .then(() => { console.log('Done!') })
  .catch(err => { console.log('Error', err) })
```

- 可将以上代码保存为`puppeteer.js`，然后在`package.json`的脚本中做如下配置，在打包前执行脚本，实现不同平台下`puppeteer`的下载。

``` json
  "scripts": {
    "start": "electron .",
    "puppeteer": "node puppeteer",
    "packager": "electron-packager ./ awesome-app --platform=win32 --arch=all --out ./Executable --electronVersion 2.0.7 --overwrite --icon=./icon.ico"
  },
```

#### Note
- 上述代码在`puppeteer@1.7.0`测试通过。

- `puppeteer`的下载被墙了，用默认配置下载超慢，甚至下载失败，修改目标服务器配置：

``` bash
npm config set puppeteer_download_host https://storage.googleapis.com.cnpmjs.org
```

### Reference
- [https://stackoverflow.com/questions/47757720/puppeteer-download-chromium-for-different-platforms](https://stackoverflow.com/questions/47757720/puppeteer-download-chromium-for-different-platforms)

- [https://github.com/GoogleChrome/puppeteer/blob/v1.1.1/docs/api.md#puppeteerlaunchoptions](https://github.com/GoogleChrome/puppeteer/blob/v1.1.1/docs/api.md#puppeteerlaunchoptions)


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***