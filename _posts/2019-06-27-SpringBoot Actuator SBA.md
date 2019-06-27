---
layout: post
title: SpringBoot Admin 实现Actuator端点可视化监控
tags: Nginx
---

### 简介

Actuator可视化监控SpringBoot Admin 

Note: 

- SpringBoot版本： `2.1.4` 
- SpringBoot Admin版本： `2.1.5` 

### Spring Boot Admin Server

- 单独建一个Spring Boot Admin Server工程作为服务端

- 在Maven的pom.xml文件中添加 `spring-boot-admin-server` 与 `spring-boot-admin-server-ui` 依赖： 

```xml
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-server</artifactId>
    <version>2.1.5</version>
</dependency>
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-server-ui</artifactId>
    <version>2.1.5</version>
</dependency>
```

- 在主类上添加注解启用Spring Boot Admin

```java
@EnableAdminServer
@SpringBootApplication
public class AdminApplication {

	public static void main(String[] args) {
		SpringApplication.run(AdminApplication.class, args);
	}

}
```

到此， Spring Boot Admin服务端工程建立完毕， 在浏览器访问 `http://localhost:8000` ， 打开管理页面， 目前没有客户端实例注册过来，显示为空。 接下来建立客户端工程。 

### Spring Boot Admin Client

- 建一个Spring Boot工程

- 在Maven的pom.xml文件中添加 `spring-boot-admin-starter-client` 依赖： 

```xml
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-starter-client</artifactId>
    <version>2.1.5</version>
</dependency>	
```

- `application.yml` 配置： 1. 暴露指定端口; 2. 注册到Spring Boot Admin服务端

```java
management:
  endpoints:
    web:
      exposure:
        include: "*"
        exclude: env,beans

spring:
  boot:
    admin:
      client:
        url: http://localhost:8000
        instance:
          name: ReactiveCrud
```

Note: 当然这里首先要开启项目的Actuator端点监控功能， 可参考[SpringBoot2开启Actuator端点监控](https://blog.csdn.net/u013810234/article/details/93764101)

### 启动客户端， 在管理端进行可视化端点监控

- Journal

启动客户端后， 会在 `Journal` 页面看到客户端注册到管理端发生的各类事件； 

![2019-06-27-SpringBootAdminJournal.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-27-SpringBootAdminJournal.png)

- WallBoard-->Details

在首页可以查看所有已注册到管理端的实例， 点击跳转到实例监控详情

![2019-06-27-SpringBootAdminWallBoard.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-27-SpringBootAdminWallBoard.png)

![2019-06-27-SpringBootAdminDetails.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-27-SpringBootAdminDetails.png)

以上通过 `Spring Boot Admin` 实现了对Spring Boot暴露的 `Actuator` 端点的可视化监控， 对于详细的端点信息， 以及 `Spring Boot Admin` 的其他配置， 可参考相关文档。 后续增加认证功能， 即需要用户登录才能进入管理端。 

### References： 

- [https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-endpoints.html](https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-endpoints.html)
- [http://codecentric.github.io/spring-boot-admin/2.1.4/#securing-spring-boot-admin](http://codecentric.github.io/spring-boot-admin/2.1.4/#securing-spring-boot-admin)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
