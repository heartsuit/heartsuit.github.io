---
layout: post
title: 百度地图按行政区、县划分轮廓界限
tags: Front-End
---

### 背景
在物联网行业，用户、决策者通常需要直观地看到不同区域、地点处的设备部署情况，便于了解整体分布。通过在数字地图上动态划分各区、县的边界，同时显示每个区域的设备数量，可实现这一需求。其实，这种技术已经很成熟，并在各大找房网站中得到广泛应用。

这里列出几个参考网站，随便感受下：

- [悟空找房](https://www.wkzf.com/map.html)
- [链家网](https://bj.lianjia.com/ditu/)
- [爱屋吉屋](https://www.iwjw.com/sale/map)
- [安居客](https://beijing.anjuke.com/map/sale/?from=esf_list_navigation)
- [巴乐兔](http://sh.baletu.com/map)

基本上就是根据地图（高德、百度）的不同放大级别，分别显示不同的覆盖物；

### 项目需求
在百度地图上，分级，按行政区、县划分轮廓界限；

一开始拿到这一需求后，先查阅了相关资料，结果基本都指向了[悟空找房](https://www.wkzf.com/map.html)，果然不错，随即确认了眼神。向各大找房网站学习~~

### 效果展示

![2018-05-18-DistrictBoundary](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-05-18-DistrictBoundary.gif)


### 总结

(1) 自定义覆盖物
主要解决了以下几个问题：
1. 标注位置、样式；
2. 根据放大级别显示不同的标注覆盖物；

(2) 调用百度API获取指定区域边界数据；

[官方Demo
](http://lbsyun.baidu.com/jsdemo.htm#c1_10)

``` javascript
var plys = [];
var bdary = new BMap.Boundary();
bdary.get(省区县名, function (rs) {
    var count = rs.boundaries.length;
    //建立多边形覆盖物
    for (var i = 0; i < count; i++) {
        var ply = new BMap.Polygon(rs.boundaries[i], {
            strokeWeight: 2,
            strokeOpacity: 0.8,
            StrokeStyle: "solid",
            strokeColor: "#1abc9c",
            fillColor: "#16a085",
            fillOpacity: 0.2
        });
        plys.push(ply);
        map.addOverlay(ply);  //添加覆盖物
    }
});
```

(3) 显示、隐藏轮廓边界；

为避免重复调用接口，并多次渲染地图边界，对边界点调用`show()`, `hide()`方法，实现轮廓边界的显示与隐藏。

``` javascript
// 显示轮廓
for (var i = 0; i < plys.length; i++) {
    plys[i].show();
}

// 隐藏轮廓
for (var i = 0; i < plys.length; i++) {
    plys[i].hide();
}
```

(2) mouseover和mouseout在鼠标悬浮时多次触发；

问题的根源在子元素，一句话说明 mouseover与mouseenter 的区别：

    无论鼠标穿过被选元素或其子元素，都会触发 `mouseover` 事件。
    仅当鼠标穿过被选元素时，才会触发 `mouseenter` 事件。

所以将 mouseover改为`mouseenter`，mouseout改为`mouseleave`，即可达到目的。

### [Reference](https://github.com/didilinkin/aoffice_web_BaiduMapSearch)

### Source Code: [Github](https://github.com/heartsuit/baidumap)

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***