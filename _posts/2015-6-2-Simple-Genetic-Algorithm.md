---
layout: post
title: 基本遗传算法（SGA）的MATLAB实现
tags: Matlab
---

### Simple Genetic Algorithm的MATLAB实现

- 两个测试用例，直观地阐述基本遗传算法的原理，具体原理参考：http://blog.csdn.net/begtostudy/article/details/4136492

- 对于上述课件（讲得很透彻，适合对遗传算法的入门）中提出的一个问题进行了实现，并通过MATLAB作图直接观察到算法搜索的过程。闲言少叙，Show me the Code！

<pre class="lang-matlab">
% Date：2015年6月1日 14:01:35
% Author：heartsuit
% Function：基本遗传算法(Simple Genetic Algorithm, SGA)的实现
%          用于求解一元函数在某个区间内的最值，并作图反映寻优过程；
% Description：编写该程序的目的主要是了解SGA的基本原理以及整体流程
%              通过解决两个小问题，更直观深刻地理解SGA；
% Instruction：若需要添加新的问题，只需在评估函数：
%              function evaluateValue = f(x)
%              添加目标函数表达式即可；

% GeneticAlgo(encodingBits, left, right)输入参数：
%      encodingBits：编码位数；根据实际问题确定
%      left:左区间端点
%      right:右区间端点
% Note：
%      numbleOfSample：样本个数；建议范围：20~100
%      maxIteration：最大迭代次数；建议范围：100~500

% 对于测试的两个问题可以采用以下方式调用函数：
% Q1: GeneticAlgo(8, -2, 3)
% Q2: GeneticAlgo(22, -1, 2)
function GeneticAlgo(encodingBits, left, right)
% 设置默认值（可以改动）
numbleOfSample = 50;                 % 默认样本数为50
maxIteration = 100;                  % 默认最大迭代次数为100；
mutationProbability = 0.007;         % 变异概率：建议范围：0.001~0.01
iteration = 1;                       % 迭代次数初始化
currentIndividual = -1;  
bestIndividual = zeros(maxIteration, 1);           % 用以保存每次找到的最佳样本值

% 二进制编码（表现型->基因型）
sample = randi(2, numbleOfSample, encodingBits) - 1;  % 初始化种群
figure(1);
while (iteration < maxIteration)                   % 遗传迭代
    % 计算评估值
    [evaluateValue, evaluateX, evaluateIndividual] = evaluate(sample, left, right, encodingBits);
    if (evaluateIndividual > currentIndividual)
        currentX = evaluateX;                      % 更新最佳个体的横坐标
        currentIndividual = evaluateIndividual;    % 更新最佳个体
    end;
    bestIndividual(iteration) = currentIndividual; % 保存当前最佳个体
    plot(bestIndividual(1:iteration)); grid on; pause(0.1);
    sample = select(sample, evaluateValue);        % 选择
    sample = cross(sample, encodingBits);          % 交叉
    sample = mutate(sample, mutationProbability);  % 变异
    iteration = iteration + 1;
end;

% 输出
disp(currentIndividual);  disp(iteration);  disp(currentX);

% 变异（基本位变异）
function sampleGenetic = mutate(sample, mutationProbability)
[numbleOfSample, encodingBits] = size(sample);
sampleGenetic = sample;
for kn = 1:numbleOfSample,  
    for km = 1:encodingBits
        r = rand(1);
        if (r < mutationProbability)
            sampleGenetic(kn, km) = double(~ sampleGenetic(kn, km)); 
        end;
    end;
end;

% 交叉（单点交叉）
function sampleGenetic = cross(sample, encodingBits)
numbleOfSample = size(sample, 1);  sampleGenetic = sample;
M2 = floor(numbleOfSample/2);
for k = 1:M2    
    r1 = randi(numbleOfSample, 1); 
    r2 = randi(numbleOfSample, 1);
    Y1 = sample(r1, :);
    Y2 = sample(r2, :);
    % 交叉概率建议范围：0.4~0.9
    r = randi(encodingBits-1, 1);               % 随机生成交叉位置
    Y11 = [Y1(1:r),  Y2((r+1):encodingBits)];
    Y21 = [Y2(1:r),  Y1((r+1):encodingBits)];
    sampleGenetic(r1, :) = Y11;  sampleGenetic(r2, :) = Y21;
end;

% 选择（轮盘赌）
function sampleGenetic = select(sample, evaluateValue)
numbleOfSample = size(sample, 1); 
evaluateValuer = cumsum(evaluateValue);
sampleGenetic = zeros(size(sample));
for k = 1:numbleOfSample
    r = rand(1);
    I = 1;
    for kr  = 2:numbleOfSample
        if ((r<evaluateValuer(kr)) && (r>=evaluateValuer(kr-1)))
            I = kr;
            break;
        end;
    end;
    sampleGenetic(k, :) = sample(I, :);
end;

% 解码 2->10进制, bin2dec()
function [evaluateValue, evaluateX, evaluateIndividual] = evaluate(sample, left, right, encodingBits)
evaluateValue = zeros(size(sample, 1), 1);
evaluateIndividual  =  -1;
evaluateX = left;   % 既然evaluateX作为返回值，就要保证对其赋值，此处初始化为左边界
for k = 1:size(sample, 1)
    s = num2str(sample(k, :));
    s = strrep(s, ' ', '');     % 找到s中的空格并替换为空，即删除字符串中的空格
    x = left + (right-left)/(2^encodingBits-1) * bin2dec(s);        % 解码（基因型->表现型）
    evaluateValue(k) = f(x);
    if (evaluateValue(k) > evaluateIndividual)
        evaluateX = x; 
        evaluateIndividual = evaluateValue(k);
    end;
end;
evaluateValue = evaluateValue/sum(evaluateValue);    %  归一化

% 适应度函数（可在此处添加要求解的目标函数）
function evaluateValue = f(x)
% Test1：
% %  Q1: f(x) = 10*x/sin(10*x); 在[-2, 3]的最小值
% Note：由于这里的遗传算法处理的都是求最大值，所以取上述函数的倒数
%       学过高数的同学都知道这个函数的极限值为1，在x = 0处取得
%       下面作图验证：
% x = -2:.01:3;
% f = sin(10 * x)./(10 * x);
% plot(x, f); grid on;
% evaluateValue = sin(10*x+eps)./(10*x+eps);

% Test2：
% %  Q2: f(x) = x*sin(10*pi*x)+2.0; 在[-1, 2]的最大值（结果精确到6位小数）
% Note：
%     此处虽然要求精确到6为小数，但是其实MATLAB已经保留了15为双精度
%     可通过vpa(num, 6)实现

% 查看f的图像，可知，在[-1, 2]上f的最大值在x = 1.85处取得，值为3.85
% x = -1:.01:2;
% f =  x .* sin(10*pi*x) + 2.0;
% plot(x, f); grid on;
evaluateValue = x .* sin(10*pi*x) + 2.0;
</pre>

以上只是遗传算法的基本原理，由于今后还要用到这个算法，所以还会对其进行改进。update见我的[Github](https://github.com/heartsuit)

若发现以上代码有什么问题，欢迎讨论！
