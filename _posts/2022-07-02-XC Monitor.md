---
layout: post
title: 信创环境下部署SpringBootAdmin监控服务遇到的问题
tags: 国产化, TongWeb
---

## 背景

就像通常的微服务打包部署至国产化环境中一样，先是做了以下操作：

* [X] 排除默认的Tomcat
* [X] 打war包
* [X] 重写启动类

可是 `war` 打包时报错：

1. 找不到javax.servlet.Filter的类文件；
2. Description:The Bean Validation API is on the classpath but no implementation could be found; Action:Add an implementation, such as Hibernate Validator, to the classpath

## 排除默认的Tomcat

```xml
<!-- SpringBoot Web -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
  <exclusions>
    <exclusion>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-tomcat</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

## 打war包

```xml
<packaging>war</packaging>

    <build>
        <finalName>${project.artifactId}</finalName>
        <plugins>
            <plugin>
                <artifactId>maven-war-plugin</artifactId>
                <version>2.6</version>
                <configuration>
                    <!--如果想在没有web.xml文件的情况下构建WAR，请设置为false。-->
                    <failOnMissingWebXml>false</failOnMissingWebXml>
                </configuration>
            </plugin>
        </plugins>
    </build>
```

## 重写启动类

重写启动类，继承 `SpringBootServletInitializer` 类，重写 `configure` 方法，否则无法检测到启动类。

```java
public class StandardMonitorApplication extends SpringBootServletInitializer
{
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
    return builder.sources(StandardMonitorApplication.class);
    }

    public static void main(String[] args)
    {
        SpringApplication.run(StandardMonitorApplication.class, args);
        System.out.println("(♥◠‿◠)ﾉﾞ  系统模块启动成功   ლ(´ڡ`ლ)ﾞ  ");
    }
}
```

![2022-07-02-Guochan.jpg.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-07-02-Guochan.jpg.jpg)

## 解决错误1：

> 由于使用TongWeb，在 `pom` 文件中排除了 `Tomcat` ，代码中用到了WebSecurityConfigurerAdapter，打包报错：找不到 `javax.servlet.Filter` 的类文件

* 添加依赖：`javaee-api`

```xml
        <dependency>
            <groupId>javax</groupId>
            <artifactId>javaee-api</artifactId>
            <version>7.0</version>
        </dependency>
```

## 解决错误2：

  Description:
  The Bean Validation API is on the classpath but no implementation could be found
  Action:
  Add an implementation, such as Hibernate Validator, to the classpath

* 添加依赖：`hibernate-validator`

```xml
        <dependency>
            <groupId>org.hibernate</groupId>
            <artifactId>hibernate-validator</artifactId>
            <version>5.2.4.Final</version>
        </dependency>
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
