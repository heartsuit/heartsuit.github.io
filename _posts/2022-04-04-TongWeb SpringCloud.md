---
layout: post
title: 信创迁移适配实战-SpringCloudAlibaba服务以war包部署后无法注册到Nacos
tags: TongWeb, SpringBoot, SpringCloud
---

## 背景

[信创迁移适配实战-SpringBoot项目打包war部署至TongWeb7](https://blog.csdn.net/u013810234/article/details/123936929)中的实践通过排除默认的 `Tomcat` ，打 `war` 包，重写启动类等步骤将 `SpringBoot` 项目打包 `war` 部署至 `TongWeb7` 。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

如果使用的是基于 `Spring Cloud Alibaba` 的微服务架构，除了上述步骤，还需要添加以下配置类，将服务注册至 `Naocs` 注册中心，否则服务虽然正常启动，且没有任何报错信息，但是并没有注册到 `Naocs` 。。

## 注册Naocs

新增一个关于 `Naocs` 的配置类。自定义获取获取外部容器端口的方法，然后监听应用启动事件，当应用被启动时，获取外部容器启动的端口号，然后将这个 `port` 设置到 `NacosAutoServiceReigistration` 中。

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

## 业务服务正常，但是日志中持续报错

> java.lang.NoClassDefFoundError: com/alibaba/nacos/shaded/com/google/common/util/concurrent/AbstractFuture$Failure$1

经过排查后发现，这个错误是由于之前升级了`Nacos`(2.0.4)，但是后端服务中的nacos-client（2.0.3）没有同步修改版本导致的。

## Reference

- [https://blog.csdn.net/qq_28379809/article/details/103773149](https://blog.csdn.net/qq_28379809/article/details/103773149)

- [https://github.com/alibaba/nacos/issues/7435](https://github.com/alibaba/nacos/issues/7435)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
