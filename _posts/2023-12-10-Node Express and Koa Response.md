---
layout: post
title: Node后端框架Express与Koa接口统一响应封装
tags: Node.js, Express
---

## 背景

以前在写 `SpringBoot` 全栈开发的系列文章中[全栈开发之后端脚手架：SpringBoot集成MybatisPlus代码生成，分页，雪花算法，统一响应，异常拦截，Swagger3接口文档](https://heartsuit.blog.csdn.net/article/details/122644435)，有提到对后端接口的响应数据进行统一的封装，方便前端或者第三方进行数据获取与对接工作；统一响应一般包含状态码、消息内容、数据内容等。

这里对 `2017` 年写的一个基于 `Node.js` 的 `Express.js` 框架开发的后端项目的接口进行类似的封装。

## 通用状态码与信息封装

```javascript
/**
 * @author ycx
 * @description 业务异常通用code
 *
 */
class BaseResultCode {
    /***********************************/
    /**
     * code
     */
    code;
    /**
     * 说明
     */
    desc;

    constructor(code, desc) {
        this.code = code;
        this.desc = desc;
    }

    /************************************/
    static SUCCESS = new BaseResultCode(200, '成功');
    static FAILED = new BaseResultCode(500, '失败');
    static VALIDATE_FAILED = new BaseResultCode(400, '参数校验失败');
    static API_NOT_FOUNT = new BaseResultCode(404, '接口不存在');
    static API_BUSY = new BaseResultCode(429, '操作过于频繁')
}

module.exports = BaseResultCode
```

Note: 上面的 `class` 写法对 `Node.js` 的版本有要求， `10.x` 报错， `12.x` 可以使用。

![2023-12-10-Response.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-10-Response.jpg)

## 统一响应封装

```javascript
const ResultCode = require('./BaseResultCode');
/**
 * @author ycx
 * @description 统一返回结果
 */
class Result {
    /**
     * 返回code
     */
    code;
    /**
     * 返回消息
     */
    msg;
    /**
     * 返回数据
     */
    data;
    /**
     * 返回时间
     */
    time;

    /**
     * 
     * @param code {number} 返回code
     * @param msg {string} 返回消息
     * @param data {any} 返回具体对象
     */
    constructor(code, msg, data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
        this.time = Date.now();
    }

    /**
     * 成功
     * @param data {any} 返回对象
     * @return {Result}
     */
    static success(data) {
        return new Result(ResultCode.SUCCESS.code, ResultCode.SUCCESS.desc, data);
    }

    /**
     * 失败
     */
    static fail(errData) {
        return new Result(ResultCode.FAILED.code, ResultCode.FAILED.desc, errData);
    }

    /**
     * 参数校验失败
     */
    static validateFailed(param) {
        return new Result(ResultCode.VALIDATE_FAILED.code, ResultCode.VALIDATE_FAILED.desc, param);
    }

    /**
     * 拦截到的业务异常
     * @param bizException {BizException} 业务异常
     */
    static bizFail(bizException) {
        return new Result(bizException.code, bizException.msg, null);
    }
}
module.exports = Result
```

## 返回数据时进行封装

封装好统一的响应后，在 `Express.js` 后端项目中怎么使用？先是引入： `const Result = require("../common/Result");` ，然后直接使用 `Result.success()` 或者 `Result.fail()` 返回数据或错误信息。

![2023-12-10-Usage.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-10-Usage.jpg)

```javascript
const router = express.Router();
const Result = require("../common/Result");

router.get("/:productName/:deviceName", function(req, res) {
    let productName = req.params.productName;
    let deviceName = req.params.deviceName;
    Device.findOne({
        "product_name": productName,
        "device_name": deviceName
    }, function(err, device) {
        if (err) {
            res.send(Result.fail(err));
        } else {
            if (device != null) {
                Connection.find({
                    device: device._id
                }, function(_, connections) {
                    res.json(Result.success(Object.assign(device.toJSONObject(), {
                        connections: connections.map(function(conn) {
                            return conn.toJSONObject();
                        })
                    })))
                })
            } else {
                res.status(404).json({
                    error: "Not Found"
                });
            }
        }
    })
});
```

```javascript
router.put("/:productName/:deviceName/suspend", function(req, res) {
    let productName = req.params.productName
    let deviceName = req.params.deviceName
    Device.findOneAndUpdate({
        "product_name": productName,
        "device_name": deviceName
    }, {
        status: "suspended"
    }, {
        useFindAndModify: false
    }).exec(function(err, device) {
        if (err) {
            res.send(Result.fail(err));
        } else {
            if (device != null) {
                device.disconnect();
            }
            res.status(200).send(Result.success("ok"));
        }
    })
});
```

Note：顺便在这里简单总结下 `Express.js` 获取请求参数的几种方法：

1. req.query.productName，对应http://localhost:3000/device?productName=product
2. req.params.productName，对应http://localhost:3000/device/:productName
3. req.headers["productname"]，获取头信息中的参数，注意小写~
4. req.body.productName，Express.js无法直接获取Post请求的参数，需要设置body解析中间件，app.use(express.urlencoded())

## 可能遇到的问题

> Express 请求没有响应 日志显示：-- ms

原因：在响应时没有调用 `res.send()` 或者 `next()` 向下执行，导致最终没有结果返回给调用方。

```javascript
router.put("/:productName/:deviceName/suspend", function(req, res) {
    let productName = req.params.productName
    let deviceName = req.params.deviceName
    Device.findOneAndUpdate({
        "product_name": productName,
        "device_name": deviceName
    }, {
        status: "suspended"
    }, {
        useFindAndModify: false
    }).exec(function(err, device) {
            if (err) {
                res.send(err));
        } else {
            if (device != null) {
                device.disconnect();
            }
            Result.success("ok");
        }
    })
});
```

解决方法： 将 `Result.success` 放到 `res.send()` 里，就像这样： `res.send(Result.success("ok"))` 。

## 结果展示

![2023-12-10-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-10-Result.jpg)

## 小总结

上述内容记录了对 `Node.js` 后端框架 `Express.js` （如果使用的是 `Koa.js` ，方法也类似）的接口进行统一响应封装的方法以及可能遇到的问题，后端开发时，对响应和异常进行统一封装有几个好处：
1. 统一风格：通过封装，可以确保所有的响应和异常都遵循相同的格式和风格，使代码更加一致和易于理解。
2. 便于维护：统一封装可以让你更容易地管理和维护响应和异常的逻辑，而不必在每个地方都重复相同的代码。
3. 安全性：通过封装异常，可以更好地处理错误情况，确保系统的安全性和稳定性。
4. 易于扩展：封装可以让你更容易地扩展和修改响应和异常的处理逻辑，而不必改动大量的代码。

总之，统一封装可以提高代码的可维护性、安全性和可扩展性，这是在进行 `HTTP` 接口开发时的一个最佳实践。

## Reference

* [code笔记:nodeJS框架 express 接口统一返回结果设计](https://juejin.cn/post/6890532318395777038)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
