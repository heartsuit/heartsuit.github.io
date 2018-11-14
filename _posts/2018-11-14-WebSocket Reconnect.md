---
layout: post
title: Failed to close the ServletOutputStream connection cleanly, Broken pipe
tags: WebSocket
---

### Problem1: 服务端报错：Broken pipe

``` java
java.io.IOException: Connection timed out
  at sun.nio.ch.FileDispatcherImpl.read0(Native Method)
  at sun.nio.ch.SocketDispatcher.read(SocketDispatcher.java:39)
  at sun.nio.ch.IOUtil.readIntoNativeBuffer(IOUtil.java:223)
  at sun.nio.ch.IOUtil.read(IOUtil.java:197)
  at sun.nio.ch.SocketChannelImpl.read(SocketChannelImpl.java:380)
  at org.apache.tomcat.util.net.SecureNioChannel.read(SecureNioChannel.java:581)
  at org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper.fillReadBuffer(NioEndpoint.java:1248)
  at org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper.fillReadBuffer(NioEndpoint.java:1221)
  at org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper.read(NioEndpoint.java:1194)
  at org.apache.tomcat.websocket.server.WsFrameServer.onDataAvailable(WsFrameServer.java:72)
  at org.apache.tomcat.websocket.server.WsFrameServer.doOnDataAvailable(WsFrameServer.java:171)
  at org.apache.tomcat.websocket.server.WsFrameServer.notifyDataAvailable(WsFrameServer.java:151)
  at org.apache.tomcat.websocket.server.WsHttpUpgradeHandler.upgradeDispatch(WsHttpUpgradeHandler.java:148)
  at org.apache.coyote.http11.upgrade.UpgradeProcessorInternal.dispatch(UpgradeProcessorInternal.java:54)
  at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:53)
  at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:790)
  at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1459)
  at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)
  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
  at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)
  at java.lang.Thread.run(Thread.java:748)
05-Nov-2018 09:17:07.881 INFO [https-jsse-nio-443-exec-6] org.apache.tomcat.websocket.server.WsRemoteEndpointImplServer.doClose Failed to close the ServletOutputStream connection cleanly
 java.io.IOException: Broken pipe
  at sun.nio.ch.FileDispatcherImpl.write0(Native Method)
  at sun.nio.ch.SocketDispatcher.write(SocketDispatcher.java:47)
  at sun.nio.ch.IOUtil.writeFromNativeBuffer(IOUtil.java:93)
  at sun.nio.ch.IOUtil.write(IOUtil.java:65)
  at sun.nio.ch.SocketChannelImpl.write(SocketChannelImpl.java:471)
  at org.apache.tomcat.util.net.SecureNioChannel.flush(SecureNioChannel.java:144)
  at org.apache.tomcat.util.net.SecureNioChannel.close(SecureNioChannel.java:526)
  at org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper.close(NioEndpoint.java:1209)
  at org.apache.tomcat.websocket.server.WsRemoteEndpointImplServer.doClose(WsRemoteEndpointImplServer.java:167)
  at org.apache.tomcat.websocket.WsRemoteEndpointImplBase.close(WsRemoteEndpointImplBase.java:710)
  at org.apache.tomcat.websocket.WsSession.onClose(WsSession.java:518)
  at org.apache.tomcat.websocket.server.WsHttpUpgradeHandler.close(WsHttpUpgradeHandler.java:240)
  at org.apache.tomcat.websocket.server.WsHttpUpgradeHandler.upgradeDispatch(WsHttpUpgradeHandler.java:162)
  at org.apache.coyote.http11.upgrade.UpgradeProcessorInternal.dispatch(UpgradeProcessorInternal.java:54)
  at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:53)
  at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:790)
  at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1459)
  at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)
  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
  at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)
  at java.lang.Thread.run(Thread.java:748)
  ```

报出超时的原因可能是后端在向前端发起数据请求时，没有成功。可能的原因是，在服务端，负责和前端通信的`websocket`连接`Session`存放在一个Map中，当由于某种未知的原因，导致前后端连接断开后，即客户端失联了，但是Map里的Session并未被移除。所以当服务端有新消息要发送给这个已经失联的Session，便会报错：`Connection timed out`, `Broken pipe`。

- Solution：当产生这个异常后，后端从Map中移除(remove)已断开连接的客户端`Session`。

Note：也可以在前端把错误打印出来：WebSocket断开时，会触发CloseEvent, CloseEvent的code字段表示了WebSocket断开的原因。可以从该字段中分析断开的原因。

CloseEvent的三个字段：

    CloseEvent.code: code是错误码，是整数类型
    CloseEvent.reason: reason是断开原因，是字符串
    CloseEvent.wasClean: wasClean表示是否正常断开，是布尔值。一般异常断开时，该值为false

``` javascript
websocket.onclose = function (e) {
     console.log('WebSocket连接断开：Code:' + e.code + ' Reason:' + e.reason + ' wasClean:' + e.wasClean);
}
```
### Problem2: 客户端断开后，如何做到尝试再次连接，即断线重连

- Solution: `websocket`断线重连解决方案: [ReconnectingWebSocket](https://cdn.bootcss.com/reconnecting-websocket/1.0.0/reconnecting-websocket.min.js)

``` javascript
let ws = new WebSocket('ws://host:port');
// 替换为：
let ws = new ReconnectingWebSocket('ws://host:port');
```

当然`ReconnectingWebSocket`中还有其他诸如重试间隔等各类配置项，可以查看文档或源码。

Note：***如果服务器域名为HTTPS，那么使用的WebSocket协议也必须是wss***

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***