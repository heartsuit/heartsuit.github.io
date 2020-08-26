---
layout: post
title: 关于`Apache Tomcat存在文件包含漏洞`的整改
tags: SpringBoot
---

### 背景

作为网站负责人，上午接到了来自`省通信管理局`的电话：我们网站存在一个Tomcat任意文件读取的漏洞。What?? 吓死。。

### 整改办法

最直接的办法是升级Tomcat（可直接指定内嵌Tomcat的版本）即可（V9.0.31），这里升级通过SpringBoot的方式自动升级Tomcat版本。

SpringBoot由2.1.2.RELEASE升级至2.2.5.RELEASE

```xml
<parent>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-parent</artifactId>
	<version>2.2.5.RELEASE</version>
	<relativePath /> <!-- lookup parent from repository -->
</parent>
```

刷新依赖，正常情况下，这一步就直接结束了，然而我们项目在仅替换了SpringBoot版本之后出现了问题。。

### 解决问题

1. Redis报错

- Problem：

> java.lang.ClassNotFoundException: redis.clients.jedis.util.SafeEncoder

- Solution：

直接修改jedis版本：`<jedis.version>2.9.0</jedis.version>` 升级为 `<jedis.version>3.1.0</jedis.version>`

```xml
<dependency>
	<groupId>redis.clients</groupId>
	<artifactId>jedis</artifactId>
	<version>${jedis.version}</version> <!-- 可去掉，由SpringBoot自己管理 -->
</dependency>
```

修改导入：import redis.clients.util.SafeEncoder;改为：import redis.clients.jedis.util.SafeEncoder;

2. 循环依赖错误

项目启动时出现了两处循环依赖的问题，A依赖B，B又依赖了A。。这类错误会被Spring检测到，如下：

- Problem：

> ERROR org.springframework.boot.SpringApplication - Application run failed
org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'wxOpenidUtil': Injection of resource dependencies failed; nested exception is org.springframework.beans.factory.BeanCurrentlyInCreationException: Error creating bean with name 'wxOpenidServiceImpl': Bean with name 'wxOpenidServiceImpl' has been injected into other beans [wxOpenidServiceImpl] in its raw version as part of a circular reference, but has eventually been wrapped. This means that said other beans do not use the final
version of the bean. This is often the result of over-eager type matching - consider using 'getBeanNamesOfType' with the 'allowEagerInit' flag turned off, for example.

> ERROR org.springframework.boot.SpringApplication - Application run failed
org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'sysUserService': Bean with name 'sysUserService' has been injected into other beans [sysRoleService] in its raw version as part of a circular reference, but has eventually been wrapped. This means that said other beans do not use the final version of the bean. This is often the result of over-eager type matching - consider using 'getBeanNamesOfType' with the 'allowEagerInit' flag turned off, for example.

- Solution：

1. 可在代码层面解决这类问题，即对依赖对象的方法重新在自己的类内实现一遍；
2. 在B中依赖A的地方使用@Lazy注解，实现Spring注入bean的策略调整；

至此，关于`Apache Tomcat存在文件包含漏洞`的整改完毕。

- 整改前

![2020-08-26-TomcatBefore.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-26-TomcatBefore.png)

- 整改后

![2020-08-26-TomcatAfter.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-26-TomcatAfter.png)

### 总结

实际上，通过`国家信息安全漏洞共享平台`可知，这个漏洞在年初2月份（疫情。。）就公布了，但直到8月份才接到通信管理局的告知电话，说明了我们自身对信息安全的忽视。。

### Reference

[国家信息安全漏洞共享平台](https://www.cnvd.org.cn/webinfo/show/5415)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***