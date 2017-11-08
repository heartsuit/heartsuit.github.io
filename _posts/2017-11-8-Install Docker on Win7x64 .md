---
layout: post
title: 如何顺利地将Docker安装至Win7(x64)？
tags: Docker
---
### 下载、安装DockerToolbox.exe

- 下载：Docker针对Win10做了专门的Docker版本，其他旧版Windows操作系统安装的是[DockerToolbox.exe](https://docs.docker.com/toolbox/toolbox_install_windows/)

- 安装：基本按照默认即可，如果已经安装过Git，可以不勾选相应选项；

### 启动Docker Quickstart Terminal
安装完毕，生成三个快捷方式，打开Docker Quickstart Terminal，可能遇到的问题：

- 下载boot2docker.iso很慢

![2017-11-8-boot2docker](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-8-boot2docker.jpg)

一般的网络中这一过程会很慢，这时可以将图中的网址输入到浏览器或者下载专用的软件中下载，速度会快很多，完成后将`boot2docker.iso`置于`C:\Users\<UserName>\.docker\machine\cache`中，关闭Terminal，重新打开，应该可以顺利进到下一步。

- 未开启对虚拟化技术的支持

![2017-11-8-EnableVirtualization](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-8-EnableVirtualization.jpg)

> 或出现“Error checking TLS connection: ssh command error: command : ip addr show err”

需要重启计算机，我这里是通过`F12`到BIOS中手动开启硬件虚拟化技术，在Configuration项下将`Intel Virtual Technology`改为Enable，保存退出，启动计算机。

### 验证安装
重启后，打开Docker Quickstart Terminal，可通过以下方式进行验证。

- 输入`docker version`，如果输出以下内容则表示安装成功。

![2017-11-8-CheckInstallation](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-8-CheckInstallation.png)

- 输入`docker run hello-world`

![2017-11-8-CheckHelloWorld](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2017-11-8-CheckHelloWorld.png)

### 基本命令
docker本身采用Go语言基于Linux开发，命令类似于git。

``` bash
# 列出本地已有镜像
docker images
# 从远端下载镜像
docker pull <image name>
# 使用镜像创建并启动一个容器（若本地没有该镜像，则会先从远端下载，每次run都会生成一个容器，嗯，轻量~）
docker run hub.c.163.com/library/hello-world:latest

# 列出正在运行的容器
docker ps
# 列出所有容器（包括Exited）
docker ps -a
# 启动指定的容器
docker start <container id>
# 停止指定的容器
docker stop <container id>
# 停止所有运行中的容器
docker stop $(docker ps -q)
# 删除指定容器
docker rm <container id>
# 删除所有容器
docker rm $(docker ps -aq)
# 停止并删除容器
docker stop $(docker ps -q) & docker rm $(docker ps -aq)
# 删除指定镜像（删除镜像前须先停止并删除容器）
docker rmi <image id>

```

### 镜像中心
- [网易蜂巢](https://c.163yun.com/hub#/m/home/)
- [时速云](https://hub.tenxcloud.com/)


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***