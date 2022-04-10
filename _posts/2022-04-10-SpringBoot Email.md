---
layout: post
title:  全栈开发之SpringBoot发送邮件
tags: SpringBoot, Email
---

## 背景

发送邮件的场景：用户注册验证、忘记密码验证、监控告警、信息推送等。

这里以发送邮箱验证码为例，演示 `SpringBoot` 集成发送邮件的各种方法：

1. 普通文本邮件
2. HTML富文本邮件
3. 带附件邮件
4. 内联静态图片邮件
5. HTML模板邮件

## 获取授权码

在通过程序集成邮件服务之前，需要到各邮箱服务提供商处获取授权码，这里以QQ邮箱为例。

> QQ邮箱-->设置-->账户-->POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务-->开启POP3/SMTP服务，按照指示发送短信便可以获取QQ邮箱的授权码

![2022-04-10-MailConfig.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-MailConfig.jpg)

## 基础配置

包括 `pom` 依赖与 `yml` 配置。

### POM依赖

```xml
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!--email-->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>

    <!--模板引擎-->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
```

### 配置

```yaml
spring:
  mail:
    host: smtp.qq.com
    username: 你的邮箱
    password: 你的授权码
    properties:
      mail:
        smpt:
          auth: true
          starttls:
            enable: true
            required: true
```

## 发送邮件

在发送邮件之前，我们先写一个接口模拟生成验证码，接下来就以发送邮箱验证码为例来演示。

### 生成验证码

```java
    public String getCode() {
        String str = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // no zero
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            int index = (int) (Math.random() * str.length());
            code.append(str.charAt(index));
        }
        return code.toString();
    }
```

![2022-04-10-TestCode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-TestCode.jpg)

### 普通文本邮件

一般集成发送邮件服务，使用发送普通文本的邮件就足够了。

```java
    @Value("${spring.mail.username}")
    private String mailSender;

    @Autowired
    private JavaMailSender javaMailSender;

    @PostMapping("text")
    public String sendTextMail(@RequestParam String target) {
        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setFrom(mailSender);
        mailMessage.setTo(target);
        mailMessage.setSubject("XY平台注册验证码邮件");

        String code = getCode();
        mailMessage.setText("您的验证码为: " + code
                + "（有效期5分钟）。为了保证您的帐户安全，请勿向任何人提供此验证码。本邮件由系统自动发送，请勿直接回复。");

        javaMailSender.send(mailMessage);
        return code;
    }
```

![2022-04-10-TextMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-TextMail.jpg)

### HTML富文本邮件

HTML富文本邮件的方式可以使用各种基本的CSS样式。

```java
    @PostMapping("html")
    public String sendHTMLMail(@RequestParam String target) throws MessagingException {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, true);
        mimeMessageHelper.setFrom(mailSender);
        mimeMessageHelper.setTo(target);
        mimeMessageHelper.setSubject("XY平台注册验证码邮件");

        String code = getCode();
        String sb = "<h2>您的验证码为：</h2>" +
                "<p style='color:red; text-align:center'> " + code + "（有效期5分钟）</p>" +
                "<p style='font-weight:bold; text-decoration:underline'>为了保证您的帐户安全，请勿向任何人提供此验证码。本邮件由系统自动发送，请勿直接回复。</p>";
        mimeMessageHelper.setText(sb, true); // 关键是第二个参数，开启将富文本渲染为HTML

        javaMailSender.send(mimeMessage);
        return code;
    }
```

![2022-04-10-HTMLMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-HTMLMail.jpg)

### 带附件邮件

我这里在资源目录中放了一张图片，作为邮件附件进行传输。

```java
    @PostMapping("attachment")
    public String sendAttachmentMail(@RequestParam String target) throws MessagingException, IOException {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, true);
        mimeMessageHelper.setFrom(mailSender);
        mimeMessageHelper.setTo(target);
        mimeMessageHelper.setSubject("XY平台注册验证码邮件");

        String code = getCode();
        mimeMessageHelper.setText("您的验证码为: " + code
                + "（有效期5分钟）。为了保证您的帐户安全，请勿向任何人提供此验证码。本邮件由系统自动发送，请勿直接回复。"); // 关键是第二个参数，开启将富文本渲染为HTML

        // 附件
        String fileName = "avatar.jpg";
        Resource resource = new ClassPathResource(fileName);
        mimeMessageHelper.addAttachment(fileName, resource.getFile());

        javaMailSender.send(mimeMessage);
        return code;
    }
```

![2022-04-10-AttachmentMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-AttachmentMail.jpg)

### 内联静态图片邮件

```java
    @PostMapping("inline")
    public String sendInlineMail(@RequestParam String target) throws MessagingException, IOException {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, true);
        mimeMessageHelper.setFrom(mailSender);
        mimeMessageHelper.setTo(target);
        mimeMessageHelper.setSubject("XY平台注册验证码邮件");

        String code = getCode();
        String resourceId = "avatar"; // 每个资源对应一个ID
        String sb = "<h2>您的验证码为：</h2>" +
                "<p style='color:red; text-align:center'> " + code + "（有效期5分钟）</p>" +
                "<img style='width:64px; height:64px;' src='cid:" + resourceId + "' />" +
                "<p style='font-weight:bold; text-decoration:underline'>为了保证您的帐户安全，请勿向任何人提供此验证码。本邮件由系统自动发送，请勿直接回复。</p>";
        mimeMessageHelper.setText(sb, true); // 关键是第二个参数，开启将富文本渲染为HTML

        // 内联静态资源
        String fileName = "avatar.jpg";
        Resource resource = new ClassPathResource(fileName);
        mimeMessageHelper.addInline(resourceId, resource.getFile());

        javaMailSender.send(mimeMessage);
        return code;
    }
```

![2022-04-10-InlineMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-InlineMail.jpg)

### HTML模板邮件

这是最为放飞自我的发送邮件的方式了，可以使用各种高大上的设计；此处用到了模板引擎 `Thymleaf` 。

```html
<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">

<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>

<body>
    <h2 th:text="|尊敬的${username} :|"></h2><br />
    <img src="https://avatars.githubusercontent.com/u/8071981?s=40&v=4" /> 您有服务运行异常。<a th:href="${url}">查看详情</a>
    <br />
</body>

</html>
```

```java
@Autowired
    private TemplateEngine templateEngine;

    @PostMapping("template")
    public String sendTemplateMail(@RequestParam String target) throws MessagingException, IOException {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, true);
        mimeMessageHelper.setFrom(mailSender);
        mimeMessageHelper.setTo(target);
        mimeMessageHelper.setSubject("HTML模板邮件");

        // HTML 模板
        Context context = new Context();
        context.setVariable("username", "HeartSuit");
        context.setVariable("url", "https://avatars.githubusercontent.com/u/8071981?s=40&v=4");
        String content = templateEngine.process("notify", context);
        mimeMessageHelper.setText(content, true); // 关键是第二个参数，开启将富文本渲染为HTML

        javaMailSender.send(mimeMessage);
        return "OK";
    }
```

![2022-04-10-TemplateMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-10-TemplateMail.jpg)

这让我想起了之前使用 `Spring Boot Admin` 对服务监控的邮件告警推送时的场景：
* 邮件通知使用的模板存放在 `server` 依赖的 classpath:/META-INF/spring-boot-admin-server/mail/status-changed.html 路径；
* 如果想要自定义模板内容，可以拷贝这个文件放到自己的 templates 目录下，修改成自己想要的效果，然后在配置中指定自定义模板路径。

```yaml
spring:
  boot:
    admin:
      notify:
        mail:
          # 自定义邮件模版
          template: classpath:/templates/notify.html
```

## 测试接口

这里直接使用 `IDEA` 的插件 `RESTfulToolkit` 进行测试。

```
http://localhost:8080/mail/text

http://localhost:8080/mail/html

http://localhost:8080/mail/attachment

http://localhost:8080/mail/inline

http://localhost:8080/mail/template

http://localhost:8080/mail/code
```

以上测试地址，分别对应普通文本邮件，HTML富文本邮件，带附件邮件，内联静态图片邮件，HTML模板邮件以及生成验证码接口。

### Reference

* https://blog.csdn.net/qq_31984879/article/details/87516363

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
