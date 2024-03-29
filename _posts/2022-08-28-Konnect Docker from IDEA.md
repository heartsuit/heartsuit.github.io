---
layout: post
title: 云原生之容器编排实践-通过IDEA连接Docker服务
tags: CloudNative, Docker, IDEA
---

## 背景

`Docker` 安装在虚拟机（VMWare）中，我实际是在宿主机 `Windows10` 上进行开发，但是宿主机上并未安装 `Docker` 环境，借助 `IDEA` 开发工具，可以将我们的镜像直接发布到虚拟机中的 `Docker` 中。

Note: 我的 `IDEA` 版本信息如下：

   IntelliJ IDEA 2021.2.3 (Ultimate Edition)
   Build #IU-212.5457.46, built on October 12, 2021
   Licensed to https://www.xyz.com
   You have a perpetual fallback license for this version.
   Subscription is active until December 31, 2099.
   Runtime version: 11.0.12+7-b1504.40 amd64
   VM: OpenJDK 64-Bit Server VM by JetBrains s.r.o.
   Windows 10 10.0
   GC: G1 Young Generation, G1 Old Generation
   Memory: 2036M
   Cores: 16
   Registry: ide.balloon.shadow.size=0
   Non-Bundled Plugins: com.starxg.mybatis-log-plugin-free (1.3.0), com.tianlei.plugin.mybatis (2.1.1), org.jetbrains.kotlin (212-1.6.10-release-923-IJ5457.46), io.github.newhoo.restkit (2.0.5)
   Kotlin: 212-1.6.10-release-923-IJ5457.46

## 允许远程访问Docker

在通过 `IDEA` 的 `Docker` 插件连接之前，先要配置允许远程访问 `Docker` 。

```bash
# 养成好习惯，修改配置前，先备份
[root@k8s0 ~]# cp /usr/lib/systemd/system/docker.service /usr/lib/systemd/system/docker.service.bk

# 修改配置
[root@k8s0 ~]# vi /usr/lib/systemd/system/docker.service 
#ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H fd:// --containerd=/run/containerd/containerd.sock

# 重启docker
[root@k8s0 ~]# systemctl daemon-reload
[root@k8s0 ~]# service docker restart
```

## 通过IDEA连接Docker

我使用的是2021版本的 `IDEA` ，自带了 `Docker` 插件。通过快捷键“Ctrl+Alt+S”呼出配置菜单，在 `File | Settings | Build, Execution, Deployment` 下可以看到有个Docker菜单。点击+，新增连接配置：选择TCP socket，输入Engine API URL： `tcp://k8s0:2375` 。不出意外，输入完成后可以看到下方的 `Connection successful` .

![2022-08-28-AddDocker.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-AddDocker.jpg)

之后，可以在 `IDEA` 的 `Services` Tab下看到已建立连接的 `Docker` 服务，包括容器、镜像、网络以及数据卷。这时，如果编写了 `Dockerfile` ，可以直接运行容器。

![2022-08-28-DocerService.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-DocerService.jpg)

## 小总结

通过 `IDEA` 连接 `Docker` 服务给我们带来以下几个好处：

1. 方便管理和监控容器：通过`IDEA`连接`Docker`服务，可以直接在`IDEA`界面上管理和监控`Docker`容器。可以方便地查看容器的状态、日志和资源使用情况，还可以执行容器的启动、停止和重启操作。

2. 快速部署和调试应用：通过`IDEA`连接`Docker`服务，可以快速部署应用到`Docker`容器中，并进行调试。可以在`IDEA`中配置容器的运行环境和参数，然后一键启动容器，实现快速的应用部署和调试过程。

3. 与开发工具的集成：`IDEA`连接`Docker`服务可以与其他开发工具进行集成，提供更便捷的开发体验。例如，可以在`IDEA`中使用`Docker`插件来管理容器和镜像，还可以通过插件与版本控制工具集成，实现容器和代码的一体化管理。

总之，通过 `IDEA` 连接 `Docker` 服务可以提高开发效率，简化容器管理和应用部署过程，同时提供更好的集成和调试体验。 

下一篇，我们通过 `SpringBoot` 应用 `Docker` 化后，一键部署 `SpringBoot` 服务到 `Docker` 。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
