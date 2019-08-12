---
layout: post
title: A bean with that name has already been defined in class path resource [com/alibaba/druid/spring/boot/autoconfigure/DruidDataSourceAutoConfigure.class]
tags: SpringBoot
---

### 报错场景

`Mysql` 配置主从同步后，想实现读写分离，便引入 `Sharding-JDBC` ，但在 `SpringBoot` 集成 `Sharding-JDBC` 时无法启动。

#### 以下版本，正常启动。

- SpringBoot: V2.0.6. RELEASE
- Druid: 1.1.16
- Sharding-JDBC: 4.0.0-RC1

#### 以下版本，报错！

- SpringBoot: V2.1.2. RELEASE
- Druid: 1.1.16
- Sharding-JDBC: 4.0.0-RC1

### 报错信息

    ***************************
    APPLICATION FAILED TO START
    ***************************

    Description:

    The bean 'dataSource', defined in class path resource [org/apache/shardingsphere/shardingjdbc/spring/boot/SpringBootConfiguration.class], could not be registered. A bean with that name has already been defined in class path resource [com/alibaba/druid/spring/boot/autoconfigure/DruidDataSourceAutoConfigure.class] and overriding is disabled.

    Action:

    Consider renaming one of the beans or enabling overriding by setting spring.main.allow-bean-definition-overriding=true

### 解决方法

错误信息提示： `dataSource` 重复定义了。。并提供了一种解决方案：设置 `spring.main.allow-bean-definition-overriding=true` 

然而，这样设置依然没用；仔细分析，SpringBoot本身具有自动配置，现在自动配置时发生冲突了，那么我们可以将冲突的部分排除掉，即告诉SpringBoot，某个类不用帮我自动配置了，这里我们将Druid的关于数据源的配置排除掉： `exclude={DruidDataSourceAutoConfigure.class}` 

``` java
import com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceAutoConfigure;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude={DruidDataSourceAutoConfigure.class})
public class BackendApplicaiton {
	public static void main(String[] args) {
		SpringApplication.run(BackendApplicaiton.class, args);
	}
}
```

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

