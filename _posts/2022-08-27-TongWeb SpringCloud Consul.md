---
layout: post
title: 信创迁移适配实战-SpringBoot服务以war包部署后无法注册到Consul
tags: TongWeb, SpringBoot, SpringCloud
---

## 背景

[信创迁移适配实战-SpringBoot项目打包war部署至TongWeb7](https://blog.csdn.net/u013810234/article/details/123936929)中的实践通过排除默认的 `Tomcat` ，打 `war` 包，重写启动类等步骤将 `SpringBoot` 项目打包 `war` 部署至 `TongWeb7` 。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

如果使用的是基于 `Spring Cloud` 的微服务架构， `Consul` 作为服务注册中心，除了上述步骤，还需要添加以下配置类，将服务注册至 `Consul` 注册中心，否则服务虽然正常启动，且没有任何报错信息，但是并没有注册到 `Consul` 。。

Note：这个问题源于一个读者：后端包括网关服务一共四个，一开始四个都部署失败，目前部署上去两个但点击http接口访问都是404， `Consul` 集群也没发现这两个服务。

![2022-08-27-Consul.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-27-Consul.jpg)

## 注册Consul

`Consul` 的源码仓库 `spring-cloud-consul` 中已经有相关的 `Issue` ，并且有大神给出了解决方案。新增一个关于 `Consul` 的配置类。自定义获取获取外部容器端口的方法，然后监听应用启动事件，当应用被启动时，获取外部容器启动的端口号，然后将这个 `port` 设置到 `ConsulAutoServiceRegistration` 中。

![2022-08-27-ConsulRegister.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-27-ConsulRegister.jpg)

```java
@Configuration
@ConditionalOnConsulEnabled
@ConditionalOnMissingBean(type= "org.springframework.cloud.consul.discovery.ConsulLifecycle")
@AutoConfigurationAfter(ConsulAutoServiceRegistrationAutoConfiguration.class)
public class MyConsulLifecycle implements ApplicationContextAware {

     @Autowired(required=false)
     private ConsulAutoServiceRegistration registration;

     @Autowired
     private Environment environment;

    public void setApplicationContext(ApplicationContext context) throws BeansException {
       if (registration !=null){
          String portNumber = environment.getProperty("server.port");
          registration.setPort(Integer.parseInt(portNumber));
          registration.start();
       }
    }
}
```

## Reference

[https://github.com/spring-cloud/spring-cloud-consul/issues/302#issuecomment-342340582](https://github.com/spring-cloud/spring-cloud-consul/issues/302#issuecomment-342340582)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
