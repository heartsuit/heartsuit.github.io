---
layout: post
title: 云原生之容器编排实践-minikube传递秘钥使用阿里云私有镜像仓库
tags: CloudNative, Docker, Kubernetes
---

## 背景

前面我们提到：

> 有了私有的容器镜像仓库后，当在 `minikube` 或者 `Kubernetes` 中拉取私有容器镜像仓库的镜像时，并不能直接拉取，还需要进行认证秘钥信息的配置，这在后续文章中会专门介绍到。

那么，今天在这里就实践下通过 `kubectl run` 命令与 `以YAML描述文件部署pod` 两种方式下如何指定镜像拉取的密钥，完成从阿里云私有镜像仓库的拉取操作，然后部署到 `minikube` 。

## 直接拉取报错

直接通过 `kubectl run` 命令运行一个 `pod` ，镜像来自我们前面上传到阿里云私有镜像仓库。然后报错了 `ErrImagePull` ，通过查看事件信息了解具体的报错信息。

Note：如果你的镜像仓库是公开的，那么直接 `kubectl run` 没啥问题。

```bash
# 直接kubectl run
[root@k8s0 ~]# kubectl run cloud-native --image=registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
pod/cloud-native created

# 查看pod，发现拉取镜像错误ErrImagePull
[root@k8s0 ~]# kubectl get pods
NAME                              READY   STATUS         RESTARTS        AGE
cloud-native                      0/1     ErrImagePull   0               14s
hello-minikube-58647b77b8-srpbq   1/1     Running        5 (2m43s ago)   30d

# 查看事件，了解到底发生了什么
[root@k8s0 ~]# kubectl get events
LAST SEEN   TYPE      REASON                                             OBJECT                                MESSAGE
25s         Normal    Scheduled                                          pod/cloud-native                      Successfully assigned default/cloud-native to minikube
10s         Normal    Pulling                                            pod/cloud-native                      Pulling image "registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT"
9s          Warning   Failed                                             pod/cloud-native                      Failed to pull image "registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT": rpc error: code = Unknown desc = Error response from daemon: pull access denied for registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub, repository does not exist or may require 'docker login': denied: requested access to the resource is denied
9s          Warning   Failed                                             pod/cloud-native                      Error: ErrImagePull
```

从错误信息看：requested access to the resource is denied，是说我们对镜像资源的访问被拒绝了。

## 添加私有镜像仓库认证信息

显然，我们需要将私有镜像仓库的认证信息以某种方式告诉 `minikube` 或者 `Kubernetes` 。以下命令可以帮我们做这件事： `kubectl create secret`

```bash
# 添加认证信息
[root@k8s0 ~]# kubectl create secret docker-registry aliyunregistry --docker-server=registry.cn-hangzhou.aliyuncs.com --docker-username=heartsuit --docker-password=YourDocker --docker-email=youremail
secret/aliyunregistry created

# 查看我们添加的认证信息：aliyunregistry
[root@k8s0 ~]# kubectl get secret
NAME                  TYPE                                  DATA   AGE
aliyunregistry        kubernetes.io/dockerconfigjson        1      17m
default-token-xgvrt   kubernetes.io/service-account-token   3      30d
```

## kubectl run使用我们添加的秘钥

向 `minikube` 或者 `Kubernetes` 添加好了私有镜像仓库认证信息， `kubectl run` 时能否自动知道这个秘钥信息吗？不幸的是，答案是否定的。但是查看 `kubectl run` 命令的帮助文档（ `kubectl run --help` ），我并没有看到一个选项来指定拉取镜像的密钥，好像无法将镜像的密钥作为运行命令的一部分进行传递。不过，有个强大参数 `--overrides` 可以用来传递秘钥信息。

> --overrides='{ "spec": { "template": { "spec": { "imagePullSecrets": [{"name": "your-registry-secret"}] } } } }'

完整的 `kubectl run` 命令如下，完成携带秘钥从阿里云私有镜像仓库的拉取、部署操作，成功：

```
kubectl run cloud-native1 --image=registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT --overrides='{ "spec": { "template": { "spec": { "imagePullSecrets": [{"name": "aliyunregistry"}] } } } }'
```

## yaml描述文件中使用我们添加的秘钥

其实，上述 `--overrides` 传递参数的方式就是 `yaml` 描述文件中使用的格式，不过是以单行命令的形式出现。实际我们使用 `yaml` 描述时，是以下形式，重点关注 `imagePullSecrets` 。

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

然后，应用以上描述文件 `kubectl apply -f cloud-native.yaml` 即可根据指定的秘钥完成从阿里云私有镜像仓库的拉取操作，然后部署到 `minikube` 。

Note: 

1. 为防止`pod`重名，可删除已有`pod`重新部署或换个名字再部署 `kubectl delete pod cloud-native` 。
2. 这里示例的 `yaml`是使用`Pod`类型来运行的，其他类型的比如：`Deployment`, `Service`运行时关于私有镜像仓库秘钥的指定方式同样是通过`imagePullSecrets`实现的。

## Reference

[https://minikube.sigs.k8s.io/docs/handbook/kubectl/](https://minikube.sigs.k8s.io/docs/handbook/kubectl/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
