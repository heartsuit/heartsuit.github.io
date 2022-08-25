---
layout: post
title: 云原生之容器编排实践-在CentOS7上安装使用Docker
tags: CloudNative, Docker
---

## 背景

之前曾在 `Windows` 上安装过 `Docker` ：[如何顺利地将Docker安装至Win7(x64)？](https://heartsuit.blog.csdn.net/article/details/78483055)，如今更多地是在 `Linux` 环境下进行实际的部署与运维工作。

![2022-08-28-Build.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-Build.jpg)

容器化技术的三个阶段：物理机时代，虚拟机时代，容器化时代。

![2022-08-28-Share.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-Share.jpg)

容器是 `APP` 层面的隔离，虚拟化是物理资源层面的隔离。两者解决的问题不一样，在未来，两者将各自持续发展。

1. docker
2. compose
3. swam
4. kubernetes

![2022-08-28-Run.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-Run.jpg)

容器化技术的应用场景：标准化的迁移方式，统一的参数配置，自动化部署，应用集群监控，开发与运维之间的桥梁。

## 索引

本系列文章从一个容器化、云原生初学者的角度出发，介绍云原生基础设施、容器编排平台以及云原生应用的相关实践，侧重于云原生应用容器化部署的快速入门。

* 云原生之容器编排实践-在CentOS7上安装使用Docker
* 云原生之容器编排实践-通过IDEA连接Docker服务
* 云原生之容器编排实践-SpringBoot应用Docker化
* 云原生之容器编排实践-阿里云私有容器镜像仓库
* 云原生之容器编排实践-在CentOS7上安装minikube
* 云原生之容器编排实践-minikube使用阿里云私有镜像仓库
* 云原生之容器编排实践-SpringBoot应用以pod方式部署到minikube
* 云原生之容器编排实践-SpringBoot应用以Deployment方式部署到minikube以及弹性伸缩
* 云原生之容器编排实践-以k8s的Service方式暴露SpringBoot服务

## 系统环境

采用一台虚拟机进行实践。。

* 系统信息

```bash
[root@k8s0 local]# uname -a
Linux k8s0 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@k8s0 local]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@k8s0 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)
```

* 配置信息

```
内存：4G
处理器：2*2
硬盘：100G
```

## 安裝Docker

```bash
# 安装依赖项
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum makecache fast

# 安装Docker
yum install docker-ce

# 查看版本信息
[root@k8s0 ~]# docker -v
Docker version 20.10.17, build 100c701
# 启动Docker
systemctl status docker
systemctl start docker

# 开机自启
systemctl enable docker

# 关闭防火墙
systemctl stop firewalld
systemctl disable firewalld
```

## 拉取镜像并运行容器

```bash
[root@k8s0 ~]# docker pull hello-world
Using default tag: latest
latest: Pulling from library/hello-world
2db29710123e: Pull complete 
Digest: sha256:7d246653d0511db2a6b2e0436cfd0e52ac8c066000264b3ce63331ac66dca625
Status: Downloaded newer image for hello-world:latest
docker.io/library/hello-world:latest
[root@k8s0 ~]# docker run hello-world

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

## 基本命令

```bash
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

## Reference

[如何顺利地将Docker安装至Win7(x64)？](https://heartsuit.blog.csdn.net/article/details/78483055)
[Docker化koa2 vue OCR Web应用](https://heartsuit.blog.csdn.net/article/details/78514585)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
