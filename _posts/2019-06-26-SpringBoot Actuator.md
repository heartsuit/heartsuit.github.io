---
layout: post
title: SpringBoot2开启Actuator端点监控
tags: SpringBoot
---

SpringBoot本身提供了一套监控端点， 可以查看应用的基本信息、 健康程度、 配置等监控信息， 很容易上手。 

Note: 此处所用SpringBoot版本： `2.1.4` 

### 开启Actuator

在Maven的pom.xml文件中添加 `spring-boot-starter-actuator` 依赖： 

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

直接运行项目， 在后端控制台会看到以下输出： 

    2019 - 06 - 26 18: 07: 27.896 INFO 7868-- - [restartedMain] o.s.b.a.e.web.EndpointLinksResolver: Exposing 2 endpoint(s) beneath base path '/actuator'

在浏览器访问 `http://localhost:9000/actuator` ， 结果如下： 

![2019-06-26-SpringBootActuator1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-26-SpringBootActuator1.png)

即SpringBoot2.0的actuator启动端点监控web端默认加载默认仅info, health两个可见的端点（除了actuator本身之外）， 见[官方文档说明](https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-endpoints.html#production-ready-endpoints-exposing-endpoints)

### 暴露其他端点（与SpringBoot 2.0之前的配置不太一样）

```yml
management:
  endpoints:
    web:
      exposure:
        include: "*"
        exclude: env,beans
```

以上配置暴露了除 `env` , `beans` 之外的所有端点； 修改配置后， 在后端控制台会看到以下输出： 

    2019 - 06 - 26 18: 16: 03.951 INFO 7868-- - [restartedMain] o.s.b.a.e.web.EndpointLinksResolver: Exposing 13 endpoint(s) beneath base path '/actuator'

再次在浏览器访问 `http://localhost:9000/actuator` ， 结果如下： 

![2019-06-26-SpringBootActuator2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-26-SpringBootActuator2.png)

Notes： 

- 虽然端点 `enabled` ， 但是还需要 `exposed` ， 才能在Web端访问； 
- `health` 端点在默认情况下， 仅显示 `"status": "UP"` ； 如需显示详细信息， 配置： `management.endpoint.health.show-details=always` 
- 实际中， 请谨慎选择要开启的端点！ 

以上配置仅实现了对应用监控信息的获取， 但其实已经有专门用于展现这些 `json` 数据的管理端， 后续将实践一下SpringBoot Admin这套社区提供的可视化应用监控管理端。 
SpringBoot Admin 文档对自己的介绍： 

    codecentric’ s Spring Boot Admin is a community project to manage and monitor your Spring Boot® applications.The applications register with our Spring Boot Admin Client(via HTTP) or are discovered using Spring Cloud®(e.g.Eureka, Consul).The UI is just a Vue.js application on top of the Spring Boot Actuator endpoints.

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
