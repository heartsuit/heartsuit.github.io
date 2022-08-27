---
layout: post
title: 云原生之容器编排实践-SpringBoot应用Docker化
tags: CloudNative, Docker
---

## 背景

前面我们已经通过 `IDEA` 的 `Docker` 插件连接到了 `Docker` 服务。这里我们借助 `Dockerfile` 与 `Maven` 打包插件实现一键部署 `Spring Boot` 应用到远程 `Docker` 容器。

## 创建应用

* 创建一个SpringBoot的空项目

略。。

* 写一个简单的接口

```java
package com.heartsuit.cloudnative.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @Author Heartsuit
 * @Date 2022-08-22
 */
@RestController
@Slf4j
public class HelloController {
    @Value("${server.port}")
    private String port;

    @GetMapping("/hi")
    public String hello() {
        return "Hi " + port;
    }

    @GetMapping("/hello")
    public String hello(@RequestParam String name) {
        log.info("Parameter: {}", name);
        return "Hello " + name + ", I am on port: " + port;
    }
}
```

* 编写Dockerfile

在项目根目录新增 `Dockerfile` 文件，写入以下内容。

```dockerfile
FROM openjdk:8-jdk-alpine
VOLUME /tmp
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

说明：
1. FROM：基于openjdk8
2. VOLUME：临时数据卷目录
3. COPY：拷贝target目录下的jar，命名为app.jar
4. ENTRYPOINT：配置启动命令

* 增加打包插件
编辑 `pom.xml` ，在插件部分添加以下内容。

```xml
            <plugin>
                <groupId>com.spotify</groupId>
                <artifactId>docker-maven-plugin</artifactId>
                <version>1.2.0</version>
                <executions>
                    <execution>
                        <id>build-image</id>
                        <phase>package</phase>
                        <goals>
                            <goal>build</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <dockerHost>http://k8s0:2375</dockerHost>
                    <imageName>heartsuit/${project.artifactId}</imageName>
                    <imageTags>
                        <imageTag>${project.version}</imageTag>
                    </imageTags>
                    <forceTags>true</forceTags>
                    <dockerDirectory>${project.basedir}</dockerDirectory>
                    <resources>
                        <resource>
                            <targetPath>/</targetPath>
                            <directory>${project.build.directory}</directory>
                            <include>${project.build.finalName}.jar</include>
                        </resource>
                    </resources>
                </configuration>
            </plugin>
```

Note：源码已上传 `GitHub` ：[https://github.com/heartsuit/cloud-native](https://github.com/heartsuit/cloud-native)

## 运行容器应用

一种方式是，直接在打开的 `Dockerfile` 中，点击运行，会将应用直接在容器中部署启动。

![2022-08-28-RunOnDocker.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-28-RunOnDocker.jpg)

## 一键部署应用到容器

执行 `mvn package` 命令，或者通过 `Maven` 插件的 `package` 命令完成一键打包与部署到容器的操作。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
