---
layout: post
title: 云原生之容器编排实践-ruoyi-cloud项目部署到K8S：网关服务、认证服务与系统服务
tags: Kubernetes
---

## 背景

前面搭建好了 `Kubernetes` 集群与私有镜像仓库，终于要进入服务编排的实践环节了。本系列拿 `ruoyi-cloud` 项目进行练手，按照 `MySQL` ， `Nacos` ， `Redis` ， `Nginx` ， `Gateway` ， `Auth` ， `System` 的顺序来部署 `ruoyi-cloud` 微服务应用。

部署一个服务前，需要明确它是有状态服务还是无状态服务，这里 `MySQL` ， `Nacos` ， `Redis` ， `Nginx` 当做有状态服务（StatefulSet）来部署；而 `Gateway` ， `Auth` ， `System` 这些微服务作为无状态服务（Deployment）来部署。

这一次对全部服务采用 `YAML` 文件的方式来进行部署，这有助于理解K8S组织管理资源的风格，后续我们可以借助开源的容器平台，eg： `KubeSphere` 来进行可视化的服务部署。不过，手动编写 `YAML` 文件有一个问题，那就是当面对较多的微服务时，工作量较大，基本成了体力活；有个好消息是，我们可以使用 `Kubernetes` 官方提供的 `kompose` 工具，实现对 `dokcer-compose` 的 `yaml` 到 `K8S` 的 `yaml` 的转换。

另外，为了保证后续在实际生产环境下各组件的稳定与可靠，我们限定了所有基础镜像的版本。
* MySQL: 8.0
* Nacos: 2.2.3
* Redis: 7.2.3
* Nginx: 1.25.3

作为演示，这里仅部署网关服务、认证服务与系统服务这三个核心服务，有了这三个服务，配合 `Nginx` 代理的前端服务，便完成了 `ruoyi-cloud` 微服务项目的部署；与前面几个依赖服务（ `MySQL` ， `Nacos` ， `Redis` ）不同的是：
1. 基于若依自带的Dockerfile，对网关服务、认证服务与系统服务这3个服务进行构建；
2. 用到了私有镜像仓库，将上一步得到的新Nginx镜像Push到私有镜像仓库，方便在K8S集群内部的不同实例之间进行镜像共享；
3. 由于私有镜像仓库配置了认证信息，则在其他的节点拉取镜像时，需要配置 `imagePullSecrets`；
4. 网关服务、认证服务与系统服务以无状态服务（Deployment，方便进行弹性伸缩）来部署，仅在集群内部通信即可，无需暴露Service端口；此外也无需创建PV、PVC，没有数据持久化相关的配置。

## 虚机资源

共用到了三台虚机，1台作为 `Master` 节点，2台 `Worker` 节点。

| 主机名      | IP            | 说明 |
| ---------- | ------------- | ------- |
| k8s-master | 192.168.44.25 | 主节点   |
| k8s-node1  | 192.168.44.26 | 工作节点 |
| k8s-node2  | 192.168.44.27 | 工作节点 |

```bash
[root@k8s-master ~]# kubectl get nodes
NAME         STATUS   ROLES                  AGE   VERSION
k8s-master   Ready    control-plane,master   37h   v1.20.9
k8s-node1    Ready    <none>                 35h   v1.20.9
k8s-node2    Ready    <none>                 35h   v1.20.9
```

## 系统环境

```bash
[root@k8s-master ~]# uname -a
Linux k8s-master 3.10.0-1160.71.1.el7.x86_64 #1 SMP Tue Jun 28 15:37:28 UTC 2022 x86_64 x86_64 x86_64 GNU/Linux
[root@k8s-master ~]# cat /proc/version 
Linux version 3.10.0-1160.71.1.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-44) (GCC) ) #1 SMP Tue Jun 28 15:37:28 UTC 2022
[root@k8s-master ~]# cat /etc/redhat-release
CentOS Linux release 7.9.2009 (Core)
```

## YAML转换

`ruoyi-cloud` 项目本身提供了一个使用 `docker-compose` 部署的配置文件以及所有依赖服务镜像的构建脚本，是在项目根目录的 `docker` 目录下，可参考[Docker容器化部署若依微服务ruoyi-cloud项目](https://heartsuit.blog.csdn.net/article/details/134613312)。

先将这个 `docker` 目录上传到 `Kubernetes` 的主节点，然后使用 `kompose` 将 `dokcer-compose` 的 `yaml` 转换为 `K8S` 的 `yaml` 。

```bash
curl -L https://github.com/kubernetes/kompose/releases/download/v1.26.0/kompose-linux-amd64 -o kompose
chmod +x kompose
mv ./kompose /usr/local/bin/kompose
[root@k8s-master docker]# cd /opt/docker
[root@k8s-master docker]# kompose convert
```

对于自动转换后的 `YAML` ，我们做简单的修改后即可应用部署。这里就通过手动方式先创建 `NameSpace` ： `kubectl create namespace ruoyi-service` ，后续的无状态服务都部署到这个命名空间下。

* ruoyi-gateway-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.26.0 (40646f47)
  labels:
    io.kompose.service: ruoyi-gateway
  name: ruoyi-gateway
  namespace: ruoyi-service
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: ruoyi-gateway
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert
        kompose.version: 1.26.0 (40646f47)
      labels:
        io.kompose.service: ruoyi-gateway
    spec:
      imagePullSecrets:
        - name: ruoyi-registry-secret    
      containers:
        - image: 10.96.198.223:5000/ruoyi-gateway:1
          name: ruoyi-gateway
          ports:
            - containerPort: 8081
      restartPolicy: Always
```

* ruoyi-auth-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.26.0 (40646f47)
  labels:
    io.kompose.service: ruoyi-auth
  name: ruoyi-auth
  namespace: ruoyi-service
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: ruoyi-auth
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert
        kompose.version: 1.26.0 (40646f47)
      labels:
        io.kompose.service: ruoyi-auth
    spec:
      imagePullSecrets:
        - name: ruoyi-registry-secret           
      containers:
        - image: 10.96.198.223:5000/ruoyi-auth:2
          name: ruoyi-auth
          ports:
            - containerPort: 9200
      restartPolicy: Always
```

* ruoyi-modules-system-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.26.0 (40646f47)
  labels:
    io.kompose.service: ruoyi-modules-system
  name: ruoyi-modules-system
  namespace: ruoyi-service
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: ruoyi-modules-system
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert
        kompose.version: 1.26.0 (40646f47)
      labels:
        io.kompose.service: ruoyi-modules-system
    spec:
      imagePullSecrets:
        - name: ruoyi-registry-secret        
      containers:
        - image: 10.96.198.223:5000/ruoyi-module-system:1
          name: ruoyi-modules-system
          ports:
            - containerPort: 9201
      restartPolicy: Always
```

Note: 为了在不同的节点上可以拉取到镜像，需要配置：

```yaml
    spec:
      imagePullSecrets:
        - name: ruoyi-registry-secret
```

部署自定义的无状态服务，基本的步骤为：
1. 构建镜像并推送镜像到私有仓库；
2. 应用上面编写的YAML，完成无状态服务部署；
3. 验证服务是否成功启动。

Note: 对于每一个服务，记得修改 `bootstrap.yml` 与 `Nacos` 配置中心的服务连接信息：**使用服务名访问**。
* bootstrap.yml
server-addr: ruoyi-nacos.ruoyi-basic:8848

* Nacos配置中心

```yaml
# 连接Redis
spring:
  redis:
    host: ruoyi-redis.ruoyi-basic
    port: 6379
    password: you-guess

# 连接数据库
            url: jdbc:mysql://ruoyi-mysql.ruoyi-basic:3306/ruoyi-cloud?useUnicode=true&characterEncoding=utf8&zeroDateTimeBehavior=convertToNull&useSSL=true&serverTimezone=GMT%2B8
            username: root
            password: you-guess
```

## 部署网关服务

### 构建并推送镜像到私有仓库

将若依项目的 `docker` 目录上传虚机上，在 `Dockerfile` 所在目录执行 `docker build -t 镜像名称:版本 .` 。

```bash
# 登录至私有镜像仓库
docker login -uusername -ppassword 10.96.198.223:5000

# 构建镜像
[root@k8s-master gateway]# docker build -t ruoyi-gateway:1 .

# 打标签
[root@k8s-master gateway]# docker tag ruoyi-gateway:1 10.96.198.223:5000/ruoyi-gateway:1

# 推送至私有仓库
[root@k8s-master gateway]# docker push 10.96.198.223:5000/ruoyi-gateway:1

# 查看是否上传成功
[root@k8s-master gateway]# curl -u username:password http://10.96.198.223:5000/v2/_catalog
{"repositories":["hello-world","ruoyi-gateway","ruoyi-nginx"]}
```

### 应用YAML文件

```bash
# 部署gateway
[root@k8s-master gateway]# kubectl apply -f ruoyi-gateway-deployment.yaml 
deployment.apps/ruoyi-gateway created

# 查看所有Pod，gateway就绪
[root@k8s-master gateway]# kubectl get pod -A
NAMESPACE              NAME                                         READY   STATUS             RESTARTS   AGE
default                busybox                                      1/1     Running            24         23h
docker-registry        docker-registry-9bc898786-l477q              1/1     Running            2          2d3h
kube-system            calico-kube-controllers-577f77cb5c-hv29w     1/1     Running            3          5d7h
kube-system            calico-node-4fkrs                            1/1     Running            2          5d7h
kube-system            calico-node-d4tqq                            1/1     Running            3          5d7h
kube-system            calico-node-sdmm6                            1/1     Running            6          5d7h
kube-system            coredns-9545f45dc-tf9wd                      1/1     Running            1          22h
kube-system            etcd-k8s-master                              1/1     Running            10         6d18h
kube-system            kube-apiserver-k8s-master                    1/1     Running            10         6d18h
kube-system            kube-controller-manager-k8s-master           1/1     Running            10         6d18h
kube-system            kube-proxy-4789z                             1/1     Running            2          6d18h
kube-system            kube-proxy-7mt7k                             1/1     Running            6          6d18h
kube-system            kube-proxy-lqtpz                             1/1     Running            3          6d18h
kube-system            kube-scheduler-k8s-master                    1/1     Running            11         6d18h
kubernetes-dashboard   dashboard-metrics-scraper-79c5968bdc-j9bnv   1/1     Running            3          5d7h
kubernetes-dashboard   kubernetes-dashboard-658485d5c7-pq7z8        1/1     Running            2          5d7h
ruoyi-basic             ruoyi-mysql-8c779d94c-b7r9n                   1/1     Running            1          33h
ruoyi-basic             ruoyi-nacos-0                                 1/1     Running            1          22h
ruoyi-basic             ruoyi-nginx-0                                 1/1     Running   		   13         44m
ruoyi-basic             ruoyi-redis-0                                 1/1     Running            0          8h
ruoyi-service           ruoyi-gateway-664795d7d-xrfqz                 1/1     Running            0          84s

# 配置文件没改动，单纯想重新运行
[root@k8s-master gateway]# kubectl rollout restart deployment ruoyi-gateway -n ruoyi-service
deployment.apps/ruoyi-gateway restarted

# 配置文件有改动，先删除
[root@k8s-master gateway]# kubectl delete -f ruoyi-gateway-deployment.yaml 
# 配置文件有改动，重新部署
[root@k8s-master gateway]# kubectl apply -f ruoyi-gateway-deployment.yaml 
```

### 验证网关服务

直接通过浏览器访问 `Nacos` 的服务列表，看有没有注册成功。

![2024-03-10-Gateway.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-03-10-Gateway.jpg)

## 部署认证服务

### 构建并推送镜像到私有仓库

将若依项目的 `docker` 目录上传虚机上，在 `Dockerfile` 所在目录执行 `docker build -t 镜像名称:版本 .` 。

```bash
# 登录至私有镜像仓库
docker login -uusername -ppassword 10.96.198.223:5000

# 构建镜像
[root@k8s-master auth]# docker build -t ruoyi-auth:2 .

# 打标签
[root@k8s-master auth]# docker tag ruoyi-auth:2 10.96.198.223:5000/ruoyi-auth:2

# 推送至私有仓库
[root@k8s-master auth]# docker push 10.96.198.223:5000/ruoyi-auth:2

# 查看是否上传成功
[root@k8s-master auth]# curl -u username:password http://10.96.198.223:5000/v2/_catalog
{"repositories":["hello-world","ruoyi-auth","ruoyi-gateway","ruoyi-nginx"]}
```

### 应用YAML文件

```bash
# 部署auth
[root@k8s-master auth]# kubectl apply -f ruoyi-auth-deployment.yaml 
deployment.apps/ruoyi-auth created

# 调整副本数
[root@k8s-master auth]# kubectl scale deployment ruoyi-auth --replicas=2 -n ruoyi-service
[root@k8s-master auth]# kubectl get pod -A
NAMESPACE              NAME                                         READY   STATUS    RESTARTS   AGE
default                busybox                                      1/1     Running   452        18d
docker-registry        docker-registry-9bc898786-l477q              1/1     Running   2          19d
kube-system            calico-kube-controllers-577f77cb5c-hv29w     1/1     Running   3          23d
kube-system            calico-node-4fkrs                            1/1     Running   2          23d
kube-system            calico-node-d4tqq                            1/1     Running   3          23d
kube-system            calico-node-sdmm6                            1/1     Running   6          23d
kube-system            coredns-9545f45dc-tf9wd                      1/1     Running   1          18d
kube-system            etcd-k8s-master                              1/1     Running   10         24d
kube-system            kube-apiserver-k8s-master                    1/1     Running   10         24d
kube-system            kube-controller-manager-k8s-master           1/1     Running   10         24d
kube-system            kube-proxy-4789z                             1/1     Running   2          24d
kube-system            kube-proxy-7mt7k                             1/1     Running   6          24d
kube-system            kube-proxy-lqtpz                             1/1     Running   3          24d
kube-system            kube-scheduler-k8s-master                    1/1     Running   11         24d
kubernetes-dashboard   dashboard-metrics-scraper-79c5968bdc-j9bnv   1/1     Running   3          23d
kubernetes-dashboard   kubernetes-dashboard-658485d5c7-pq7z8        1/1     Running   2          23d
ruoyi-basic             ruoyi-mysql-8c779d94c-b7r9n                   1/1     Running   1          19d
ruoyi-basic             ruoyi-nacos-0                                 1/1     Running   1          18d
ruoyi-basic             ruoyi-nginx-0                                 1/1     Running   0          17d
ruoyi-basic             ruoyi-redis-0                                 1/1     Running   0          18d
ruoyi-service           ruoyi-auth-794bb8f5d4-kqt2m                   1/1     Running   0          11s
ruoyi-service           ruoyi-auth-794bb8f5d4-pxmxg                   1/1     Running   0          11s
ruoyi-service           ruoyi-gateway-664795d7d-xrfqz                 1/1     Running   0          17d

# 配置文件没改动，单纯想重新运行
[root@k8s-master auth]# kubectl rollout restart deployment ruoyi-auth -n ruoyi-service
deployment.apps/ruoyi-auth restarted

# 配置文件有改动，先删除
[root@k8s-master auth]# kubectl delete -f ruoyi-auth-deployment.yaml 
# 配置文件有改动，重新部署
[root@k8s-master auth]# kubectl apply -f ruoyi-auth-deployment.yaml 
```

### 验证认证服务

直接通过浏览器访问 `Nacos` 的服务列表，看有没有注册成功。

![2024-03-10-Auth.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-03-10-Auth.jpg)

## 部署系统服务

### 构建并推送镜像到私有仓库

将若依项目的 `docker` 目录上传虚机上，在 `Dockerfile` 所在目录执行 `docker build -t 镜像名称:版本 .` 。

```bash
# 登录至私有镜像仓库
docker login -uusername -ppassword 10.96.198.223:5000

# 构建镜像
[root@k8s-master system]# docker build -t ruoyi-module-system:1 .

# 打标签
[root@k8s-master system]# docker tag ruoyi-module-system:1 10.96.198.223:5000/ruoyi-module-system:1

# 推送至私有仓库
[root@k8s-master system]# docker push 10.96.198.223:5000/ruoyi-module-system:1

# 查看是否上传成功
[root@k8s-master system]# curl -u username:password http://10.96.198.223:5000/v2/_catalog
{"repositories":["hello-world","ruoyi-auth","ruoyi-gateway","ruoyi-module-system","ruoyi-nginx"]}
```

### 应用YAML文件

```bash
# 部署system
[root@k8s-master system]# kubectl apply -f ruoyi-modules-system-deployment.yaml 
deployment.apps/ruoyi-modules-system created

# 查看所有Pod，system就绪
[root@k8s-master system]# kubectl get pod -A
NAMESPACE              NAME                                         READY   STATUS    RESTARTS   AGE
default                busybox                                      1/1     Running   453        18d
docker-registry        docker-registry-9bc898786-l477q              1/1     Running   2          20d
kube-system            calico-kube-controllers-577f77cb5c-hv29w     1/1     Running   3          23d
kube-system            calico-node-4fkrs                            1/1     Running   2          23d
kube-system            calico-node-d4tqq                            1/1     Running   3          23d
kube-system            calico-node-sdmm6                            1/1     Running   6          23d
kube-system            coredns-9545f45dc-tf9wd                      1/1     Running   1          18d
kube-system            etcd-k8s-master                              1/1     Running   10         24d
kube-system            kube-apiserver-k8s-master                    1/1     Running   10         24d
kube-system            kube-controller-manager-k8s-master           1/1     Running   10         24d
kube-system            kube-proxy-4789z                             1/1     Running   2          24d
kube-system            kube-proxy-7mt7k                             1/1     Running   6          24d
kube-system            kube-proxy-lqtpz                             1/1     Running   3          24d
kube-system            kube-scheduler-k8s-master                    1/1     Running   11         24d
kubernetes-dashboard   dashboard-metrics-scraper-79c5968bdc-j9bnv   1/1     Running   3          23d
kubernetes-dashboard   kubernetes-dashboard-658485d5c7-pq7z8        1/1     Running   2          23d
ruoyi-basic             ruoyi-mysql-8c779d94c-b7r9n                   1/1     Running   1          19d
ruoyi-basic             ruoyi-nacos-0                                 1/1     Running   0          13m
ruoyi-basic             ruoyi-nginx-0                                 1/1     Running   0          17d
ruoyi-basic             ruoyi-redis-0                                 1/1     Running   0          18d
ruoyi-service           ruoyi-auth-794bb8f5d4-kqt2m                   1/1     Running   0          38m
ruoyi-service           ruoyi-auth-794bb8f5d4-pxmxg                   1/1     Running   0          38m
ruoyi-service           ruoyi-gateway-664795d7d-xrfqz                 1/1     Running   0          17d
ruoyi-service           ruoyi-modules-system-5f9f8dc5fc-lg7ts         1/1     Running   5          7m52s

# 配置文件没改动，单纯想重新运行
[root@k8s-master system]# kubectl rollout restart deployment ruoyi-modules-system -n ruoyi-service
deployment.apps/ruoyi-modules-system restarted

# 配置文件有改动，先删除
[root@k8s-master system]# kubectl delete -f ruoyi-modules-system-deployment.yaml 
# 配置文件有改动，重新部署
[root@k8s-master system]# kubectl apply -f ruoyi-modules-system-deployment.yaml 
```

### 验证系统服务

直接通过浏览器访问 `Nacos` 的服务列表，看有没有注册成功。

![2024-03-10-System.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-03-10-System.jpg)

## 小总结

本文介绍了如何将 `ruoyi-cloud` 项目部署到 `Kubernetes` 集群中，包括网关服务、认证服务和系统服务。首先，根据服务的特性将它们分为有状态服务和无状态服务，并采用 `YAML` 文件进行部署。通过 `kompose` 工具将 `docker-compose` 的配置转换为 `Kubernetes` 的配置，简化了部署过程，之后可以通过前面 `Nginx` 暴露的服务端口进行访问。

部署过程中，首先需要构建服务的 `Docker` 镜像，并将其推送到私有镜像仓库。为了在 `Kubernetes` 集群中的不同节点上拉取镜像，需要配置 `imagePullSecrets` 。接着，通过应用修改后的 `YAML` 文件来部署服务，并通过 `kubectl` 命令管理服务的部署状态。

部署的具体步骤包括：
1. 构建服务的Docker镜像并推送到私有镜像仓库。
2. 应用YAML文件，完成服务的部署。
3. 验证服务是否成功注册到Nacos服务列表中。

此外，还需要注意修改服务配置文件中的 `Nacos` 配置中心的服务连接信息，确保服务能够正确连接到 `Nacos` 、 `Redis` 和 `MySQL` 等依赖服务。

通过上述步骤，可以实现 `ruoyi-cloud` 项目的容器化部署和管理，利用 `Kubernetes` 的弹性伸缩和服务管理能力，提高服务的可用性和可维护性。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
