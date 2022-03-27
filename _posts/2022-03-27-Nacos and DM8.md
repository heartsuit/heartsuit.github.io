---
layout: post
title: 信创迁移适配实战-修改Nacos2.0.4源码以连接达梦数据库DM8
tags: Nacos, SpringBoot, DataBase
---

## 背景

因信创迁移适配需要，我们需要将服务部署在国产化平台上。其中涉及到 `Nacos` 连接国产数据库的问题，这里以达梦数据库为例，使用**CV大法**（复制、粘贴）完成对 `Nacos` 源码修改，来实现对达梦数据库 `DM8` 的连接支持。

如果直接通过官方版本连接国产化数据库，或者MariaDB，便会报错（以下错误会在无法连接数据库时抛出，可能是端口未开放、数据库不允许远程连接等，反正就是不能成功与数据库建立连接。。）：

> Nacos Server did not start because dumpservice bean construction failure: No DataSource set

其实说白了只是换个驱动而已。这里以实际迁移需要作为出发点，仅仅将涉及 `MySQL` 数据源的地方改为 `DM8` 对应的代码，并未考虑兼容多种数据源、同时支持多种数据库的连接，因为有这类需求的都是改为对某个数据库的支持后，直接扔到服务器运行即可。当然，如果真的需要扩展对多种数据库的支持，那么改起来也并复杂，只是这时候建议直接切换 `Github` 上 `Nacos` 源码分支到[feature_multiple_datasource_support](https://github.com/alibaba/nacos/tree/feature_multiple_datasource_support)。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

## 下载源码

我这里使用的是 `Nacos` 的 `2.0.4` 版本：[https://github.com/alibaba/nacos/tree/2.0.4](https://github.com/alibaba/nacos/tree/2.0.4)

## 项目依赖

将达梦8的驱动安装至本地 `Maven` 仓库（驱动在安装包里有，包括文档）。

* 本地仓库

```bash
mvn install:install-file -Dfile=D:\Java\IdeaProjects\dmtest\drivers\jdbc\DmJdbcDriver18.jar -DgroupId=com.dm -DartifactId=DmJdbcDriver18 -Dversion=1.8 -Dpackaging=jar
```

![2022-03-27-DM8jar.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-DM8jar.jpg)

## 修改源码

### pom.xml

修改nacos-config模块的pom依赖。

```xml
        <dependency>
            <groupId>com.dm</groupId>
            <artifactId>DmJdbcDriver18</artifactId>
            <version>1.8</version>
        </dependency>
```

![2022-03-27-pom.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-pom.jpg)

### PropertiesConstant.java，PropertyUtil.java

* PropertiesConstant.java

```java
public static final String MYSQL = "mysql";
// 增加常量
public static final String DM8 = "dm8";
```

* PropertyUtil.java

```java
//            setUseExternalDB(PropertiesConstant.MYSQL
//                    .equalsIgnoreCase(getString(PropertiesConstant.SPRING_DATASOURCE_PLATFORM, "")));

            setUseExternalDB(PropertiesConstant.DM8
                    .equalsIgnoreCase(getString(PropertiesConstant.SPRING_DATASOURCE_PLATFORM, "")));

```

![2022-03-27-Property.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-Property.jpg)

### ExternalDataSourceProperties.java，ExternalDataSourceServiceImpl.java

复制 `ExternalDataSourceProperties` ， `ExternalDataSourceServiceImpl` ，分别重命名为 `DM8DataSourceProperties` ， `DM8DataSourceServiceImpl` 。修改驱动名称，以及 `DM8DataSourceServiceImpl.java` 对应的类名称。

* DM8DataSourceProperties.java

```java
private static final String JDBC_DRIVER_NAME = "dm.jdbc.driver.DmDriver";
```

* DM8DataSourceServiceImpl.java

```java
dataSourceList = new DM8DataSourceProperties()
        .build(EnvUtil.getEnvironment(), (dataSource) -> {
            JdbcTemplate jdbcTemplate = new JdbcTemplate();
            jdbcTemplate.setQueryTimeout(queryTimeout);
            jdbcTemplate.setDataSource(dataSource);
            testJtList.add(jdbcTemplate);
            isHealthList.add(Boolean.TRUE);
        });
```

![2022-03-27-Driver.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-Driver.jpg)

### DynamicDataSource.java

主要是将 `MySQL` 的实现类换为我们复制出来的 `DM8DataSourceServiceImpl` 。

```java
            if (PropertyUtil.isEmbeddedStorage()) {
                if (localDataSourceService == null) {
                    localDataSourceService = new LocalDataSourceServiceImpl();
                    localDataSourceService.init();
                }
                return localDataSourceService;
            } else {
                if (basicDataSourceService == null) {
                    basicDataSourceService = new DM8DataSourceServiceImpl();
                    basicDataSourceService.init();
                }
                return basicDataSourceService;
            }
```

![2022-03-27-DynamicDataSource.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-DynamicDataSource.jpg)

打完收工。

## 编译打包

```bash
mvn -Prelease-nacos -Dmaven.test.skip=true -Dpmd.skip=true -Dcheckstyle.skip=true clean install -U
```

编译输出在 `\nacos-2.0.4\distribution\target\nacos-server-2.1.0-SNAPSHOT` （我这里版本是自动从2.0.4升为2.1.0-SNAPSHOT快照版本）下的 `nacos` 目录。至此，属于我们自己的 `Nacos` 版本诞生了。

![2022-03-27-Build.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-Build.jpg)

## 修改配置

依然是手动修改配置 `conf\application.properties` ，连接达梦数据库。

```yaml
###If use DM8 as datasource:
spring.datasource.platform=dm8

###Count of DB:
db.num=1

###Connect URL of DB:
db.url.0=jdbc:dm://192.168.21.64:5236
db.user.0=SYSDBA
db.password.0=SYSDBA
```

## 数据迁移

既然我们要用 `Nacos` 连接达梦数据库，前提我们要把 `Nacos` 的数据或者 `SQL` 语句迁移到达梦数据库。借助 `DM数据迁移工具` ，完成 `Nacos` 配置数据表迁移到达梦数据库。

![2022-03-27-NacosConfigTransfer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-NacosConfigTransfer.jpg)

## 连接成功

不出意外，成功启动 `Nacos` 后，可以看到这样的界面，左上角显示了我们编译后的版本号。

![2022-03-27-Version.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-27-Version.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
