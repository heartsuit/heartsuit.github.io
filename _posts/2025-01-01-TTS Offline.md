---
layout: post
title: 纯CPU环境离线部署语音合成TTS服务（支持中文）技术选型：eSpeak，ChatTTS，CoquiTTS
tags: AI, TTS
---

## 背景

还记得我刚毕业那会儿，接触的项目就是跟音频应用相关的工作，包括语音识别、语音合成以及音频剪辑等功能，具体见[https://github.com/heartsuit/BaiduASRAndTTS](https://github.com/heartsuit/BaiduASRAndTTS)，当时主要是调用了百度的 `ASR` 与 `TTS` 接口。后来有的项目用到语音合成功能时，直接通过前端的 `NPM` 包 `speak-tts` 即可实现（调用客户端操作系统的类库实现）。

关于语音合成 `TTS` （Text to Speech），如果想要私有化部署一套 `TTS` 服务，如今的选择是真多： `ChatTTS` ， `VITS` ， `MeloTTS` ， `CoquiTTS` 等，此外， `HuggingFace` ， `ModelScope` 上的开源模型更是数不胜数。

> 这里的需求是在纯CPU、无互联网的环境下完成中文文本语音合成，时间要求是5秒以内。

结合实际的应用场景，本次主要关注在纯 `CPU` 场景下，对于*中文文本*的**合成效果**（人声自然）与**合成效率**（时间短）两个方面。以下将通过对 `eSpeak` ， `ChatTTS` ， `CoquiTTS` 这三种语音合成 `TTS` 服务离线部署测试，分析三种方案的优劣。

## 先看结果

模型名称     |  合成效果        | 合成效率
----------- | --------------- | -------------
eSpeak      | 鬼畜声、比较差   | 毫秒级~几秒
ChatTTS     | 逼真流畅，音质高  | 50秒左右
CoquiTTS    | 正常人声，音质一般 | 5秒左右

Note：以上是在纯 `CPU` 环境下使用100个字符以内的中文文本进行测试得出的结果。

## eSpeak

`eSpeak` 是一个开源的文本到语音（TTS）合成器，适用于多种语言，包括英语和其他语言。 `eSpeak` 使用了形式合成方法，能够生成高质量的声音，并且因为其小文件大小和多语言特性，被广泛应用于各种场景中。

关于 `eSpeak` 的 `TTS` 方案，我直接使用 `Cursor` 来编码，**全程没有一行自己编写的代码**，部署到服务器上之后成功运行，不过，中文的合成效果很是鬼畜，挺差的。。

* 目录结构

```
D:.
│  docker-compose.yml
│  Dockerfile
│  package.json
│  README.md
│
└─src
    │  index.js
    │  tts.js
    │
    └─routes
            tts.routes.js
```

代码结构比较简单，标准的 `Node.js` 后端项目，使用了传统的 `Express`  `Web` 框架，不多作解释。

### tts.js

```javascript
const {
    exec
} = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;

const execPromise = util.promisify(exec);

class TextToSpeech {
    constructor() {
        this.outputDir = process.env.OUTPUT_DIR || './output';
    }
    async convertToSpeech(text, options = {}) {
        const {
            language = 'zh',
                speed = 175,
                pitch = 50,
                volume = 100
        } = options;

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const wavFile = path.join(this.outputDir, `${fileName}.wav`);
        const mp3File = path.join(this.outputDir, `${fileName}.mp3`);

        try {
            // 1. 使用 espeak 生成 wav 文件
            await execPromise(
                `espeak -v ${language} -s ${speed} -p ${pitch} -a ${volume} -w "${wavFile}" "${text}"`
            );

            // 2. 转换为 mp3
            await execPromise(
                `sox "${wavFile}" "${mp3File}"`
            );

            // 3. 读取 MP3 文件
            const audioBuffer = await fs.readFile(mp3File);

            // 4. 清理临时文件
            await Promise.all([
                fs.unlink(wavFile),
                fs.unlink(mp3File)
            ]);
            return audioBuffer;
        } catch (error) {
            // 清理任何可能存在的临时文件
            try {
                await Promise.all([
                    fs.unlink(wavFile).catch(() => {}),
                    fs.unlink(mp3File).catch(() => {})
                ]);
            } catch (e) {
                // 忽略清理错误
            }
            throw new Error(`TTS conversion failed: ${error.message}`);
        }
    }
}

module.exports = TextToSpeech;
```

### tts.routes.js

```javascript
const express = require('express');
const router = express.Router();
const TextToSpeech = require('../tts');

const tts = new TextToSpeech();

router.post('/convert', async (req, res) => {
    try {
        const {
            text,
            options
        } = req.body;

        if (!text) {
            return res.status(400).json({
                error: 'Text is required'
            });
        }

        const audioBuffer = await tts.convertToSpeech(text, options);

        // 设置响应头
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
        });

        // 发送音频数据
        res.send(audioBuffer);

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// 添加健康检查端点
router.get('/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

module.exports = router;
```

### index.js

```javascript
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const ttsRoutes = require('./routes/tts.routes');

const app = express();
const port = process.env.PORT || 4000;

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 路由
app.use('/api/tts', ttsRoutes);

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!'
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
```

### package.json

```json
{
  "name": "tts-service",
  "version": "1.0.0",
  "description": "Offline text-to-speech service",
  "main": "src/index.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "uuid": "^9.0.0"
  }
}
```

### Docker部署文件

* Dockerfile

```Dockerfile
FROM node:18-slim

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装必要的包
RUN apt-get update && apt-get install -y \
    espeak \
    espeak-ng \
    sox \
    libsox-fmt-mp3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --registry=https://registry.npmmirror.com/

# 复制源代码
COPY . .

# 创建输出目录
RUN mkdir -p output && chmod 777 output

EXPOSE 4000
CMD ["node", "src/index.js"]
```

* docker-compose.yml

```yml
version: '3'
services:
  tts-service:
    build: .
    ports:
      - "4000:4000"
    volumes:
      - ./output:/app/output
    environment:
      - PORT=4000
      - OUTPUT_DIR=/app/output
```

### README.md

```markdown
使用方法：
1. 构建和运行服务：
docker-compose up --build

2. API 使用示例：
使用 curl：
curl -X POST http://192.168.44.171:4000/api/tts/convert \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是一个测试文本",
    "options": {
      "language": "zh+f2",
      "speed": 175,
      "pitch": 50,
      "volume": 100
    }
  }' \
  --output speech.mp3
```

## ChatTTS

`ChatTTS` 是一款专为对话场景设计的文本转语音（TTS）模型，支持中英文双语。经过大量训练， `ChatTTS` 能够生成自然、流畅且富有表现力的语音合成内容，并在韵律控制上超越了大多数开源模型。它不仅能细致地控制笑声、停顿和感叹词等特征，还可以用于多种语言和场景的语音内容生成。此外， `ChatTTS` 特别适用于大型语言模型（LLM）助手的对话任务以及诸如对话式音频和视频介绍等应用。它的性能非常出色，甚至在与微软 `Azure-tts` 这样的商业级项目相比时，也毫不逊色。

`ChatTTS` 提供了在线工具来生成语音，可以快速体验：[https://chattts.com/zh?__theme=dark#Demo](https://chattts.com/zh?__theme=dark#Demo)，不过经过测试，普通的一句话 `TTS` 一般需要20秒（这还是使用了 `GPU` 的）。下面是使用了基于 `ChatTTS` 实现语音合成的开源 `UI` 项目：[ChatTTS-ui](https://github.com/jianchang512/ChatTTS-ui)，主要是对官方的[ChatTTS](https://github.com/2noise/ChatTTS)进行了容器化构建，并提供了一个用于测试的 `Web` 可视化页面和开放的 `API` 接口。

### 官方在线体验

![2025-01-01-1-ChatTTS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-01-01-1-ChatTTS.jpg)

### 本地部署

```bash
# 下载ChatTTS源码
cd ChatTTS-ui-main

# 运行cpu版本  
docker-compose -f docker-compose.cpu.yaml up -d
```

![2025-01-01-2-ChatTTS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-01-01-2-ChatTTS.jpg)

### 纯CPU运行效果

浏览器打开：http://192.168.44.171:9966；

![2025-01-01-3-ChatTTS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-01-01-3-ChatTTS.jpg)

## CoquiTTS

`CoquiTTS` 是一个开源的文字到语音（Text-to-Speech, TTS）系统，旨在使语音合成技术对研究人员、开发者和创造者更加可接近。它基于共同学习技术，能够从各语言的训练数据集中转换知识，从而有效降低所需的数据量。 `CoquiTTS` 支持多种语言，包括跨语言克隆，例如英文到中文、中文到英文等，共计 `16` 种语言。

此外， `CoquiTTS` 还提供了先进的多语言文本转语音库支持超过1100种语言的功能，并包含如 `Tacotron2` 、 `VITS` 和 `YourTTS` 等多种深度学习模型。它不仅用于生成高质量的语音，还提供训练新模型和微调现有模型的工具，支持多说话人 TTS，并提供了数据集分析功能。

`CoquiTTS` 因其高效性和多功能性而受到广泛关注，在 `GitHub` 上获得了 `36.4k` 的星标数，成为新一代开源语音技术的领军者。

### 安装

容器化部署，使用中文模型： `tts_models/zh-CN/baker/tacotron2-DDC-GST` 。

```bash
[root@tts ~]# docker run --rm -it -p 5002:5002 --entrypoint /bin/bash ghcr.io/coqui-ai/tts-cpu
Unable to find image 'ghcr.io/coqui-ai/tts-cpu:latest' locally
latest: Pulling from coqui-ai/tts-cpu
025c56f98b67: Pull complete 
778656c04542: Pull complete 
85485c9f43dd: Pull complete 
23b3c91f0de2: Pull complete 
fd19b936aab8: Pull complete 
30b21c9aef2b: Pull complete 
cc12d1e5322b: Pull complete 
b91e9a336532: Pull complete 
d679a5e35c77: Pull complete 
0d84a5b8bca3: Pull complete 
4f4fb700ef54: Pull complete 
d170b2e70a00: Pull complete 
c612db99f0b2: Pull complete 
Digest: sha256:a2f6659245358c38efb1bb44b39f7b7b3459e03e9ed5687c447681cb82c35de3
Status: Downloaded newer image for ghcr.io/coqui-ai/tts-cpu:latest
root@b452b7513c7e:~# python3 TTS/server/server.py --list_models

 Name format: type/language/dataset/model
 1: tts_models/multilingual/multi-dataset/xtts_v2
 2: tts_models/multilingual/multi-dataset/xtts_v1.1
 3: tts_models/multilingual/multi-dataset/your_tts
 4: tts_models/multilingual/multi-dataset/bark
 5: tts_models/bg/cv/vits
 6: tts_models/cs/cv/vits
 7: tts_models/da/cv/vits
 8: tts_models/et/cv/vits
 9: tts_models/ga/cv/vits
 10: tts_models/en/ek1/tacotron2
 11: tts_models/en/ljspeech/tacotron2-DDC
 12: tts_models/en/ljspeech/tacotron2-DDC_ph
 13: tts_models/en/ljspeech/glow-tts
 14: tts_models/en/ljspeech/speedy-speech
 15: tts_models/en/ljspeech/tacotron2-DCA
 16: tts_models/en/ljspeech/vits
 17: tts_models/en/ljspeech/vits--neon
 18: tts_models/en/ljspeech/fast_pitch
 19: tts_models/en/ljspeech/overflow
 20: tts_models/en/ljspeech/neural_hmm
 21: tts_models/en/vctk/vits
 22: tts_models/en/vctk/fast_pitch
 23: tts_models/en/sam/tacotron-DDC
 24: tts_models/en/blizzard2013/capacitron-t2-c50
 25: tts_models/en/blizzard2013/capacitron-t2-c150_v2
 26: tts_models/en/multi-dataset/tortoise-v2
 27: tts_models/en/jenny/jenny
 28: tts_models/es/mai/tacotron2-DDC
 29: tts_models/es/css10/vits
 30: tts_models/fr/mai/tacotron2-DDC
 31: tts_models/fr/css10/vits
 32: tts_models/uk/mai/glow-tts
 33: tts_models/uk/mai/vits
 34: tts_models/zh-CN/baker/tacotron2-DDC-GST
 35: tts_models/nl/mai/tacotron2-DDC
 36: tts_models/nl/css10/vits
 37: tts_models/de/thorsten/tacotron2-DCA
 38: tts_models/de/thorsten/vits
 39: tts_models/de/thorsten/tacotron2-DDC
 40: tts_models/de/css10/vits-neon
 41: tts_models/ja/kokoro/tacotron2-DDC
 42: tts_models/tr/common-voice/glow-tts
 43: tts_models/it/mai_female/glow-tts
 44: tts_models/it/mai_female/vits
 45: tts_models/it/mai_male/glow-tts
 46: tts_models/it/mai_male/vits
 47: tts_models/ewe/openbible/vits
 48: tts_models/hau/openbible/vits
 49: tts_models/lin/openbible/vits
 50: tts_models/tw_akuapem/openbible/vits
 51: tts_models/tw_asante/openbible/vits
 52: tts_models/yor/openbible/vits
 53: tts_models/hu/css10/vits
 54: tts_models/el/cv/vits
 55: tts_models/fi/css10/vits
 56: tts_models/hr/cv/vits
 57: tts_models/lt/cv/vits
 58: tts_models/lv/cv/vits
 59: tts_models/mt/cv/vits
 60: tts_models/pl/mai_female/vits
 61: tts_models/pt/cv/vits
 62: tts_models/ro/cv/vits
 63: tts_models/sk/cv/vits
 64: tts_models/sl/cv/vits
 65: tts_models/sv/cv/vits
 66: tts_models/ca/custom/vits
 67: tts_models/fa/custom/glow-tts
 68: tts_models/bn/custom/vits-male
 69: tts_models/bn/custom/vits-female
 70: tts_models/be/common-voice/glow-tts

 Name format: type/language/dataset/model
 1: vocoder_models/universal/libri-tts/wavegrad
 2: vocoder_models/universal/libri-tts/fullband-melgan
 3: vocoder_models/en/ek1/wavegrad
 4: vocoder_models/en/ljspeech/multiband-melgan
 5: vocoder_models/en/ljspeech/hifigan_v2
 6: vocoder_models/en/ljspeech/univnet
 7: vocoder_models/en/blizzard2013/hifigan_v2
 8: vocoder_models/en/vctk/hifigan_v2
 9: vocoder_models/en/sam/hifigan_v2
 10: vocoder_models/nl/mai/parallel-wavegan
 11: vocoder_models/de/thorsten/wavegrad
 12: vocoder_models/de/thorsten/fullband-melgan
 13: vocoder_models/de/thorsten/hifigan_v1
 14: vocoder_models/ja/kokoro/hifigan_v1
 15: vocoder_models/uk/mai/multiband-melgan
 16: vocoder_models/tr/common-voice/hifigan
 17: vocoder_models/be/common-voice/hifigan

 Name format: type/language/dataset/model
 1: voice_conversion_models/multilingual/vctk/freevc24

root@b452b7513c7e:~# python3 TTS/server/server.py --model_name tts_models/zh-CN/baker/tacotron2-DDC-GST
 > tts_models/zh-CN/baker/tacotron2-DDC-GST is already downloaded.
 > Using model: tacotron2
 > Setting up Audio Processor...
 | > sample_rate:22050
 | > resample:False
 | > num_mels:80
 | > log_func:np.log10
 | > min_level_db:-100
 | > frame_shift_ms:None
 | > frame_length_ms:None
 | > ref_level_db:0
 | > fft_size:1024
 | > power:1.5
 | > preemphasis:0.0
 | > griffin_lim_iters:60
 | > signal_norm:True
 | > symmetric_norm:True
 | > mel_fmin:50.0
 | > mel_fmax:7600.0
 | > pitch_fmin:0.0
 | > pitch_fmax:640.0
 | > spec_gain:1.0
 | > stft_pad_mode:reflect
 | > max_norm:4.0
 | > clip_norm:True
 | > do_trim_silence:True
 | > trim_db:60
 | > do_sound_norm:False
 | > do_amp_to_db_linear:True
 | > do_amp_to_db_mel:True
 | > do_rms_norm:False
 | > db_level:None
 | > stats_path:/root/.local/share/tts/tts_models--zh-CN--baker--tacotron2-DDC-GST/scale_stats.npy
 | > base:10
 | > hop_length:256
 | > win_length:1024
 > Model's reduction rate `r` is set to: 2
 * Serving Flask app 'server'
 * Debug mode: off
INFO:werkzeug:WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (::)
 * Running on http://[::1]:5002
 * Running on http://[::1]:5002
INFO:werkzeug:Press CTRL+C to quit
INFO:werkzeug:::ffff:192.168.26.12 - - [31/Dec/2024 02:29:57] "GET / HTTP/1.1" 200 -
INFO:werkzeug:::ffff:192.168.26.12 - - [31/Dec/2024 02:30:39] "GET /favicon.ico HTTP/1.1" 404 -
INFO:werkzeug:::ffff:192.168.26.12 - - [31/Dec/2024 02:30:39] "GET /static/coqui-log-green-TTS.png HTTP/1.1" 200 -
 > Model input: 你好。
 > Speaker Idx: 
 > Language Idx: 
 > Text splitted to sentences.
['你好。']
Building prefix dict from the default dictionary ...
DEBUG:jieba:Building prefix dict from the default dictionary ...
Dumping model to file cache /tmp/jieba.cache
DEBUG:jieba:Dumping model to file cache /tmp/jieba.cache
Loading model cost 0.612 seconds.
DEBUG:jieba:Loading model cost 0.612 seconds.
Prefix dict has been built successfully.
DEBUG:jieba:Prefix dict has been built successfully.
 > Processing time: 1.3838930130004883
 > Real-time factor: 1.3535681749760808
INFO:werkzeug:::ffff:192.168.26.12 - - [31/Dec/2024 02:30:51] "GET /api/tts?text=你好。&speaker_id=&style_wav={"0":%200.1}&language_id= HTTP/1.1" 200 -
 > Model input: Coqui TTS 支持多种语言，包括跨语言克隆，例如英文到中文、中文到英文等，共计16种语言。
 > Speaker Idx: 
 > Language Idx: 
 > Text splitted to sentences.
['Coqui TTS 支持多种语言，包括跨语言克隆，例如英文到中文、中文到英文等，共计16种语言。']
Coqui   TTS   dʒʏ1ʈʂʏ2 duo1dʒoŋ3y3iɛn2 ， baʌ1kuo4 kua4 y3iɛn2 kø4loŋ2 ， li4ʐu2 ɨŋ1wœn2 daʌ4 dʒoŋ1wœn2   dʒoŋ1wœn2 daʌ4 ɨŋ1wœn2 dɵŋ3 ， goŋ4dʑi4 ʂʏ2lio4dʒoŋ3 y3iɛn2 。
 [!] Character 'C' not found in the vocabulary. Discarding it.
Coqui   TTS   dʒʏ1ʈʂʏ2 duo1dʒoŋ3y3iɛn2 ， baʌ1kuo4 kua4 y3iɛn2 kø4loŋ2 ， li4ʐu2 ɨŋ1wœn2 daʌ4 dʒoŋ1wœn2   dʒoŋ1wœn2 daʌ4 ɨŋ1wœn2 dɵŋ3 ， goŋ4dʑi4 ʂʏ2lio4dʒoŋ3 y3iɛn2 。
 [!] Character 'T' not found in the vocabulary. Discarding it.
Coqui   TTS   dʒʏ1ʈʂʏ2 duo1dʒoŋ3y3iɛn2 ， baʌ1kuo4 kua4 y3iɛn2 kø4loŋ2 ， li4ʐu2 ɨŋ1wœn2 daʌ4 dʒoŋ1wœn2   dʒoŋ1wœn2 daʌ4 ɨŋ1wœn2 dɵŋ3 ， goŋ4dʑi4 ʂʏ2lio4dʒoŋ3 y3iɛn2 。
 [!] Character 'S' not found in the vocabulary. Discarding it.
Coqui   TTS   dʒʏ1ʈʂʏ2 duo1dʒoŋ3y3iɛn2 ， baʌ1kuo4 kua4 y3iɛn2 kø4loŋ2 ， li4ʐu2 ɨŋ1wœn2 daʌ4 dʒoŋ1wœn2   dʒoŋ1wœn2 daʌ4 ɨŋ1wœn2 dɵŋ3 ， goŋ4dʑi4 ʂʏ2lio4dʒoŋ3 y3iɛn2 。
 [!] Character 'g' not found in the vocabulary. Discarding it.
 > Processing time: 3.930570125579834
 > Real-time factor: 0.4210506765887842
INFO:werkzeug:::ffff:192.168.26.12 - - [31/Dec/2024 02:37:24] "GET /api/tts?text=Coqui%20TTS%20支持多种语言，包括跨语言克隆，例如英文到中文、中文到英文等，共计16种语言。&speaker_id=&style_wav={"0":%200.1}&language_id= HTTP/1.1" 200
```

### 纯CPU运行效果

浏览器打开：http://192.168.44.171:5002；大部分情况下，会在5秒左右返回合成结果。

![2025-01-01-4-CoquiTTS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-01-01-4-CoquiTTS.jpg)

![2025-01-01-5-CoquiTTS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-01-01-5-CoquiTTS.jpg)

Note: 
1. 记得要在中文最后加上**中文句号**，否则模型会在后面加一段*啊的声音*，补齐12s的时长，这应该是个Bug。
2. 对于较长的文本，比如50个文字以上，有时会出现最后一部分被截断的情况，这应该也是个Bug。

### 遇到模型下载失败的问题

* 报错信息：从GitHub上下载模型文件超时

```bash
root@b452b7513c7e:~# python3 TTS/server/server.py --model_name tts_models/zh-CN/baker/tacotron2-DDC-GST
 > Downloading model to /root/.local/share/tts/tts_models--zh-CN--baker--tacotron2-DDC-GST
 > Failed to download the model file to /root/.local/share/tts/tts_models--zh-CN--baker--tacotron2-DDC-GST
Traceback (most recent call last):
  File "/usr/local/lib/python3.10/site-packages/urllib3/connection.py", line 203, in _new_conn
    sock = connection.create_connection(
  File "/usr/local/lib/python3.10/site-packages/urllib3/util/connection.py", line 85, in create_connection
    raise err
  File "/usr/local/lib/python3.10/site-packages/urllib3/util/connection.py", line 73, in create_connection
    sock.connect(sa)
TimeoutError: [Errno 110] Connection timed out

The above exception was the direct cause of the following exception:
Traceback (most recent call last):
  File "/usr/local/lib/python3.10/site-packages/requests/adapters.py", line 486, in send
    resp = conn.urlopen(
  File "/usr/local/lib/python3.10/site-packages/urllib3/connectionpool.py", line 844, in urlopen
    retries = retries.increment(
  File "/usr/local/lib/python3.10/site-packages/urllib3/util/retry.py", line 515, in increment
    raise MaxRetryError(_pool, url, reason) from reason  # type: ignore[arg-type]
urllib3.exceptions.MaxRetryError: HTTPSConnectionPool(host='github.com', port=443): Max retries exceeded with url: /coqui-ai/TTS/releases/download/v0.6.1_models/tts_models--zh-CN--baker--tacotron2-DDC-GST.zip (Caused by ConnectTimeoutError(<urllib3.connection.HTTPSConnection object at 0x7faab643bb50>, 'Connection to github.com timed out. (connect timeout=None)'))
```

* 解决方法：手动下载模型

从报错信息中可以看到模型的下载地址： `https://github.com/coqui-ai/TTS/releases/download/v0.6.1_models/tts_models--zh-CN--baker--tacotron2-DDC-GST.zip` ；手动下载后解压并传至容器的 `/root/.local/share/tts` 目录下。

```bash
[root@tts opt]# unzip tts_models--zh-CN--baker--tacotron2-DDC-GST.zip 
Archive:  tts_models--zh-CN--baker--tacotron2-DDC-GST.zip
   creating: tts_models--zh-CN--baker--tacotron2-DDC-GST/
 extracting: tts_models--zh-CN--baker--tacotron2-DDC-GST/model_file.pth  
 extracting: tts_models--zh-CN--baker--tacotron2-DDC-GST/scale_stats.npy  
 extracting: tts_models--zh-CN--baker--tacotron2-DDC-GST/config.json  
[root@tts opt]# docker cp tts_models--zh-CN--baker--tacotron2-DDC-GST nostalgic_hawking:/root/.local/share/tts
                            Successfully copied 686MB to nostalgic_hawking:/root/.local/share/tts
```

## 小总结

> 架构是一种权衡。

根据当前的实际需求，下面来总结一下三种 `TTS` 方案的对比，在纯 `CPU` 、无互联网环境下进行中文文本语音合成（要求5秒内完成）时：

| 方案名称   | 合成效果 | 合成速度 | 是否满足需求 |
|-----------|---------|----------|-------------|
| eSpeak    | 鬼畜声  | 毫秒级    | 速度满足，效果差 |
| ChatTTS   | 最佳    | 50秒左右  | 效果好，速度不达标 |
| CoquiTTS  | 正常    | 5秒左右   | 基本满足要求 |

综上， `CoquiTTS` 是最符合需求的方案，它能在纯 `CPU` 环境下5秒内完成合成，且语音效果可以接受。

## Reference

* [https://chattts.com/zh?__theme=dark#Demo](https://chattts.com/zh?__theme=dark#Demo)
* [https://github.com/jianchang512/ChatTTS-ui](https://github.com/jianchang512/ChatTTS-ui)
* [https://github.com/coqui-ai/TTS](https://github.com/coqui-ai/TTS)
* [https://docs.coqui.ai/en/latest/tutorial_for_nervous_beginners.html](https://docs.coqui.ai/en/latest/tutorial_for_nervous_beginners.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
