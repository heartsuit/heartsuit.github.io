---
layout: post
title: 云原生之容器编排实践-OpenEuler23.09离线安装Kubernetes与KubeSphere
tags: Kubernetes, KubeSphere
---

## 背景

有互联网的日子确实美好，不过有时候，仅仅是有时候，你可能会面临离线部署 `Kubernetes` 与 `KubeSphere` 集群的要求。。

我们借助由**青云**开源的容器平台， `KubeSphere` 来进行可视化的服务部署。 `KubeSphere` 是在 `Kubernetes` 之上构建的面向云原生应用的分布式操作系统，完全开源，支持多云与多集群管理，提供全栈的 `IT` 自动化运维能力； 

接下来使用 `KubeKey` 完成 `Kubernetes` 与 `KubeSphere` 的一键安装。另外，由于 `CentOS7` 在**2024年即将停服**，实际部署不建议采用；本次的部署环境采用 `OpenEuler` 社区创新版 `23.09` 。

Note：如果是生产环境部署，建议使用更稳定的 `LTS` 版本的操作系统，eg: `OpenEuler 22.03 SP3` 。另外，所谓的离线安装，前提是有一台能联网的机器，用于制作离线安装包，说白了**整个安装过程就是先在一台联网环境下的机器上下载好搭建集群的所需要的镜像，然后在离线环境下将这些镜像推送到私有镜像仓库，当搭建集群需要用到镜像时，从这个私有镜像仓库拉取即可完成安装**， `KubeKey` 就是干了这样一个活儿。

## 虚机资源

共用到了三台虚机：
1. 1台是之前进行在线安装`Kubernetes`与`KubeSphere`的主节点，在本次实践过程中的用途仅仅是制作离线包；
2. 1台 `Master` 节点
3. 1台 `Worker` 节点

| 主机名      | IP      |     说明     |
| ---------- | ------- | -------------- |
| k1  | 192.168.44.162 | 可联网，用于制作离线包  |
| ksp1  | 192.168.44.165 | 主节点 |
| ksp2  | 192.168.44.166 | 工作节点 |

即将安装的 `KubeSphere` 和 `Kubernetes` 版本信息如下：
* KubeSphere版本：v3.3.2（我们指定了版本：--with-kubesphere v3.3.2）
* Kubernetes版本：v1.23.10（kubectl get node）

## 系统环境

```bash
[root@ksp1 ~]# uname -a
Linux ksp1 6.4.0-10.1.0.20.oe2309.x86_64 #1 SMP PREEMPT_DYNAMIC Mon Sep 25 19:01:14 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ksp1 ~]# cat /proc/version
Linux version 6.4.0-10.1.0.20.oe2309.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 12.3.1 (openEuler 12.3.1-16.oe2309), GNU ld (GNU Binutils) 2.40) #1 SMP PREEMPT_DYNAMIC Mon Sep 25 19:01:14 CST 2023
```

## 制作离线包

Note：这部分操作是在联网环境下的主机 `k1` 上进行。

* 生成离线包配置

```bash
# 创建配置文件
[root@k1 ~]# ./kk create manifest
Generate KubeKey manifest file successfully

# 修改配置：放开了habor和docker-compose；修改了拉取镜像时的前缀
[root@k1 ~]# vi manifest-sample.yaml 
apiVersion: kubekey.kubesphere.io/v1alpha2
kind: Manifest
metadata:
  name: sample
spec:
  arches:
  - amd64
  operatingSystems:
  - arch: amd64
    type: linux
    id: openeuler
    version: "2309"
    osImage: openEuler 23.09
    repository:
      iso:
        localPath: /root/centos7-rpms-amd64.iso
        url: 
  kubernetesDistributions:
  - type: kubernetes
    version: v1.23.10
  components:
    helm: 
      version: v3.9.0
    cni: 
      version: v0.9.1
    etcd: 
      version: v3.4.13
    containerRuntimes:
    - type: docker
      version: 20.10.8
    crictl: 
      version: v1.24.0
    ## 
    # docker-registry:
    #   version: "2"
    harbor:
      version: v2.4.1
    docker-compose:
      version: v2.2.2
  images:
  - registry.cn-beijing.aliyuncs.com/kubesphereio/cni:v3.23.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-controllers:v3.23.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/node:v3.23.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/pod2daemon-flexvol:v3.23.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/coredns:1.8.6
  - registry.cn-beijing.aliyuncs.com/kubesphereio/snapshot-controller:v4.0.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/k8s-dns-node-cache:1.15.12
  - registry.cn-beijing.aliyuncs.com/kubesphereio/ks-apiserver:v3.3.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/ks-console:v3.3.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/ks-controller-manager:v3.3.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/ks-installer:v3.3.2
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-apiserver:v1.23.10
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-controller-manager:v1.23.10
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-proxy:v1.23.10
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-rbac-proxy:v0.11.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-rbac-proxy:v0.8.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-scheduler:v1.23.10
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-state-metrics:v2.5.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kubectl:v1.22.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/notification-manager-operator:v1.4.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/notification-manager:v1.4.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/notification-tenant-sidecar:v3.2.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/pause:3.6
  - registry.cn-beijing.aliyuncs.com/kubesphereio/prometheus-config-reloader:v0.55.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/prometheus-operator:v0.55.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/defaultbackend-amd64:1.4
  - registry.cn-beijing.aliyuncs.com/kubesphereio/linux-utils:3.3.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/provisioner-localpv:3.3.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/alertmanager:v0.23.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/node-exporter:v1.3.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/prometheus:v2.34.0
  registry:
    auths: {}
```

Note: 
1. 上述修改配置主要是放开了私有镜像仓库的配置：habor和docker-compose；
2. 修改了拉取镜像时的前缀：全部改为阿里云registry.cn-beijing.aliyuncs.com/kubesphereio。

* 生成离线包：kubesphere.tar.gz

```bash
[root@k1 ~]# ./kk artifact export -m manifest-sample.yaml -o kubesphere.tar.gz
```

Note：
0. export KKZONE=cn
1. CPU过高，修改虚拟机配置；
2. 个别软件包下载失败，可以手动下载后，放到对应目录中。
3. 生成的kubesphere.tar.gz通过本地上传到ksp1主机，用于离线安装。

![2024-09-28-1-Problem.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-1-Problem.jpg)

![2024-09-28-2-Tar.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-2-Tar.jpg)

接下来的操作全部**在离线环境进行**。

## 依赖组件

我这里使用的 `OpenEuler` 操作系统，采用最小化安装，没有自带*压缩/解压缩*的软件，以及后续安装需要的 `conntrack` 与 `socat` 依赖。从之前在线环境下通过yum安装这些组件的过程中，可以找到下载离线安装的 `rpm` 包。

* tar conntrack socat

```bash
# 下面是在线环境下通过yum安装时的记录
Downloading Packages:
(1/6): libnetfilter_queue-1.0.5-2.oe2309.x86_64.rpm                                                                        257 kB/s |  25 kB     00:00    
(2/6): tar-1.35-2.oe2309.x86_64.rpm                                                                                        3.2 MB/s | 756 kB     00:00    
(3/6): libnetfilter_cttimeout-1.0.1-1.oe2309.x86_64.rpm                                                                     31 kB/s |  21 kB     00:00    
(4/6): libnetfilter_cthelper-1.0.1-1.oe2309.x86_64.rpm                                                                      22 kB/s |  20 kB     00:00    
(5/6): conntrack-tools-1.4.7-1.oe2309.x86_64.rpm                                                                           168 kB/s | 177 kB     00:01    
(6/6): socat-1.7.4.4-1.oe2309.x86_64.rpm             

===========================================================================================================================================================
 Package                                      Architecture                 Version                                  Repository                        Size
===========================================================================================================================================================
Installing:
 tar                                          x86_64                       2:1.35-2.oe2309                          OS                               756 k
 conntrack-tools                              x86_64                       1.4.7-1.oe2309                           everything                       177 k
 socat                                        x86_64                       1.7.4.4-1.oe2309                         everything                       165 k
Installing dependencies:
 libnetfilter_cthelper                        x86_64                       1.0.1-1.oe2309                           everything                        20 k
 libnetfilter_cttimeout                       x86_64                       1.0.1-1.oe2309                           everything                        21 k
 libnetfilter_queue                           x86_64                       1.0.5-2.oe2309                           OS                                25 k

Transaction Summary
===========================================================================================================================================================
Install  6 Packages
```

![2024-09-28-3-Yum.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-3-Yum.jpg)

结合 `yum` 源配置，找到 `http://repo.openeuler.org/openEuler-23.09/everything/x86_64/Packages/` ，分别下载下列 `rpm` 安装包。

http://repo.openeuler.org/openEuler-23.09/OS/x86_64/Packages/tar-1.35-2.oe2309.x86_64.rpm
http://repo.openeuler.org/openEuler-23.09/OS/x86_64/Packages/libnetfilter_queue-1.0.5-2.oe2309.x86_64.rpm
http://repo.openeuler.org/openEuler-23.09/everything/x86_64/Packages/libnetfilter_cthelper-1.0.1-1.oe2309.x86_64.rpm
http://repo.openeuler.org/openEuler-23.09/everything/x86_64/Packages/libnetfilter_cttimeout-1.0.1-1.oe2309.x86_64.rpm
http://repo.openeuler.org/openEuler-23.09/everything/x86_64/Packages/conntrack-tools-1.4.7-1.oe2309.x86_64.rpm
http://repo.openeuler.org/openEuler-23.09/everything/x86_64/Packages/socat-1.7.4.4-1.oe2309.x86_64.rpm

本地上传 `tar` , `conntrack` , `socat` 等依赖的 `rpm` 包到 `ksp1` 和 `ksp2` 主机（即所有集群主机都需要安装）。

```bash
rpm -ivh tar-1.35-2.oe2309.x86_64.rpm
rpm -ivh libnetfilter_queue-1.0.5-2.oe2309.x86_64.rpm
rpm -ivh libnetfilter_cthelper-1.0.1-1.oe2309.x86_64.rpm
rpm -ivh libnetfilter_cttimeout-1.0.1-1.oe2309.x86_64.rpm
rpm -ivh conntrack-tools-1.4.7-1.oe2309.x86_64.rpm
rpm -ivh socat-1.7.4.4-1.oe2309.x86_64.rpm
```

## 配置准备工作

```bash
# 设置2台虚机的主机名
[root@ksp1 ~]# hostnamectl set-hostname ksp1
[root@ksp2 ~]# hostnamectl set-hostname ksp2

# 本地上传kubekey的可执行文件kk到ksp1主机，并给执行权限
[root@ksp1 ~]# chmod +x kk

# 本地上传config-sample.yaml
# 修改主机、镜像仓库配置信息
[root@ksp1 ~]# vi config-sample.yaml 
# 修改了主机信息，控制平面与ETCD的安装节点、工作节点信息
spec:
  hosts:
  - {name: ksp1, address: 192.168.44.165, internalAddress: 192.168.44.165, user: root, password: "CloudNative"}
  - {name: ksp2, address: 192.168.44.166, internalAddress: 192.168.44.166, user: root, password: "CloudNative"}
  roleGroups:
    etcd:
    - ksp1
    control-plane: 
    - ksp1
    worker:
    - ksp2
    # 设置使用 kk 自动部署镜像仓库的节点
    registry:
    - ksp1
```

## 初始化本地镜像仓库Harbor

Note：以下内容只需要在主节点上（这里是 `ksp1` ）执行。

```bash
[root@ksp1 ~]# ./kk init registry -f config-sample.yaml -a kubesphere.tar.gz

# 查看下Harbor的访问地址：是在ksp1主机的4443端口
[root@ksp1 ~]# docker ps
CONTAINER ID   IMAGE                                  COMMAND                  CREATED         STATUS                   PORTS                                                                                                                       NAMES
5c0bed2219e6   goharbor/harbor-jobservice:v2.5.3      "/harbor/entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               harbor-jobservice
5ef38f5f747b   goharbor/nginx-photon:v2.5.3           "nginx -g 'daemon of…"   2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:4443->4443/tcp, :::4443->4443/tcp, 0.0.0.0:80->8080/tcp, :::80->8080/tcp, 0.0.0.0:443->8443/tcp, :::443->8443/tcp   nginx
ada4d791a0a5   goharbor/notary-server-photon:v2.5.3   "/bin/sh -c 'migrate…"   2 minutes ago   Up 2 minutes                                                                                                                                         notary-server
910ec9c7a994   goharbor/harbor-core:v2.5.3            "/harbor/entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               harbor-core
2c587ec2d12e   goharbor/trivy-adapter-photon:v2.5.3   "/home/scanner/entry…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               trivy-adapter
355a77d9e869   goharbor/notary-signer-photon:v2.5.3   "/bin/sh -c 'migrate…"   2 minutes ago   Up 2 minutes                                                                                                                                         notary-signer
26a7772a6668   goharbor/registry-photon:v2.5.3        "/home/harbor/entryp…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               registry
75791cb60298   goharbor/harbor-registryctl:v2.5.3     "/home/harbor/start.…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               registryctl
4c5d871ba667   goharbor/harbor-portal:v2.5.3          "nginx -g 'daemon of…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               harbor-portal
5619f2eb8ce8   goharbor/chartmuseum-photon:v2.5.3     "./docker-entrypoint…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               chartmuseum
766b7b856761   goharbor/harbor-db:v2.5.3              "/docker-entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               harbor-db
d1c846dba273   goharbor/redis-photon:v2.5.3           "redis-server /etc/r…"   2 minutes ago   Up 2 minutes (healthy)                                                                                                                               redis
e9ade07ea3c3   goharbor/harbor-log:v2.5.3             "/bin/sh -c /usr/loc…"   2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:1514->10514/tcp                                                                                                   harbor-log
```

当看到： `Local image registry created successfully. Address: dockerhub.kubekey.local` ，表示本地镜像仓库初始化成功~，可通过浏览器访问： `https://192.168.44.165:4443` 验证。

## 创建Harbor仓库

```bash
# 创建以下脚本，用于循环创建Harbor仓库中项目名称（其实，因为用了阿里云镜像，实际只需要场景一个kubesphereio即可）
[root@ksp1 ~]# vi create_project_harbor.sh
#!/usr/bin/env bash
# Copyright 2018 The KubeSphere Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
url="https://dockerhub.kubekey.local"  #修改url的值为https://dockerhub.kubekey.local
user="admin"
passwd="Harbor12345"
harbor_projects=(library
    kubesphereio
    kubesphere
    argoproj
    calico
    coredns
    openebs
    csiplugin
    minio
    mirrorgooglecontainers
    osixia
    prom
    thanosio
    jimmidyson
    grafana
    elastic
    istio
    jaegertracing
    jenkins
    weaveworks
    openpitrix
    joosthofman
    nginxdemos
    fluent
    kubeedge
    openpolicyagent
)
for project in "${harbor_projects[@]}"; do
    echo "creating $project"
    curl -u "${user}:${passwd}" -X POST -H "Content-Type: application/json" "${url}/api/v2.0/projects" -d "{ \"project_name\": \"${project}\", \"public\": true}" -k #curl命令末尾加上 -k
done

# 赋予执行权限
[root@ksp1 ~]# chmod +x create_project_harbor.sh

# 执行Harbor仓库创建项目的脚本
[root@ksp1 ~]# sh ./create_project_harbor.sh
creating library
{"errors":[{"code":"CONFLICT","message":"The project named library already exists"}]}
creating kubesphereio
creating kubesphere
creating argoproj
creating calico
creating coredns
creating openebs
creating csiplugin
creating minio
creating mirrorgooglecontainers
creating osixia
creating prom
creating thanosio
creating jimmidyson
creating grafana
creating elastic
creating istio
creating jaegertracing
creating jenkins
creating weaveworks
creating openpitrix
creating joosthofman
creating nginxdemos
creating fluent
creating kubeedge
creating openpolicyagent
```

## 安装K8S集群与KubeSphere

本地私有镜像仓库 `Harbor` 成功运行并创建好了项目后，就可以进行离线安装 `Kubernetes` 与 `KubeSphere` 集群了。

```bash
# 再次编辑config-sample.yaml，配置Harbor的认证信息
[root@ksp1 ~]# vi config-sample.yaml
    auths:
      "dockerhub.kubekey.local":
        username: admin
        password: Harbor12345
    privateRegistry: "dockerhub.kubekey.local"
    namespaceOverride: "kubesphereio"

# 安装K8S集群与KubeSphere
[root@ksp1 ~]# ./kk create cluster -f config-sample.yaml -a kubesphere.tar.gz
```

这个过程取决于硬件配置，我花了大概半个小时。

## 验证集群

* KubeSphere安装成功

![2024-09-28-4-InstallComplete.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-4-InstallComplete.jpg)

* 查看启动了哪些pod

![2024-09-28-5-Pod.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-5-Pod.jpg)

由于 `KubeSphere` 暴露的服务端口，我们可以在浏览器中直接访问验证：
  Console: http://192.168.44.165:30880
  Account: admin
  Password: P@88w0rd

* KubeSphere资源概览

![2024-09-28-6-Resource.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-28-6-Resource.jpg)

## 小总结

本文介绍了如何在 `OpenEuler 23.09` 操作系统上离线安装 `Kubernetes` 和 `KubeSphere` 。首先，需要在一台联网的机器上下载所需的镜像和软件包，制作成离线安装包。然后，在离线环境的虚拟机上，通过配置和安装依赖组件，准备安装环境。接着，使用 `KubeKey` 工具初始化本地镜像仓库 `Harbor` ，并创建所需的 `Harbor` 项目。最后，通过 `KubeKey` 配置文件，指定 `Harbor` 认证信息和私有镜像仓库地址，完成 `Kubernetes` 集群和 `KubeSphere` 的离线安装。安装成功后，可以通过 `KubeSphere` 的控制台进行资源管理和操作。本文提供了详细的步骤和脚本，帮助用户在离线环境下顺利部署 `Kubernetes` 和 `KubeSphere` 。

## Reference

- [https://www.kubesphere.io/zh/docs/v3.3/installing-on-linux/introduction/air-gapped-installation/](https://www.kubesphere.io/zh/docs/v3.3/installing-on-linux/introduction/air-gapped-installation/)

- [https://github.com/kubesphere/kubekey/releases/tag/v3.0.7](https://github.com/kubesphere/kubekey/releases/tag/v3.0.7)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
