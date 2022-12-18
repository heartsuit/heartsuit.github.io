---
layout: post
title: 远程的Win11主机没有连接屏幕，通过向日葵远程后只有一个640x480的分辨率选项
tags: Tools
---

## 背景

远程的 `Win11` 主机没有连接屏幕，通过向日葵远程后只有一个 `640x480` 的分辨率选项，界面特别小，用起来很不方便。而且远程主机本身还无法调整分辨率，向日葵上面的工具栏里也没有分辨率这一选项。

![2022-12-18-640-480.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-12-18-640-480.jpg)

## 问题分析

主要原因是远程主机未接屏幕，导致无法识别具体的分辨率。

## 解决方案

经过查阅发现可以通过安装一个虚拟屏幕，来实现分辨率可选。这个软件是： `usbmmidd_v2`

![2022-12-18-usbmmidd.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-12-18-usbmmidd.jpg)

在远程主机下载或传输到远程主机后，解压，双击 `usbmmidd.bat` ，发现屏幕分辨率发生了变化，虽不是全屏，至少变大了。这时可以采用以下3种方式调整分辨率：

1. 因为相当于接了个虚拟屏幕，所以可以通过系统设置调整远程主机的分辨率；
2. 断开向日葵重新连接，发现上面的工具栏里有了分辨率这一选项；
3. 安装一个第三方小工具：`HRC-HotKey_Resolution_Changer`，可以很方便的动态调整分辨率大小。

我这里用 `HRC` 实现了动态调整屏幕分辨率:[百度网盘：提取密码: ugbi](https://pan.baidu.com/share/init?surl=jIM67rg) 

![2022-12-18-HRC.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-12-18-HRC.jpg)

其实在解决问题之前，还使用了 `Qres` 这个软件，但是命令行执行时报错：**the graphics mode are not supported**，果断放弃。

## Reference

* [https://www.office26.com/windows/hotkey-resolution-changer-download.html](https://www.office26.com/windows/hotkey-resolution-changer-download.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
