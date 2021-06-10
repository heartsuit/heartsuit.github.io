---
layout: post
title: Ansible纸上谈兵03：Playbook
tags: Ansible, Server
---

### 背景

`ad-hoc` ，通过一次执行一行命令，可以实现简单的文件管理、软件包管理、服务管理等；但是如果想要多次执行一个任务，或者一次执行多个任务，那么 `ad-hoc` 就显得有点繁琐和力不从心了，这时候就轮到 `Playbook` 登场了。

`Playbook` 是由 `yml` 语法书写，结构清晰，可读性强，可以简单将其理解为一门编程语言（本身具有变量、分支、循环、监听器的概念）。在一个 `Playbook` 中可以包含一组自动化任务，主要有以下部分：

```yml
- hosts: group                     [主机或主机组]
  tasks:                           [剧本中的任务]
    - name:                        [输入模块选项]
      module:                      [输入要执行的模块]
        module_options-1: value    [输入模块选项]
        module_options-2: value
        ...
        module_options-N: value
```

Note: 

1. 执行 `ad-hoc` 命令，通过 `ansibile` 程序运行；
2. 执行 `playbook` 剧本，通过 `ansibile-playbook` 程序运行；

### 主机清单

主机清单配置与上一篇[Ansible纸上谈兵01：认识一下Ansible](https://heartsuit.blog.csdn.net/article/details/116903916)文章中的一致，并对其进行分组（1个控制端，3个web服务，1个数据库服务，1个缓存服务）。

```bash
# Ansible默认的配置文件位于/etc/ansible/hosts
[root@ecs-kunpeng-0001 ~]# vim /etc/ansible/hosts
# 配置以下内容
[controller]
192.168.0.6
[web]
192.168.0.53
192.168.0.39
192.168.0.46
[db]
192.168.0.235
[cache]
192.168.0.166
```

### ansibile-playbook

* `ansibile-playbook` 命令语法格式：

    ansible-playbook [剧本文件]

* 检查剧本是否存在语法错误

    ansible-playbook [剧本文件] --syntax-check

Note: 一般会创建一个专门的目录存放 `playbook` 剧本。

### Playbook基本实例：安装JDK

* `playbook` 源码

```yml
- hosts: cache
  tasks:
    # 在目标主机组上创建安装目录
    - name: mkdir jdk directory
      file: 
        path: /opt
        state: directory
        mode: 755
    # 从本地传输文件至远程目标主机组并解压
    - name: copy and unzip jdk 
      unarchive: 
        src: /opt/software/jdk-8u281-linux-aarch64.tar.gz
        dest: /opt
    # 设置环境变量
    - name: set env 
      lineinfile: dest=/etc/profile insertafter="{{item.position}}" line="{{item.value}}" state=present
      with_items:
        - {position: EOF, value: "export JAVA_HOME=/opt/jdk1.8.0_281"}
        - {position: EOF, value: "export PATH=$JAVA_HOME/bin:$PATH"}
    # 赋予权限
    - name: chmod bin
      file: 
        dest: /opt/jdk1.8.0_281/bin
        mode: 755
        recurse: yes
    # 刷新配置
    - name: refresh env
      shell: source /etc/profile
```

* `playbook` 执行

```bash
# 检查语法（若没有错误信息，则表示无语法错误）
[root@ecs-kunpeng-0001 ~]# ansible-playbook /opt/playbook/install-jdk.yml --syntax-check

playbook: /opt/playbook/install-jdk.yml

# 执行playbook
[root@ecs-kunpeng-0001 ~]# ansible-playbook /opt/playbook/install-jdk.yml

PLAY [cache] *******************************************************************************************************************

TASK [Gathering Facts] *********************************************************************************************************
ok: [192.168.0.166]

TASK [mkdir jdk directory] *****************************************************************************************************
changed: [192.168.0.166]

TASK [copy and unzip jdk] ******************************************************************************************************
changed: [192.168.0.166]

TASK [set env] *****************************************************************************************************************
changed: [192.168.0.166] => (item={'position': 'EOF', 'value': 'export JAVA_HOME=/opt/jdk1.8.0_281'})
changed: [192.168.0.166] => (item={'position': 'EOF', 'value': 'export PATH=$JAVA_HOME/bin:$PATH'})

TASK [chmod bin] ***************************************************************************************************************
changed: [192.168.0.166]

TASK [refresh env] *************************************************************************************************************
changed: [192.168.0.166]

PLAY RECAP *********************************************************************************************************************
192.168.0.166              : ok=6    changed=5    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0 
```

### Playbook高阶实例：部署SpringBoot服务

下面的剧本，包含了 `Playbook` 基础的语法：变量、条件、循环等。当然这里为演示 `Playbook` 的效果，没有结合诸如 `Jenkins` 等 `CI` 工具，徒增理解复杂性，而是将待部署的 `jar` 包手动放到控制机的一个目录中。

* `playbook` 代码

```yml
- hosts: controller # 定义运行的主机
  vars: # 设置变量
    deploy_dir: /opt/deploy
    jar_dir_name: registry

  remote_user: root
  gather_facts: no
  tasks:
    # 获取本地打包好的文件名
    - name: Get local file name
      local_action: shell ls {{ deploy_dir }}/{{ jar_dir_name }}/*.jar
      register: file_name

    # 创建目标目录
    - name: create target directory {{ deploy_dir }}/{{ jar_dir_name }}
      file:
        path: "{{ deploy_dir }}/{{ jar_dir_name }}"
        state: directory
      when: file_name.stdout != ""

    # 上传jar包到服务器
    - name: Upload jar file to server {{ file_name.stdout }}
      copy:
        src: "{{ file_name.stdout }}"
        dest: "{{ deploy_dir }}/{{ jar_dir_name }}"
      when: file_name.stdout != ""

    # 获取上次jar包运行的pid
    - name: Get pid of service
      shell: "ps -ef | grep -v grep | grep {{ jar_dir_name }}- | awk '{print $2}'"
      register: running_processes

    # 发送停止运行信号
    - name: Kill running processes {{ running_processes.stdout_lines }}
      shell: "kill {{ item }}"
      with_items: "{{ running_processes.stdout_lines }}"

    # 等待60s钟，确认获取的到的pid是否都停止运行
    - wait_for:
        path: "/proc/{{ item }}/status"
        state: absent
        timeout: 60
      with_items: "{{ running_processes.stdout_lines }}"
      ignore_errors: yes
      register: killed_processes

    # 强制杀死，未停止运行的进程
    - name: Force kill stuck processes
      shell: "kill -9 {{ item }}"
      with_items: "{ { killed_processes.results | select('failed') | map(attribute='item') | list }}"

    # 启动新的jar包
    - name: Start service {{ file_name.stdout }}
      shell: "nohup java -jar {{ file_name.stdout }} --spring.profiles.active=kp &> {{ deploy_dir }}/{{ jar_dir_name }}/nohup.out &"
```

* `playbook` 执行

```bash
# 检查语法
[root@ecs-kunpeng-0001 ~]# ansible-playbook /opt/playbook/deploy-springboot.yml --syntax-check

playbook: /opt/playbook/deploy-springboot.yml

# 部署一个基于SpringBoot、Eureka的注册中心程序，这里涉及到变量传参
[root@ecs-kunpeng-0001 ~]# ansible-playbook /opt/playbook/deploy-springboot.yml -e "jar_dir_name=registry"

PLAY [controller] **************************************************************************************************************

TASK [Get local file name] *****************************************************************************************************
changed: [192.168.0.6 -> localhost]

TASK [create target directory /opt/deploy/registry] ****************************************************************************
ok: [192.168.0.6]

TASK [Upload jar file to server /opt/deploy/registry/registry-0.0.1-SNAPSHOT.jar] **********************************************
ok: [192.168.0.6]

TASK [Get pid of service] ******************************************************************************************************
changed: [192.168.0.6]

TASK [Kill running processes ['1828029']] **************************************************************************************
changed: [192.168.0.6] => (item=1828029)

TASK [wait_for] ****************************************************************************************************************
ok: [192.168.0.6] => (item=1828029)

TASK [Force kill stuck processes] **********************************************************************************************

TASK [Start service /opt/deploy/registry/registry-0.0.1-SNAPSHOT.jar] **********************************************************
changed: [192.168.0.6]

PLAY RECAP *********************************************************************************************************************
192.168.0.6                : ok=7    changed=4    unreachable=0    failed=0    skipped=1    rescued=0    ignored=0 
```

### Reference

* [https://docs.ansible.com/ansible/latest/index.html](https://docs.ansible.com/ansible/latest/index.html)

* [https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html](https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html)

* [https://www.jianshu.com/p/d5185bb8c4b8](https://www.jianshu.com/p/d5185bb8c4b8)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
