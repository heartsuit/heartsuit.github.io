---
layout: post
title: 4-TDengine图形化管理工具TDengineGUI与IDEA插件
tags: TDengine
---

### 背景

前面都是使用命令行或者代码直接查看数据库表的数据，相对图形化界面工具来说不够直观，像我们通常使用的 `MySQL` ， `MongoDB` 都有对应的图形化管理工具： `Navicat` 、 `HeidiSQL` 、 `NoSQLBooster` 等。而 `TDengine` 官方没有对应的工具，不过借助开源社区、第三方，我们多了些选择。

### 基于Electron开发的跨平台TDengine图形化管理工具

* 地址：https://github.com/skye0207/TDengineGUI

![2021-07-29-1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-1.jpg)

![2021-07-29-2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-2.jpg)

![2021-07-29-3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-3.jpg)

![2021-07-29-4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-4.jpg)

![2021-07-29-5.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-5.jpg)

![2021-07-29-6.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-6.jpg)

![2021-07-29-7.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-7.jpg)

Note：这个图形化管理工具使用的是 `JDBC-RESTfull` 的连接方式，所以连接端口为 `6041` 。

数据库连接、多数据库切换、超级表查询，普通表查询以及查询配置（按指定时间范围查询，显示指定的列，分页查询每页的数量，按时间戳正序、倒序，表格刷新功能）、控制台可执行高级查询、当前数据库的属性信息。

除了一些高阶功能（比如数据导入、数据导出、实时显示每个操作背后执行的命令、耗时等），基本的功能都有了，挺好~

Note：不过当数据量较大时，如果配置了时间倒序，则会出现“Result set too large to be sorted”的错误。

### IDEA数据库管理工具可视化使用TDengine

* 地址：https://www.taosdata.com/blog/2020/08/27/1767.html

* 用了一下，有点问题，有错误信息，但其实是连接成功的；

![2021-07-29-8.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-8.jpg)

![2021-07-29-9.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-9.jpg)

![2021-07-29-10.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-29-10.jpg)

* 中文乱码，通过charset参数解决：
    jdbc: TAOS://hadoop1:6030/demo?charset=CP936

### Reference

* [https://github.com/skye0207/TDengineGUI](https://github.com/skye0207/TDengineGUI)
* [https://www.taosdata.com/blog/2020/08/27/1767.html](https://www.taosdata.com/blog/2020/08/27/1767.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
