---
layout: post
title: 云原生之容器编排实践-ruoyi-cloud项目部署到K8S：MySQL8
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

## 虚机资源

共用到了三台虚机，1台作为 `Master` 节点，2台 `Worker` 节点。

| 主机名      | IP            | 说明 |
| ---------- | ------------- | ------- |
| k8s-master | 172.16.201.25 | 主节点   |
| k8s-node1  | 172.16.201.26 | 工作节点 |
| k8s-node2  | 172.16.201.27 | 工作节点 |

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

## 部署示意

![2024-02-25-K8SMySQL.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-25-K8SMySQL.png)

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

对于自动转换后的 `YAML` ，我们做简单的修改后即可应用部署。下面是 `MySQL` 的 `YAML` 配置文件（做了合并和微调）。

* ruoyi-mysql-ns-sc-pv-pvc.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ruoyi-basic

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: ruoyi-mysql-data-pv
  labels:
    pv: ruoyi-mysql-data-pv
spec:
  capacity: 
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /data/mysql/data
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
kind: PersistentVolume
metadata:
  name: ruoyi-mysql-log-pv
  labels:
    pv: ruoyi-mysql-log-pv
spec:
  capacity: 
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /data/mysql/log
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
  name: ruoyi-mysql-data-pvc
  namespace: ruoyi-basic
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Mi
  storageClassName: local-storage
  selector:
    matchLabels:
      pv: ruoyi-mysql-data-pv
---

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ruoyi-mysql-log-pvc
  namespace: ruoyi-basic
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  storageClassName: local-storage
  selector:
    matchLabels:
      pv: ruoyi-mysql-log-pv

---

apiVersion: v1
kind: ConfigMap
metadata:
  name: ruoyi-mysql-configmap
  namespace: ruoyi-basic
data:
  my-custom.cnf: |
    [mysqld]
    # handle error "this is incompatible with sql_mode=only_full_group_by"
    sql_mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
    socket=/var/run/mysqld/mysqld.sock

    [client]
    socket=/var/run/mysqld/mysqld.sock
```

Note: 这里使用 `local-storage` 的 `StorageClass` ，并使用本地磁盘的方式创建使用 `PV` ，实际建议使用 `NFS` 。

* ruoyi-mysql-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.26.0 (40646f47)
  labels:
    io.kompose.service: ruoyi-mysql
  name: ruoyi-mysql
  namespace: ruoyi-basic
spec:
  replicas: 1
  selector:
    matchLabels:
      io.kompose.service: ruoyi-mysql
  template:
    metadata:
      annotations:
        kompose.cmd: kompose convert
        kompose.version: 1.26.0 (40646f47)
      labels:
        io.kompose.service: ruoyi-mysql
    spec:
      containers:
        - args:
            - --innodb-buffer-pool-size=80M
            - --character-set-server=utf8mb4
            - --collation-server=utf8mb4_unicode_ci
            - --default-time-zone=+8:00
            - --lower-case-table-names=1
          env:
            - name: MYSQL_DATABASE
              value: ruoyi-cloud
            - name: MYSQL_ROOT_PASSWORD
              value: you-guess
          image: mysql:8.0
          name: ruoyi-mysql
          ports:
            - containerPort: 3306
          volumeMounts:
            - mountPath: /var/lib/mysql
              name: ruoyi-mysql-data-pvc
            - mountPath: /var/log/mysql
              name: ruoyi-mysql-log-pvc
            - mountPath: /etc/mysql/conf.d
              name: ruoyi-mysql-config
      restartPolicy: Always
      volumes:
        - name: ruoyi-mysql-data-pvc
          persistentVolumeClaim:
            claimName: ruoyi-mysql-data-pvc
        - name: ruoyi-mysql-log-pvc
          persistentVolumeClaim:
            claimName: ruoyi-mysql-log-pvc
        - name: ruoyi-mysql-config
          configMap:
            name: ruoyi-mysql-configmap
```

* ruoyi-mysql-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    kompose.cmd: kompose convert
    kompose.version: 1.26.0 (40646f47)
  labels:
    io.kompose.service: ruoyi-mysql
  name: ruoyi-mysql
  namespace: ruoyi-basic
spec:
  ports:
    - name: "3306"
      port: 3306
      targetPort: 3306
      nodePort: 30306
  selector:
    io.kompose.service: ruoyi-mysql
  type: NodePort
```

## 部署MySQL

Note: 本次部署 `MySQL` 时用了 `Deployment` （运行的pod名称会有个随机后缀），实际生产建议使用 `StatefulSet` （pod名称后缀为0）更合适。

```bash
# 创建NameSpace、StorageClass、PV、PVC
[root@k8s-master mysql]# kubectl apply -f ruoyi-mysql-ns-sc-pv-pvc.yaml
namespace/ruoyi-basic created
persistentvolume/ruoyi-mysql-data-pv created
persistentvolume/ruoyi-mysql-log-pv created
persistentvolumeclaim/ruoyi-mysql-data-pvc created
persistentvolumeclaim/ruoyi-mysql-log-pvc created
configmap/ruoyi-mysql-configmap created

# 部署MySQL
[root@k8s-master mysql]# kubectl apply -f ruoyi-mysql-deployment.yaml
deployment.apps/ruoyi-mysql created

# 创建MySQL服务
[root@k8s-master mysql]# kubectl apply -f ruoyi-mysql-service.yaml
service/ruoyi-mysql created

# 查看PV信息
[root@k8s-master mysql]# kubectl get pv -owide
NAME                 CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                 STORAGECLASS    REASON   AGE     VOLUMEMODE
docker-registry-pv   5Gi        RWX            Retain           Bound    docker-registry/docker-registry-pvc   local-storage            26h     Filesystem
ruoyi-mysql-data-pv   5Gi        RWX            Retain           Bound    ruoyi-basic/ruoyi-mysql-data-pvc        local-storage            5m16s   Filesystem
ruoyi-mysql-log-pv    5Gi        RWX            Retain           Bound    ruoyi-basic/ruoyi-mysql-log-pvc         local-storage            5m16s   Filesystem

# 获取配置信息
[root@k8s-master mysql]# kubectl get cm -n ruoyi-basic
NAME                   DATA   AGE
kube-root-ca.crt       1      17m
ruoyi-mysql-configmap   1      17m

# 可通过以下命令查看编辑MySQL的配置
[root@k8s-master ~]# kubectl edit cm ruoyi-mysql-configmap -n ruoyi-basic

# 查看MySQL日志
[root@k8s-master ~]# kubectl logs ruoyi-mysql-8c779d94c-b7r9n -n ruoyi-basic

# 查看所有Pod，MySQL就绪
[root@k8s-master mysql]# kubectl get pod -A
NAMESPACE              NAME                                         READY   STATUS    RESTARTS   AGE
docker-registry        docker-registry-9bc898786-l477q              1/1     Running   1          17h
kube-system            calico-kube-controllers-577f77cb5c-hv29w     1/1     Running   2          3d22h
kube-system            calico-node-4fkrs                            1/1     Running   0          3d22h
kube-system            calico-node-d4tqq                            1/1     Running   2          3d22h
kube-system            calico-node-sdmm6                            1/1     Running   4          3d22h
kube-system            etcd-k8s-master                              1/1     Running   9          5d9h
kube-system            kube-apiserver-k8s-master                    1/1     Running   9          5d9h
kube-system            kube-controller-manager-k8s-master           1/1     Running   9          5d9h
kube-system            kube-proxy-4789z                             1/1     Running   0          5d9h
kube-system            kube-proxy-7mt7k                             1/1     Running   5          5d9h
kube-system            kube-proxy-lqtpz                             1/1     Running   2          5d9h
kube-system            kube-scheduler-k8s-master                    1/1     Running   10         5d9h
kubernetes-dashboard   dashboard-metrics-scraper-79c5968bdc-j9bnv   1/1     Running   0          3d22h
kubernetes-dashboard   kubernetes-dashboard-658485d5c7-pq7z8        1/1     Running   0          3d22h
ruoyi-basic             ruoyi-mysql-8c779d94c-b7r9n                   1/1     Running   0          4m3s

# MySQL对外暴露了端口，用于测试
[root@k8s-master mysql]# kubectl get svc -n ruoyi-basic -o wide
NAME         TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)          AGE   SELECTOR
ruoyi-mysql   NodePort   10.96.58.67   <none>        3306:30306/TCP   4s    io.kompose.service=ruoyi-mysql
```

## 验证MySQL服务

1. 可以直接进入容器，通过`MySQL`自带的命令行客户端进行测试连接：`mysql -uroot -p`。
2. 可以使用`busybox`，验证集群内部是否可以正常连接`MySQL`数据库。
3. 由于暴露了服务端口30306，也可以通过远程的数据库客户端进行连接测试。

```bash
# 进入mysql的服务，测试客户端连接：mysql -uroot -p
kubectl exec -it pod/ruoyi-mysql-8c779d94c-b7r9n  -n ruoyi-basic -- /bin/bash

# 使用Busybox进行数据库连接测试；以服务名的方式
[root@k8s-master ~]# kubectl exec -it pod/busybox -- /bin/sh
/ # telnet ruoyi-mysql.ruoyi-basic.svc.cluster.local:3306
J
8.0.27,'~_xJ{��C~;f<*,mqlcaching_sha2_password
```

远程测试 `MySQL` 服务状态：

![2024-02-25-TelnetMySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-02-25-TelnetMySQL.jpg)

## 导入数据

若依提供了微服务用到的数据库脚本，在 `MySQL` 服务部署完成后可以通过 `SQL` 文件自行导入脚本。

## 小总结

这次我们先是借助 `kompose` 工具，实现对 `dokcer-compose` 的 `yaml` 到 `K8S` 的 `yaml` 的转换，经过简单的加工后即可应用部署；通过以上操作，成功将 `MySQL 8.0` 部署到了 `K8S` 集群，下一步我们安装下 `Nacos v2.2.3` 。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
