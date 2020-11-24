---
layout: post
title: 更新了SpringBoot版本， SpringBootAdmin的Httptrace不见了
tags: SpringBoot
---

### Background

这两天突然发现`SpringBootAdmin`监控页面左侧菜单的`Web-HttpTraces`不见了；直接访问端点`http://ip:port/../httptrace`，404了，莫名其妙哦(๑°3°๑)

### Analysis

印象里关于监控这里，最近没什么改动，除了一次`SpringBoot`版本的升级。。

去SpringBoot仓库的Issue查看，发现了这一条：[Consider disabling management.trace.http by default](https://github.com/spring-projects/spring-boot/pull/15059)

再去看官方文档：[https://docs.spring.io/spring-boot/docs/2.2.5.RELEASE/reference/html/production-ready-features.html#production-ready-endpoints](https://docs.spring.io/spring-boot/docs/2.2.5.RELEASE/reference/html/production-ready-features.html#production-ready-endpoints)，其中有下面这段话：

    HTTP Tracing can be enabled by providing a bean of type HttpTraceRepository in your application’s configuration. For convenience, Spring Boot offers an InMemoryHttpTraceRepository that stores traces for the last 100 request-response exchanges, by default. InMemoryHttpTraceRepository is limited compared to other tracing solutions and we recommend using it only for development environments. For production environments, use of a production-ready tracing or observability solution, such as Zipkin or Spring Cloud Sleuth, is recommended. Alternatively, create your own HttpTraceRepository that meets your needs.

    The httptrace endpoint can be used to obtain information about the request-response exchanges that are stored in the HttpTraceRepository.

### Solution

解决方案：

- 若想直接在SpringBootAmin中继续查看`Http Traces`，则直接注入`InMemoryHttpTraceRepository`这个Bean即可；

```java
import org.springframework.boot.actuate.trace.http.InMemoryHttpTraceRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringBootAdminConfig
 */
@Configuration
public class SpringBootAdminConfig {

    @Bean
	public InMemoryHttpTraceRepository getInMemoryHttpTrace(){
		return new InMemoryHttpTraceRepository();
	}

}
```

重启后，在`SpringBootAdmin`的监控页面会发现，左侧菜单的`Web-HttpTraces`又回来啦（〜^㉨^)〜

- 从官方文档中可以看出，不建议在生产环境下使用`InMemoryHttpTraceRepository`；在生产环境下，推荐使用第三方组件实现对HttpTraces的监控，比如`Zipkin or Spring Cloud Sleuth`, `Prometheus+Grafana`，或者自己来实现。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***