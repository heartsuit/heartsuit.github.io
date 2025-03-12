---
layout: post
title: 云原生之容器编排实践-kubectl get pod -A没有coredns
tags: Kubernetes
---

## 背景

前面搭建的3节点 `Kubernetes` 集群，其实少了一个组件： `CoreDNS` ，这也是我后面拿 `ruoyi-cloud` 项目练手时，部署了 `MySQL` 和 `Nacos` 服务后才意识到的：**发现Nacos无法通过服务名连接MySQL**，这里 `Nacos` 选择使用 `MySQL` 进行配置数据的持久化。

初步分析，这可能是 `K8S` 内部的域名解析有问题，通过 `kubectl get pod -A` 一看，还真没有 `coredns` 。

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

## 下载coredns的YAML文件

从 `GitHub` 上下载：https://github.com/coredns/deployment/blob/master/kubernetes/coredns.yaml.sed

修改了以下两处：**ready下的kubernetes**，具体见下图：
* forward
* clusterIP

![2024-02-24-CoreDNS1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-24-CoreDNS1.jpg)

![2024-02-24-CoreDNS2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-24-CoreDNS2.jpg)

Note：修改上面 `coredns.yaml` 时，主要参考了 `/var/lib/kubelet/config.yaml` 文件，即： `clusterDNS` 和 `clusterDomain` 。

```bash
[root@k8s-master coredns]# cat /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 0s
    cacheUnauthorizedTTL: 0s
cgroupDriver: systemd
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
cpuManagerReconcilePeriod: 0s
evictionPressureTransitionPeriod: 0s
fileCheckFrequency: 0s
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 0s
imageMinimumGCAge: 0s
kind: KubeletConfiguration
logging: {}
nodeStatusReportFrequency: 0s
nodeStatusUpdateFrequency: 0s
rotateCertificates: true
runtimeRequestTimeout: 0s
shutdownGracePeriod: 0s
shutdownGracePeriodCriticalPods: 0s
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 0s
syncFrequency: 0s
volumeStatsAggPeriod: 0s
```

## 查看coredns状态

改好了 `coredns.yaml` 资源文件， `apply` 之后，查看下 `coredns` 状态信息。

```bash
# 安装coredns
[root@k8s-master coredns]# kubectl apply -f coredns.yaml

# 获取所有Pod，发现多了一个coredns-9545f45dc-tf9wd
[root@k8s-master coredns]# kubectl get pod -A
NAMESPACE              NAME                                         READY   STATUS    RESTARTS   AGE
kube-system            calico-kube-controllers-577f77cb5c-hv29w     1/1     Running   3          22d
kube-system            calico-node-4fkrs                            1/1     Running   2          22d
kube-system            calico-node-d4tqq                            1/1     Running   3          22d
kube-system            calico-node-sdmm6                            1/1     Running   6          22d
kube-system            coredns-9545f45dc-tf9wd                      1/1     Running   1          17d
kube-system            etcd-k8s-master                              1/1     Running   10         23d
kube-system            kube-apiserver-k8s-master                    1/1     Running   10         23d
kube-system            kube-controller-manager-k8s-master           1/1     Running   10         23d
kube-system            kube-proxy-4789z                             1/1     Running   2          23d
kube-system            kube-proxy-7mt7k                             1/1     Running   6          23d
kube-system            kube-proxy-lqtpz                             1/1     Running   3          23d
kube-system            kube-scheduler-k8s-master                    1/1     Running   11         23d

# 获取服务，有个kube-dns
[root@k8s-master coredns]# kubectl get svc -n kube-system
NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP,9153/TCP   17d
```

## 验证coredns服务

验证 `coredns` 服务是否真正安装成功的一种方法是在 `busybox` 容器中使用 `nslookup` 进行域名解析测试。

```bash
# 编辑busybox资源文件
[root@k8s-master coredns]# vi busybox.yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox
spec:
  containers:
  - image: busybox:1.28.3
    name: busybox
    command:
    - /bin/sh
    - -c
    - 'sleep 3600'

# 应用部署busybox
[root@k8s-master coredns]# kubectl apply -f busybox.yaml 
pod/busybox created

# 进入busybox容器内部，使用nslookup命令解析域名：ruoyi-nacos.ruoyi-basic，ruoyi-mysql.ruoyi-basic
[root@k8s-master coredns]# kubectl exec -it pod/busybox -- /bin/sh
/ # nslookup ruoyi-nacos.ruoyi-basic
Server:    10.96.0.10
Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local

Name:      ruoyi-nacos.ruoyi-basic
Address 1: 10.96.126.233 ruoyi-nacos.ruoyi-basic.svc.cluster.local

/ # nslookup ruoyi-mysql.ruoyi-basic
Server:    10.96.0.10
Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local

Name:      ruoyi-mysql.ruoyi-basic
Address 1: 10.96.58.67 ruoyi-mysql.ruoyi-basic.svc.cluster.local
```

使用 `nslookup` 命令解析域名，如果得到了 `Address` 信息，则表名域名解析成功，其中， `ruoyi-basic` 是 `namespace` 。
Note： `K8S` 集群的域名一般为 `.svc.cluster.local` 。例如，如果 `Service` 名称为 `my-service` ，在默认的 `default` 命名空间下，则完整的 `Service` 域名为 `my-service.default.svc.cluster.local` 。

## K8S集群内服务间调用

这里以 `Nacos` 服务连接 `MySQL` 服务为例，说明集群内部的服务如何互访，在 `Nacos` 的配置文件 `application.properties` 中连接 `MySQL` 时，由于这两个服务是在同一个命名空间下，所以使用 `ruoyi-mysql.ruoyi-basic` 的方式即可成功连接到 `MySQL` 。

> db.url.0=jdbc:mysql://ruoyi-mysql.ruoyi-basic:3306/ruoyi-config?characterEncoding=utf8&connectTimeout=20000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC

## 小总结

以上记录了当 `K8S` 集群内的 `coredns` 服务未能成功安装时的解决方案，并说明了如何验证 `coredns` 服务是否安装成功，最后，我们了解了 `K8S` 集群内部服务之间调用的方式。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
