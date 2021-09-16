---
layout: post
title: 10-TDengine之SpringBoot读取的时间与数据库中存储的时间相差8小时
tags: TDengine
---

### 背景

一开始的配置内容如下，重点关注数据库连接时的 `timezone` ，这也是 `TDengine` 官方集成 `MyBatisPlus` 时的 `demo` 里的配置方式；

```yaml
spring:
  datasource:
    driver-class-name: com.taosdata.jdbc.TSDBDriver
    url: jdbc:TAOS://hadoop1:6030/iot?charset=UTF-8&locale=en_US.UTF-8&timezone=UTC-8
    username: root
    password: taosdata
```

另外，为了表示数据精度，我在实体类上配置了日期时间格式以及时区；

```java
@Data
public class Power {
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss.SSS", timezone = "GMT+8")
    private Timestamp ts;
    private Integer voltage;
    ...
}
```

使用以上配置后，凡是直接返回实体类，或者使用 `resultMap` 映射为实体类的接口响应中时间都正常；
但是当使用 `resultType="java.util.Map"` 方式直接返回数据库中结果后，发现接口返回中的时间与数据库中的时间相比慢了8小时。

![2021-09-16-Timezone.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-16-Timezone.jpg)

### 接口返回中的时间与数据库中的时间相比快了8小时

接着，我改了数据库连接中的 `timezone=GMT+8` ，发现接口返回中的时间与数据库中的时间相比竟然快了8小时。

```yaml
spring:
  datasource:
    driver-class-name: com.taosdata.jdbc.TSDBDriver
    url: jdbc:TAOS://hadoop1:6030/iot?charset=UTF-8&locale=en_US.UTF-8&timezone=GMT+8
    username: root
    password: taosdata
```

### 接口返回中的时间与数据库中的时间一致

* 方法一

继续修改数据库连接中的 `timezone=GMT%2b8` ，即把上一种方法的+为 `%2b` ，发现接口返回中的时间与数据库中的时间相一致。

```yaml
spring:
  datasource:
    driver-class-name: com.taosdata.jdbc.TSDBDriver
    url: jdbc:TAOS://hadoop1:6030/iot?charset=UTF-8&locale=en_US.UTF-8&timezone=GMT%2b8
    username: root
    password: taosdata
```

* 方法二

也可以将数据库连接中的 `timezone=Shanghai` ，这与我们使用 `MySQL` 数据库连接时一样，发现接口返回中的时间与数据库中的时间相一致。

```yaml
spring:
  datasource:
    driver-class-name: com.taosdata.jdbc.TSDBDriver
    url: jdbc:TAOS://hadoop1:6030/iot?charset=UTF-8&locale=en_US.UTF-8&timezone=Shanghai
    username: root
    password: taosdata
```

* 方法三

依然采用 `timezone=UTC-8` ，不过增加全局的 `jackson` 时区配置，发现接口返回中的时间与数据库中的时间相一致。

```yaml
spring:
  datasource:
    driver-class-name: com.taosdata.jdbc.TSDBDriver
    url: jdbc:TAOS://hadoop1:6030/iot?charset=UTF-8&locale=en_US.UTF-8&timezone=UTC-8
    username: root
    password: taosdata
  jackson:
    time-zone: GMT+8
```

### Reference

[https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC](https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
