---
layout: post
title: 云原生之容器编排实践-阿里云私有容器镜像仓库
tags: CloudNative, Docker
---

## 背景

前面我们已经通过 `IDEA` 的 `Docker` 插件连接到了 `Docker` 服务，并借助 `Dockerfile` 与 `Maven` 打包插件实现一键部署 `Spring Boot` 应用到远程 `Docker` 容器。但是这里的镜像都存储在本地（ `Docker` 所在的主机），这样在实际的协同开发时不方便共享，所以可以采用各大云服务商提供的私有容器镜像仓库服务，或者自建私有仓库。这里使用阿里云提供的私有容器镜像仓库进行实践。

## 阿里云私有容器镜像仓库

* 阿里云搜索容器镜像服务

直接在阿里云搜索容器镜像服务即可。

![2022-09-03-AliyunDockerSearch.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-03-AliyunDockerSearch.jpg)

* 创建个人实例

作为实验测试，使用个人实例即可，如果实际生产需要，可选择企业实例。

![2022-09-03-DockerPersonal.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-03-DockerPersonal.jpg)

## 远程登录并上传镜像

命令行登录阿里云私有容器镜像仓库后，对指定的镜像打Tag，然后推送到远程镜像仓库。

```bash
# 先看下本地镜像列表
[root@k8s0 ~]# docker images
REPOSITORY                                                    TAG              IMAGE ID       CREATED         SIZE
heartsuit/cloud-native                                        latest           eb03480c1351   3 days ago      122MB
heartsuit/cloud-native                                        0.0.1-SNAPSHOT   e0f7dde1261a   4 days ago      122MB
kicbase/stable                                                v0.0.32          ff7b11088f07   2 months ago    1.15GB
hello-world                                                   latest           feb5d9fea6a5   11 months ago   13.3kB
openjdk                                                       8-jdk-alpine     a3562aa0b991   3 years ago     105MB
```

```bash
# 输入账号与密码登录
[root@k8s0 ~]# docker login --username=heartsuit registry.cn-hangzhou.aliyuncs.com
Password: 
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded

# 打Tag
[root@k8s0 ~]# docker tag e0f7dde1261a registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT

# Push到远程仓库
[root@k8s0 ~]# docker push registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
The push refers to repository [registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub]
8fae554c8835: Pushed 
ceaf9e1ebef5: Pushed 
9b9b7f3d56a0: Pushed 
f1b5933fe4b5: Pushed 
0.0.1-SNAPSHOT: digest: sha256:aa901df7e77dce21461b28d3c4c46241cdc3e0247631541b29eee551f3ee529b size: 1159
```

```bash
# 再次看下本地镜像列表
[root@k8s0 ~]# docker images
REPOSITORY                                                    TAG              IMAGE ID       CREATED         SIZE
heartsuit/cloud-native                                        latest           eb03480c1351   3 days ago      122MB
registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub   0.0.1-SNAPSHOT   eb03480c1351   3 days ago      122MB
heartsuit/cloud-native                                        0.0.1-SNAPSHOT   e0f7dde1261a   4 days ago      122MB
kicbase/stable                                                v0.0.32          ff7b11088f07   2 months ago    1.15GB
hello-world                                                   latest           feb5d9fea6a5   11 months ago   13.3kB
openjdk                                                       8-jdk-alpine     a3562aa0b991   3 years ago     105MB
```

## 远程镜像仓库

![2022-09-03-AliyunDocerRepository.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-03-AliyunDocerRepository.png)

之后，就可以将自己 `Build` 好的镜像进行共享了。

## 小总结

以上是使用阿里云提供的私有容器镜像仓库托管服务的具体实践，其实，其他云服务提供商提供的此类服务的用法基本一致，eg: 腾讯云，因为都是参考的 `Docker` [官方的镜像仓库](https://hub.docker.com/)来实现的。当然如果网络环境（主要是上传和拉取镜像的速度）具备条件，可直接使用 `Docker` 官方提供的镜像库。

有了私有的容器镜像仓库，当在 `minikube` 或者 `Kubernetes` 中拉取私有容器镜像仓库的镜像时，并不能直接拉取，还需要进行认证信息配置，这在后续文章中会专门介绍到。

## Reference

* [https://hub.docker.com/](https://hub.docker.com/)
* [https://cr.console.aliyun.com/cn-hangzhou/instances](https://cr.console.aliyun.com/cn-hangzhou/instances)
---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
