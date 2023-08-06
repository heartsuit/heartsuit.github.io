---
layout: post
title: 云原生之容器编排实践-Docker使用JDK-Alpine镜像的时区问题
tags: CloudNative, Docker, Kubernetes
---

## 背景

偶然发现程序中的一个定时任务在 `Docker` 容器中部署后并没有按照既定的时间执行。经过排查后发现，定时任务与实际时间有关联，而容器内(openjdk:8-jdk-alpine)的时间与实际时间相差了8小时，应该是时区问题。

那么，如何解决容器内的时区问题呢？网上有给出各类方式解决这个问题，而且针对了不同的操作系统的镜像都给出了方案。我这里用的是比较简单的 `JDK-Alpine` 镜像，参考其官方文档后，直接在构建自己的镜像时设置好时区。

## 设置时区

根据 `Alpine` 的文档提示：https://docs.alpinelinux.org/user-handbook/0.1a/Installing/manual.html#_timezone，我们可以将以下代码添加到 `Dockerfile` 中：

![2022-09-10-AlpineTimeZone.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-10-AlpineTimeZone.jpg)

```dockerfile
RUN apk --update add tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata && \
    rm -rf /var/cache/apk/*
```

## 完整Dockfile

```dockerfile
FROM openjdk:8-jdk-alpine
RUN apk --update add tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata && \
    rm -rf /var/cache/apk/*
VOLUME /tmp
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

## 小总结

`Docker`镜像中时区不正确的问题可能是由于以下原因导致的：

1. 镜像中的时区设置不正确：`Docker`镜像默认使用UTC时间作为时区。如果你在容器中发现时区不正确，可能是因为镜像作者没有正确设置时区。你可以通过在`Docker`file中添加设置时区的命令来解决这个问题，例如：

```
   RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```
这将把时区设置为上海的时区。你可以F根据自己的需要选择适当的时区。

2. 宿主机时区与容器时区不一致：`Docker`容器默认继承宿主机的时区设置。如果宿主机的时区不正确，那么容器中的时区也会不正确。你可以通过在宿主机上正确设置时区，然后重新启动容器来解决这个问题。

3. 容器中的时钟同步问题：有时候，容器中的时钟可能会与宿主机的时钟不同步，导致时区显示不正确。你可以尝试重新启动容器或者使用NTP服务来同步容器中的时钟。

如果你遇到`Docker`镜像中时区不正确的问题，可以尝试上述解决方法来解决。另外，你也可以参考`Docker`官方文档中关于时区设置的指南来获取更多信息。 

## Reference

* [https://www.jianshu.com/p/d770a19e39c3](https://www.jianshu.com/p/d770a19e39c3)
* [https://docs.alpinelinux.org/user-handbook/0.1a/Installing/manual.html#_timezone](https://docs.alpinelinux.org/user-handbook/0.1a/Installing/manual.html#_timezone)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
