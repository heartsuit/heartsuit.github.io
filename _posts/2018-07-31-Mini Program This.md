---
layout: post
title: 小程序thirdScriptError, this.setData is not a function;
tags: Front-End
---

### Problem

小程序开发过程中遇到this指向问题：

![2018-07-31-ThisError.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-31-ThisError.png)

前端控制台报错：

> thirdScriptError this.setData is not a function;

即：setData方法不存在。

### Solution

将生命周期函数中的`this`传至普通函数；

通过以下代码，确定每个this分别指向哪里：

``` javascript
Page({
  data: {
    result: '',
  },

  onLoad: function(options) {
  },

  onReady: function() {
  },

  onShow: function() {
    let that = this;
    console.log('1: 生命周期函数中的this：', this);

    setInterval(function() {
      console.log('2: 定时函数中的this：', this);
      cronJob(that); // pass 'this' to normal method
    }, 10000);
  }
})

function cronJob(that) {
  console.log('3: 普通函数体中的this：', this);
  console.log('4: 普通函数体中的that：', that);
  wx.request({
    url: 'https://cn.bing.com/', // Just as an example
    method: 'GET',
    success: function(res) {
      let images = res.data.match(/\/az\/hprichbg\/rb\/(.){1,50}_1920x1080\.jpg/g); // regular expression
      let imageURL = `https://cn.bing.com${images[0]}`; // here must be https

      // that in wx.request
      this.setData({
        result: imageURL
      })
      console.log(that.data.result); // OK
    },
    fail: function(res) {
      console.log(res);
    }
  })
}
```

### Result

![2018-07-31-ThisResult.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-31-ThisResult.jpg)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***