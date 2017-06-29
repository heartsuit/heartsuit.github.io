---
layout: post
title: SQL Server修改已有字段类型，并添加默认约束
tags: Database
---

    当数据表中存在数据，修改具有默认约束的字段定义时，需要先删除已有约束，才能对字段定义进行修改；而在SQL Server建表时创建的默认约束，其名称后会自动生成一段随机码，因此在删除时需要找到（在SQL Server Management Studio中选择表——>约束，可以看到以DF_开头的默认约束）已有约束名，再进行删除，这一过程较为繁琐。

    现采用以下代码实现对默认约束的自动匹配，并修改。看代码：

``` sql
-- 修改已有字段类型(eg:整型)为字符串，并添加、修改（如果有的话）默认约束(默认值为空串)
USE [库名]
DECLARE @name VARCHAR(50);
SELECT @name=b.name FROM syscolumns a,sysobjects b 
WHERE a.id=object_id('[LGShare_OrgFiles]') AND b.id=a.cdefault AND a.name='FromWhere' AND b.name LIKE 'DF%';
IF @name IS NOT NULL BEGIN
    EXEC('ALTER TABLE [表名] DROP CONSTRAINT '+@name); --删除已有约束
    ALTER TABLE [表名] ALTER COLUMN [列名] NVARCHAR(4) NOT NULL; --修改字段定义
    EXEC('ALTER TABLE [表名] ADD CONSTRAINT '+@name+' DEFAULT '+''''+''''+' FOR [列名]'); -- 添加修改后的约束，注意此处空串的写法
END
ELSE BEGIN 
    ALTER TABLE [表名] ADD CONSTRAINT DF_列名 DEFAULT '' FOR [列名]; --添加新约束
END

```
---
if you have any questions or any bugs are found, please feel free to contact me.

Your comments and suggestions are welcome!


