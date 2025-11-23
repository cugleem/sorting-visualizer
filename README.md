基于React实现的排序算法动态展示项目，该项目可以动态的展示各种主流排序算法的执行过程，包括冒泡排序、选择排序、插入排序、希尔排序、堆排序、快速排序和归并排序。可以展示各排序算法比较次数、交换次数和执行时间，排序的过程可以以柱状图、散点图和极坐标图的形式进行动态展示，用户可以选择生成随机的数据、倒序的数据、基本有序的数据以及重复情况较多的数据等数据模式。

# 界面预览
## 柱状图视图
<img width="1912" height="932" alt="image" src="https://github.com/user-attachments/assets/ca76e2af-3fd7-45b3-be2f-52d4278571ab" />

## 散点图视图
<img width="1912" height="932" alt="image" src="https://github.com/user-attachments/assets/96549c05-dad0-442c-9b72-6cc8122fa8f9" />

## 极坐标视图
<img width="1912" height="932" alt="image" src="https://github.com/user-attachments/assets/e2e650ee-9f04-459a-aad8-b7c19570563d" />


# 项目配置说明
## 第一步：准备环境

确保你的电脑上已经安装了 Node.js。

- 打开终端（Windows 下是 CMD 或 PowerShell，Mac 下是 Terminal）。

- 输入 `node -v`。

- 如果显示版本号（如 v18.17.0 或更高），说明已安装。如果没有，请去 Node.js 官网 下载并安装。

## 第二步：依赖配置


进入项目目录：

`cd sorting-visualizer`


安装项目依赖：

`npm install`

安装完成后项目目录下会出现node_modules文件夹


## 第三步：运行项目


在终端中运行：

`npm run dev`


终端会显示一个地址，通常是 http://localhost:5173/。

按住 Ctrl (Mac 是 Cmd) 点击这个链接，或者在浏览器中手动输入这个地址。
