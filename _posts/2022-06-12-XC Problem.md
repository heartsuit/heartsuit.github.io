---
layout: post
title: 微服务项目在信创环境下部署遇到的零星问题汇总
tags: 国产化, 微服务
---

## 背景

本次项目涉及20+台服务器的部署，技术包括 `Nacos` 注册中心集群、 `GateWay` 网关服务集群、 `达梦8` 关系型数据库服务集群、 `MinIO` 分布式文件存储服务集群、 `Redis` 缓存服务集群、 `WebSocket` 服务端消息推送集群、 `Quartz` 定时任务服务集群、 `Nginx+KeepAlived` 反向代理高可用集群、监控服务集群。

前面通过几篇文章记录了基于微服务的项目在国产化环境的迁移适配遇到的核心问题：数据库迁移、中间件迁移等，这里再总结下在迁移过程中可能遇到的一些比较小的问题，每个问题都比较简单，无法构成一篇完整的文章，就全部整合到这一篇文章中，作为问题的解决记录。

## 前端

### vue刷新404

编辑 `Nginx` 配置文件，在 `location` 下添加以下内容。

```conf
try_files $uri $uri/ /index.html;
```

### vue二级路由刷新空白页

* vue.config.js

```javascript
publicPath: process.env.NODE_ENV === "production" ? "/ok" : "/",
```

* router/index.js

```javascript
export default new Router({
    mode: 'history',
    scrollBehavior: () => ({
        y: 0
    }),
    base: "/ok",
    routes: constantRoutes
})
```

如果通过 `Nginx` 结合上述前端源码配置了二级路由（在一个端口上多个前端服务：一个 `/` ，一个 `/ok` ），那么需要编辑 `Nginx` 配置文件，在 `location` 下添加以下内容。

```
try_files $uri $uri/ /ok/index.html;
```

### Nginx代理WebSocket

编辑 `Nginx` 配置文件，在 `location` 下添加以下内容。

```conf
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## 中间件

### PUT、DELETE接口405

在前端页面新增请求正常，但是修改、删除接口405。这是由于 `Tongweb` 默认禁用了 `PUT` ， `DELETE` 请求，在 `Tongweb` 控制台放行即可。

![2022-06-12-PutDelete405.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-12-PutDelete405.jpg)

### 后端接收的中文参数乱码

在 `Tongweb` 控制台找见对应服务，修改相应的 `HTTP` 通道配置： `URL` 编码格式改为 `UTF-8` ，用于解码U `RI` 字符的编码格式，默认 `GBK` 。

![2022-06-12-Encode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-12-Encode.jpg)

## 数据库

### 命令行数据迁移

除了使用达梦客户端提供的可视化迁移工具，达梦数据库通过命令行导入数据的方式如下。

```
./dimp BUSSINESS_CONFIG/BUSSINESS_CONFIG123 FILE=/opt/dm-data-restore/standard-config.dmp LOG=/opt/dm-data-restore.log FULL=y TABLE_EXISTS_ACTION=REPLACE
```

参考： `https://blog.csdn.net/qq_42000661/article/details/117419225`

### 创建用户并授权

在达梦数据库中创建用户并授权。

```sql
create user BUSSINESSCORE identified by BUSSINESSCORE123 limit failed_login_attemps 5, password_lock_time 5;
grant resource to BUSSINESSCORE;
```

参考： `https://blog.csdn.net/weixin_49715367/article/details/124322304`

### 创建FIND_IN_SET函数报错，没有权限创建

简单点，可以直接使用 `SYSDBA` 创建。

### java.lang. NullPointerException: element cannot be mapped to a null key

一张表中有个字段： `type` ，由于达梦查出的字段名为大写 `TYPE` ，导致代码中使用 `Lambda` 表达式使用小写 `type` 获取到的值为 `null` 。
解决方法是起别名： `SELECT type as "type" FROM tbname;`

### MySQL中的TinyInt4通过迁移工具到了达梦后，代码中的数据类型变成了Byte，导致空指针

解决方法是修改表字段类型为 `Int` 。

### 自增列赋值错误

我们使用 `MyBatisPlus` ，进行 `save` 操作时（采用默认的策略，即生成的雪花算法），因为默认的 `SQL` 语句包含了 `ID ` 列的赋值导致报错，解决办法是将 ` ID ` 主键字段设置为非自增。

## 分布式文件存储

### MinIO通过内网上传，外网展示

内网环境下上传文件的响应：

```json
{
	"file": {
		"id": "1533995382831808513",
		"name": "微信图片_20220524101534.jpg",
		"url": "http://172.27.204.115:9000/notice/2022/06/07/3bfeddca-32c8-42ac-a173-619e2e89fa0b.jpg",
		"size": "797.48KB   ",
		"createTime": "2022-06-07 10:12:54"
	}
}
```

通过外网访问、展示文件，以下通过Nginx进行代理。当然，后端项目中需添加一段替换内网地址为外网地址的代码： `String replace = sysFileResource.getUrl().replace(minIOAddress, publicAddress);`

```conf
location ^~ /oss/ {
	proxy_read_timeout 600s;
	proxy_pass http://172.167.60.77:9000;
	proxy_http_version 1.1;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
	proxy_set_header X-Special-Delivery "";
	proxy_set_header Access-Control-Allow-Origin "";
	proxy_set_header Proxy-Client-IP $remote_addr;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 小总结

至此，基于微服务架构的项目的国产化迁移适配告一段落，希望国产化软硬件发展越来越好~

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
