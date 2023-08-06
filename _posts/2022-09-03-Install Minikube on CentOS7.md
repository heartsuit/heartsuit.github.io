---
layout: post
title: 云原生之容器编排实践-在CentOS7上安装minikube
tags: CloudNative, Docker, Kubernetes
---

## 背景

前面做了一些基础的铺垫后，终于进入正题了。

作为初学者，为避免在裸金属主机上搭建 `Kubernetes` 集群的复杂度，以及使用云服务商提供的容器编排服务的一脸懵逼等打击信心的深坑，建议使用 `minikube` 来进入 `Kubernetes` 的世界。

`Minikube` 是一个用于在本地机器上运行 `Kubernetes` 集群的工具。使用 `Minikube` 有以下几个好处：

1. 学习和开发环境：`Minikube`提供了一个轻量级的`Kubernetes`环境，可以在本地机器上快速搭建和测试`Kubernetes`应用程序。这对于学习和开发`Kubernetes`相关的技术非常有帮助。

2. 离线环境：`Minikube`可以在没有互联网连接的情况下运行，这对于在没有稳定网络连接的环境中进行开发和测试非常有用。

3. 快速部署和验证：使用`Minikube`可以快速部署和验证`Kubernetes`应用程序，而无需依赖复杂的生产环境。这对于快速迭代和验证想法非常有帮助。

4. 多平台支持：`Minikube`支持在多个操作系统上运行，包括`Windows`、`Mac`和`Linux`。这使得开发人员可以在自己喜欢的操作系统上使用`Kubernetes`。

总而言之， `Minikube` 是一个方便、灵活和易于使用的工具，可以帮助开发人员在本地机器上快速搭建和测试 `Kubernetes` 应用程序。 

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

## 安装Minikube

### 前提是需要具备 `Docker` 环境

```bash
[root@k8s0 ~]# docker -v
Docker version 20.10.17, build 100c701

[root@k8s0 ~]# systemctl status docker
● docker.service - Docker Application Container Engine
   Loaded: loaded (/usr/lib/systemd/system/docker.service; disabled; vendor preset: disabled)
   Active: inactive (dead)
     Docs: https://docs.docker.com

[root@k8s0 ~]# systemctl start docker
[root@k8s0 ~]# systemctl enable docker
Created symlink from /etc/systemd/system/multi-user.target.wants/docker.service to /usr/lib/systemd/system/docker.service.
[root@k8s0 ~]# systemctl stop firewalld
[root@k8s0 ~]# systemctl disable firewalld
Removed symlink /etc/systemd/system/multi-user.target.wants/firewalld.service.
Removed symlink /etc/systemd/system/dbus-org.fedoraproject.FirewallD1.service.
```

### 下载安装并启动

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

按照官方文档：https://minikube.sigs.k8s.io/docs/start/，我们下载安装后，直接通过 `minikube start` 就结束战斗了。然而，我就是死活起不来，报出各种错误。

后来，参考了 `GitHub` 上的 `Issue` ：https://github.com/kubernetes/minikube/issues/14477，启动时指定 `Kubernetes` 的版本号就可以启动了。

    minikube start --force --kubernetes-version=v1.23.1

不过，如果关闭防火墙后没有重启Docker，就会遇到下面的错误信息。

> Error response from daemon: Failed to Setup IP tables: Unable to enable SKIP DNAT rule:  (iptables failed: iptables --wait -t nat -I DOCKER -i br-af6aa0eafdec -j RETURN: iptables: No chain/target/match by that name.

解决方案：关闭防火墙后需要重启 `Docker` 服务，然后再指定 `Kubernetes` 的版本号启动 `minikube` 即可。

```bash
[root@k8s0 local]# systemctl restart docker
[root@k8s0 local]# minikube start --force --kubernetes-version=v1.23.1
* Centos 7.8.2003 上的 minikube v1.26.0
! minikube skips various validations when --force is supplied; this may lead to unexpected behavior
* 自动选择 docker 驱动。其他选项：none, ssh
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* If you are running minikube within a VM, consider using --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/
* Using Docker driver with root privileges
* Starting control plane node minikube in cluster minikube
* Pulling base image ...
    > index.docker.io/kicbase/sta...: 0 B [_____________________] ?% ? p/s 2m1s
! minikube was unable to download gcr.io/k8s-minikube/kicbase:v0.0.32, but successfully downloaded docker.io/kicbase/stable:v0.0.32 as a fallback image
* Creating docker container (CPUs=2, Memory=2200MB) ...
! This container is having trouble accessing https://k8s.gcr.io
* To pull new external images, you may need to configure a proxy: https://minikube.sigs.k8s.io/docs/reference/networking/proxy/
* 正在 Docker 20.10.17 中准备 Kubernetes v1.23.1…
  - Generating certificates and keys ...
  - Booting up control plane ...
  - Configuring RBAC rules ...
* Verifying Kubernetes components...
  - Using image gcr.io/k8s-minikube/storage-provisioner:v5
* Enabled addons: default-storageclass, storage-provisioner
* kubectl not found. If you need it, try: 'minikube kubectl -- get pods -A'
* Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

### 安装kubectl

直接通过 `kubectl` 命令无法访问，可通过 `minikube kubectl` 或者单独安装 `kubectl` ，或者起别名： `alias kubectl="minikube kubectl --"`

下载地址：https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

```bash
[root@k8s0 local]# kubectl get node
-bash: kubectl: 未找到命令
[root@k8s0 local]# minikube kubectl -- get pods -A
NAMESPACE     NAME                               READY   STATUS    RESTARTS       AGE
kube-system   coredns-64897985d-rcrjq            1/1     Running   0              8m31s
kube-system   etcd-minikube                      1/1     Running   0              8m43s
kube-system   kube-apiserver-minikube            1/1     Running   0              8m43s
kube-system   kube-controller-manager-minikube   1/1     Running   0              8m43s
kube-system   kube-proxy-6ffnk                   1/1     Running   0              8m32s
kube-system   kube-scheduler-minikube            1/1     Running   0              8m43s
kube-system   storage-provisioner                1/1     Running   1 (8m9s ago)   8m40s

# 下载安装kubectl
[root@k8s0 local]# curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   154  100   154    0     0    217      0 --:--:-- --:--:-- --:--:--   217
100 43.5M  100 43.5M    0     0  7820k      0  0:00:05  0:00:05 --:--:-- 10.1M
[root@k8s0 local]# install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 查看版本，验证安装
[root@k8s0 local]# kubectl version --client
WARNING: This version information is deprecated and will be replaced with the output from kubectl version --short.  Use --output=yaml|json to get the full version.
Client Version: version.Info{Major:"1", Minor:"24", GitVersion:"v1.24.3", GitCommit:"aef86a93758dc3cb2c658dd9657ab4ad4afc21cb", GitTreeState:"clean", BuildDate:"2022-07-13T14:30:46Z", GoVersion:"go1.18.3", Compiler:"gc", Platform:"linux/amd64"}
Kustomize Version: v4.5.4
```

## minikube基本使用

`kubectl` 是一个用来跟 `K8S` 集群进行交互的命令行工具。显然，这里只有一个节点。

### 常用控制命令

```bash
# 查看节点
[root@k8s0 local]# kubectl get node
NAME       STATUS   ROLES                  AGE   VERSION
minikube   Ready    control-plane,master   10m   v1.23.1

# 启动集群
minikube start

# 停止集群
minikube stop

# 清空集群
minikube delete --all

# 安装集群可视化 Web UI 控制台
minikube dashboard
```

### Dashboard

```bash
[root@k8s0 local]# minikube dashboard
* 正在开启 dashboard ...
  - Using image kubernetesui/dashboard:v2.6.0
  - Using image kubernetesui/metrics-scraper:v1.0.8
* 正在验证 dashboard 运行情况 ...
* Launching proxy ...
* 正在验证 proxy 运行状况 ...

http://127.0.0.1:36124/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/

# 新开一个tab
[root@k8s0 ~]# kubectl proxy --port=8000 --address='192.168.44.142' --accept-hosts='^.*' &
```

然后通过链接访问：http://192.168.44.142:8000/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/#/workloads?namespace=default

![2022-09-03-KubernetesDashboard.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-09-03-KubernetesDashboard.jpg)

### 部署应用

```bash
# 根据官方文档，部署一个已有应用
[root@k8s0 ~]# kubectl create deployment hello-minikube --image=k8s.gcr.io/echoserver:1.4

# 查看pod
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS             RESTARTS   AGE
hello-minikube-7bc9d7884c-bz4q8   0/1     ImagePullBackOff   0          51s

# 状态错误：ErrImagePull
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS         RESTARTS   AGE
hello-minikube-7bc9d7884c-bz4q8   0/1     ErrImagePull   0          56s

# 排查原因，查看事件
[root@k8s0 ~]# kubectl get events
5m43s       Warning   Failed                    pod/hello-minikube-7bc9d7884c-bz4q8    Error: ErrImagePull
5m32s       Normal    BackOff                   pod/hello-minikube-7bc9d7884c-bz4q8    Back-off pulling image "k8s.gcr.io/echoserver:1.4"
5m32s       Warning   Failed                    pod/hello-minikube-7bc9d7884c-bz4q8    Error: ImagePullBackOff
6m52s       Warning   Failed                    pod/hello-minikube-7bc9d7884c-bz4q8    Failed to pull image "k8s.gcr.io/echoserver:1.4": rpc error: code = Unknown desc = Error response from daemon: Get "https://k8s.gcr.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
49m         Normal    SuccessfulCreate          replicaset/hello-minikube-7bc9d7884c   Created pod: hello-minikube-7bc9d7884c-bz4q8
49m         Normal    ScalingReplicaSet         deployment/hello-minikube              Scaled up replica set hello-minikube-7bc9d7884c to 1
```

从事件信息中可以看到，拉取镜像失败，怀疑是网络问题。以下我们改为国内容器镜像进行拉取部署。

```bash
# 先删除deployment和pod
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS         RESTARTS   AGE
hello-minikube-7bc9d7884c-bz4q8   0/1     ErrImagePull   0          41m

[root@k8s0 ~]# kubectl get deployment
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
hello-minikube   0/1     1            0           44m
[root@k8s0 ~]# kubectl delete deployment hello-minikube
deployment.apps "hello-minikube" deleted
[root@k8s0 ~]# kubectl get deployment
No resources found in default namespace.
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS        RESTARTS   AGE
hello-minikube-7bc9d7884c-bz4q8   0/1     Terminating   0          45m
[root@k8s0 ~]# kubectl get pod
No resources found in default namespace.

# 更改为国内镜像，重新部署应用，成功
[root@k8s0 ~]# kubectl create deployment hello-minikube --image=registry.cn-hangzhou.aliyuncs.com/google_containers/echoserver:1.4
deployment.apps/hello-minikube created
[root@k8s0 ~]# kubectl get deployment
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
hello-minikube   0/1     1            0           12s
[root@k8s0 ~]# kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
hello-minikube-58647b77b8-srpbq   1/1     Running   0          18s
```

### 暴露并访问服务

```bash
# 将部署暴露为服务
[root@k8s0 ~]# minikube service hello-minikube
|-----------|----------------|-------------|---------------------------|
| NAMESPACE |      NAME      | TARGET PORT |            URL            |
|-----------|----------------|-------------|---------------------------|
| default   | hello-minikube |        8080 | http://192.168.76.2:31061 |
|-----------|----------------|-------------|---------------------------|
* 正通过默认浏览器打开服务 default/hello-minikube...
  http://192.168.76.2:31061

# 查看所有服务
[root@k8s0 ~]# kubectl get services
NAME             TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
hello-minikube   NodePort    10.107.201.188   <none>        8080:31061/TCP   34d
kubernetes       ClusterIP   10.96.0.1        <none>        443/TCP          34d

# 查看指定服务
[root@k8s0 ~]# kubectl get services hello-minikube
NAME             TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
hello-minikube   NodePort   10.107.201.188   <none>        8080:31061/TCP   34d

# 访问服务
[root@k8s0 ~]# curl http://192.168.76.2:31061
CLIENT VALUES:
client_address=172.17.0.1
command=GET
real path=/
query=nil
request_version=1.1
request_uri=http://192.168.76.2:8080/

SERVER VALUES:
server_version=nginx: 1.10.0 - lua: 10001

HEADERS RECEIVED:
accept=*/*
host=192.168.76.2:31061
user-agent=curl/7.29.0
BODY:
-no body in request-
```

## Reference

* [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/)
* [https://github.com/kubernetes/minikube/issues/14477](https://github.com/kubernetes/minikube/issues/14477)
---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
