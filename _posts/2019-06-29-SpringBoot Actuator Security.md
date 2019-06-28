---
layout: post
title: SpringBoot Admin 实现Actuator端点可视化监控（开启认证）
tags: SpringBoot
---

### 简介

之前一篇文章介绍了[SpringBoot Admin 实现Actuator端点可视化监控](https://blog.csdn.net/u013810234/article/details/93892607)， 但是没有进行认证， 基本就是“裸奔”， 这在生产环境中是绝对不允许的！ 

下面， 从开启客户端Actuator认证， 到开启SpringBoot Admin认证， 一步一步配置， 每配一步， 检查对应的效果。 

Note: 

- SpringBoot版本： `2.1.4` 
- SpringBoot Admin版本： `2.1.5` 

### 客户端认证： SpringBoot应用开启Actuator认证

- 在Maven的pom.xml文件中添加 `spring-boot-starter-security` 依赖： 

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

- 配置 `Spring Security` 认证信息

```yml
spring:
  security:
    user:
      name: user
      password: password
```

- 测试客户端认证

此时访问 `http://localhost:9000` ， 显示如下 `Spring Security` 默认的登录页面

![2019-06-28-SpringBootClientLogin.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootClientLogin.png)

- 测试管理端监控信息

访问 `http://localhost:8000` ， 发现获取到的数据并不完整， 这是因为客户的应用虽然注册到了管理端， 但是管理端并未获得客户端的认证。 。 

![2019-06-28-SpringBootAdmin1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootAdmin1.png)

在 `application.yml` 中增加当前实例注册到管理端的认证信息， 主要是metadata下的 `user.name` 与 `user.password` ; 

```yml
management:
  endpoints:
    web:
      exposure:
        include: "*"
        exclude: env,beans
  endpoint:        
    health:
      show-details: always # 访问/actuator/health时，显示详细信息，而不是仅仅显示"status": "UP"

spring:
  security:
    user:
      name: user
      password: password
  boot:
    admin:
      client:
        url: http://localhost:8000
        instance:
          name: ReactiveCrud
          metadata: # 这个name与password用于在注册到管理端时，使管理端有权限获取客户端端点数据
            user.name: ${spring.security.user.name}
            user.password: ${spring.security.user.password}
```

再次访问 `http://localhost:8000` ， 得到如下信息： 

![2019-06-28-SpringBootAdmin2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootAdmin2.png)

### 管理端： SpringBoot Admin开启认证

以上， 客户端的Actuator通过 `Spring Security` 开启认证， 而不是让人随便访问， 同理， 管理端也不应该暴露在公网上。 

- 同样， 在Maven的pom.xml文件中添加 `spring-boot-starter-security` 依赖： 

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

- 配置 `Spring Security` 认证信息

```yml
spring:
  security:
    user:
      name: admin
      password: admin
```

- 添加 `Spring Security` 认证路由

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import de.codecentric.boot.admin.server.config.AdminServerProperties;

@Configuration
public class SecuritySecureConfig extends WebSecurityConfigurerAdapter {
    private final String adminContextPath;

    public SecuritySecureConfig(AdminServerProperties adminServerProperties) {
        this.adminContextPath = adminServerProperties.getContextPath();
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        SavedRequestAwareAuthenticationSuccessHandler successHandler = new SavedRequestAwareAuthenticationSuccessHandler();
        successHandler.setTargetUrlParameter("redirectTo");
        successHandler.setDefaultTargetUrl(adminContextPath + "/");

        http.authorizeRequests().antMatchers(adminContextPath + "/assets/**").permitAll()
                .antMatchers(adminContextPath + "/login").permitAll().anyRequest().authenticated().and().formLogin()
                .loginPage(adminContextPath + "/login").successHandler(successHandler).and().logout()
                .logoutUrl(adminContextPath + "/logout").and().httpBasic().and().csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringAntMatchers(adminContextPath + "/instances", adminContextPath + "/actuator/**");
    }
}
```

- 管理端登录 `http://localhost:8000` 

![2019-06-28-SpringBootAdminLogin.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootAdminLogin.png)

输入配置的用户信息后， 登录后发现， 页面是空的， 即没有任何应用注册上来！ ！ 这时， 由于管理端开启了认证， 那么客户端要想注册上来， 也必须提供认证信息。 。 

在客户端的 `application.yml` 中（注意， 是在客户端的配置文件）添加： 

![2019-06-28-SpringBootAdminClient.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootAdminClient.png)

最后， 登录管理端 `http://localhost:8000` ， 成功后的信息如下， 注意右上角的用户信息： 

![2019-06-28-SpringBootAdminMonitor.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-28-SpringBootAdminMonitor.png)

### 附： 客户端 `application.yml` 完整配置

```yml
server:
  port: 9000

management:
  endpoints:
    web:
      exposure:
        include: "*"
        exclude: env,beans
  endpoint:        
    health:
      show-details: always

spring:
  security:
    user:
      name: user
      password: password
  boot:
    admin:
      client:
        url: http://localhost:8000
        username: admin # 这个username与password用于注册到管理端，使其通过认证
        password: admin
        instance:
          name: ReactiveCrud
          metadata: # 这个name与password用于在注册到管理端时，使管理端有权限获取客户端端点数据
            user.name: ${spring.security.user.name}
            user.password: ${spring.security.user.password}

info:
  app:
    name: chapter-mogo
```

### 附： 管理端 `application.yml` 完整配置

```yml
server:
  port: 8000

spring:
  security:
    user:
      name: admin
      password: admin
```

### References

[http://codecentric.github.io/spring-boot-admin/2.1.4/#_securing_spring_boot_admin_server](http://codecentric.github.io/spring-boot-admin/2.1.4/#_securing_spring_boot_admin_server)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
