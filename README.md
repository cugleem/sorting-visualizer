React 项目搭建与代码迁移指南

本指南将指导你如何从零开始搭建一个现代 React 开发环境，配置 Tailwind CSS，并将排序可视化代码迁移进去。

第一步：准备环境

确保你的电脑上已经安装了 Node.js。

打开终端（Windows 下是 CMD 或 PowerShell，Mac 下是 Terminal）。

输入 node -v。

如果显示版本号（如 v18.17.0 或更高），说明已安装。如果没有，请去 Node.js 官网 下载并安装。

第二步：创建 React 项目 (使用 Vite)

我们将使用 Vite 来创建项目，因为它比传统的 create-react-app 更快更轻量。

在终端中，进入你想存放项目的文件夹。

运行以下命令创建项目（项目名为 sorting-visualizer）：

npm create vite@latest sorting-visualizer -- --template react


进入项目目录：

cd sorting-visualizer


安装基础依赖：

npm install


第三步：安装并配置 Tailwind CSS (关键步骤)

原本的代码使用了大量的 CSS 类名（如 bg-slate-950, flex, p-4），这些都来自 Tailwind CSS。必须配置它，否则页面会是一片空白或乱码。

安装 Tailwind 及其依赖（强制使用 v3 版本以保证兼容性）：

npm install -D tailwindcss@3 postcss autoprefixer


(注意：这里特意加了 @3，防止自动安装不兼容的 v4 版本)

初始化配置文件：

npx tailwindcss init -p


(这会生成 tailwind.config.js 和 postcss.config.js 两个文件。如果不成功，请参考之前的对话手动创建这两个文件)

修改 tailwind.config.js：
打开项目根目录下的 tailwind.config.js，将 content 数组修改为以下内容，以便 Tailwind 能扫描到你的 React 文件：

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


引入 Tailwind 指令：
打开 src/index.css 文件，删除里面的所有内容，替换为以下三行：

@tailwind base;
@tailwind components;
@tailwind utilities;


第四步：安装图标库依赖

原来的代码中使用了很多图标（如 Play, Settings, Volume2），它们来自 lucide-react 库。

安装 lucide-react：

npm install lucide-react


第五步：迁移代码

现在环境都配置好了，开始把代码放进去。

打开 src/App.jsx 文件。

清空 里面的所有内容。

复制 我之前生成的 SortingVisualizer.jsx 中的全部代码。

粘贴 到 src/App.jsx 中。

保存文件。

(可选)：你可以删除 src/App.css 文件，并在 src/main.jsx 中去掉 import './App.css' 这一行，因为我们主要使用 Tailwind，不需要额外的 CSS 文件了。

第六步：运行项目

一切准备就绪！

在终端中运行：

npm run dev


终端会显示一个地址，通常是 http://localhost:5173/。

按住 Ctrl (Mac 是 Cmd) 点击这个链接，或者在浏览器中手动输入这个地址。

恭喜你！ 你现在应该能在浏览器中看到完整的、可交互的排序算法可视化大屏了。

常见问题排查

页面排版错乱/白屏？

检查 第三步 是否完全执行。

确保 src/index.css 里有那三行 @tailwind 指令。

确保 main.jsx 里面引用了 import './index.css'。

提示 "Play is not defined" 或类似错误？

检查 第四步 是否执行 (npm install lucide-react)。

确保代码顶部的 import ... from 'lucide-react' 这一行存在。

提示 PostCSS plugin 错误？

确保你执行了 npm install -D tailwindcss@3 postcss autoprefixer 来安装 v3 版本，而不是默认的 v4 版本。