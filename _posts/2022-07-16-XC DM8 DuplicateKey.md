---
layout: post
title: 信创环境下达梦数据库唯一索引异常无法拦截DuplicateKeyException
tags: 国产化, 达梦数据库
---

## 背景

迁移到达梦数据库后，发现我们的全局异常拦截中的唯一索引异常 `DuplicateKeyException` 无法被正常拦截，给前端直接抛出了数据库原始的错误信息，对用户极其不友好。

## 异常信息

如果不对唯一索引异常拦截，则默认 `MySQL` 与 `达梦数据库` 的异常信息如下：

> MySQL异常：Error updating database.  Cause: java.sql. SQLIntegrityConstraintViolationException: Duplicate entry '111' for key 'XXX'

> 达梦8异常：Error updating database.  Cause: dm.jdbc.driver. DMException: 违反表[YYY]唯一性约束

## 全局异常拦截

在 `SpringBoot` 中通过 `RestControllerAdvice` 注解，实现对异常响应的统一封装。可参考：[全栈开发之后端脚手架：SpringBoot集成MybatisPlus代码生成，分页，雪花算法，统一响应，异常拦截，Swagger3接口文档](https://heartsuit.blog.csdn.net/article/details/122644435)

以下是对数据库唯一索引异常的拦截，统一返回：**编号不可重复**。

```java
@RestControllerAdvice
public class GlobalExceptionHandler
{
    /**
     * 唯一索引异常
     */
    @ExceptionHandler(DuplicateKeyException.class)
    public AjaxResult handleDuplicateKeyException(DuplicateKeyException e)
    {
        return AjaxResult.error("编号不可重复");
    }
}
```

## 问题分析

`Spring` 对主流的数据库的异常进行了封装与翻译，对于 `DuplicateKeyException` 都可以进行拦截，但是到了国产数据库，比如这里是达梦8，那么其异常信息 `Spring` 就不认识了。

### DuplicateKeyException产生过程

`Spring JDBC` 模块在发生数据库异常时会执行 `org.springframework.jdbc.support.SQLErrorCodeSQLExceptionTranslator#doTranslate` 方法，将不同数据库的 `errorCode` 进行映射，转换为自定义的框架异常。

![2022-07-16-DuplicateKeyException.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-07-16-DuplicateKeyException.jpg)

### SQLErrorCodes生成方式

`Spring` 在启动时会将资源文件 `org/springframework/jdbc/support/sql-error-codes.xml` 生成 `org.springframework.jdbc.support.SQLErrorCodes` 对象，程序出现异常时将根据错误码解析并映射为 `Spring` 定义的数据库异常。

## 解决方案

**在IDEA中直接双击Shift**，输入 `sql-error-codes` 即可快速定位到这个 `XML` 文件。

![2022-07-16-ErrorCodeXML.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-07-16-ErrorCodeXML.jpg)

其中 `sql-error-codes.xml` 中有提示性的一句描述："Can be overridden by definitions in a `sql-error-codes.xml` file - in the root of the class path." ，告诉我们这个文件可以被覆盖，直接复制该文件到对应模块的 `resources` 目录下，增加对应数据库需要的错误码映射。

* 达梦里的`DuplicateKeyException`对应的错误码为`-6602`，这可以查阅达梦官方的文档。

![2022-07-16-DMErrorCode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-07-16-DMErrorCode.jpg)

* `sql-error-codes.xml`修改后放到`resources`目录

然后，在达梦中抛出唯一索引异常后会被翻译为 `DuplicateKeyException` ，可以被 `Spring` 拦截。

![2022-07-16-ResourceFile.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-07-16-ResourceFile.jpg)

* 修改后的`sql-error-codes.xml`文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE beans PUBLIC "-//SPRING//DTD BEAN 2.0//EN" "https://www.springframework.org/dtd/spring-beans-2.0.dtd">

<!--
	- Default SQL error codes for well-known databases.
	- Can be overridden by definitions in a "sql-error-codes.xml" file
	- in the root of the class path.
	-
	- If the Database Product Name contains characters that are invalid
	- to use in the id attribute (like a space) then we need to add a property
	- named "databaseProductName"/"databaseProductNames" that holds this value.
	- If this property is present, then it will be used instead of the id for
	- looking up the error codes based on the current database.
	-->
<beans>

	<bean id="DB2" name="Db2" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductName">
			<value>DB2*</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>-007,-029,-097,-104,-109,-115,-128,-199,-204,-206,-301,-408,-441,-491</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>-803</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>-407,-530,-531,-532,-543,-544,-545,-603,-667</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>-904,-971</value>
		</property>
		<property name="transientDataAccessResourceCodes">
			<value>-1035,-1218,-30080,-30081</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>-911,-913</value>
		</property>
	</bean>

	<bean id="Derby" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductName">
			<value>Apache Derby</value>
		</property>
		<property name="useSqlStateForTranslation">
			<value>true</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>42802,42821,42X01,42X02,42X03,42X04,42X05,42X06,42X07,42X08</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>23505</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>22001,22005,23502,23503,23513,X0Y32</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>04501,08004,42Y07</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>40XL1</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>40001</value>
		</property>
	</bean>

	<bean id="H2" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="badSqlGrammarCodes">
			<value>42000,42001,42101,42102,42111,42112,42121,42122,42132</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>23001,23505</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>22001,22003,22012,22018,22025,23000,23002,23003,23502,23503,23506,23507,23513</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>90046,90100,90117,90121,90126</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>50200</value>
		</property>
	</bean>

	<!-- https://help.sap.com/saphelp_hanaplatform/helpdata/en/20/a78d3275191014b41bae7c4a46d835/content.htm -->
	<bean id="HDB" name="Hana" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductNames">
			<list>
				<value>SAP HANA</value>
				<value>SAP DB</value>
			</list>
		</property>
		<property name="badSqlGrammarCodes">
			<value>
				257,259,260,261,262,263,264,267,268,269,270,271,272,273,275,276,277,278,
				278,279,280,281,282,283,284,285,286,288,289,290,294,295,296,297,299,308,309,
				313,315,316,318,319,320,321,322,323,324,328,329,330,333,335,336,337,338,340,
				343,350,351,352,362,368
			</value>
		</property>
		<property name="permissionDeniedCodes">
			<value>10,258</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>301</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>461,462</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>-813,-709,-708,1024,1025,1026,1027,1029,1030,1031</value>
		</property>
		<property name="invalidResultSetAccessCodes">
			<value>-11210,582,587,588,594</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>131</value>
		</property>
		<property name="cannotSerializeTransactionCodes">
			<value>138,143</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>133</value>
		</property>
	</bean>

	<bean id="HSQL" name="Hsql" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductName">
			<value>HSQL Database Engine</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>-22,-28</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>-104</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>-9</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>-80</value>
		</property>
	</bean>

	<bean id="Informix" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductName">
			<value>Informix Dynamic Server</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>-201,-217,-696</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>-239,-268,-6017</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>-692,-11030</value>
		</property>
	</bean>

	<bean id="MS-SQL" name="SqlServer" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductName">
			<value>Microsoft SQL Server</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>156,170,207,208,209</value>
		</property>
		<property name="permissionDeniedCodes">
			<value>229</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>2601,2627</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>544,8114,8115</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>4060</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>1222</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>1205</value>
		</property>
	</bean>

	<bean id="MySQL" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductNames">
			<list>
				<value>MySQL</value>
				<value>MariaDB</value>
			</list>
		</property>
		<property name="badSqlGrammarCodes">
			<value>1054,1064,1146</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>1062</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>630,839,840,893,1169,1215,1216,1217,1364,1451,1452,1557</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>1</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>1205,3572</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>1213</value>
		</property>
	</bean>

	<bean id="Oracle" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="badSqlGrammarCodes">
			<value>900,903,904,917,936,942,17006,6550</value>
		</property>
		<property name="invalidResultSetAccessCodes">
			<value>17003</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>1</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>1400,1722,2291,2292</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>17002,17447</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>54,30006</value>
		</property>
		<property name="cannotSerializeTransactionCodes">
			<value>8177</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>60</value>
		</property>
	</bean>

	<bean id="PostgreSQL" name="Postgres" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="useSqlStateForTranslation">
			<value>true</value>
		</property>
		<property name="badSqlGrammarCodes">
			<value>03000,42000,42601,42602,42622,42804,42P01</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>21000,23505</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>23000,23502,23503,23514</value>
		</property>
		<property name="dataAccessResourceFailureCodes">
			<value>53000,53100,53200,53300</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>55P03</value>
		</property>
		<property name="cannotSerializeTransactionCodes">
			<value>40001</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>40P01</value>
		</property>
	</bean>

	<bean id="Sybase" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductNames">
			<list>
				<value>Sybase SQL Server</value>
				<value>Adaptive Server Enterprise</value>
				<value>ASE</value>  <!-- name as returned by jTDS driver -->
				<value>SQL Server</value>
				<value>sql server</value>  <!-- name as returned by jTDS driver -->
			</list>
		</property>
		<property name="badSqlGrammarCodes">
			<value>101,102,103,104,105,106,107,108,109,110,111,112,113,116,120,121,123,207,208,213,257,512</value>
		</property>
		<property name="duplicateKeyCodes">
			<value>2601,2615,2626</value>
		</property>
		<property name="dataIntegrityViolationCodes">
			<value>233,511,515,530,546,547,2615,2714</value>
		</property>
		<property name="transientDataAccessResourceCodes">
			<value>921,1105</value>
		</property>
		<property name="cannotAcquireLockCodes">
			<value>12205</value>
		</property>
		<property name="deadlockLoserCodes">
			<value>1205</value>
		</property>
	</bean>

	<!-- 支持达梦数据库错误码-->
	<bean id="DM" class="org.springframework.jdbc.support.SQLErrorCodes">
		<property name="databaseProductNames">
			<list>
				<!-- 数据源名称存在空格不能像Oracle一样直接作为beanId -->
				<value>DM DBMS</value>
			</list>
		</property>
		<property name="duplicateKeyCodes">
			<value>-6602</value>
		</property>
	</bean>
</beans>
```

## Reference

* [https://blog.csdn.net/adaivskean/article/details/122261246](https://blog.csdn.net/adaivskean/article/details/122261246)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
