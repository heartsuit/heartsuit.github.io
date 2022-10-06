---
layout: post
title: 云原生之容器编排实践-以k8s的Service方式暴露SpringBoot服务
tags: CloudNative, Docker, Kubernetes
---

## 背景

上一篇文章[云原生之容器编排实践-SpringBoot应用以Deployment方式部署到minikube以及弹性伸缩](https://blog.csdn.net/u013810234/article/details/127176254?spm=1001.2014.3001.5501)中，我们通过 `Deployment` 完成了将 `SpringBoot` 应用部署到 `minikube` 并测试了其弹性伸缩的丝滑体验。但是 `Deployment` 部署后我们还面临以下问题：

* 访问时需要先进行端口转发
* 每次只能访问一个`Pod`，不支持负载均衡将请求路由至不同的`Pod`
* `Pod`重新创建后IP地址与名称均发生变化，显然这在实际生产环境下是无法容忍的

这次我们使用 `Kubernetes` 的 `Service` 来解决上述问题， `Service` 为我们带来了以下特性：

* `Service`通过`Label`标签选择器关联对应的Pod
* `Service`生命周期不跟`Pod`绑定，不会因为`Pod`重新创建改变IP
* 提供了负载均衡功能，自动转发流量到不同`Pod`
* 集群内部可通过服务名字访问(ClusterIP)
* 可对集群外部提供访问端口(NodePort)

今天我们体验下两种类型的 `Service` ：分别为 `ClusterIP` ， `NodePort` 。

创建服务最简单的 方式是通过 `kubectl expose` 命令，结合标签选择器来创建服务资源，实现通过单个 `IP` 和端口来访问所有的 `Pod` 。与 `Deployment` 一样，我们同样可以通过 `YAML` 描述文件调用 `Kubernetes`  `API` 服务来创建 `Service` 。

## ClusterIP

`ClusterIP` 类型的 `Service` 只能在集群内部可以被访问。可以通过端口转发的方式可以在外面访问到集群里的服务。

![2022-10-06-ClusterIP.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-06-ClusterIP.jpg)

### YAML

重点关注类型 `kind: Service` ，以及选择器 `selector.app: cloud-native` 。

```bash
[root@k8s0 service]# vi cloud-native-service.yaml 
apiVersion: v1
kind: Service
metadata:
  name: cloud-native-svc
spec:
  # 用来查找关联的Pod，所有标签都匹配才行
  selector:
    app: cloud-native
  # 默认 ClusterIP 集群内可访问
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080

# 应用配置
[root@k8s0 service]# kubectl apply -f cloud-native-service.yaml 
service/cloud-native-svc created
```

### 获取服务

`service` 可以简写为 `svc` 。

Note: 关于**简写**，在 `Kubernetes` 中通常会用到以下简写。

```
namespaces ns
nodes no
pods po
services svc
deployments deploy
replicationcontrollers rc
replicasets rs
configmaps cm
endpoints ep
events ev
cronjobs cj
persistentvolumeclaims pvc
persistentvolumes pv
```

```bash
[root@k8s0 service]# kubectl get service
NAME               TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
cloud-native-svc   ClusterIP   10.105.254.130   <none>        8080/TCP         9s
hello-minikube     NodePort    10.107.201.188   <none>        8080:31061/TCP   35d
kubernetes         ClusterIP   10.96.0.1        <none>        443/TCP          35d
[root@k8s0 service]# kubectl get svc
NAME               TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
cloud-native-svc   ClusterIP   10.105.254.130   <none>        8080/TCP         43s
hello-minikube     NodePort    10.107.201.188   <none>        8080:31061/TCP   35d
kubernetes         ClusterIP   10.96.0.1        <none>        443/TCP          35d
```

`Service` 服务的默认类型是 `ClusterIP` ，只能在集群内部访问。

可以进入 `Pod` 内访问或者通过端口转发，并且可以通过服务名称或者IP来访问。我的镜像内部没有 `curl` 命令（那么问题来了，镜像里面没有curl命令，怎么破？），就不测试了。

### 转发端口

```bash
[root@k8s0 service]# kubectl port-forward service/cloud-native-svc 8000:8080
Forwarding from 127.0.0.1:8000 -> 8080
Forwarding from [::1]:8000 -> 8080
Handling connection for 8000
```

### 测试接口

完成端口测试后，新开一个 `Tab` ，使用 `Curl` 进行接口测试。

```bash
[root@k8s0 ~]# curl http://localhost:8000/hi
Hi 127.0.0.1, I am 172.17.0.6
```

## NodePort

使用 `NodePort` 类型的 `Service` ，可以做到直接将集群服务暴露出来。

![2022-10-06-ServiceNodePort.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-06-ServiceNodePort.jpg)

### YAML

重点关注类型 `spec.type: NodePort` ，以及节点端口 `spec.ports.nodePort: 30000` 。

```bash
[root@k8s0 service]# vi cloud-native-service.yaml 
apiVersion: v1
kind: Service
metadata:
  name: cloud-native-svc
spec:
  # 用来查找关联的Pod，所有标签都匹配才行
  selector:
    app: cloud-native
  # NodePort节点可访问
  type: NodePort
  ports: 
    - port: 8080 # 本Service端口
      targetPort: 8080 # 容器端口
      nodePort: 30000   # 节点端口，范围固定30000 ~ 32767

# 应用配置
[root@k8s0 service]# kubectl apply -f cloud-native-service-nodeport.yaml 
service/cloud-native-svc configured
```

### 获取服务

`cloud-native-svc` 为 `NodePort` 类型。当使用 `kubectl describe service` 命令时，我们可以观察到结果中的 `Endpoints` 有两个：172.17.0.5:8080, 172.17.0.6:8080，这便是我们的两个 `Deployment` 副本。

通过 `kubectl get pods -o wide` 我们可以再次验证：两个 `Endpoints` 正是我们的两个 `Pod` 。

```bash
[root@k8s0 service]# kubectl get svc
NAME               TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
cloud-native-svc   NodePort    10.105.254.130   <none>        8080:30000/TCP   24m
hello-minikube     NodePort    10.107.201.188   <none>        8080:31061/TCP   35d
kubernetes         ClusterIP   10.96.0.1        <none>        443/TCP          35d

# Endpoints有两个
[root@k8s0 service]# kubectl describe service cloud-native-svc
Name:                     cloud-native-svc
Namespace:                default
Labels:                   <none>
Annotations:              <none>
Selector:                 app=cloud-native
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       10.105.254.130
IPs:                      10.105.254.130
Port:                     <unset>  8080/TCP
TargetPort:               8080/TCP
NodePort:                 <unset>  30000/TCP
Endpoints:                172.17.0.5:8080,172.17.0.6:8080
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>

# 两个Endpoints正是我们的两个Pod
[root@k8s0 service]# kubectl get pods -o wide
NAME                              READY   STATUS    RESTARTS       AGE     IP           NODE       NOMINATED NODE   READINESS GATES
cloud-native                      1/1     Running   3 (117m ago)   4d12h   172.17.0.4   minikube   <none>           <none>
cloud-native-7bc75f4c94-47zg7     1/1     Running   2 (117m ago)   2d4h    172.17.0.6   minikube   <none>           <none>
cloud-native-7bc75f4c94-c2php     1/1     Running   2 (117m ago)   2d4h    172.17.0.5   minikube   <none>           <none>
hello-minikube-58647b77b8-srpbq   1/1     Running   9 (117m ago)   35d     172.17.0.8   minikube   <none>           <none>
```

同样，可以桶过 `Dashboard` 以可视化的方式观测我们运行的 `Kubernetes` 的 `Service` 信息。

![2022-10-06-ServiceDetail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-06-ServiceDetail.jpg)

## 进入节点

这里所谓的 `节点` ，是指 `Kubernetes` 节点；显然，这时候我们只有一个 `minikube` 节点。

```bash
[root@k8s0 service]# docker ps
CONTAINER ID   IMAGE                    COMMAND                  CREATED       STATUS       PORTS  NAMES
421832f7e7c9   kicbase/stable:v0.0.32   "/usr/local/bin/entr…"   5 weeks ago   Up 2 hours   127.0.0.1:49157->22/tcp, 127.0.0.1:49156->2376/tcp, 127.0.0.1:49155->5000/tcp, 127.0.0.1:49154->8443/tcp, 127.0.0.1:49153->32443/tcp   minikube

# 进入节点内部
[root@k8s0 service]# docker exec -it 421832f7e7c9 /bin/bash
```

### 测试接口

在 `Kubernetes` 节点（ `minikube` ）内部测试接口，哇哦，我们体验到了 `Service` 提供的负载均衡效果。

```bash
root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.5root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.6root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.5root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.6root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.5root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.6root@minikube:/# curl http://localhost:30000/hi
Hi 172.17.0.1, I am 172.17.0.5root@minikube:/# 
```

## 小总结

`Kubemetes` 服务是一种为一组功能相同的 `Pod` 提供单一不变的接入点的资源。当服务存在时，它的IP地址和端口不会改变。客户端通过IP地址和端口号建立连接，这些连接会被路由到提供该服务的任意一个 `Pod` 上。通过这种方式，客户端不需要知道每个单独的提供服务的 `Pod` 的地址，这样这些 `Pod` 就可以在集群中随时被创建或移除。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
