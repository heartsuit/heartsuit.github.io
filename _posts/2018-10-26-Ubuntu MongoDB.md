---
layout: post
title: Ubuntu下安装使用MongoDB
tags: Database
---

### 安装MongoDB

``` bash
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
apt-get update
apt-get install -y mongodb-org
```

### 启动、连接、配置
启动MongoDB服务，默认安装后，是启动MongoDB服务的

``` bash
service mongod stop　　#停止服务
service mongod start　　#启动服务
service mongod restart #重新启动服务
service mongod status #查看状态
chkconfig mongod on #加入开机启动服务
```

客户端连接，mongo安装完成后，默认是只能在本机连接，在服务器外部是不能连接mongo的
可通过vim 修改/etc/mongod.conf中的net，bindIP，把127.0.0.1改为0.0.0.0，可从配置文件中获取到以下目录存储信息

- 数据目录：/var/log/mongodb
- 日志目录：/var/lib/mongodb

### 基本操作

- Management

``` bash
mongo # 连接默认数据库test；
db # 显示当前连接的数据库；
show dbs # 显示所有可连接的数据库；
use dbName # 切换数据库（若DB不存在，则创建）；
show tables # 显示数据库中的表；
db.getCollectionNames() # 显示数据库中的表；
```

- CRUD

``` javascript
db.tableName.find().count()：查找对应数据表中的所有数据条数；
db.tableName.find().pretty()：查找对应数据表中的所有数据，并格式化显示；
db.tableName.findOne({name:'Tom'})：查找对应数据表中的一条数据；
db.tableName.insert({
  name:'n',
  password:'000000'
});
db.tableName.update({name:'n'}, {$set:{password:'111'}});
db.tableName.remove({name:'n'});
db.tableName.drop(); ：删除数据表
db.dropDatabase(); ：删除数据库
```

- Other operations

``` javascript
db.getCollectionNames(); ：获取所有数据表名
db.oldname.renameCollection("newname"); ：数据表重命名
```

### 用户：认证与授权

创建用户:

**记住关键的一点：在MongoDB中用户跟着数据库走。**

1 添加管理用户（mongoDB中没有超级管理员用户，只有用来管理用户的用户`userAdminAnyDatabase`）

``` javascript
use admin
db.createUser({
  user: "用户名",
  pwd:"密码",
  roles:[{ role: "userAdminAnyDatabase", db: "admin" }]
})
```

2 开启认证：/etc/mongod.conf中修改：

``` yml
security:  
  authorization: enabled  
```

3 重启mongod， 认证

以创建的管理用户身份进行认证

``` javascript
> use admin
switched to db admin
> db.auth("用户名","密码")   # 认证成功返回1
1
```

**Note:**
- 若不进行认证，将无法进行后续操作

> 2018-10-26T14:35:17.218+0800 E QUERY    [thread1] Error: listCollections failed: {
  "ok" : 0,
  "errmsg" : "not authorized on admin to execute command { listCollections: 1.0, filter: {} }",
  "code" : 13,
  "codeName" : "Unauthorized"
} :
_getErrorWithCode@src/mongo/shell/utils.js:25:13
DB.prototype._getCollectionInfosCommand@src/mongo/shell/db.js:807:1
DB.prototype.getCollectionInfos@src/mongo/shell/db.js:819:19
DB.prototype.getCollectionNames@src/mongo/shell/db.js:830:16
@(shell):1:1

- admin用户仅具有用户管理权限

4 为指定库创建读写权限的用户

``` javascript
use targetDB
db.createUser({
  user: "hello",
  pwd:"world",
  roles:[{ role: "readWrite", db: "targetDB" }]
})
```

5. 查看已创建的用户

- 通过admin认证后，可以查看已创建的所有用户。

``` javascript
db.system.users.find().pretty();
```

- 使用刚创建的读写权限的用户认证

``` javascript
> use targetDB
switched to db targetDB
> db.auth('hello', 'world')
1
```

### 数据导出、导入，备份、恢复

``` bash
导出：mongoexport -d 库名 -c 表名 -o 目录\表名.json --type json
导入：mongoimport -d 库名 -c 表名 --file 目录\表名.json --type json
备份：mongodump -h localhost -u 用户名 -p 密码 -d 库名 -o 目录
恢复：mongorestore -h ip:port -u 用户名 -p 密码 -d 库名 --dir 目录
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***