---
layout: post
title: Zuul网关部署在HTTPS，路由到其他HTTP服务
tags: Server
---

### Scenario

如题，Zuul网关部署在HTTPS，路由到其他HTTP服务，即用户所有的请求经由HTTPS的网关之后，路由到其他机器上的HTTP服务。

首先说明下，这种方式是可以的，服务器端不像浏览器那样的安全限制，HTTPS不允许加载HTPP请求。这里，记一次因粗心配置导致的莫名其妙的报错：

	org.springframework.web.client.UnknownContentTypeException: Could not extract response: no suitable HttpMessageConverter found for response type [interface java.util.Map] and content type [text/plain;charset=UTF-8]

简要陈述下背景，参考`SpringCloud`官方的架构，`SpringCloud`技术栈练手：Eureka, Feign, Zuul, Ribbon, Hystrix

![2020-07-30-SpringCloud.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-07-30-SpringCloud.png)

共5个服务，注册中心、认证服务、资源服务1、资源服务2、网关服务。

![2020-07-30-ZuulHttps.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-07-30-ZuulHttps.png)

对外HTTPS，对内HTTP

- 前置Nginx，配置了SSL，同时监听80端口的请求，全部强制路由至HTTPS
- 网关服务部署在域名服务器上，其他服务均在另外一台阿里云局域网内的服务器上；
- 二级域名：xyz.abc.com，当使用http部署时一切正常，但是换用https部署后，出问题了。。

Notes: 使用的是免费的SSL证书（还不是因为穷~~）。。一个免费SSL证书只能绑定在一台服务器上。

```conf
server {
    listen 80;
    server_name xyz.abc.com;
    rewrite ^(.*) https://$server_name$1 permanent;
}  
server {
    listen  443 ssl;
    server_name  xyz.abc.com;
    ssl         on;
    ssl_certificate     /opt/cert/4216057_xyz.abc.com.pem;
    ssl_certificate_key /opt/cert/4216057_xyz.abc.com.key;

    location / {
        proxy_pass https://127.0.0.1:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Problem

```
2020-07-29 17:26:47.673 ERROR 13941 --- [nio-9003-exec-3] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] threw exception

org.springframework.web.client.UnknownContentTypeException: Could not extract response: no suitable HttpMessageConverter found for response type [interface java.util.Map] and content type [text/plain;charset=UTF-8]
	at org.springframework.web.client.HttpMessageConverterExtractor.extractData(HttpMessageConverterExtractor.java:126) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:998) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:981) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:741) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.execute(RestTemplate.java:674) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.exchange(RestTemplate.java:583) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.oauth2.provider.token.RemoteTokenServices.postForMap(RemoteTokenServices.java:149) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.token.RemoteTokenServices.loadAuthentication(RemoteTokenServices.java:106) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.authentication.OAuth2AuthenticationManager.authenticate(OAuth2AuthenticationManager.java:83) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.authentication.OAuth2AuthenticationProcessingFilter.doFilter(OAuth2AuthenticationProcessingFilter.java:150) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:116) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.context.SecurityContextPersistenceFilter.doFilter(SecurityContextPersistenceFilter.java:105) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy.doFilterInternal(FilterChainProxy.java:215) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy.doFilter(FilterChainProxy.java:178) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.DelegatingFilterProxy.invokeDelegate(DelegatingFilterProxy.java:358) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.filter.DelegatingFilterProxy.doFilter(DelegatingFilterProxy.java:271) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.invoke(ApplicationDispatcher.java:712) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.processRequest(ApplicationDispatcher.java:461) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.doForward(ApplicationDispatcher.java:384) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.forward(ApplicationDispatcher.java:312) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.custom(StandardHostValve.java:394) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.status(StandardHostValve.java:253) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.throwable(StandardHostValve.java:348) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:173) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:343) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:373) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:868) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1590) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167) [na:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641) [na:na]
	at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at java.base/java.lang.Thread.run(Thread.java:844) [na:na]

2020-07-29 17:26:47.673 ERROR 13941 --- [nio-9003-exec-3] o.a.c.c.C.[Tomcat].[localhost]           : Exception Processing ErrorPage[errorCode=0, location=/error]

org.springframework.web.client.UnknownContentTypeException: Could not extract response: no suitable HttpMessageConverter found for response type [interface java.util.Map] and content type [text/plain;charset=UTF-8]
	at org.springframework.web.client.HttpMessageConverterExtractor.extractData(HttpMessageConverterExtractor.java:126) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:998) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate$ResponseEntityResponseExtractor.extractData(RestTemplate.java:981) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:741) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.execute(RestTemplate.java:674) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.client.RestTemplate.exchange(RestTemplate.java:583) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.oauth2.provider.token.RemoteTokenServices.postForMap(RemoteTokenServices.java:149) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.token.RemoteTokenServices.loadAuthentication(RemoteTokenServices.java:106) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.authentication.OAuth2AuthenticationManager.authenticate(OAuth2AuthenticationManager.java:83) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.oauth2.provider.authentication.OAuth2AuthenticationProcessingFilter.doFilter(OAuth2AuthenticationProcessingFilter.java:150) ~[spring-security-oauth2-2.3.4.RELEASE.jar!/:na]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:116) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.context.SecurityContextPersistenceFilter.doFilter(SecurityContextPersistenceFilter.java:105) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:334) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy.doFilterInternal(FilterChainProxy.java:215) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.security.web.FilterChainProxy.doFilter(FilterChainProxy.java:178) ~[spring-security-web-5.3.3.RELEASE.jar!/:5.3.3.RELEASE]
	at org.springframework.web.filter.DelegatingFilterProxy.invokeDelegate(DelegatingFilterProxy.java:358) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.filter.DelegatingFilterProxy.doFilter(DelegatingFilterProxy.java:271) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:103) ~[spring-web-5.2.7.RELEASE.jar!/:5.2.7.RELEASE]
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:193) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.invoke(ApplicationDispatcher.java:712) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.processRequest(ApplicationDispatcher.java:461) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.doForward(ApplicationDispatcher.java:384) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.ApplicationDispatcher.forward(ApplicationDispatcher.java:312) ~[tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.custom(StandardHostValve.java:394) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.status(StandardHostValve.java:253) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.throwable(StandardHostValve.java:348) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:173) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:74) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:343) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:373) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:868) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1590) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167) [na:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641) [na:na]
	at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61) [tomcat-embed-core-9.0.36.jar!/:9.0.36]
	at java.base/java.lang.Thread.run(Thread.java:844) [na:na]
```

### Analysis

使用https部署后，无意中用http请求了一下，报错了。

```
Bad Request
This combination of host and port requires TLS.
```

此时突然灵光一闪😎，想到生产环境下的配置写的还是http的。。

``` yml
security:
  oauth2:
    client:
      client-id: client
      client-secret: secret
    resource:
    #   token-info-uri: http://xyz.abc.com/api/auth/oauth/check_token
      token-info-uri: https://xyz.abc.com/api/auth/oauth/check_token
```

应该就是因为服务之间调用时（这里是认证服务https://xyz.abc.com/api/auth/oauth/check_token），返回了上面这段`错误文本信息`，导致`SpringBoot`无法按照Map或者JSON去解析，改为实际的HTTPS网关地址即可。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***