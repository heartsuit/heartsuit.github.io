---
layout: post
title: Vue中用axios向后端接口POST数据，Spring端收不到
tags: Java
---

两种方式解决：

### 使用URLSearchParams构造参数

- FrontEnd

``` javascript
hex2str(hex) {
  let that = this;
  /* method1: send parameter with URLSearchParams (Note: )
  * This bring a new compatability problem, can be solved by node package: 'url-search-params-polyfill'
  * import 'url-search-params-polyfill'; // solve problem in IE: ReferenceError: “URLSearchParams”未定义 
  */ 
  let params = new URLSearchParams();
  params.append("hex", hex);

  this.$http.post("/test/tool/hex2string", params).then(
    function(res) {
      that.results.push({ title: "字符串", result: res.data });
    },
    function(err) {
      console.log(err);
    }
  );
},
```

- BackEnd

``` java
@ResponseBody
@RequestMapping(value = "hex2decimal", method = RequestMethod.POST)
public String hex2Decimal(String hex) {
  return ConverterUtil.hex2Decimal(hex);
}
```

### 后台Spring端使用@requestBody接收

- FrontEnd

``` javascript
hex2str1(hex) {
  let that = this;
  // method2: send parameter as usual, but use @RequestBody Map<String, String> to receive in Spring
  let data = { hex: hex };
  this.$http.post("/test/tool/hex2string1", data).then(
    function(res) {
      that.results.push({ title: "字符串", result: res.data });
    },
    function(err) {
      console.log(err);
    }
  );
},
```

- BackEnd

``` java
@ResponseBody
@RequestMapping(value = "hex2decimal1", method = RequestMethod.POST)
public String hex2Decimal1(@RequestBody Map<String, String> data) {
  return ConverterUtil.hex2Decimal(data.get("hex"));
}
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***