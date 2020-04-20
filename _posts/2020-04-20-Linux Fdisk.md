---
layout: post
title: 挂载并初始化Linux数据盘，完成MySQL数据迁移
tags: Server
---

## 背景

开始建项目时，数据库存储放到了系统盘，如今磁盘空间快被占满了。。当云服务器挂载了一块新的数据盘时，这里以一块`600G`硬盘为例，使用fdisk分区工具将该数据盘设为主分区，分区形式默认设置为`MBR`，文件系统设为`ext4`格式，挂载在`/mnt/sdc`下，并设置开机启动自动挂载。

### 系统环境

- 查看系统信息：`lsb_release -a`

![2020-04-20-LinuxFdisk-OS.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-OS.png)

- 挂载前磁盘信息：`df -TH`

![2020-04-20-LinuxFdisk-Before.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-Before.png)

### 划分分区并挂载磁盘

1. 查看新增数据盘：`fdisk -l`

![2020-04-20-LinuxFdisk-l.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-l.png)

表示当前的云服务器有两块磁盘，“/dev/vda”是系统盘，“/dev/vdb”是新增数据盘。

2. 进入fdisk分区工具，开始对新增数据盘执行分区操作：`fdisk /dev/vdb`

先键入m查看帮助

![2020-04-20-LinuxFdisk-m.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-m.png)

3. 依次输入：` n p 1 两次回车 p w`

![2020-04-20-LinuxFdisk-np1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-np1.png)

n: 创建新分区
p: 主分区
1：主分区编号
两次回车：选择默认起始磁柱值与截止磁柱值
p: 查看新建分区的详细信息
w: 将分区结果写入分区表中

4. 将新的分区表变更同步至操作系统：`partprobe`

![2020-04-20-LinuxFdisk-partprobe.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-partprobe.png)

这里的警告表示已通知操作系统，下次重启生效。

5. 将新建分区文件系统设为系统所需格式：`mkfs -t ext4 /dev/vdb1`

该过程需要一段时间，大概一两分钟，耐心等待。。
![2020-04-20-LinuxFdisk-fs.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-fs.png)


这是执行完毕后的效果：
![2020-04-20-LinuxFdisk-fs-ok.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-fs-ok.png)

6. 新建挂载目录：`mkdir /mnt/sdc`

7. 将新建分区挂载到上一步创建的目录下：`mount /dev/vdb1 /mnt/sdc`

8. 查看挂载后磁盘信息：`df -TH`

![2020-04-20-LinuxFdisk-After.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-After.png)

可以看到新增了一个635G的磁盘，挂载在/mnt/sdc。

### 设置开机自动挂载磁盘分区

> 云服务器重启后，挂载会失效。需要修改“/etc/fstab”文件，将新建磁盘分区设置为开机自动挂载。

设置云服务器系统启动时自动挂载磁盘分区，不能采用在“/etc/fstab”直接指定设备名（比如/dev/vdb1）的方法，因为云中设备的顺序编码在关闭或者开启云服务器过程中可能发生改变，例如/dev/vdb1可能会变成/dev/vdb2。推荐使用UUID来配置自动挂载磁盘分区。

1. 查询磁盘分区的UUID：`blkid /dev/vdb1`

![2020-04-20-LinuxFdisk-uuid.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-20-LinuxFdisk-uuid.png)

2. 使用VI编辑器打开“fstab”文件：`vi /etc/fstab`

键入`i`，进入插入模式，添加如下一行：

> UUID=34cffb31-e89c-4150-9dd2-cfe9dfe5a0f7 /mnt/sdc                ext4    defaults        0 2

参数说明如下：
- 第一列为UUID，此处填写1中查询到的磁盘分区的UUID。
- 第二列为磁盘分区的挂载目录，可以通过df -TH命令查询。
- 第三列为磁盘分区的文件系统格式， 可以通过df -TH命令查询。
- 第四列为磁盘分区的挂载选项，此处通常设置为defaults即可。
- 第五列为Linux dump备份选项。
    - 0表示不使用Linux dump备份。现在通常不使用dump备份，此处设置为0即可。
    - 1表示使用Linux dump备份。
- 第六列为fsck选项，即开机时是否使用fsck检查磁盘。
    - 0表示不检验。
    - 挂载点为（/）根目录的分区，此处必须填写1。
    - 根分区设置为1，其他分区只能从2开始，系统会按照数字从小到大依次检查下去。


### 数据迁移：系统盘—>数据盘

> 不用改配置，实现`MySQL`数据库迁移

- 停止MySQL服务

`service mysqld stop`

- 移动mysql目录至新挂载的数据盘目录

`mv /var/lib/mysql /mnt/sdc`

- 建立软连接，将新的`mysql`目录链接至`/var/lib`

`ln -s /mnt/sdc/mysql /var/lib`

- 重启MySQL服务

`service mysqld start`

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***