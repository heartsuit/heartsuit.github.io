---
layout: post
title: Win10安装Docker Desktop并运行Tutorial示例
tags: Docker
---

## 背景

前段时间一个项目需要在开发环境直接使用 `Docker` ，为了省事便计划在本地安装 `Desktop` 版的 `Docker` 。其实安装过程比较简单，可视化安装即可，主要是对安装与初步使用时遇到的问题做个记录。

## 下载安装

* 下载地址：[https://download.docker.com/win/edge/Docker%20Desktop%20Installer.exe](https://download.docker.com/win/edge/Docker%20Desktop%20Installer.exe)。

到 `Docker` 官方下载 `Docker Desktop Installer.exe` 并安装即可。我在安装过程中遇到的问题如下。

### 问题描述：WSL 2 installation is incomplete.

### 解决方法

下载安装 `WSL` 即可。https://learn.microsoft.com/zh-cn/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package

安装完成后遇到的另一个问题就是，我的 `VMware` 无法运行了，这样就不能用虚拟机了。一般来说 `Win10` 默认不会打开 `Hyper-V` ，但是安装 `Docker` 默认会打开 `Hyper-V` 。由于 `VMware Workstation` 和 `Hyper-V` 冲突，那么 `VMware Workstation` 和 `Docker` 也冲突。如果要重新开启 `Hyper-V` ，只需以管理员身份运行 `cmd` ，执行 `bcdedit /set hypervisorlaunchtype auto` 命令并重启即可。

## 运行Tutorial

这个示例程序的完整命令如下。

```bash
docker run --name repo alpine/git clone https://github.com/docker/getting-started.git
docker cp repo:/git/getting-started/ .
cd getting-started
docker build -t docker101tutorial .
docker run -d -p 80:80 --name docker-tutorail docker101tutorial
```

在执行构建镜像命令时，发生了以下错误。

### 问题描述：https://dl-cdn.alpinelinux.org/alpine/v3.18/main: temporary error (try again later)

![2023-09-23-1-DNSError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-23-1-DNSError.jpg)

### 解决方法

修改 `Docker` 的 `DNS` 配置，在 `Docker` 引擎的配置文件中添加以下内容然后重启 `Docker` ，再次构建镜像即可。

```json
{
  "dns": ["8.8.8.8"]
}
```

![2023-09-23-2-DNSConfig.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-23-2-DNSConfig.jpg)

## 成功启动容器

根据示例程序的映射端口，本地访问 `http://localhost` 即可打开页面。

![2023-09-23-3-Demo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-23-3-Demo.jpg)

## 实际项目中遇到的问题

`docker-compose` 配置如下：

```yaml
services:
  rabbitmq:
    image: xxx
    restart: on-failure
    ports:
      - '5672:5672'
      - '1883:1883'
      - '8883:8883'
      - '61613:61613'
      - '15672:15672'
    container_name: my-rabbitmq
    hostname: my-rabbitmq
    volumes:
      - rabbitmq:/var/lib/rabbitmq
```

实际项目中，当使用 `RabbitMQ` 作为 `MQTT` 的 `Broker` 启动容器时，采用的端口为 `1883` ，发生端口无法使用的错误。

### 问题描述：Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:1883 -> 0.0.0.0:0: listen tcp 0.0.0.0:1883: bind: An attempt was made to access a socket in a way forbidden by its access permissions.

### 解决方法

可是通过 `netstat -aon|findstr "1883"` 没找到占用该端口的进程，神奇了。。
经过查询： `netsh interface ipv4 show excludedportrange protocol=tcp` ，发现这个端口确实被禁用了，那就先临时换个端口用吧。。

![2023-09-23-4-TCPPort.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-23-4-TCPPort.jpg)

## 小总结

以上记录了安装与初步使用 `Docker Desktop` 时遇到的问题， `Docker Desktop` 是一个用于在本地计算机上运行和管理 `Docker` 容器的工具，其特性如下：

1. 跨平台性：Docker Desktop可以在Windows、Mac和Linux操作系统上运行，使得开发人员可以在不同的平台上使用相同的开发环境。
2. 隔离性：Docker容器提供了隔离的运行环境，使得应用程序和其依赖可以在一个独立的容器中运行，而不会影响到主机系统或其他容器。
3. 可移植性：Docker容器可以在不同的环境中进行部署，包括开发、测试和生产环境。这种可移植性使得应用程序的部署更加简单和可靠。
4. 快速部署：Docker容器可以快速启动和停止，使得应用程序的部署和扩展变得更加高效和灵活。
5. 版本控制：Docker容器可以使用版本控制工具进行管理，使得应用程序的版本控制更加方便和可追踪。

此外，自带了 `docker-compose` ，使用 `Docker Desktop` 可以提供一个轻量级、可移植和可靠的开发和部署环境，使得开发人员能够更加高效地构建和交付应用程序。

## Reference

* [Docker示例](https://www.docker.com/101-tutorial/)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
