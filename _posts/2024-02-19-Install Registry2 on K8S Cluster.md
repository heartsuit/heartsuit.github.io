---
layout: post
title: 云原生之容器编排实践-在K8S集群中使用Registry2搭建私有镜像仓库
tags: Kubernetes
---

## 背景

基于前面搭建的3节点 `Kubernetes` 集群，今天我们使用 `Registry2` 搭建私有镜像仓库，这在镜像安全性以及离线环境下运维等方面具有重要意义。

Note: 由于是测试环境，以下创建了一个 `local-storage` 的 `StorageClass` ，并使用本地磁盘的方式创建使用 `PV` ，实际建议使用 `NFS` 。

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

## 使用Registry2搭建私有镜像仓库

采用 `YAML` 文件的方式，搭建私有 `Docker Registry` 的整体流程：
1. 创建一个Docker Registry的命名空间
2. 创建一个持久卷来存储Docker Registry的数据
3. 创建一个Secret用于存储Docker Registry的凭证
4. 创建一个Deployment来部署Docker Registry
5. 创建一个Service来暴露Docker Registry
6. 登录并推送镜像到私有镜像仓库

### 创建一个Docker Registry的命名空间

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: docker-registry
```

### 创建一个持久卷来存储Docker Registry的数据

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
  namespace: docker-registry
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: docker-registry-pv
  labels:
    pv: docker-registry-pv
spec:
  capacity: 
    storage: 5Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /data/docker
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node1

---

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: docker-registry-pvc
  namespace: docker-registry
spec:
  resources:
    requests:
      storage: 5Gi
  accessModes:
    - ReadWriteMany
  storageClassName: local-storage
  selector:
    matchLabels:
      pv: docker-registry-pv
```

Note：
1. 没有必要将namespace字段添加到kind: persistantVolume因为PersistentVolumes绑定(bind)是排他的；
2. 出于安全考虑Pod不会被调度到Master Node上，也就是说默认情况下Master节点（taint：污点）不参与工作负载。如果没有配置nodeAffinity，在创建PV时会报错：

> 0/3 nodes are available: 1 node(s) had taint {node-role.kubernetes.io/master: }, that the pod didn't tolerate, 2 node(s) didn't find available persistent volumes to bind.

解决方法：添加 `nodeAffinity` ，这里将 `PV` 创建到 `k8s-node1` 节点；记得先在 `Worker` 节点上创建 `PV` 目录：/data/docker

### 创建一个Secret用于存储Docker Registry的凭证

```bash
mkdir auth

docker run --entrypoint htpasswd registry:2 -Bbn username password > auth/htpasswd
```

报错：unable to start container process: exec: "htpasswd": executable file not found in $PATH: unknown.
原因： `registry` 镜像在 `2.x` 相关版本中删除了 `/usr/bin/htpasswd` 文件，导致创建容器时找不到可执行文件，参考：https://github.com/docker/distribution-library-image/issues/106

使用旧版本的 `registry` 或者在服务器本地安装 `httpd` ，再执行生成密码的命令。

```bash
yum install httpd
htpasswd -Bbn username password > auth/htpasswd
kubectl create secret generic docker-registry-secret --from-file=auth/htpasswd -n docker-registry

# 创建了一个Opaque类型的Secret
[root@k8s-master ~]# kubectl get secret -n docker-registry
NAME                     TYPE                                  DATA   AGE
default-token-prfsz      kubernetes.io/service-account-token   3      11m
docker-registry-secret   Opaque                                1      20s
```

创建 `Docker` 私有镜像仓库的 `secret` ，这里是在 `docker-registry` 命名空间，如果新增了 `namespace` ，那么这个 `namespace` 就需要单独添加一次 `secret` ，而且这个 `namespace` 下拉取镜像时也需要添加 `imagePullSecrets` 。

```bash
kubectl create secret docker-registry ruoyi-registry-secret --docker-server=10.96.198.223:5000 --docker-username=username --docker-password=password  -n docker-registry

[root@k8s-master ~]# kubectl get secret -n docker-registry
NAME                     TYPE                                  DATA   AGE
default-token-prfsz      kubernetes.io/service-account-token   3      2d23h
docker-registry-secret   Opaque                                1      2d23h
ruoyi-registry-secret     kubernetes.io/dockerconfigjson        1      3s
```

Note: 
1. docker-registry-secret: 用于配置Registry的账号与域名，并在控制台通过username与password登录、推送镜像到私有镜像仓库；
2. ruoyi-registry-secret: 用于通过在不同的Worker节点上拉取私有镜像。

将上述创建 `NameSpace` , `StorageClass` , `PV` 以及 `PVC` 的 `YAML` 合并为一个 `docker-registry-ns-sc-pv-pvc.yaml` 并执行。

```bash
kubectl apply -f docker-registry-ns-sc-pv-pvc.yaml

# 查看sc,pv,pvc状态
[root@k8s-master registry]# kubectl get sc,pv,pvc -n docker-registry
NAME                                        PROVISIONER                    RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
storageclass.storage.k8s.io/local-storage   kubernetes.io/no-provisioner   Retain          WaitForFirstConsumer   false                  4m45s

NAME                                  CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS    REASON   AGE
persistentvolume/docker-registry-pv   5Gi        RWX            Retain           Available           local-storage            4m45s

NAME                                        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS    AGE
persistentvolumeclaim/docker-registry-pvc   Pending                                      local-storage   4m45s
```

看到 `PVC` 一直是 `Pending` 状态。

```bash
# 查看PVC详细信息
[root@k8s-master registry]# kubectl describe pvc -n docker-registry
Name:          docker-registry-pvc
Namespace:     docker-registry
StorageClass:  local-storage
Status:        Pending
Volume:        
Labels:        <none>
Annotations:   <none>
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:      
Access Modes:  
VolumeMode:    Filesystem
Used By:       <none>
Events:
  Type    Reason                Age                  From                         Message
  ----    ------                ----                 ----                         -------
  Normal  WaitForFirstConsumer  9s (x26 over 6m13s)  persistentvolume-controller  waiting for first consumer to be created before binding
```

提示需要有个消费者进行关联，后面应用 `Deployment` 后， `PVC` 状态会变为 `Binding` 。

### 创建一个Deployment来部署Docker Registry

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: docker-registry
  name: docker-registry
  namespace: docker-registry
spec:
  replicas: 1
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: docker-registry
  template:
    metadata:
      labels:
        app: docker-registry
    spec:
      securityContext:
        runAsUser: 0
      containers:
        - name: docker-registry 
          image: registry:2 
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5000
              name: web
              protocol: TCP
          resources:
            requests:
              memory: 200Mi
              cpu: "0.1"
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
          env:
            - name: REGISTRY_AUTH
              value: htpasswd
            - name: REGISTRY_AUTH_HTPASSWD_REALM
              value: Registry Realm
            - name: REGISTRY_AUTH_HTPASSWD_PATH
              value: /auth/htpasswd
          volumeMounts:
            - name: docker-registry-data
              mountPath: /var/lib/registry/
            - name: docker-registry-auth
              mountPath: /auth
              readOnly: true
      volumes:
        - name: docker-registry-data
          persistentVolumeClaim:
            claimName: docker-registry-pvc
        - name: docker-registry-auth
          secret:
            secretName: docker-registry-secret
```

### 创建一个Service来暴露Docker Registry

```yaml
apiVersion: v1
kind: Service
metadata:
  name: docker-registry-service
  namespace: docker-registry 
spec:
  ports:
    - name: port-name
      port: 5000 
      protocol: TCP
      targetPort: 5000
  selector:
    app: docker-registry
  type: NodePort
```

部署 `Deployment` 与 `Service` 。

```bash
kubectl apply -f docker-registry-deploy-svc.yaml

[root@k8s-master registry]# kubectl get deploy -n docker-registry
NAME              READY   UP-TO-DATE   AVAILABLE   AGE
docker-registry   1/1     1            1           21s

[root@k8s-master registry]# kubectl get svc -n docker-registry
NAME                      TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
docker-registry-service   NodePort   10.96.198.223   <none>        5000:30858/TCP   15s
```

## 登录私有镜像仓库

```bash
# 直接查看下镜像仓库的内容，提示未认证
[root@k8s-master ~]# curl http://10.96.198.223:5000/v2/_catalog
{"errors":[{"code":"UNAUTHORIZED","message":"authentication required","detail":[{"Type":"registry","Class":"","Name":"catalog","Action":"*"}]}]}

# 使用用户名、密码登录，报错：http: server gave HTTP response to HTTPS client
[root@k8s-master ~]# docker login -uusername -ppassword 10.96.198.223:5000
WARNING! Using --password via the CLI is insecure. Use --password-stdin.
Error response from daemon: Get https://10.96.198.223:5000/v2/: http: server gave HTTP response to HTTPS client

# 修改配置文件，添加insecure-registries
[root@k8s-master ~]# vi /etc/docker/daemon.json
"insecure-registries": ["10.96.198.223:5000"]

# 重启Docker服务
[root@k8s-master ~]# systemctl daemon-reload
[root@k8s-master ~]# systemctl restart docker

# 再次使用用户名、密码登录，成功
[root@k8s-master registry]# docker login -uusername -ppassword 10.96.198.223:5000
WARNING! Using --password via the CLI is insecure. Use --password-stdin.
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded

# 会自动生成~/.docker/config.json文件
[root@k8s-master ~]# cat ~/.docker/config.json
{
        "auths": {
                "10.96.198.223:5000": {
                        "auth": "dXNlcm5hbWU6cGFzc3dvcmQ="
                }
        }
}

# 附带用户名、密码，获取仓库内镜像，为空
[root@k8s-master ~]# curl -u username:password http://10.96.198.223:5000/v2/_catalog
{"repositories":[]}
```

## 推送镜像到私有仓库

```bash
# 以hello-world为例测试推送镜像到私有仓库功能
[root@k8s-master ~]# docker run hello-world
[root@k8s-master ~]# docker images
REPOSITORY                                                                 TAG        IMAGE ID       CREATED         SIZE
calico/node                                                                v3.20.6    daeec7e26e1f   17 months ago   156MB
calico/pod2daemon-flexvol                                                  v3.20.6    39b166f3f936   17 months ago   18.6MB
calico/cni                                                                 v3.20.6    13b6f63a50d6   17 months ago   138MB
calico/kube-controllers                                                    v3.20.6    4dc6e7685020   17 months ago   60.2MB
registry                                                                   2          b8604a3fe854   2 years ago     26.2MB
hello-world                                                                latest     feb5d9fea6a5   2 years ago     13.3kB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-proxy                v1.20.9    8dbf9a6aa186   2 years ago     99.7MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-scheduler            v1.20.9    295014c114b3   2 years ago     47.3MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-controller-manager   v1.20.9    eb07fd4ad3b4   2 years ago     116MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-apiserver            v1.20.9    0d0d57e4f64c   2 years ago     122MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/etcd                      3.4.13-0   0369cf4303ff   3 years ago     253MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/coredns                   1.7.0      bfe3a36ebd25   3 years ago     45.2MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/pause                     3.2        80d28bedfe5d   3 years ago     683kB

# 对hello-world镜像重新打标签
[root@k8s-master ~]# docker tag hello-world 10.96.198.223:5000/hello-world:1
[root@k8s-master ~]# docker images
REPOSITORY                                                                 TAG        IMAGE ID       CREATED         SIZE
calico/node                                                                v3.20.6    daeec7e26e1f   17 months ago   156MB
calico/pod2daemon-flexvol                                                  v3.20.6    39b166f3f936   17 months ago   18.6MB
calico/cni                                                                 v3.20.6    13b6f63a50d6   17 months ago   138MB
calico/kube-controllers                                                    v3.20.6    4dc6e7685020   17 months ago   60.2MB
registry                                                                   2          b8604a3fe854   2 years ago     26.2MB
10.96.198.223:5000/hello-world                                             1          feb5d9fea6a5   2 years ago     13.3kB
hello-world                                                                latest     feb5d9fea6a5   2 years ago     13.3kB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-proxy                v1.20.9    8dbf9a6aa186   2 years ago     99.7MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-scheduler            v1.20.9    295014c114b3   2 years ago     47.3MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-controller-manager   v1.20.9    eb07fd4ad3b4   2 years ago     116MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/kube-apiserver            v1.20.9    0d0d57e4f64c   2 years ago     122MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/etcd                      3.4.13-0   0369cf4303ff   3 years ago     253MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/coredns                   1.7.0      bfe3a36ebd25   3 years ago     45.2MB
registry.cn-hangzhou.aliyuncs.com/lfy_k8s_images/pause                     3.2        80d28bedfe5d   3 years ago     683kB

# 推送到私有镜像仓库，成功
[root@k8s-master ~]# docker push 10.96.198.223:5000/hello-world:1
The push refers to repository [10.96.198.223:5000/hello-world]
e07ee1baac5f: Pushed 
1: digest: sha256:f54a58bc1aac5ea1a25d796ae155dc228b3f0e11d046ae276b39c4bf2f13d8c4 size: 525

# 附带用户名、密码，获取仓库内镜像
[root@k8s-master ~]# curl -u username:password http://10.96.198.223:5000/v2/_catalog
{"repositories":["hello-world"]}

# 退出操作
[root@k8s-master ~]# docker logout 10.96.198.223:5000
```

## 安装Registry前端

直接通过 `Docker` 安装 `Registry` 前端，通过用户名与密码登录后，可以网页展示已推送的私有镜像。

```bash
docker run -d -e ENV_DOCKER_REGISTRY_HOST=10.96.198.223 -e ENV_DOCKER_REGISTRY_PORT=5000 -p 5001:80 konradkleine/docker-registry-frontend:v2
```

* 认证

![2024-02-19-RegistryAuth.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-19-RegistryAuth.jpg)

* 私有镜像列表

![2024-02-19-RegistryRepo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-19-RegistryRepo.jpg)

## 小总结

作为测试环境，本次使用 `Registry2` 搭建了私有镜像仓库，实际生产环境建议使用 `Harbor` 。 `Registry2` 和 `Harbor` 都是用于 `Docker` 镜像存储和分发的解决方案，但它们各自具有不同的特点：

### Registry2

* 基本功能：Registry2（通常称为Docker Registry）是Docker官方的开源镜像仓库，提供了存储和分发Docker镜像的基本功能。
* 简单轻量：它比较轻量级，适合需要快速部署的场景。
* 自主部署：可以自主部署在私有环境中，满足私有化需求。
* 缺少高级功能：相比于Harbor，Registry2缺少一些高级功能，如图形用户界面、角色基础的访问控制、镜像扫描和签名等。

### Harbor

* 企业级特性：Harbor是一个开源的企业级Docker Registry解决方案，提供了Registry2的所有基本功能，并增加了许多企业级特性。
* 图形用户界面：Harbor提供了用户友好的图形界面，便于管理和浏览镜像。
* 访问控制：支持基于角色的访问控制，可以细粒度地管理用户权限。
* 安全性：提供了镜像扫描和签名功能，增强了镜像的安全性。
* 高可用性：支持高可用部署，适合企业级应用。

总结来说，如果你需要一个简单的、轻量级的 `Docker` 镜像仓库， `Registry2` 可能是一个不错的选择。而如果你需要更多的企业级特性，如图形界面、细粒度的访问控制、镜像安全扫描等， `Harbor` 会是更好的选择。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
