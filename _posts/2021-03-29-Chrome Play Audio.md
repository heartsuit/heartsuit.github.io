---
layout: post
title: 解决Puppeteer内置的Chromium无法自动播放音频问题
tags: Node.js
---

### 背景

以前做的一个基于 `Wechaty` 的客户端应用，最近更新个功能，涉及到提示语音的播放，由于要实现对附近人员的提醒，要求自动播放音频，可人工操作关闭。

但是实际开发中，发现 `Chrome` 浏览器无法自动播放音频，经过查询，发现是 `Chromium` 本身做了限制。

版本信息：

1. wechaty@0.14.1，puppeteer: ^1.2.0；
2. 音频播放用的是`jquery.jplayer.min.js`；

### 解决

这里场景比较特殊， 这个客户端就在用户的一台电脑上使用，那么只要想法解决这个客户端的问题就行了。 `Wechaty` 项目依赖了 `Puppeteer` ，其中内置了 `Chromium` ，那么按道理，应该可以通过**修改源码配置**的方式突破这一无法自动播放音频的限制。

经过查找依赖信息，终于找到了相关的配置，源码路径：node_modules\wechaty\dist\src\puppet-web\bridge.js，默认的浏览器初始化参数如下：

``` js
initBrowser() {
    return __awaiter(this, void 0, void 0, function*() {
        config_1.log.verbose('PuppetWebBridge', 'initBrowser()');
        const headless = this.options.head ? false : true;
        const browser = yield puppeteer_1.launch({
            headless,
            args: [
                '--audio-output-channels=0',
                '--disable-default-apps',
                '--disable-extensions',
                '--disable-translate',
                '--disable-gpu',
                '--disable-setuid-sandbox',
                '--disable-sync',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-sandbox',
            ],
        });
        const version = yield browser.version();
        config_1.log.verbose('PUppetWebBridge', 'initBrowser() version: %s', version);
        return browser;
    });
}
```

按照下图进行配置（删掉参数：--mute-audio，增加参数：--autoplay-policy=no-user-gesture-required）：

![2021-3-29-ChromiumBridge.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-29-ChromiumBridge.png)

即：--autoplay-policy=no-user-gesture-required，在启动参数中加上这个, 就可以自动播放音频了。

Note：其他场景：如果想直接在 `Google` 的 `Chrome` 浏览器上实现音频自动播放，那么可对浏览进行配置（可解决当前电脑 `Chrome` 浏览器的这一问题）：

在浏览器输入： `chrome://flags/#autoplay-policy` ，将第一个配置项 `Autoplay policy` ，设置为 `no user gesture is required` ，重启浏览器生效。😊

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
