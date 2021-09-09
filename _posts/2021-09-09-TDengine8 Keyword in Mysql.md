---
layout: post
title: 8-TDengine里用的好好的字段名，却被MySQL狠狠上了一课
tags: TDengine
---

### 背景

使用 `TDengine` 集成 `MyBatistPlus` 后，对我自己建的数据表进行分页查询时闪退，同时有条信息： `Process finished with exit code -1073741819 (0xC0000005)` 。

![2021-09-09-ErrorMsg.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-ErrorMsg.jpg)

我们知道， `MyBatistPlus` 的分页查询时先查询记录的总数，再进行分页条件查询，仔细观察 `MyBatistPlus` 控制台日志生成的SQL语句： `SELECT COUNT(1) FROM ( SELECT ts, voltage, current, temperature, sn, city, groupid FROM power ) TOTAL;` ，直接将这条SQL语句放在 `taos` 的客户端命令行执行是正确的（当然，需要先切换至对应的数据库： `use ok; ` ）。

![2021-09-09-SQLinTaos.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-SQLinTaos.jpg)

### 分析问题

* 难道是环境问题？
统一了 `SpringBoot` 、 `MyBatisPlus` 、 `taos-jdbcdriver` 的版本，以及JDK、编译器的版本，甚至将官方SpringBoot与 `MyBatistPlus` 集成的例子放进同一个项目， `Temperature` 可正常分页查询，可一到我的 `Power` 就不对了；所以是我的表有问题。

* 难道是因为数据量太大？ 
自己建的表超过1亿条数据， 官方示例中的 `Temperature` 是用来测试的，里面总共就几张子表，数据量也是个位数，可我试了官方的 `meters` 表， `100000000` 条数据，分页查询正常呀；所以是我的表有问题。

* 难道是我建的表有问题？
是我建表方式有问题？可对照官网说明仔细检查了十来八遍，没发现建库、建表语句有啥问题。而且 `TDengine` 官方文档中也是有这样的示例的：

Note: 建库建表语句如下（以下是经过简化后的，仅写入两条数据，说明问题即可）：

```sql
create database if not exists ok;

create stable if not exists ok.power(ts timestamp, voltage int, current float, temperature float) tags(sn int, city nchar(64), groupid int);

create table if not exists ok.device1 using ok.power tags(1, "太原", 1);
create table if not exists ok.device2 using ok.power tags(2, "西安", 2);

insert into ok.device1 values("2021-09-04 21:03:38.734", 1, 1.0, 1.0);
insert into ok.device2 values("2021-09-04 21:03:40.734", 2, 2.0, 2.0);
```

![2021-09-09-Ofiicial.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Ofiicial.jpg)

见鬼，我竟然开始怀疑人生了。

我决定跟踪下 `MyBatisPlus` 分页查询拦截器的源码，到底为啥我建的表会导致查询数据总量的SQL与别人的不一样。

```sql
-- 通过 `MyBatisPlus` 分页查询官方meter表生成的count查询语句
SELECT COUNT(1) FROM meters

-- 通过 `MyBatisPlus` 分页查询官方我建的表生成的count查询语句
SELECT COUNT(1) FROM ( SELECT ts, voltage, current, temperature, sn, city, groupid FROM power ) TOTAL
```

### 源码调试

从配置的分页拦截器位置开始，一步步调试。

![2021-09-09-Debug1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug1.jpg)

![2021-09-09-Debug2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug2.jpg)

![2021-09-09-Debug3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug3.jpg)

![2021-09-09-Debug4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug4.jpg)

![2021-09-09-Debug5.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug5.jpg)

![2021-09-09-Debug6.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Debug6.jpg)

 `net.sf.jsqlparser.parser. ParseException: Encountered unexpected token: "current"`

当看到这个信息时，瞬间炸裂，一下子就知道错哪里了， `current` 有 `现在的；电流` 的意思，当年也是虐过四六级的人。。这跟英语好不好没啥关系，而是跟编码基础与习惯、细心程度密切相关。这种细节错误很容易就被忽略，导致南辕北辙，耗费掉大半天时光。其实跟踪起来倒也不太难，只是刚开始没往这个方向思考。

> JsqlParserCountOptimize里的parser方法，try中的第一行代码直接到了catch块里，显然，这第一行抛异常了。。

![2021-09-09-Throw.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-Throw.jpg)

而且， `IDEA` 的高亮语法显示其实早已经标明了 `current` 是个关键字/保留字，只是，一开始的注意力根本没放在这里。

![2021-09-09-KeywordInIDEA.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-KeywordInIDEA.jpg)

### 解决问题

显然，换个名字吧，字段名不能使用 `mysql` 的关键字以及保留字（虽然在 `TDengine` 中一切正常），一般遇到 `order` 这种关键字出现在表名、字段名中时，我们会用反引号括起来，但是这里通过分页插件的查询代码显然没帮我们做这件事。

这个问题的根本是我们不应该使用保留字 `current` 作为字段名，但引起麻烦的是这个分页插件并没有向我们显式的报错，而是仅展示了一段莫名其妙的信息： `Process finished with exit code -1073741819 (0xC0000005)` （网上查了下这个报错，很多说是跟金山词霸有关系，这个。。真心没用过）。

另外，如果使用 `MyBatistPlus` 的 `selectList` 方法，则正常执行。。 `sigh`

![2021-09-09-NormalSQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-09-NormalSQL.jpg)

### 总结

`current` 作为字段名在 `TDengine` 中正常，在 `MySQL` 中用反引号括起来也正常；然而，当 `TDengine` 集成 `MyBatistPlus` 后，分页查询时，问题出现了。。在 `TDengine` 里用的好好的字段名，却被 `MySQL` 狠狠上了一课。

### Reference

* [https://www.taosdata.com/cn/documentation/taos-sql](https://www.taosdata.com/cn/documentation/taos-sql)
* [MySQL5.7的关键字与保留字](https://dev.mysql.com/doc/refman/5.7/en/keywords.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
