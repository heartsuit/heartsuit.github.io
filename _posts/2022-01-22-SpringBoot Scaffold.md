---
layout: post
title: 全栈开发之后端脚手架：SpringBoot集成MybatisPlus代码生成，分页，雪花算法，统一响应，异常拦截，Swagger3接口文档
tags: SpringBoot
---

### 背景

当需要快速实现一个想法时，如果采用 `Java` 技术栈，一般都是选择 `SpringBoot` 技术栈，虽然 `SpringBoot` 解决了传统 `Spring` 及 `MVC` 配置等方面的问题，且其生态体系也非常强大，但是在实际使用时仍然需要集成最起码的数据库、响应封装、异常拦截、代码生成器、接口文档等基础组件，这时一般有两种手段：

1. 使用开源的各类后台管理系统，这类系统一般模块完善，功能强大；然而很多无关紧要的模块又会带来一些干扰；
2. 使用自建的简化版，集成最常用的模块即可，一方面便于掌控，同时在“重复造轮子”的过程中也熟悉下这些主流技术是如何整合在一起的。

这里，就从零开始搭建后端脚手架，以搭积木的方式将开源组件组装起来。后续的玩具项目都基于这个脚手架进行开发。

### MybatisPlus代码生成器

参考官方的代码仓库以及文档：https://mp.baomidou.com/guide/generator.html

![2022-01-22-CodeGenerator.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-CodeGenerator.jpg)

简单修改路径信息后，直接执行 `MysqlGenerator` 类的 `main` 方法。分别键入模块表以及表名即可生成 `Entity` , `Mapper` , `Service` , `Controller` 等对应的文件。

### MybatisPlus雪花算法ID

![2022-01-22-SnowFlake.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-SnowFlake.jpg)

`MybatisPlus` (3.3.1)的主键策略默认是雪花算法，如果不显式设置主键的话， `MybatisPlus` 通过代码自动通过雪花算法算出一个值，插入的时候就会将其作为id插入。

雪花算法（ `SnowFlake` ）是一个 `Long` 类型的 `Java` 长整型数字，一般对应 `MySQL` 中的类型为 `BIGINT(20)` ；具有趋势单调递增，且全局唯一的特点。

### MybatisPlus分页

![2022-01-22-Page.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-Page.jpg)

* MybatisPlusConfig.java

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public PaginationInterceptor paginationInterceptor() {
        return new PaginationInterceptor().setCountSqlParser(new JsqlParserCountOptimize(true));
    }
}
```

* PageUtils.java

```java
@Data
public class PageUtils {
    //总记录数
    private long total;

    //每页记录数
    private long size;

    //总页数
    private long pages;

    //当前页数
    private long current;

    //列表数据
    private List<?> records;

    //灵活添加
    private Map<String,Object> data;

    /**
     * 分页
     * @param records        列表数据
     * @param total  总记录数
     * @param size    每页记录数
     * @param current    当前页数
     */
    public PageUtils(List<?> records, long total, long size, long current) {
        this.records = records;
        this.total = total;
        this.size = size;
        this.current = current;
        this.pages = (long)Math.ceil((double)total/size);
    }

    /**
     * 分页
     * @param records        列表数据
     * @param total  总记录数
     * @param size    每页记录数
     * @param current    当前页数
     */
    public PageUtils(List<?> records, long total, long size, long current, Map<String,Object> data) {
        this.records = records;
        this.total = total;
        this.size = size;
        this.current = current;
        this.data = data;
        this.pages = (long)Math.ceil((double)total/size);
    }

    /**
     * 分页
     */
    public PageUtils(Page<?> page) {
        this.records = page.getRecords();
        this.total = (long)page.getTotal();
        this.size = page.getSize();
        this.current = page.getCurrent();
        this.pages = (long)page.getPages();
    }
}
```

* BookController.java

```java
// 分页查询：使用自定义PageUtils
@GetMapping("list")
public Result<PageUtils> list(@RequestParam(defaultValue = "0") Integer page, @RequestParam(defaultValue = "10") Integer size, @RequestParam Map<String, Object> params) {
    PageUtils list = bookService.findList(new Page<>(page, size), params);
    return Result.success(list);
}

// 分页查询：使用MyBatisPlus的page方法
@GetMapping("page")
public Result<IPage<Book>> page(@RequestParam(defaultValue = "0") Integer page, @RequestParam(defaultValue = "10") Integer size, @RequestParam Map<String, Object> params) {
    QueryWrapper<Book> queryWrapper = new QueryWrapper<>();
    queryWrapper.likeRight("read_date", params.get("readDate"));
    IPage<Book> list = bookService.page(new Page<>(page, size),queryWrapper);
    return Result.success(list);
}
```

### 统一响应封装

![2022-01-22-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-Result.jpg)

通过 `RestControllerAdvice` 注解，实现对请求的拦截，统一封装结果为 `Result` 。

```java
@RestControllerAdvice
public class ResultAdvice implements ResponseBodyAdvice<Object> {
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public boolean supports(MethodParameter methodParameter, Class<? extends HttpMessageConverter<?>> aClass) {
        return true;
    }

    @SneakyThrows
    @Override
    public Object beforeBodyWrite(Object o, MethodParameter methodParameter, MediaType mediaType, Class<? extends HttpMessageConverter<?>> aClass, ServerHttpRequest serverHttpRequest, ServerHttpResponse serverHttpResponse) {
        if (o instanceof String) {
            return objectMapper.writeValueAsString(Result.success(o));
        }
        if (o instanceof Result) {
            return o;
        }
        return Result.success(o);
    }
}
```

* Result.java

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    /** 结果状态 ,正常响应200，其他状态码都为失败*/
    private int code;
    private String msg;
    private T data;

    // Static methods
    /**
     * 成功时候的调用
     */
    public static <T> Result<T> success(T data) {
        return new Result<T>(data, CodeMsg.SUCCESS);
    }
    public static <T> Result<T> success() {
        return new Result<T>(CodeMsg.SUCCESS);
    }

    /**
     * 失败时候的调用
     */
    public static <T> Result<T> error(Integer code, String msg) {
        return new Result<T>(code, msg);
    }
    public static <T> Result<T> error(CodeMsg codeMsg) {
        return new Result<T>(codeMsg);
    }
    public static <T> Result<T> error(String msg) {
        CodeMsg codeMsg = new CodeMsg(HttpStatus.INTERNAL_SERVER_ERROR.value(), msg);
        return new Result<T>(codeMsg);
    }

    // Constructor
    private Result(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    private Result(T data, CodeMsg codeMsg) {
        this.data = data;
        if (codeMsg != null) {
            this.code = codeMsg.getCode();
            this.msg = codeMsg.getMsg();
        }
    }
    private Result(CodeMsg codeMsg) {
        if (codeMsg != null) {
            this.code = codeMsg.getCode();
            this.msg = codeMsg.getMsg();
        }
    }
}
```

* CodeMsg.java

```java
@Getter
public class CodeMsg {
    private int code;
    private String msg;

    // 通用的错误码
    public static final CodeMsg SUCCESS =new CodeMsg(HttpStatus.OK.value(), "success");
    public static final CodeMsg BAD_REQUEST = new CodeMsg(HttpStatus.BAD_REQUEST.value(), "请求无效");
    public static final CodeMsg SERVER_ERROR = new CodeMsg(HttpStatus.INTERNAL_SERVER_ERROR.value(), "服务端异常");
    public static final CodeMsg NO_HANDLER_FOUND = new CodeMsg(HttpStatus.NOT_FOUND.value(), "未找到对应资源");
    public static final CodeMsg UNAUTHORIZED = new CodeMsg(HttpStatus.UNAUTHORIZED.value(), "未认证或登录状态过期");
    public static final CodeMsg FORBIDDEN = new CodeMsg(HttpStatus.FORBIDDEN.value(), "未授权");
    // 自定义错误码
    public static final CodeMsg PARAMETER_ERROR = new CodeMsg(4000, "参数不正确！");
    /*用户相关：验证码*/
    public static final CodeMsg CAPTCHA_EXPIRED = new CodeMsg(4001, "验证码不存在或已过期");
    public static final CodeMsg CAPTCHA_INVALID = new CodeMsg(4002, "验证码错误");
    /*用户相关：认证授权*/
    public static final CodeMsg BAD_CREDENTIAL = new CodeMsg(4003, "用户名或密码错误");
    public static final CodeMsg ACCOUNT_NOT_FOUND = new CodeMsg(4004, "账号不存在");
    public static final CodeMsg ACCOUNT_NOT_ACTIVATED = new CodeMsg(4005, "账号未激活");
    // 限流
    public static final CodeMsg RATE_LIMIT = new CodeMsg(4006,"达到阈值啦!");
    // 熔断
    public static final CodeMsg DEGRADE = new CodeMsg(4007,"熔断啦!");

    public static CodeMsg error(String msg){
        return new CodeMsg(HttpStatus.BAD_REQUEST.value(),msg);
    }
    public CodeMsg(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
```

### 全局异常拦截

![2022-01-22-Exception.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-Exception.jpg)

默认拦截所有异常（也可自定义异常进行封装），同样通过 `RestControllerAdvice` 注解，实现对异常响应的统一封装。

* RestExceptionHandler.java

```java
@Slf4j
@RestControllerAdvice
public class RestExceptionHandler {
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<String> exception(Exception e) {
        log.error("Global exception: {}", null == e.getMessage() ? e.toString() : e.getMessage(), e);
        return Result.error(CodeMsg.SERVER_ERROR.getCode(), null == e.getMessage() ? e.toString() : e.getMessage());
    }
}
```

### CRUD的Controller

```java
@RestController
@RequestMapping("book")
@Api(tags = "测试Controller")
public class BookController {
    @Autowired
    IBookService bookService;

    @GetMapping("hello")
    @ApiOperation("哈喽")
    public String hello() {
        return "hello everyone.";
    }

    @GetMapping("list")
    public List<Book> list() {
        return bookService.list();
    }

    @PostMapping("save")
    public boolean save(@RequestBody Book book) {
        return bookService.save(book);
    }

    @GetMapping("detail/{id}")
    public Result detail(@PathVariable long id) {
        return Result.success(bookService.getById(id));
    }

    @GetMapping("error")
    public Result error() {
        int value = 8 / 0;
        return Result.success(value);
    }

    @GetMapping("page")
    public Result<IPage<Book>> page(@RequestParam(defaultValue = "0") Integer page, @RequestParam(defaultValue = "10") Integer size, @RequestParam Map<String, Object> params) {
        QueryWrapper<Book> queryWrapper = new QueryWrapper<>();
        queryWrapper.likeRight("read_date", params.get("readDate"));
        IPage<Book> list = bookService.page(new Page<>(page, size),queryWrapper);
        return Result.success(list);
    }
}
```

### Swagger3接口文档

![2022-01-22-Swagger3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-Swagger3.jpg)

* 引入依赖

```xml
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-boot-starter</artifactId>
    <version>${swagger.version}</version>
</dependency>
```

* 配置类

```java
@Configuration
@EnableOpenApi
public class SwaggerConfig {
    private static final String VERSION = "1.0.0";
    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.OAS_30)
                .apiInfo(apiInfo())
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.heartsuit.readingnotes.controller"))
                .paths(PathSelectors.any())
                .build();
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("SpringBoot+Swgger3.0后端服务接口文档")
                .contact(new Contact("Heartsuit", "https://blog.csdn.net/u013810234", "454670286@qq.com"))
                .description("基于Swagger3.0生成的接口文档")
                .termsOfServiceUrl("https://blog.csdn.net/u013810234")
                .license("The Apache License, Version 2.0")
                .licenseUrl("http://www.apache.org/licenses/LICENSE-2.0.html")
                .version(VERSION)
                .build();
    }
}
```

* 在控制器以及接口上添加注解

```java
@Api(tags = "测试Controller")
@RestController
public class HelloController {
    @GetMapping("hello")
    @ApiOperation("哈喽")
    public String hello() {
        return "Hello SpringBoot with Swagger3.0";
    }
}
```

* 启动服务，浏览器访问

没错，再没其他额外的注解了，直接启动服务，然后在浏览器访问即可。

Note：
* Swagger2.x的访问地址：http://localhost:8000/swagger-ui.html
* Swagger3.0的访问地址：http://localhost:8000/swagger-ui/index.html

* 控制生成文档的开关

实际中我们的接口文档只会在开发环境下使用，所以一般我们会在生产环境下关闭文档。

* application.yml

```yaml
spring:
  profiles:
    active: dev
```

* application-dev.yml

```yaml
springfox:
  documentation:
    enabled: true
```

* application-prod.yml

```yaml
springfox:
  documentation:
    enabled: false
```

### 遇到的问题

* 问题1：控制台打印`MyBatisPlus`的`SQL`日志

解决方法：

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

* 问题2：`Long`类型的雪花算法`ID`传到前端后精度丢失

解决方法：在后端 `JSON` 返回前统一将 `Long` 转为字符串。

```java
@Configuration
public class JacksonConfig {
    @Bean
    public ObjectMapper jacksonObjectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.createXmlMapper(false).build();
        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addSerializer(Long.class, ToStringSerializer.instance);
        objectMapper.registerModule(simpleModule);
        return objectMapper;
    }
}
```

* 问题3：全局异常处理时多个异常处理器匹配顺序

解决方法：

如下，除了全局拦截的所有异常 `Exception` 之外，还有一个自定义的异常 `CustomException` ，那么，当出现 `CustomException` 时，当前两个异常该如何匹配呢？答案是子类异常处理器优先，即会被 `customException` 方法拦截，而不会被 `exception` 方法拦截。

```java
@Slf4j
@RestControllerAdvice
public class RestExceptionHandler {
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<String> exception(Exception e) {
        log.error("Global exception: {}", null == e.getMessage() ? e.toString() : e.getMessage(), e);
        return Result.error(CodeMsg.SERVER_ERROR.getCode(), null == e.getMessage() ? e.toString() : e.getMessage());
    }

    @ExceptionHandler(CustomException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<String> customException(CustomException e) {
        log.error("Custom exception: {}", null == e.getMessage() ? e.toString() : e.getMessage(), e);
        return Result.error(e.getCode(), null == e.getMessage() ? e.toString() : e.getMessage());
    }
}
```

```java
@Getter
public class CustomException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private Integer code;

    public CustomException(CodeMsg codeMsg) {
        super(codeMsg.getMsg());
        this.code = codeMsg.getCode();
    }
    public CustomException(Integer code, String msg){
        super(msg);
        this.code = code;
    }
}
```

* 问题4：访问Swagger地址时报错：Unable to infer base url. This is common when using dynamic servlet registration or when the API is behind an API Gateway. The base url is the root of where all the swagger resources are served. For e.g. if the api is available at http://example.org/api/v2/api-docs then the base url is http://example.org/api/. Please enter the location manually

解决方法：

原因是我们使用 `RestControllerAdvice` 统一处理接口响应，导致给Swagger的返回值也包装了一层，最终在浏览器无法解析、渲染页面。

将 `@RestControllerAdvice` 改为： `@RestControllerAdvice(basePackages = "com.heartsuit.*.controller")`

即限制 `RestControllerAdvice` 的拦截范围，仅处理指定包下的接口响应。

### 项目依赖

```xml
<properties>
        <java.version>11</java.version>
        <mybatisplus.version>3.3.1</mybatisplus.version>
        <swagger.version>3.0.0</swagger.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>

        <!--Web-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!--MySQL and ORM-->
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>druid-spring-boot-starter</artifactId>
            <version>1.1.21</version>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-boot-starter</artifactId>
            <version>${mybatisplus.version}</version>
        </dependency>

        <!--Swagger3.0-->
        <dependency>
            <groupId>io.springfox</groupId>
            <artifactId>springfox-boot-starter</artifactId>
            <version>${swagger.version}</version>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
```

### 配置文件

```yaml
server:
  port: 8000

spring:
  datasource:
    type: com.alibaba.druid.pool.DruidDataSource
    driverClassName: com.mysql.cj.jdbc.Driver
    druid:
      url: jdbc:mysql://localhost:3306/reading_notes?serverTimezone=Asia/Shanghai&characterEncoding=UTF-8&useSSL=false
      username: root
      password: root

mybatis-plus:
  mapper-locations: classpath:mapper/**/*.xml
  typeAliasesPackage: com.heartsuit.*.entity

  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

### IDEA相关插件

![2022-01-22-Plugin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-22-Plugin.jpg)

用到的插件：

* `Lombok` ：通过注解生成Getter, Setter, toString()以及日志打印；
* `MyBatis Log Plugin` ：从MyBatis以及MyBatisPlus控制台日志的SQL复原SQL+参数拼接；
* `RestfulToolkit` ：在IDEA中测试控制层的接口，无需再切换出IDE到浏览器或者Postman；
* `Free Mybatis plugin` ：链接Mapper接口与xml；

### Reference

[https://blog.csdn.net/huishuaijun/article/details/107396906](https://blog.csdn.net/huishuaijun/article/details/107396906)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
