---
layout: post
title: 上手华为软开云DevOps前后端分离实践之-静态资源服务器(Node.js)
tags: Node.js
---

### 简介

- 前面分别实现了 SpringBoot、Vue 项目在华为软开云的一键操作。但是 Vue 打包后的部署，需要一个静态资源服务器来 Serve，如果跨域未在服务器端处理，那么在这一静态服务器中同时还要处理 Vue 在生产环境下的跨域。

- 静态资源服务器的实现方式有很多，基本每种服务端语言都有对应的框架或容器，比如 Java 的 Tomcat、以及 Python、PHP、Node.js 等，另外还有较为专业的 HTTP 和反向代理 Web 服务器 Nginx，均可实现这一目标。

- 这里选择 Node.js 实现的静态资源服务器，主要原因是其语法也是 JavaScript，与前端的 Vue 通用；另外在 Node 的生态下，已经有现成的库实现了跨域，关键是跟 Vue 在开发环境下跨域完全一样，平滑迁移，无缝切换。

### 效果

![2019-04-18-Appearance.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-Appearance.gif)

Note: 这篇文章的内容比较简单，就是基于 koa 实现了一个静态资源服务器，直接上核心代码，就不放到华为云了。部署时将该 Node.js 项目放到 Linux 的目录 A，然后前端 Vue 的 dist 静态资源文件夹直接放到目录 A 即可。

### Node.js 代码`index.js`

```javascript
const path = require("path");
const Koa = require("koa");
const static = require("koa-static");
const httpProxyMiddleware = require("http-proxy-middleware");
const koaConnect = require("koa2-connect");

const app = new Koa();

app.use(static(path.join(__dirname, "dist")));

const proxy = function(context, options) {
  if (typeof options === "string") {
    options = {
      target: options
    };
  }
  return async function(ctx, next) {
    await koaConnect(httpProxyMiddleware(context, options))(ctx, next);
  };
};

// proxy config：生产环境跨域
const proxyTable = {
  "/3rd": {
    target: "http://www.tuling123.com/openapi/api",
    changeOrigin: true,
    pathRewrite: {
      "^/3rd": ""
    }
  },
  "/api": {
    target: "http://114.116.31.223:8080",
    changeOrigin: true
    // pathRewrite: {
    //   '^/api': ''
    // }
  }
};

Object.keys(proxyTable).map(context => {
  const options = proxyTable[context];
  app.use(proxy(context, options));
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log(`Koa app listening at ${port}...`);
});
```

Note: 开发环境跨域

![2019-04-19-DevCors.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DevCors.png)

    `Vue`在开发环境下的跨域配置与生产环境下的跨域配置写法完全一致，这是用`Node.js`来实现此静态资源服务器的优势。

### Node.js 配置`package.json`

```json
{
  "name": "front-server",
  "version": "1.0.0",
  "description": "frontend project deployed in node.js static web server",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/heartsuit/devcloud-static-server.git"
  },
  "keywords": ["node.js", "pm2", "static", "resource"],
  "author": "heartsuit",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/heartsuit/devcloud-static-server/issues"
  },
  "homepage": "https://github.com/heartsuit/devcloud-static-server#readme",
  "dependencies": {
    "http-proxy-middleware": "^0.19.1",
    "koa": "^2.7.0",
    "koa-static": "^5.0.0",
    "koa2-connect": "^1.0.2"
  }
}
```

下图是上一篇[上手华为软开云 DevOps 前后端分离实践之-前端 Vue](https://github.com/heartsuit/devcloud-vue) 中的一步，其中`cd /opt/front-server`即为该静态资源服务器所在目录，上篇文章中 Vue 的打包资源 `dist.zip` 也解压到该目录。

![2019-04-19-DeployVue4.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVue4.png)

Note:
`执行Shell命令`的第二步是安装依赖：首先配置全局 npm 包安装路径，接着全局安装`nrm`（注意软连接，这是 Linux 下全局安装 npm 包的一个坑），全局安装`pm2`；然后`进入项目目录`，安装依赖，最后由 pm2 守护启动。

PS:
`nrm` 全局安装后，可切换 npm 包的镜像源地址；
`pm2` 全局安装后，可切换 npm 包的镜像源地址；
`进入项目目录` 指的是一个 node.js 后端服务项目，实现了静态资源服务器，以及 Vue 打包项目在生产环境下的跨域。

至此，我们分别实现了在华为软开云上基于`SpringBoot`的后端项目、基于`Vue`的前端项目的一键检查、编译、部署，以及基于`Node.js`的静态资源服务器（生产环境下 Vue 的跨域）。

### Source Code: [Github](https://github.com/heartsuit/devcloud-static-server)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
