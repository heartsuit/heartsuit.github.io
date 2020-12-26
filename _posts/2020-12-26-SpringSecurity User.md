---
layout: post
title: 7-SpringSecurity：获取已登录的用户信息
tags: SpringBoot, SpringSecurity
---

### 背景

本系列教程，是作为团队内部的培训资料准备的。主要以实验的方式来体验 `SpringSecurity` 的各项Feature。

用户登录成功之后，我们便可以拿到用户的基本信息：用户名、权限等。

* 有几种方法可以确定用户是谁。以下是一些最常见的方法：
    - 使用 SecurityContext 获取安全上下文
    - 将主体对象注入控制器方法
    - 将身份验证对象注入控制器方法
    - 使用 @AuthenticationPrincipal 注解的方法

直接在[上个实验](https://blog.csdn.net/u013810234/article/details/111657815)的项目 `springboot-security-db` 中进行实验 ，核心依赖为 `Web` , `SpringSecurity` , `Thymeleaf` 及 `MyBatis` ：

``` xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>
            <dependency>
        <groupId>org.mybatis.spring.boot</groupId>
        <artifactId>mybatis-spring-boot-starter</artifactId>
        <version>2.1.1</version>
    </dependency>
    <dependency>
        <groupId>com.alibaba</groupId>
        <artifactId>druid</artifactId>
        <version>1.1.21</version>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 实验0：SecurityContext

`SecurityContextHolder.getContext().getAuthentication()` 可用于获取已认证的用户信息，它可以在应用程序的任何地方使用，而不仅仅是在控制器的处理程序方法中。

``` java
@GetMapping(value = "/")
@ResponseBody
public String home() {
    log.info(SecurityContextHolder.getContext().getAuthentication().toString());
    return "Welcome " + SecurityContextHolder.getContext().getAuthentication();
}
```

接口响应：

> Welcome org. springframework. security. authentication. UsernamePasswordAuthenticationToken@89d31be5: Principal: UserDto(id=1, username=dev, password=$2a$10$IwyZkXIDuMJjmwBGyBuzlOKbpPN7cwL5sjWnYuSbWN9jL7lR9mv. a, realname=开发人员, mobile=null, enabled=true, accountNonExpired=true, accountNonLocked=true, credentialsNonExpired=true, authorities=[p1, p2]); Credentials: [PROTECTED]; Authenticated: true; Details: org. springframework. security. web. authentication. WebAuthenticationDetails@957e: RemoteIpAddress: 127. 0. 0. 1; SessionId: 77882B1C1B69281C444F4FAC19035470; Granted Authorities: p1, p2

### 实验1：Principal

接收 `java.security.Principal` 作为参数。

``` java
@GetMapping(value = "/")
@ResponseBody
public String home(Principal principal) {
    log.info(principal.toString());
    return "Welcome " + principal.toString();
}
```

接口响应：

> Welcome org. springframework. security. authentication. UsernamePasswordAuthenticationToken@89d31be5: Principal: UserDto(id=1, username=dev, password=$2a$10$IwyZkXIDuMJjmwBGyBuzlOKbpPN7cwL5sjWnYuSbWN9jL7lR9mv. a, realname=开发人员, mobile=null, enabled=true, accountNonExpired=true, accountNonLocked=true, credentialsNonExpired=true, authorities=[p1, p2]); Credentials: [PROTECTED]; Authenticated: true; Details: org. springframework. security. web. authentication. WebAuthenticationDetails@957e: RemoteIpAddress: 127. 0. 0. 1; SessionId: 77882B1C1B69281C444F4FAC19035470; Granted Authorities: p1, p2

### 实验2：Authentication

接收 `Authentication` 对象作为参数， `getPrincipal()` 方法返回一个 `java.util.Object` ，因此在使用时需要进行强制转换。

``` java
@GetMapping(value = "/")
@ResponseBody
public String home(Authentication authentication) {
    log.info(authentication.getPrincipal().toString());
    return "Welcome " + authentication.getPrincipal().toString();
}
```

接口响应：

> Welcome UserDto(id=1, username=dev, password=$2a$10$IwyZkXIDuMJjmwBGyBuzlOKbpPN7cwL5sjWnYuSbWN9jL7lR9mv. a, realname=开发人员, mobile=null, enabled=true, accountNonExpired=true, accountNonLocked=true, credentialsNonExpired=true, authorities=[p1, p2])

### 实验3：@AuthenticationPrincipal

当然，最理想的解决方案是直接拿来`User`对象来用，那么使用 `@AuthenticationPrincipal` 对其进行注解，以便它成为身份验证的主体。

``` java
@GetMapping(value = "/")
@ResponseBody
public String home(@AuthenticationPrincipal UserDto user) {
    log.info(user.toString());
    return "Welcome " + user.toString();
}
```

接口响应：

> Welcome UserDto(id=1, username=dev, password=$2a$10$IwyZkXIDuMJjmwBGyBuzlOKbpPN7cwL5sjWnYuSbWN9jL7lR9mv. a, realname=开发人员, mobile=null, enabled=true, accountNonExpired=true, accountNonLocked=true, credentialsNonExpired=true, authorities=[p1, p2])

### Reference

* [Source Code: Github](https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-security)
* [SpringSecurity官方文档](https://docs.spring.io/spring-security/site/docs/5.4.1/reference/html5/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
