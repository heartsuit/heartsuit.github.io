---
layout: post
title: 信创迁移适配预研-SpringBoot连接达梦数据库DM8服务并在IDEA中连接
tags: 国产化, SpringBoot, DataBase
---

## 背景

安装完数据库服务后，来试一下 `SpringBoot` 与达梦数据库集成，然后测试下基础的 `CRUD` 操作以及事务支持功能。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

## SpringBoot连接达梦数据库

* 依赖

以下通过外部依赖的方式集成达梦的依赖，实际部署时可通过 `maven` 将依赖包安装到本地仓库再进行引用。

```xml
        <dependency>
            <groupId>com.DmJdbcDriver18</groupId>
            <artifactId>DmJdbcDriver18</artifactId>
            <version>18.0.0</version>
            <scope>system</scope>
            <systemPath>${project.basedir}/extralib/DmJdbcDriver18.jar</systemPath>
        </dependency>
```

* 连接配置

```yaml
spring:
  datasource:
    username: "SMARTCITY"
    password: "SMART_CITY123"
    driver-class-name: dm.jdbc.driver.DmDriver
    url: jdbc:dm://hadoop3:5236
```

Note：达梦 `SQL` 查询必须指定 from **库名. 表名**，除非用户名和库名一致时可省略库名，这里我们都是在 `SMARTCITY` 库下操作。

* 集成MyBatisPlus

```yaml
mybatis-plus:
  configuration:
    # 开启下划线转驼峰
    map-underscore-to-camel-case: true
    # 指定默认枚举类型的类型转换器
    default-enum-type-handler: com.baomidou.mybatisplus.extension.handlers.MybatisEnumTypeHandler
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    # 开启/关闭 banner 打印
    banner: false
    db-config:
      # 逻辑删除（软删除）
      logic-delete-value: NOW()
      logic-not-delete-value: 'NULL'
  mapper-locations: classpath:mapper/*.xml
```

### 数据库测试

测试用例：基础的 `CRUD` 操作以及事务支持。

```java
@SpringBootTest
class DmtestApplicationTests {

    @Autowired
    CityService cityService;

    @Test
    public void selectTest(){
        List<City> list = cityService.list();
        System.out.println(list);
    }

    @Test
    public void insertTest(){
        City city = new City();
        city.setCityName("太原");
        city.setRegionId(43);
        cityService.save(city);
    }

    @Test
    @Transactional
    public void insertTest2() throws Exception {
        City city = new City();
        city.setCityName("石家庄");
        city.setRegionId(41);
        cityService.save(city);
        int x = 1/0;
        City city2 = new City();
        city2.setCityName("西安");
        city2.setRegionId(46);
        cityService.save(city);
    }
}
```

经过测试，发现通过 `SpringBoot` 、 `MyBatisPlus` 以及达梦数据库集成后，写入、查询、事务都是正常（事务会回滚）的。

![2022-03-20-Test.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-20-Test.jpg)

Note: 数据写入可以通过SQL语句，或者**DM数据迁移工具**实现。

### 在IDEA中连接达梦数据库

我们知道， `IDEA` 中可以连接各类数据库 `MySQL` ， `MongoDB` 等，其实我们通过手动添加驱动，也可实现对达梦数据库的支持。

* 添加数据源

![2022-03-20-DataSource.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-20-DataSource.jpg)

* 测试连接

![2022-03-20-DM8Test.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-20-DM8Test.jpg)

* 在IDEA中查看数据

![2022-03-20-IDEA.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-20-IDEA.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
