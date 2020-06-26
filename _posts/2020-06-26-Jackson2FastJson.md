---
layout: post
title: SpringBoot默认的JSON解析器Jackson替换为FastJson
tags: SpringBoot
---

### 背景

在集成SpringBoot与ElasticSearch时，关于LocalDateTime类型的序列化与反序列化报错，SpringBoot默认的Jackson用起来不是很顺手（需要实例化ObjectMapper），便计划使用FastJson，然而，直接引入FastJson后，会与默认的Jackson发生冲突。。

### Solution

配置类如下：

```java
package com.heartsuit.config;

import com.alibaba.fastjson.serializer.SerializerFeature;
import com.alibaba.fastjson.support.config.FastJsonConfig;
import com.alibaba.fastjson.support.spring.FastJsonHttpMessageConverter;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

/**
 * @Author Heartsuit
 * @Date 2020-06-05
 */
@Configuration
@EnableWebMvc // 必须要有这个注解，否则报错：JSON parse error: Cannot deserialize value of type `java.time.LocalDateTime` from String \"2020-06-04 15:07:54\": Failed to deserialize java.time.LocalDateTime: (java.time.format.DateTimeParseException) Text '2020-06-04 15:07:54' could not be parsed at index 10; nested exception is com.fasterxml.jackson.databind.exc.InvalidFormatException: Cannot deserialize value of type `java.time.LocalDateTime` from String \"2020-06-04 15:07:54\": Failed to deserialize java.time.LocalDateTime: (java.time.format.DateTimeParseException) Text '2020-06-04 15:07:54' could not be parsed at index 10\n at [Source: (PushbackInputStream); line: 5, column: 17] (through reference chain: com.heartsuit.domain.Book[\"publishDate\"]
public class WebConfig implements WebMvcConfigurer {
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        FastJsonHttpMessageConverter fastJsonConverter = new FastJsonHttpMessageConverter();
        FastJsonConfig config = new FastJsonConfig();
        config.setCharset(Charset.forName("UTF-8"));
        config.setDateFormat("yyyyMMdd HH:mm:ssS");
        config.setSerializerFeatures(SerializerFeature.WriteMapNullValue);
        fastJsonConverter.setFastJsonConfig(config);
        List<MediaType> list = new ArrayList<>();
        list.add(MediaType.APPLICATION_JSON);
        fastJsonConverter.setSupportedMediaTypes(list);
        converters.add(fastJsonConverter);
    }
}
```

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**