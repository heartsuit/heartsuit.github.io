---
layout: post
title: 云原生之容器编排实践-SpringBoot应用以YAML描述文件部署pod到minikube
tags: CloudNative, Docker, Kubernetes
---

## 背景

在 `Kubernetes` 中，启动一个 `Pod` 最直接的方式是通过 `kubectl run` 命令；而在实际生产环境下，我们通常是使用 `yaml` 描述文件。

## yaml描述启动Pod

熟悉 `SpringBoot` 的同学们肯定对 `yaml` 描述文件不陌生，其实就类似于 `properties` 、 `json` 文件的展现方式，这几个之间是可以[相互转换](http://www.toxcode.cn/json-yaml)的。其中，最关键的配置项为 `kind` ，我们设置其为 `Pod` 即表示以 `Pod` 方式启动；此外我们还在 `spec` 下指定了要拉取的镜像地址 `containers.image` 以及拉取镜像的秘钥 `imagePullSecrets.name` 。

![2022-10-04-Yaml2JSON.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-04-Yaml2JSON.jpg)

* cloud-native.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cloud-native
spec:
  containers:
    - name: cloud-native
      image: registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
  imagePullSecrets:
    - name: aliyunregistry
```

然后，应用以上描述文件 `kubectl apply -f cloud-native.yaml` 即可新启动一个 `Pod` 并部署到 `minikube` 。

```bash
[root@k8s0 ~]# kubectl apply -f cloud-native.yaml
pod/cloud-native created
```

Note: 重点关注 `imagePullSecrets` ，根据指定的秘钥完成从阿里云私有镜像仓库的拉取操作，具体可参考：[minikube传递秘钥使用阿里云私有镜像仓库](https://blog.csdn.net/u013810234/article/details/126693003)

## 进一步了解Pod

* 查看pod的IP地址

通过 `-o wide` 可以查看 `Pod` 的 `IP` 地址以及所在的节点，显然我们这里的节点为 `minikube` 。

```bash
[root@k8s0 ~]# kubectl get pods -o wide
NAME                              READY   STATUS    RESTARTS         AGE   IP           NODE       NOMINATED NODE   READINESS GATES
cloud-native                      1/1     Running   9 (3m20s ago)    40d   172.17.0.3   minikube   <none>           <none>
```

* 端口转发

容器内部端口为8080，这里将容器内部的端口8080转发至本机的9090。

```bash
[root@k8s0 ~]# kubectl port-forward cloud-native 8090:8080
```

* 查看日志

新开一个 `Tab` 建立连接，测试我们部署的 `Pod` 中的服务接口，并查看实时的日志信息。

```bash
# 查看最近日志
[root@k8s0 ~]# kubectl logs pod/cloud-native

# 查看实时滚动日志
[root@k8s0 ~]# kubectl logs pod/cloud-native -f

# 通过转发的端口发起请求
[root@k8s0 ~]# curl http://localhost:8090/hello?name=9
```

![2022-10-04-TestService.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-04-TestService.jpg)

## 小总结

关于 `Pod` ，以下知识点值得注意。

1. 一个`Pod`中可以有多个容器。
2. 一个 `Pod` 是一组紧密相关的容器，它们总是一起运行在同一个工作节点上，以及同一个 `Linux` 命名空间中。每个 `Pod` 就像一个独立的逻辑机器，拥有自己的`IP`、主机名、进程等，运行一个独立的应用程序。
3. 当一个`Pod`包含多个容器时，这些容器总是运行于同一个工作节点上，一个`Pod`绝不会跨越多个工作节点。
4. `Kubenetes` 集群中的所有`Pod`都在同一个共享网络地址空间中，这意味着每个`Pod`都可以通过其他`Pod`的`IP`地址来实现相互访问。 
5. 当决定是将两个容器放入一个`Pod`还是两个单独的`Pod`时，我们需要问自己以下问题：
   * 它们需要一起运行还是可以在不同的主机上运行？
   * 它们代表的是一个整体还是相互独立的组件？
   * 它们必须一起进行扩缩容还是可以分别进行？

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
