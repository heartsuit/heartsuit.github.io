---
layout: post
title: 云原生之容器编排实践-SpringBoot应用以Deployment方式部署到minikube以及弹性伸缩
tags: CloudNative, Docker, Kubernetes
---

## 背景

在实际生产环境下，我们更多的是使用 `yaml` 描述文件来启动一个 `Pod` ，并设置 `kind` 属性值为 `Deployment` 类型。

## Deployment

使用 `Deployment` 来部署应用，重点关注其可以实现应用服务的动态扩缩容。

需要注意的是：应用本身需要支持水平伸缩。 `Kubernetes` 并不会让你的应用变得可扩展，它只是让应用的扩缩容变得简单。

### yaml

```bash
[root@k8s0 ~]# vi cloud-native-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  # 部署名字
  name: cloud-native
spec:
  replicas: 2
  # 用来查找关联的Pod，所有标签都匹配才可以
  selector:
    matchLabels:
      app: cloud-native
  # 定义 Pod 相关数据
  template:
    metadata:
      labels:
        app: cloud-native
    spec:
      # 定义容器，可以多个
      containers:
        - name: cloud-native # 容器名字
          image: registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
      imagePullSecrets:
        - name: aliyunregistry

# 通过yaml描述文件启动deployment
[root@k8s0 ~]# kubectl apply -f cloud-native-deployment.yaml 
deployment.apps/cloud-native created
```

### 查看Kubernetes资源

通过 `yaml` 描述文件启动 `Deployment` 之后，我们可以通过 `kubectl get pods` , `kubectl get deployment` 以及 `kubectl get all` 来观察所发生的变化：根据我们的 `yaml` 配置，会启动两个副本的服务实例。

```bash
[root@k8s0 ~]# kubectl get pods
NAME                              READY   STATUS    RESTARTS      AGE
cloud-native                      1/1     Running   0             48m
cloud-native-684d4d8485-c2zgz     1/1     Running   0             4s
cloud-native-684d4d8485-f7qzm     1/1     Running   0             4s
hello-minikube-58647b77b8-srpbq   1/1     Running   6 (74m ago)   30d

[root@k8s0 ~]# kubectl get deployment
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
cloud-native     2/2     2            2           18s
hello-minikube   1/1     1            1           30d

# 查看所有Kubernetes资源
[root@k8s0 ~]# kubectl get all
```

### 弹性伸缩

可通过 `kubectl scale` 命令的 `--replicas` 参数来实现 `Pod` 副本数的弹性伸缩。需要注意的是，伸缩过程并不是一蹴而就的。我们并不是告诉 `Kubernetes` 需要采取什么行动，也没有告诉 `Kubernetes` 增加3个 `Pod` ，只设置新的期望的实例数量并让 `Kubernetes` 决定需要采取哪些操作来实现期望的状态。这是 `Kubernetes` 基本的原则之一。不是告诉 `Kubernetes` 应该执行什么操作，而是声明性地改变系统的期望状态，并让 `Kubernetes` 检查当前的状态是否与期望的状态一致。在整个 `Kubernetes` 的世界中都是这样的。当指定副本数为5时，那么最终调整得到的结果便是5个副本，不多也不少。

```bash
[root@k8s0 ~]# kubectl scale deployment cloud-native --replicas=5
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS    RESTARTS      AGE
cloud-native                      1/1     Running   0             62m
cloud-native-684d4d8485-c2zgz     1/1     Running   0             14m
cloud-native-684d4d8485-f7qzm     1/1     Running   0             14m
cloud-native-684d4d8485-rsbg7     1/1     Running   0             5s
cloud-native-684d4d8485-s9lkj     1/1     Running   0             5s
cloud-native-684d4d8485-skmtk     1/1     Running   0             5s
hello-minikube-58647b77b8-srpbq   1/1     Running   6 (88m ago)   30d
```

由于一开始我们的副本数配置是2，当指定副本数为5时，我们看到现在的 `Pod` 列表中 `cloud-native` 有3个新增的副本：即Age为5s的那3个。

### 查看Deployment详情

可通过 `kubectl describe` 命令查看 `Pod` 的详细信息，不过其输出内容过长，这里省略了。此外，可通过 `kubectl exec` 类似于 `Docker` 的命令进入到 `Pod` 内部，进行一系列的操作。

```bash
[root@k8s0 ~]# kubectl describe pod cloud-native-684d4d8485-rsbg7

[root@k8s0 ~]# kubectl exec -it cloud-native-684d4d8485-rsbg7 -- sh
```

### 回滚历史版本

时空穿梭，救火专用。

```bash
[root@k8s0 ~]# kubectl rollout history deployment cloud-native
deployment.apps/cloud-native 
REVISION  CHANGE-CAUSE
1         <none>
```

### 删除Deployment

```bash
[root@k8s0 ~]# kubectl delete deployment cloud-native
deployment.apps "cloud-native" deleted
[root@k8s0 ~]# kubectl get pod
NAME                              READY   STATUS    RESTARTS      AGE
cloud-native                      1/1     Running   0             64m
hello-minikube-58647b77b8-srpbq   1/1     Running   6 (90m ago)   30d
```

可以看到名为 `cloud-native` 的 `Deployment` 已被删除，需要注意的是上面还剩下一个名为 `cloud-native` 的 `Pod` ，这是我们上一篇中以 `kind: Pod` 方式启动的，所以删除 `Deployment` 并不会删除这个 `Pod` 。

## Dashboard

![2022-10-05-Dashboard.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-05-Dashboard.jpg)

其实，除了前面通过命令行查看已经运行的 `Deployment` 以及 `Pod` 信息，我们还可以通过 `Kubernetes` 为我们提供的 `Dashboard` 以可视化的方式观测我们运行的 `Kubernetes` 资源信息。访问 `Dashboard` 具体操作方式可参考：[云原生之容器编排实践-在CentOS7上安装minikube](https://blog.csdn.net/u013810234/article/details/126568707?spm=1001.2014.3001.5501)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
