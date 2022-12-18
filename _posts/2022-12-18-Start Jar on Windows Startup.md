---
layout: post
title: Windows配置开机自启jar包，不显示黑窗口，并输出日志
tags: Tools
---

## 背景

如果是在 `Linux` 下开机自启一个服务相对比较简单，这次遇到一个需求是关于 `Windows` 开机自启的：

1. 在 `Windows` 环境下开机自动运行一个 `SpringBoot` 服务；
2. 而且由于是一个后台服务，要求对终端用户无感知；
3. 为后期维护方便，需要将原来的控制台输出记录到日志文件。

以下实现方法主要用到了 `Windows` 环境下基本的批处理脚本以及 `VB` 脚本（主要是为了控制黑窗口的隐藏，同时可以输出服务的日志信息）。

## 编写启动jar包的批处理脚本：demo.bat

```bat
@echo off
D:
cd D:\Java\IdeaProjects\demo\target
java -jar demo-0.0.1-SNAPSHOT.jar >> log.log
```

Note：这里采用**追加**的方式将日志重定向写入到 `log.log` 文件。

## 编写运行批处理脚本的VB脚本：startup-jar.vbs

为了控制黑窗口不显示，这里借助了 `VB` 的脚本语言，最后的参数0表示隐藏黑窗口。

```vb
CreateObject("Wscript. Shell").run "D:\Java\IdeaProjects\demo\target\demo.bat",0
```

## 创建VB脚本的快捷方式，加入到开机自启中

对上一步中的 `VB` 脚本 `startup-jar.vbs` 右键创建快捷方式，然后将快捷方式放入以下目录，即可实现开机自启。

```
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp
```

![2022-12-18-640-480.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-12-18-640-480.jpg)

## Reference

* [https://blog.csdn.net/weixin_44072966/article/details/120764166](https://blog.csdn.net/weixin_44072966/article/details/120764166)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
