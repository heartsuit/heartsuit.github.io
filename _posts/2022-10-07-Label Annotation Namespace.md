---
layout: post
title: 云原生之容器编排实践-Kubernetes资源管理：标签选择器，注解以及命名空间
tags: CloudNative, Docker, Kubernetes
---

## 背景

前面的几篇文章我们从一个简单的 `SpringBoot` 服务开始，依次将其打包为镜像，推送至私有镜像仓库，安装 `Kubernetes` 的极简实践环境 `minikube` ， `minikube` 传递秘钥使用阿里云私有镜像仓库，然后使用 `kubectl run` 命令启动 `Pod` ，使用 `YAML` 描述文件启动 `Pod` ，使用 `Deployment` 启动弹性伸缩的 `Pod` ，最后使用 `Service` 暴露服务，经过这一系列实践，基本算是入门 `Kubernetes` 了。

那么，对 `Kubernetes` 有了基本的认识后我们再稍微了解下 `Kubernetes` 的资源（Pod、ReplicaSet、ReplicationController、Deployment、StatefulSet、DaemonSet、Job、CronJob；Node、Namespace、Service、Secret、ConfigMap、Ingress、Label）管理。在这篇文章中我们主要涉及：标签选择器 `Label` ，注解 `Annotation` 以及命名空间 `Namespace` 这3种资源。

![2022-10-07-Kubernetes.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-07-Kubernetes.jpg)

以我们之前使用的 `Pod` ： `cloud-native` 为例，通过命令 `kubectl get pod cloud-native -o yaml` 获取的 `cloud-native` 详细信息如下，重点关注： `Label` ， `Annotation` 、 `Namespace`

```bash
[root@k8s0 ~]# kubectl get pod cloud-native -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"name":"cloud-native","namespace":"default"},"spec":{"containers":[{"image":"registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT","name":"cloud-native"}],"imagePullSecrets":[{"name":"aliyunregistry"}]}}
  creationTimestamp: "2022-08-24T01:26:32Z"
  name: cloud-native
  namespace: default
  resourceVersion: "82104"
  uid: da48251e-f036-464d-8676-7b0cf454a7b1
spec:
  containers:
  - image: registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
    imagePullPolicy: IfNotPresent
    name: cloud-native
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-db2kn
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  imagePullSecrets:
  - name: aliyunregistry
  nodeName: minikube
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-db2kn
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-08-24T01:26:32Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-09-03T12:43:03Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-09-03T12:43:03Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-08-24T01:26:32Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://2804198750e70414b7cea29b6904c5e4d5df7ca9c91064c3a3289a87a7ffa5f9
    image: registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
    imageID: docker-pullable://registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub@sha256:aa901df7e77dce21461b28d3c4c46241cdc3e0247631541b29eee551f3ee529b
    lastState:
      terminated:
        containerID: docker://912e26fa74ef1f3b3cd07e2a6ee21cd7db533e444245964be2c1be9cbea68e2e
        exitCode: 255
        finishedAt: "2022-09-03T12:42:37Z"
        reason: Error
        startedAt: "2022-09-01T07:37:51Z"
    name: cloud-native
    ready: true
    restartCount: 6
    started: true
    state:
      running:
        startedAt: "2022-09-03T12:43:02Z"
  hostIP: 192.168.76.2
  phase: Running
  podIP: 172.17.0.5
  podIPs:
  - ip: 172.17.0.5
  qosClass: BestEffort
  startTime: "2022-08-24T01:26:32Z"
```

## 标签选择器 `Label`

### 为什么要有标签选择器

其实，一提到标签选择器，我第一时间便想到了 `HTML` 、 `CSS` 、 `JavaScript` 这 `Web三剑客` 了，因为 `HTML` 作为一种标记语音，其中充满了各类标签，而 `CSS` 与 `JavaScript` 在对标签操作时，第一步便是进行标签选择。

此外，我们做物联网平台开发时，为了方便对设备的管理，我们会对设备进行分组，同样也是通过不同的标签来实现，说白了，标签无非就是为了进行**批量操作**而进行的一个分组、归类手段。那么在容器化、微服务盛行的今天， `Kubernetes` 作为一种容器编排工具，面临的服务实例动辄成百上千，需要一种手段通过一次操作对属于某个组的所有 `Pod` 进行操作，而不必单独为每个 `Pod` 执行操作。在 `Kubernetes` 的世界中，通过标签来组织 `Pod` 和所有其他 `Kubernetes` 对象。

### 显示标签

```bash
# 获取所有Pod
[root@k8s0 ~]# kubectl get po
NAME                              READY   STATUS    RESTARTS         AGE
cloud-native                      1/1     Running   7 (4m32s ago)    12d
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (4m32s ago)    9d
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (4m32s ago)    9d
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (4m32s ago)   42d

# 获取所有Pod并显示标签
[root@k8s0 ~]# kubectl get po --show-labels
NAME                              READY   STATUS    RESTARTS         AGE   LABELS
cloud-native                      1/1     Running   7 (4m58s ago)    12d   <none>
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (4m58s ago)    9d    app=cloud-native,pod-template-hash=7bc75f4c94
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (4m58s ago)    9d    app=cloud-native,pod-template-hash=7bc75f4c94
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (4m58s ago)   42d   app=hello-minikube,pod-template-hash=58647b77b8

# 获取所有Pod并分列显示指定标签
[root@k8s0 ~]# kubectl get po -L app,pod-template-hash
NAME                              READY   STATUS    RESTARTS         AGE   APP              POD-TEMPLATE-HASH
cloud-native                      1/1     Running   7 (5m56s ago)    12d                    
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (5m56s ago)    9d    cloud-native     7bc75f4c94
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (5m56s ago)    9d    cloud-native     7bc75f4c94
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (5m56s ago)   42d   hello-minikube   58647b77b8
```

### 添加/修改标签

```bash
# 为cloud-native这个Pod设置标签：app=cloud-native-pod
[root@k8s0 ~]# kubectl label po cloud-native app=cloud-native-pod
pod/cloud-native labeled

# 查看新增的标签信息
[root@k8s0 ~]# kubectl get po -L app,pod-template-hash
NAME                              READY   STATUS    RESTARTS         AGE   APP                POD-TEMPLATE-HASH
cloud-native                      1/1     Running   7 (3h11m ago)    12d   cloud-native-pod   
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h11m ago)    9d    cloud-native       7bc75f4c94
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h11m ago)    9d    cloud-native       7bc75f4c94
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h11m ago)   43d   hello-minikube     58647b77b8

# 修改标签值，报错了
[root@k8s0 ~]# kubectl label po cloud-native app=cloud-native-pod1
error: 'app' already has a value (cloud-native-pod), and --overwrite is false

# 修改标签值，需附加--overwrite参数
[root@k8s0 ~]# kubectl label po cloud-native app=cloud-native-pod-label --overwrite
pod/cloud-native labeled

# 查看修改后的标签信息
[root@k8s0 ~]# kubectl get po -L app,pod-template-hash
NAME                              READY   STATUS    RESTARTS         AGE   APP                      POD-TEMPLATE-HASH
cloud-native                      1/1     Running   7 (3h12m ago)    12d   cloud-native-pod-label   
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h12m ago)    9d    cloud-native             7bc75f4c94
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h12m ago)    9d    cloud-native             7bc75f4c94
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h12m ago)   43d   hello-minikube           58647b77b8
```

### 标签过滤

重头戏。就像数据库的 `CRUD` 操作，增加(Create)、更新(Update)和删除(Delete)这三个操作比较简单，检索(Retrieve)操作是核心。 `Kubernetes` 的标签管理操作中新增、修改、删除也很简单，关键在查询过滤标签：标签选择器。

```bash
# 标签过滤：单个条件，获取所有带有app标签且标签值为cloud-native的Pod
[root@k8s0 ~]# kubectl get po -l app=cloud-native
NAME                            READY   STATUS    RESTARTS        AGE
cloud-native-7bc75f4c94-47zg7   1/1     Running   6 (3h19m ago)   9d
cloud-native-7bc75f4c94-c2php   1/1     Running   6 (3h19m ago)   9d

# 标签过滤：单个条件，获取所有带有app标签的Pod
[root@k8s0 ~]# kubectl get po -l app
NAME                              READY   STATUS    RESTARTS         AGE
cloud-native                      1/1     Running   7 (3h19m ago)    12d
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h19m ago)    9d
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h19m ago)    9d
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h19m ago)   43d

# 标签过滤：取反操作，获取所有不包含pod-template-hash标签的Pod
[root@k8s0 ~]# kubectl get po -l '!pod-template-hash'
NAME           READY   STATUS    RESTARTS        AGE
cloud-native   1/1     Running   7 (3h20m ago)   12d

# 标签过滤：in操作，获取所有app标签为cloud-native或者hello-minikube的Pod
[root@k8s0 ~]# kubectl get po -l 'app in (cloud-native, hello-minikube)'
NAME                              READY   STATUS    RESTARTS         AGE
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h26m ago)    9d
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h26m ago)    9d
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h26m ago)   43d

# 标签过滤：notin操作，获取所有app标签不为cloud-native或者hello-minikube的Pod
[root@k8s0 ~]# kubectl get po -l 'app notin (cloud-native, hello-minikube)'
NAME           READY   STATUS    RESTARTS        AGE
cloud-native   1/1     Running   7 (3h27m ago)   12d

# 标签过滤：多个条件同时满足，获取所有app标签为cloud-native且pod-template-hash标签为7bc75f4c94的Pod
[root@k8s0 ~]# kubectl get po -l 'app=cloud-native, pod-template-hash=7bc75f4c94'
NAME                            READY   STATUS    RESTARTS        AGE
cloud-native-7bc75f4c94-47zg7   1/1     Running   6 (3h29m ago)   9d
cloud-native-7bc75f4c94-c2php   1/1     Running   6 (3h29m ago)   9d
```

### 删除标签

下面我们先加一个 `gpu=true` 的标签，然后删除。

```bash
# 添加一个gpu=true的标签
[root@k8s0 ~]# kubectl label po cloud-native gpu=true
pod/cloud-native labeled

# 查看新增的标签信息
[root@k8s0 ~]# kubectl get po -L app,gpu
NAME                              READY   STATUS    RESTARTS         AGE   APP                      GPU
cloud-native                      1/1     Running   7 (3h39m ago)    12d   cloud-native-pod-label   true
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h39m ago)    9d    cloud-native             
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h39m ago)    9d    cloud-native             
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h39m ago)   43d   hello-minikube           

# 标签过滤：查看新增的标签信息
[root@k8s0 ~]# kubectl get po -l gpu=true
NAME           READY   STATUS    RESTARTS        AGE
cloud-native   1/1     Running   7 (3h45m ago)   12d

# 删除标签（注意关键在于标签后面的-）
[root@k8s0 ~]# kubectl label po cloud-native gpu-
pod/cloud-native unlabeled

# 验证删除标签操作
[root@k8s0 ~]# kubectl get po -L app,gpu
NAME                              READY   STATUS    RESTARTS         AGE   APP                      GPU
cloud-native                      1/1     Running   7 (3h52m ago)    12d   cloud-native-pod-label   
cloud-native-7bc75f4c94-47zg7     1/1     Running   6 (3h52m ago)    9d    cloud-native             
cloud-native-7bc75f4c94-c2php     1/1     Running   6 (3h52m ago)    9d    cloud-native             
hello-minikube-58647b77b8-srpbq   1/1     Running   13 (3h52m ago)   43d   hello-minikube 
```

### 为node添加标签

默认情况下，我们创建的 `Pod` 是随机地调度到工作节点上的。这正是在 `Kubernetes` 集群中工作的正确方式。由于 `Kubernetes` 将集群中的所有节点抽象为一个整体的部署平台，因此对于 `Pod` 实际调度到哪个节点而言是无关紧要的。然而，有时候我们需要对 `Pod` 调度到哪个节点上有发言权，eg：在用 `Pytorch` 做深度学习模型训练时，我们需要将执行 `GPU` 密集型运算的 `Pod` 调度到实际硬件支持 `GPU` 加速的节点上。

* 调度到指定节点

```bash
[root@k8s0 ~]# kubectl label node minikube gpu=true
node/minikube labeled
[root@k8s0 ~]# kubectl get nodes -l gpu=true
NAME       STATUS   ROLES                  AGE   VERSION
minikube   Ready    control-plane,master   43d   v1.23.1

# 在YAML描述文件中配置，
spec:
	nodeSelector:
		gpu: "true"
```

* 节点标签

实际上，每个节点都有一个唯一标签，其中键为 `kubernetes.io/hostname` ，值为该节点的实际主机名

```bash
# 查看node的详细信息
[root@k8s0 ~]# kubectl get nodes -o wide
NAME       STATUS   ROLES                  AGE   VERSION   INTERNAL-IP    EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION           CONTAINER-RUNTIME
minikube   Ready    control-plane,master   43d   v1.23.1   192.168.76.2   <none>        Ubuntu 20.04.4 LTS   3.10.0-1127.el7.x86_64   docker://20.10.17

# 查看node的标签
[root@k8s0 ~]# kubectl get nodes --show-labels
NAME       STATUS   ROLES                  AGE   VERSION   LABELS
minikube   Ready    control-plane,master   43d   v1.23.1   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,gpu=true,kubernetes.io/arch=amd64,kubernetes.io/hostname=minikube,kubernetes.io/os=linux,minikube.k8s.io/commit=f4b412861bb746be73053c9f6d2895f12cf78565,minikube.k8s.io/name=minikube,minikube.k8s.io/primary=true,minikube.k8s.io/updated_at=2022_07_23T23_06_42_0700,minikube.k8s.io/version=v1.26.0,node-role.kubernetes.io/control-plane=,node-role.kubernetes.io/master=,node.kubernetes.io/exclude-from-external-load-balancers=
```

## Annotation注解

### 为什么需要注解

使用注解可以为每个 `Pod` 或其他 `API` 对象添加说明，以便每个使用该集群的入都可以快速查找有关每个单独对象的信息。例如，指定创建对象的人员姓名的注解可以使在集群中工作的人员之间的协作更加便利。

### 添加注解

从一开始的 `kubectl get pod cloud-native -o yaml` 信息中可以看到 `Kubernetes` 已经自动添加了一些 `Annotations` 信息，通过 `kubectl annotate` 命令可以添加/修改注解信息。

```bash
[root@k8s0 ~]# kubectl annotate pod cloud-native heartsuit.com/author="Heartsuit"
pod/cloud-native annotated
```

### 查看注解

可以使用 `kubectl describe` 命令查看刚刚添加的注解： `Annotations` 。

```bash
[root@k8s0 ~]# kubectl describe pod cloud-native
Name:         cloud-native
Namespace:    default
Priority:     0
Node:         minikube/192.168.76.2
Start Time:   Wed, 24 Aug 2022 09:26:32 +0800
Labels:       app=cloud-native-pod-label
Annotations:  heartsuit.com/author: Heartsuit
Status:       Running
IP:           172.17.0.6
IPs:
  IP:  172.17.0.6
Containers:
  cloud-native:
    Container ID:   docker://c7ccba0903247af3588514420c10252824e2e19ed3ef99b07dbdb20b49c16be7
    Image:          registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub:0.0.1-SNAPSHOT
    Image ID:       docker-pullable://registry.cn-hangzhou.aliyuncs.com/container-repo/docker-hub@sha256:aa901df7e77dce21461b28d3c4c46241cdc3e0247631541b29eee551f3ee529b
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Mon, 05 Sep 2022 11:40:01 +0800
    Last State:     Terminated
      Reason:       Error
      Exit Code:    255
      Started:      Sat, 03 Sep 2022 20:43:02 +0800
      Finished:     Mon, 05 Sep 2022 11:39:35 +0800
    Ready:          True
    Restart Count:  7
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-db2kn (ro)
Conditions:
  Type              Status
  Initialized       True 
  Ready             True 
  ContainersReady   True 
  PodScheduled      True 
Volumes:
  kube-api-access-db2kn:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:                      <none>
```

## NameSpace

就像我们在 `Java` 中使用 `package` 一样， `Kubernetes` 的 `Namespace` 也是为了对资源进行分组与隔离，而且可以将对象分割成完全独立且不重叠的组（显然，这一点与前面的标签进行分组有区别啦。前面的 `Lable` 标签是为了方便进行批量操作，而这里的 `Namespace` 命名空间则更多的是为了资源隔离）。

### 获取所有命名空间

如果我们不指定命名空间，则默认的资源都在 `default` 命名空间下。此外，我们可以看到 `Kubernetes` 默认还有其他自带的系统命名空间： `kube-node-lease` , `kube-public` , `kube-system` ；还有我们之前运行的 `Dashboard` 则在 `kubernetes-dashboard` 命名空间。

```bash
[root@k8s0 ~]# kubectl get ns
NAME                   STATUS   AGE
default                Active   43d
kube-node-lease        Active   43d
kube-public            Active   43d
kube-system            Active   43d
kubernetes-dashboard   Active   43d
```

### 查看kube-system命名空间下的所有pod

以下是 `Kubernetes` 本身运行的一些 `Pod` 组件，在 `kube-system` 命名空间下。

```bash
[root@k8s0 ~]# kubectl get po --namespace kube-system
NAME                               READY   STATUS    RESTARTS         AGE
coredns-64897985d-rcrjq            1/1     Running   14 (4h17m ago)   43d
etcd-minikube                      1/1     Running   14 (4h17m ago)   43d
kube-apiserver-minikube            1/1     Running   14 (4h17m ago)   43d
kube-controller-manager-minikube   1/1     Running   14 (4h17m ago)   43d
kube-proxy-6ffnk                   1/1     Running   14 (4h17m ago)   43d
kube-scheduler-minikube            1/1     Running   14 (4h17m ago)   43d
storage-provisioner                1/1     Running   29 (4h16m ago)   43d
```

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

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
