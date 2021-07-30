---
layout: post
title: 5-TDengine集成SpringBoot，MyBatis，MyBatisPlus
tags: TDengine
---

### 背景

前面的体验中，用到了 `taos` 的客户端、 `RESTful Connector` 以及 `JDBC-JNI` 等连接方式，这次我们体验下更接近实际应用场景的示例： `TDengine` 与 `SpringBoot` ， `MyBatis` ， `MyBatisPlus` 等的集成。

官方已经自带了示例， `https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC` ；这些示例在安装的客户端目录也有： `/usr/local/taos/examples/JDBC` 或者 `C:\TDengine\examples\JDBC` ，我把这些示例都跑了一遍，大体都可以跑起来，但是也存在一些问题或bug，尤其是一些测试用例不太严谨。我把改过的示例放到了我的GitHub上，修改的地方与说明在README.md中。

| No.  |        Name        | Describe                                                     |
| :--: | :----------------: | ------------------------------------------------------------ |
|  1   |      JDBCDemo      | Example codes for JDBC-JNI, JDBC-RESTful, Subscribe          |
|  2   |  connectionPools   | Example codes for HikariCP, Druid, dbcp, c3p0 connection pools |
|  3   | SpringJdbcTemplate | Example codes for spring jdbcTemplate                        |
|  4   |  mybatisplus-demo  | Example codes for mybatis                                    |
|  5   |   springbootdemo   | Example codes for springboot                                 |
|  6   |      taosdemo      | This is an internal tool for testing Our JDBC-JNI, JDBC-RESTful, RESTful interfaces |

### SpringBoot+TDengine+MyBatis

示例内容基本上就是建库、建表、插入数据，具体看代码即可。下面只列一下遇到的问题以及解决方法。

* 依赖版本与服务端相兼容

```xml
<dependency>
    <groupId>com.taosdata.jdbc</groupId>
    <artifactId>taos-jdbcdriver</artifactId>
    <version>2.0.28</version>
</dependency>
```

修改为：

```xml
<dependency>
    <groupId>com.taosdata.jdbc</groupId>
    <artifactId>taos-jdbcdriver</artifactId>
    <version>2.0.28</version>
</dependency>
```

如果不修改依赖版本，当与服务端版本不一致时，则报错：

> ### Cause: java.sql. SQLException: TDengine ERROR (216): Syntax error in SQL; uncategorized SQLException; SQL state []; error code [534]; TDengine ERROR (216): Syntax error in SQL; nested exception is java.sql. SQLException: TDengine ERROR (216): Syntax error in SQL] with root cause

关于版本兼容性说明，见官方这个表（我的服务端TDengine版本为：2.1.2.0）：

![2021-07-27-VersionCompatiable.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-VersionCompatiable.jpg)

* TDengine批量插入数据遇到bug

这里用三种方式写了批量插入的语句（这里仅选择一个普通表批量插入，后续实现动态向多个普通表中批量插入数据），但是有一种写法按道理是正确的，但实际就是报错，懵逼一脸，经过调试，应该是个bug。。

第一种：使用后端sql语句中的时间戳作为主键，now+步长

```xml
        <insert id="insertBatch" parameterType="java.util.List">
            insert into demo.t0 (ts, temperature, humidity) values
            <foreach separator=" " collection="list" item="weather" index="index" >
                <!-- 参考涛思数据官方文档：https://www.taosdata.com/cn/documentation/taos-sql#data-type
                数字后面的时间单位可以是 u(微秒)、a(毫秒)、s(秒)、m(分)、h(小时)、d(天)、w(周)
                在指定降频操作（down sampling）的时间窗口（interval）时，时间单位还可以使用 n(自然月) 和 y(自然年)。-->
                (now + #{index}a, #{weather.temperature}, #{weather.humidity})
            </foreach>
        </insert>
```

Note: `(now + #{index}a, #{weather.temperature}, #{weather.humidity})` 这样的写法，让我一度怀疑是不是不小心打错了，多打了个字母a。。

第二种：使用前端传参列表中的时间戳作为主键，表名在循环体外，这种方法报错，应该是个bug。。

```xml
<!--用这种写法，直接使用前端传过来的时间戳，报错：uncategorized SQLException; SQL state []; error code [534]; TDengine ERROR (216): Syntax error in SQL; -->
    <insert id="insertBatch" parameterType="java.util.List">
        insert into demo.t0 (ts, temperature, humidity) values
        <foreach separator=" " collection="list" item="weather" index="index">
            (#{weather.ts}, #{weather.temperature}, #{weather.humidity})
        </foreach>
    </insert>
```

第一种方法可以，第二种就不行，让人怀疑人生。。然后就跟着调试了一番。

![2021-07-30-BatchInsertError](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-30-BatchInsertError)

![2021-07-30-Postman.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-30-Postman.jpg)

![2021-07-30-DebugErrorSQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-30-DebugErrorSQL.jpg)

![2021-07-30-DebugUtils.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-30-DebugUtils.jpg)

结果：在批量插入时，第二条记录的时间戳竟然没有自动加上引号，导致报错。。

第三种：使用前端传参列表中的时间戳作为主键，表名在循环体内，批量插入成功~

```xml
        <insert id="insertBatch" parameterType="java.util.List">
            insert into
            <foreach separator=" " collection="list" item="weather" index="index">
                demo.t0 values
                (#{weather.ts}, #{weather.temperature}, #{weather.humidity})
            </foreach>
        </insert>
```

附： `Postman` 里的批量数据传参方式（向后端传递一个数组类型的参数）：

```bash
curl --location --request POST 'localhost:8080/weather/batch' \
--header 'Content-Type: application/json' \
--data-raw '[
    {
        "ts": 1626324781093,
        "temperature": 30.00000,
        "humidity": 99.00000
    },
    {
        "ts": 1626324981322,
        "temperature": 9.50609,
        "humidity": 10.00000
    }
]'

# 或者（换了传递的时间戳格式）：
curl --location --request POST 'localhost:8080/weather/batch' \
--header 'Content-Type: application/json' \
--data-raw '[
    {
        "ts": "2021-07-19 14:53:01.093",
        "temperature": 30.00000,
        "humidity": 99.00000
    },
    {
        "ts": "2021-07-19 14:53:01.200",
        "temperature": 9.50609,
        "humidity": 10.00000
    }
]'
```

Note: 我用的这个版本，已经不允许往超级表中直接插入数据了，但示例代码自带的README.md中还是这样写的： `insert into test.weather (ts, temperature, humidity) values` ，总之，文档不太严谨。。

### SpringBoot+TDengine+MyBatisPlus

* 依赖修改

同样，不贴源码了，下面只列一下遇到的问题以及解决方法。

1. 删除了h2依赖

2. druid依赖替换为starter

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.1.17</version>
</dependency>
```

3. 升级了`taos-jdbcdriver`依赖版本

```xml
<dependency>
    <groupId>com.taosdata.jdbc</groupId>
    <artifactId>taos-jdbcdriver</artifactId>
    <version>2.0.30</version>
</dependency>
```

* 配置修改

user: root
改为：
username: root

不过这里改不改都不影响结果，就比较奇怪。。

* 代码修改

循环生成记录时，时间戳应考虑递增，而不是所有记录使用同一个时间戳，这样会导致覆盖、或者丢弃（依赖于数据库的配置）。

 `TemperatureMapperTest.java`

```java
    // insert into table
    int affectRows = 0;
    // insert 10 tables
    for (int i = 0; i < 10; i++) {
        // each table insert 5 rows
        for (int j = 0; j < 5; j++) {
            Temperature one = new Temperature();
            // 如果是插入单条记录，这样写没问题，可这里是在循环体里，TDengine表中时间戳为主键，相同的时间戳会发生覆盖，导致最终插入的记录数量与预期不符
            one.setTs(new Timestamp(1605024000000l));
            one.setTemperature(random.nextFloat() * 50);
            one.setLocation("望京");
            one.setTbIndex(i);
            affectRows += mapper.insertOne(one);
        }
    }
    Assert.assertEquals(50, affectRows);
```

改为

```java
    // insert into table
    int affectRows = 0;
    long ts = System.currentTimeMillis();
    // insert 10 tables
    for (int i = 0; i < 10; i++) {
        // each table insert 5 rows
        for (int j = 0; j < 5; j++) {
            Temperature one = new Temperature();
            // 如果是插入单条记录，这样写没问题，可这里是在循环体里，TDengine表中时间戳为主键，相同的时间戳会发生覆盖，导致最终插入的记录数量与预期不符
//                one.setTs(new Timestamp(1605024000000l));
            Timestamp timestamp = new Timestamp(ts + j);
            one.setTs(timestamp);
            one.setTemperature(random.nextFloat() * 50);
            one.setLocation("望京");
            one.setTbIndex(i);
            affectRows += mapper.insertOne(one);
        }
    }
    Assert.assertEquals(50, affectRows);
```

### Source Code

* [https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-tdengine](https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-tdengine)

### Reference

* [https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC](https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
