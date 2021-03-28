---
layout: post
title: Node.js的nrm报错：internal/validators.js:125 throw new ERR_INVALID_ARG_TYPE(name, 'string', value); 
tags: Node.js
---

### 背景

又是换电脑引发的问题，为兼容几年前写的 `Node.js` 相关项目、客户端应用，换了新主机后，便选择安装相对旧点的 `Node` 版本： `v10.24.0` 。然而，全局安装了 `nrm` 依赖后，执行 `nrm ls` 报错：

``` bash
$ nrm ls
internal/validators.js:125

    throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
    ^
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received type undefined
  at validateString (internal/validators.js:125:11)
  at Object.join (path.js:427:7)  at Object.<anonymous> (E:\Program Files\nodejs\my_global\npm\node_modules\nrm\
cli.js:17:20)
  at Module._compile (internal/modules/cjs/loader.js:778:30)
  at Object. Module._extensions..js (internal/modules/cjs/loader.js:789:10)
  at Module.load (internal/modules/cjs/loader.js:653:32)
  at tryModuleLoad (internal/modules/cjs/loader.js:593:12)
  at Function. Module._load (internal/modules/cjs/loader.js:585:3)
  at Function. Module.runMain (internal/modules/cjs/loader.js:831:12)
  at startup (internal/bootstrap/node.js:283:19)
  at bootstrapNodeJSCore (internal/bootstrap/node.js:623:3)
```

### 解决

根据经验，这应该是新安装的依赖版本过高导致的问题，那么尝试降低版本（如今，这些开源项目、中间件、三方依赖的更新是真快。。）

``` bash
# 查看指定包的可用版本
$ npm view nrm versions

[ '0.1.0',
  '0.1.1',
  '0.1.2',
  '0.1.4',
  '0.1.5',
  '0.1.6',
  '0.1.7',
  '0.1.8',
  '0.1.9',
  '0.2.0',
  '0.2.1',
  '0.2.2',
  '0.2.3',
  '0.2.4',
  '0.2.5',
  '0.3.0',
  '0.3.1',
  '0.9.0',
  '1.0.0',
  '1.0.1',
  '1.0.2',
  '1.1.0',
  '1.2.0',
  '1.2.1' ]
```

![2021-3-28-NPMVersion.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-3-28-NPMVersion.png)

``` bash
# 卸载已安装的版本
$ npm uninstall -g nrm
# 选择较低的版本安装（指定版本安装依赖）
$ npm install -g nrm@1.1.0
# 使用taobao镜像或者cnpm
$ nrm use cnpm
# 确认已选择的镜像
$ nrm ls
```

### 其它问题

虽然切换为 `taobao` 等国内镜像，可在安装有些依赖时，依然报错、超时，比如，涉及到 `puppeteer` 依赖的安装就基本总是不成功的。

``` bash
$ npm i

> puppeteer@1.3.0 install F:\JavaScript\Node.js\csair\node_modules\puppeteer
> node install.js

ERROR: Failed to download Chromium r549031! Set "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" env variable to skip download.
{ Error: connect ETIMEDOUT 172.217.24.16:443

    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1107:14)

  errno: 'ETIMEDOUT', 
  code: 'ETIMEDOUT', 
  syscall: 'connect', 
  address: '172.217.24.16', 
  port: 443 }
npm WARN koa-auto-post-form@1.0.0 No repository field.
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@1.2.2 (node_modules\fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@1.2.2: wanted {"os":"darwin", "arch":"any"}
(current: {"os":"win32", "arch":"x64"})
```

这次，需要对 `puppeteer` 单独设置国内镜像：

``` bash
$ npm config set puppeteer_download_host=https://npm.taobao.org/mirrors
```

然后，再次安装依赖即可。

### 一些扩展

`Node.js` 的全局依赖包默认是安装在C盘的，可以对这个目录进行配置：

``` bash
npm install moduleName # 安装到当前目录；
npm install -g moduleName # 安装到全局目录，默认采用最新版；
npm install moduleName@version # 安装指定版本的module，eg: npm install electron@1.6.6
npm config list # 获取当前有关配置信息；
npm config get prefix # 获取当前设置的全局目录；
npm config set prefix "E:\Program Files\nodejs\my_global\npm" # 改变全局目录到"E:\Program Files\nodejs\my_global\npm"
npm uninstall moduleName -g # 卸载全局模块
```

其实，配置全局 `npm` 包安装路径、配置镜像都会写入 `C:\Users\[用户名]\` 下的 `.npmrc` 文件，内容即为修改后的路径信息，比如，我的 `.npmrc` 文件内容是这样的：

``` bash
prefix=E:\Program Files\nodejs\my_global\npm
home=https://npm.taobao.org
registry=https://registry.npm.taobao.org/
puppeteer_download_host=https://npm.taobao.org/mirrors
```

所以，当然可通过直接改 `.npmrc` 文件来实现同样的效果~😊

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
