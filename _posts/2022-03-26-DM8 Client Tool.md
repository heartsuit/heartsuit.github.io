---
layout: post
title: 信创迁移适配实战-MySQL到达梦数据库DM8的数据迁移
tags: 国产化, SpringBoot, DataBase
---

## 背景

虽然最终会被部署到国产数据库环境，但是实际项目开发时大概率是一开始在 `MySQL` 上开发，直到最后部署时再做迁移适配。

之前是我们在项目真正开发之前进行的预研与测试。今天开始真实场景下的数据迁移，操作系统与数据库已经由专业的运维人员安装完毕，操作系统：*统信UOS*；数据库：*达梦8*。

虽然可以在`IDEA`中建立与`DM8`服务端连接，并且提供了不少功能，但是不能直接修改字段类型。还是通过DM自带的管理工具比较方便。到达梦官方注册账号，下载 `Windows` 下的开发版，可仅安装客户端工具。

![2022-03-26-ClientTool.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-ClientTool.jpg)

这次我们用到的主要是*DM管理工具*，*DM数据迁移工具*。

由于本系列文章仅用于记录当时项目的国产化迁移过程，不涉及太多的理论内容，基本都是一系列的操作过程，所以行文上就直接上操作了。如果您有任何疑问，欢迎留言评论。

> 从前车马很慢，书信很远，一生只够爱一个人。

> 如今生活太快，时间太少，不要绕圈子，给我来个痛快的。

## 数据迁移

包括配中心置数据库迁移与业务后台数据迁移。这里以 `Nacos` 官方的配置数据库迁移为例进行示例，迁移过程很顺利。

### 创建用户/模式

```sql
create user STANDARD_CONFIG identified by STANDARD_CONFIG123 limit failed_login_attemps 5, password_lock_time 5;
```

新建的 `STANDARD_CONFIG` 用户默认为 `PUBLIC` 角色，没有建表权限，先赋予建表权限，再迁移数据。

![2022-03-26-Permission.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-Permission.png)

### 开始迁移

* `Nacos` 官方的配置数据库迁移

![2022-03-26-Nacos.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-Nacos.png)

* `Nacos` 官方的配置数据库迁移成功

![2022-03-26-NacosSuccess.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-NacosSuccess.png)

## 错误处理

### 字段长度错误

实际迁移业务数据库时可能遇到一些报错问题，我们逐一解决。迁移过程中的报错一般都是字段长度超限， `MySQL` 和达梦字段长度定义不同， `MySQL` 中长度是达梦的3倍，所以只要将达梦的字段长度改为 `MySQL` 的3倍即可，可通过以下语句修改。

```sql
ALTER TABLE SYSDBA.SYS_USER MODIFY NICK_NAME varchar(90) NOT NULL;
```

### 自增列赋值错误

当手动导入数据时，报错：仅当指定列列表，且 `SET IDENTITY_INSERT` 为 `ON` 时，才能对自增列赋值；这是由于我们的数据对自增列进行了赋值操作，需要先开启对自增列的更新才能进行插入操作，注意不能有反引号。

```sql
set IDENTITY_INSERT sys_user ON;
INSERT INTO sys_user (user_id, dept_id, unit_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, login_ip, login_date, create_by, create_time, update_by, update_time, remark) VALUES (1, 101, NULL, 'admin', 'administrator', '00', '123@163.com', '15888888888', '1', '', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZPH.ulu33dHOiBE8ByOhJIrdAu2', '0', '0', '127.0.0.1', '2021-11-22 11:15:51', 'admin', '2021-11-22 11:15:51', '', NULL, '管理员');
set IDENTITY_INSERT sys_user OFF;
```

另外，通过程序执行时，可能遇到同样的错误，我们使用 `MyBatisPlus` ，进行 `save` 操作时（采用默认的策略，即生成的雪花算法），因为默认的 `SQL` 语句包含了 `ID` 列的赋值导致报错，解决办法是将 `ID` 主键字段设置为非自增。

### UPDATE不生效

`UPDATE` 语句要带 `commit` ；

```sql
UPDATE SYS_NOTICE SET notice_content = '<p>你懂的，for search.</p>';
commit;
```

### JSON支持

`DM` 支持 `JSON` 数据的存储和查询，在 `DM` 库中 `JSON` 以字符串形式存储。

```sql
CREATE TABLE std_standard_option (
	name VARCHAR(50) NOT NULL COMMENT '名称',
	content VARCHAR CONSTRAINT JSON_CHECK CHECK(CONTENT IS JSON) COMMENT '内容'
)
```

### 达梦字符串截断

虽然 `DM` 支持 `JSON` 数据的存储和查询，但是我们的 `JSON` 长度过长，超出了 `JSON` 类型能够存储的最大长度，后来就干脆使用 `TEXT` 类型来存储 `JSON` 数据。

```sql
CREATE TABLE "SYSDBA"."STD_STANDARD_TITLE"
(
"name" VARCHAR(50) NOT NULL,
"content" TEXT NOT NULL);

COMMENT ON TABLE "SYSDBA"."STD_STANDARD_TITLE" IS '标准题录表';
COMMENT ON COLUMN "SYSDBA"."STD_STANDARD_TITLE"."content" IS '内容';
COMMENT ON COLUMN "SYSDBA"."STD_STANDARD_TITLE"."name" IS '名称';
```

达梦数据库中一行记录的所有字段的实际长度的和不能超过页大小的一半。在达梦数据库中，一行记录所有字段长度累加不能超过下表：

![2022-03-26-PageSize.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-PageSize.jpg)

## 项目适配

[信创迁移适配预研-SpringBoot连接达梦数据库DM8服务并在IDEA中连接]()里，我们使用自己安装到虚拟机环境的数据库服务，并且通过添加外部依赖的方式加载依赖，这里我们要将数据库依赖打包至部署包中。

### 项目依赖

* 安装依赖至本地仓库

```bash
mvn install:install-file -Dfile=D:\Java\IdeaProjects\dmtest\drivers\jdbc\DmJdbcDriver18.jar -DgroupId=com.dm -DartifactId=DmJdbcDriver18 -Dversion=1.8 -Dpackaging=jar
```

* pom.xml

```xml
        <dependency>
            <groupId>com.dm</groupId>
            <artifactId>DmJdbcDriver18</artifactId>
            <version>1.8</version>
        </dependency>
```

* yml

```yaml
            driver-class-name: dm.jdbc.driver.DmDriver
            url: jdbc:dm://192.168.21.64:5236
            username: SYSDBA
            password: SYSDBA
```

### 函数报错

项目打包部署后，在实际国产化环境下进行测试，发现一些函数报错了。

* 在 `MySQL` 中使用的函数 `find_in_set` 迁移到`DM8`后报错。

> ###Error querying database. Cause: dm.jdbc.driver. DMException: 第1 行附近出现错误: 无法解析的成员访问表达式[find_in_set] ###The error may exist in class path resource [mapper/system/SysUserMapper.xml] ###The error may involve com.yfcx.system.mapper. SysUserMapper.selectUserList_COUNT ###The error occurred while executing a query ###SQL: SELECT count(0) FROM sys_user u LEFT JOIN sys_dept d ON u.dept_id = d.dept_id WHERE u.del_flag = '0' AND (u.dept_id = ? OR u.dept_id IN (SELECT t.dept_id FROM sys_dept t WHERE find_in_set(?, ancestors))) ###Cause: dm.jdbc.driver. DMException: 第1 行附近出现错误: 无法解析的成员访问表达式[find_in_set] ; 第1 行附近出现错误: 无法解析的成员访问表达式[find_in_set]; nested exception is dm.jdbc.driver. DMException: 第1 行附近出现错误: 无法解析的成员访问表达式[find_in_set]

解决：在达梦数据库中执行

```sql
CREATE OR REPLACE FUNCTION FIND_IN_SET
                (
                        piv_str1 varchar2,
                        piv_str2 varchar2,
                        p_sep    varchar2 := ',')
                RETURN NUMBER
                            IS
                l_idx     number:=0;                 -- 用于计算piv_str2中分隔符的位置
                str       varchar2(500);             -- 根据分隔符截取的子字符串
                piv_str   varchar2(500) := piv_str2; -- 将piv_str2赋值给piv_str
                res       number        :=0;         -- 返回结果
                loopIndex number        :=0;
        BEGIN
                -- 如果piv_str中没有分割符，直接判断piv_str1和piv_str是否相等，相等 res=1
                IF instr(piv_str, p_sep, 1) = 0 THEN
                        IF piv_str          = piv_str1 THEN
                                res        := 1;
                        END IF;
                ELSE
                        -- 循环按分隔符截取piv_str
                        LOOP
                                l_idx    := instr(piv_str, p_sep);
                                loopIndex:=loopIndex+1;
                                -- 当piv_str中还有分隔符时
                                IF l_idx > 0 THEN
                                        -- 截取第一个分隔符前的字段str
                                        str:= substr(piv_str, 1, l_idx-1);
                                        -- 判断 str 和piv_str1 是否相等，相等 res=1 并结束循环判断
                                        IF str      = piv_str1 THEN
                                                res:= loopIndex;
                                                EXIT;
                                        END IF;
                                        piv_str := substr(piv_str, l_idx+length(p_sep));
                                ELSE
                                        -- 当截取后的piv_str 中不存在分割符时，判断piv_str和piv_str1是否相等，相等 res=1
                                        IF piv_str  = piv_str1 THEN
                                                res:= loopIndex;
                                        END IF;
                                        -- 无论最后是否相等，都跳出循环
                                        EXIT;
                                END IF;
                        END LOOP;
                        -- 结束循环
                END IF;
                -- 返回res
                RETURN res;
        END FIND_IN_SET;
commit;
```

* 在 `MySQL` 中使用的函数 `cast(field as char)` 迁移到`DM8`后报错。

```
###Error querying database.  Cause: dm.jdbc.driver.DMException: 第10 行附近出现错误: 无法转换的数据类型
###The error may exist in class path resource [mapper/system/SysNoticeMapper.xml]
###The error may involve com.yfcx.system.mapper.SysNoticeMapper.selectNoticeList
###The error occurred while executing a query
###SQL: SELECT * FROM (  SELECT TMP_PAGE.*, ROWNUM PAGEHELPER_ROW_ID FROM (  select notice_id, notice_title, notice_type, cast(notice_content as char) as notice_content, status, create_by, create_time, update_by, update_time, remark from sys_notice WHERE  notice_type = ? order by create_time desc  ) TMP_PAGE) WHERE PAGEHELPER_ROW_ID <= ? AND PAGEHELPER_ROW_ID > ?
```

这个错误主要是由于富文本编辑器内容使用了 `BLOB` 类型存储，在 `DM8` 中类型转换失败。

解决：不过前端的富文本编辑器不支持图片上传，由于字段内容不包含图片等二进制内容，在达梦数据库中直接换成了 `TEXT` 或 `CLOB` 类型就可以了。记得在代码中去掉 `cast` 转换函数。

关于字符串与二进制类型的各类转换，达梦的文档中有以下说明：*CAST(value AS type)*

![2022-03-26-Cast.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-26-Cast.jpg)

## Reference

[https://blog.csdn.net/nexttoparadise/article/details/122679955](https://blog.csdn.net/nexttoparadise/article/details/122679955)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
