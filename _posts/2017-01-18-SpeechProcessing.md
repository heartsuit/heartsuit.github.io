---
layout: post
title: 百度语音识别、语音合成，NAudio录音（C#）
tags: C#
---

## 百度语音识别、语音合成，NAudio录音（C#）

### 调用API
> 调用百度语音识别API实现语音识别（ASR）与语音合成（TTS），分别需要发送一个HTTP请求。

Note: **在发送ASR或者TTS请求前，首先需要获取`Access Token`；**
1. 获取Token
**通过百度开发者账号获取到key与secret key，然后通过以下请求得到token；**

    //Access Token（每次获取后，有效期：一个月）

    string getAccessUrl = $"https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id={speechModel.APIKey}&client_secret={speechModel.APISecretKey}";
    
    eg：
    https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=yourKey&client_secret=yourSecretKey
2. 语音识别

    //ASR: Automatic Speech Recognition（须在发送请求时写入音频数据）

    string getTextUrl = $"http://vop.baidu.com/server_api?lan={speechModel.APILanguage}&cuid={speechModel.APIID}&token={speechModel.APIAccessToken}";
    
    eg：
    http://vop.baidu.com/server_api?lan=en&cuid=402&token=24.fd8c2088ac28b2722403c1acc36797e9.2592000.1487243775.282335-8317833
3. 语音合成
    
    //TTS: Text To Speech（直接返回.mp3）
    
    string requestStr = $"http://tsn.baidu.com/text2audio?tex={text}&lan={speechModel.APILanguage}&per={speechModel.APIPerson}&ctp={speechModel.APIClientType}&cuid={speechModel.APIID}&tok={speechModel.APIAccessToken}&spd={speechModel.APISpeed}&pit={speechModel.APIPitch}&vol={speechModel.APIVolume}";
    
    eg：
    http://tsn.baidu.com/text2audio?tex=集齐五福，召唤神龙！&lan=zh&cuid=402&ctp=1&tok=24.fd8c2088ac28b2722403c1acc36797e9.2592000.1487243775.282335-8317833

### 说明
- 以上的请求字符串采用C#格式，主要是因为在Windows客户端，通过Winform简单实现了语音识别、语音合成；
- 采用NAudio、Microsoft.DirectX两种方式实现录音；
- 另外，利用NAudio实现音频格式的转换（MP3--->WAV，原因是当前百度语音识别API要求：8k/16k, 16bit位深, 单声道WAV）；
- 通过WinMm.dll的mciSendString(...)实现音频的播放、停止等控制；
- 上述链接中的token自生成时刻起，有效期一个月，过期后可再次通过自己key与secret key获取。

### 实现
**程序界面：**
![Presentation](http://img.blog.csdn.net/20170118191102562?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMzgxMDIzNA==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

### Source Code: <a href="https://github.com/heartsuit/BaiduASRAndTTS">Github

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
