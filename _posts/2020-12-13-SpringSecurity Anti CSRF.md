---
layout: post
title: 4-SpringSecurity：CSRF防护
tags: SpringBoot,SpringSecurity
---

### 背景

本系列教程，是作为团队内部的培训资料准备的。主要以实验的方式来体验`SpringSecurity`的各项Feature。

接着上一篇文章[3-SpringSecurity：自定义Form表单](https://blog.csdn.net/u013810234/article/details/111054094)中的项目：`spring-security-form`，继续演示开启`CSRF`防护的场景（当时关闭了CSRF：.csrf().disable()）。

依赖不变，核心依赖为`Web`与`Thymeleaf`：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
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

从官网中可以知道，CSRF防护的关键在于我们发请求时附带一个随机数（CSRF token），而这个随机数不会被浏览器自动携带（eg: Cookie就会被浏览器自动带上）。

![2020-12-13-AntiCSRF.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-AntiCSRF.png)

### 实验0：登录时的CSRF防护

显然，我们这里的登录请求是个`POST`方法（`SpringSecurity`默认忽略"GET", "HEAD", "TRACE", "OPTIONS"等幂等请求的`CSRF`拦截）。登录时必须携带`_csrf`参数，与认证信息一并提交，否则报403。

- 后端安全配置（默认开启`CSRF`）
```java
@Override
protected void configure(HttpSecurity http) throws Exception {
    http.authorizeRequests()
            .antMatchers("/user/add").hasAuthority("p1")
            .antMatchers("/user/query").hasAuthority("p2")
            .antMatchers("/user/**").authenticated()
            .anyRequest().permitAll() // Let other request pass
            .and()
            // .csrf().disable() // turn off csrf, or will be 403 forbidden
            .formLogin() // Support form and HTTPBasic
            .loginPage("/login")
            .failureHandler(new AuthenticationFailureHandler(){
                @Override
                public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
                    exception.printStackTrace();
                    request.getRequestDispatcher(request.getRequestURL().toString()).forward(request, response);
                }
            });            
}
```

- 前端模板（新增了`_csrf`参数）：

```html
<form action="login" method="post">
    <span>用户名</span><input type="text" name="username" /> <br>
    <span>密码</span><input type="password" name="password" /> <br>
    <span>csrf token</span><input type="text" th:name="${_csrf.parameterName}" th:value="${_csrf.token}"/> <br>
    <input type="submit" value="登录">
</form>
```
Note: 
1. 当然，实际中可以将新增的`_csrf`参数作为一个隐藏域进行提交：`<input type="text" th:name="${_csrf.parameterName}" th:value="${_csrf.token}" hidden/>`
2. 其实，如果我们使用默认的登录页面，可以在页面元素中看到同样有个隐藏域：

![2020-12-13-CSRFHidden.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-CSRFHidden.png)

### 实验1：POST接口CSRF防护

通过form表单是一种发送POST请求的方式，但我们其他的请求不可能都通过form表单来提交。下面通过原生的JavaScript发起Ajax的POST请求。

- 后端接口

```java
@Controller
public class HelloController {
    @RequestMapping("/")
    public String hello(){
        return "index";
    }
    
    @PostMapping(value = "/ok")
    @ResponseBody
    public String ok() {
        return "ok post";
    }    
}

- 前端模板（新增index.html）

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <meta name="csrf" th:content="${_csrf.token}">
  <meta name="_csrf_header" th:content="${_csrf.headerName}" />
  <title>SpringSecurity</title>
</head>

<body>
  <a href="/user/add">添加用户</a>
  <a href="/user/query">查询用户</a>
  <a href="/logout">退出</a>

  <script language="JavaScript">
    // let token = document.getElementsByTagName('meta')['csrf'].content;
    let token = document.querySelector('meta[name="csrf"]').getAttribute('content');
    let header = document.getElementsByTagName('meta')['_csrf_header'].content;
    console.log("token: ", token);
    console.log("header: ", header);

    function click() {
      let xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:8080/ok", true);
      xhr.setRequestHeader(header, token);
      xhr.onload = function (e) {
        console.log("response: ", e.target.responseText);
      }
      xhr.onerror = function (e) {
        console.log("error: ", e)
      }
      xhr.send(null);
    }
    click();
  </script>
</body>
```

![2020-12-13-RequestHeader.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-RequestHeader.png)

![2020-12-13-CSRFPrint.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-CSRFPrint.png)

Note: 前面这两个实验中用到了一些参数：`_csrf.parameterName`，`_csrf.token`，`_csrf_header`等，这些可以从源码中获悉：

```java
public final class HttpSessionCsrfTokenRepository implements CsrfTokenRepository {
	private static final String DEFAULT_CSRF_PARAMETER_NAME = "_csrf";

	private static final String DEFAULT_CSRF_HEADER_NAME = "X-CSRF-TOKEN";

	private static final String DEFAULT_CSRF_TOKEN_ATTR_NAME = HttpSessionCsrfTokenRepository.class
			.getName().concat(".CSRF_TOKEN");

	private String parameterName = DEFAULT_CSRF_PARAMETER_NAME;

	private String headerName = DEFAULT_CSRF_HEADER_NAME;

    private String sessionAttributeName = DEFAULT_CSRF_TOKEN_ATTR_NAME;
}    
```

### 实验2：退出时的CSRF防护

退出url在开启CSRF之后，直接以a标签形式请求/logout（即GET方式）会报404；此时logout必须以POST方式才可以正常退出。

```java
public final class LogoutConfigurer<H extends HttpSecurityBuilder<H>> extends
		AbstractHttpConfigurer<LogoutConfigurer<H>, H> {
	private List<LogoutHandler> logoutHandlers = new ArrayList<>();
	private SecurityContextLogoutHandler contextLogoutHandler = new SecurityContextLogoutHandler();
	private String logoutSuccessUrl = "/login?logout";
	private LogoutSuccessHandler logoutSuccessHandler;
	private String logoutUrl = "/logout";
	private RequestMatcher logoutRequestMatcher;
	private boolean permitAll;
    private boolean customLogoutSuccess;
    ...

	/**
	 * The URL that triggers log out to occur (default is "/logout"). If CSRF protection
	 * is enabled (default), then the request must also be a POST. This means that by
	 * default POST "/logout" is required to trigger a log out. If CSRF protection is
	 * disabled, then any HTTP method is allowed.
	 *
	 * <p>
	 * It is considered best practice to use an HTTP POST on any action that changes state
	 * (i.e. log out) to protect against <a
	 * href="https://en.wikipedia.org/wiki/Cross-site_request_forgery">CSRF attacks</a>. If
	 * you really want to use an HTTP GET, you can use
	 * <code>logoutRequestMatcher(new AntPathRequestMatcher(logoutUrl, "GET"));</code>
	 * </p>
	 *
	 * @see #logoutRequestMatcher(RequestMatcher)
	 * @see HttpSecurity#csrf()
	 *
	 * @param logoutUrl the URL that will invoke logout.
	 * @return the {@link LogoutConfigurer} for further customization
	 */
	public LogoutConfigurer<H> logoutUrl(String logoutUrl) {
		this.logoutRequestMatcher = null;
		this.logoutUrl = logoutUrl;
		return this;
	}    
}
```

可采用form表单或者Ajax的形式发送POST请求，携带`_csrf`参数，这里以form表单为例，点击`POST logout`按钮，可成功退出：

```html
<form action="logout" method="post">
    <input type="text" th:name="${_csrf.parameterName}" th:value="${_csrf.token}" hidden/> <br>
    <input type="submit" value="POST logout">
</form>
```

### 实验3：前后端分离时的CSRF防护

前面是通过在模板引擎中接收后端传回的`_csrf`，这里演示下前后端分离项目如何实现CSRF防护下的安全请求。

> A CsrfTokenRepository that persists the CSRF token in a cookie named "XSRF-TOKEN" and reads from the header "X-XSRF-TOKEN" following the conventions of AngularJS. When using with AngularJS be sure to use withHttpOnlyFalse().

- 后端安全配置（修改`CSRF`存储类型：CookieCsrfTokenRepository）

```java
@Override
protected void configure(HttpSecurity http) throws Exception {
    http.authorizeRequests()
            .antMatchers("/user/add").hasAuthority("p1")
            .antMatchers("/user/query").hasAuthority("p2")
            .antMatchers("/user/**").authenticated()
            .anyRequest().permitAll() // Let other request pass
            .and()
            .csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .and()
            // .csrf().disable() // turn off csrf, or will be 403 forbidden
            .formLogin() // Support form and HTTPBasic
            .loginPage("/login")
            .failureHandler(new AuthenticationFailureHandler(){
                @Override
                public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
                    exception.printStackTrace();
                    request.getRequestDispatcher(request.getRequestURL().toString()).forward(request, response);
                }
            });            
}
```

- 前端脚本

```html
</body>
  <script>
    function getCookie(name) {
      let arr = document.cookie.split("; ");
      for (let i = 0; i < arr.length; i++) {
        let arr2 = arr[i].split("=");
        if (arr2[0] == name) {
          return arr2[1];
        }
      }
      return "";
    }
    console.log("XSRF-TOKEN: ", getCookie("XSRF-TOKEN"));
    // 之后就可以拿着前面获取到的"XSRF-TOKEN"去请求后端POST等接口了
  </script>
</body>    
```

![2020-12-13-Cookie.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-Cookie.png)

Note: 这里大部分同学有个问题：Cookie都被自动带到请求中了，那攻击者不就又可以拿到了吗？

> 由于`Cookie`中的信息对于攻击者来说是不可见的，无法伪造的，虽然Cookie被浏览器**自动**携带了，但攻击者能做的仅仅是用一下`Cookie`，而`Cookie`里面到底放了什么内容，攻击者是不知道的，所以将`CSRF-TOKEN`写在`Cookie`中是可以防御`CSRF`的，相比默认的存放在`Session`中，`CSRF-TOKEN`写在`Cookie`中仅仅是换了一个存储位置。

### 什么时候需要开启CSRF？

![2020-12-13-WhenCSRF.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-12-13-WhenCSRF.png)

官方文档建议，但凡涉及到浏览器用户操作，均应启用`CSRF`防护。

### Reference

[SpringSecurity官方文档](https://docs.spring.io/spring-security/site/docs/5.4.1/reference/html5/)
[SpringSecurity官方API](https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/web/csrf/CookieCsrfTokenRepository.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***