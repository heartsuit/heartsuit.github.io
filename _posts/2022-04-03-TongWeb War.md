---
layout: post
title: 信创迁移适配实战-SpringBoot项目打包war部署至TongWeb7
tags: TongWeb, SpringBoot, SpringCloud
---

## 背景

将基于 `Spring Cloud Alibaba` 的微服务架构的项目部署至东方通 `TongWeb@7.0.4.3` ， `war` 包部署。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

## 登录控制台

[http://192.168.21.52:9060/console/](http://192.168.21.52:9060/console/)

![2022-04-03-Console.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-03-Console.png)

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
public class StandardSystemApplication extends SpringBootServletInitializer
{
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
    return builder.sources(StandardSystemApplication.class);
    }

    public static void main(String[] args)
    {
        SpringApplication.run(StandardSystemApplication.class, args);
        System.out.println("(♥◠‿◠)ﾉﾞ  系统模块启动成功   ლ(´ڡ`ლ)ﾞ  ");
    }
}
```

## 注册Naocs

如果使用的是基于 `Spring Cloud Alibaba` 的微服务架构，除了上述步骤，还需要添加以下配置类，将服务注册至 `Naocs` 注册中心，否则服务虽然正常启动，没有任何报错信息，但是并没有注册到 `Naocs` 。。

```java
import com.alibaba.cloud.nacos.registry.NacosAutoServiceRegistration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;

import javax.management.MBeanServer;
import javax.management.ObjectName;
import javax.management.Query;
import java.lang.management.ManagementFactory;
import java.util.Set;

/**
 * @Author Heartsuit
 * @Date 2022-03-10
 */
@Configuration
public class NacosConfig implements ApplicationRunner {

    @Autowired(required = false)
    private NacosAutoServiceRegistration registration;

    @Value("${server.port}")
    Integer port;

    @Override
    public void run(ApplicationArguments args) {
        if (registration != null && port != null) {
            Integer tomcatPort = port;
            try {
                tomcatPort = new Integer(getTomcatPort());
            } catch (Exception e) {
                e.printStackTrace();
            }

            registration.setPort(tomcatPort);
            registration.start();
        }
    }

    /**
     * 获取外部tomcat端口
     */
    public String getTomcatPort() throws Exception {
        MBeanServer beanServer = ManagementFactory.getPlatformMBeanServer();
        Set < ObjectName > objectNames = beanServer.queryNames(new ObjectName("*:type=Connector,*"), Query.match(Query.attr("protocol"), Query.value("HTTP/1.1")));
        String port = objectNames.iterator().next().getKeyProperty("port");
        return port;
    }
}
```

## 一个Web容器下部署多个服务

如果想通过在一个 `TongWeb` 下部署多个服务，有两种方案：

1. 采用多通道结合多虚拟主机实现多服务部署；
2. 增加多个域（具体操作参考官方安装部署手册）；

* 多通道

![2022-04-03-MultiChannel.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-03-MultiChannel.png)

* 多虚拟主机

![2022-04-03-MultiVHost.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-03-MultiVHost.png)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
