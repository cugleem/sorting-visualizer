import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Settings, BarChart3, Activity, Layers, Zap, 
  Volume2, VolumeX, CircleDot, Hexagon, MoveDown, AlignEndVertical, RefreshCw 
} from 'lucide-react';

// --- 配置与常量 ---

const ALGO_INFO = {
  bubble: { name: '冒泡排序', complexity: 'O(n²)', desc: '像气泡一样，大的元素通过不断交换慢慢“浮”到顶端。效率较低但直观。' },
  selection: { name: '选择排序', complexity: 'O(n²)', desc: '每次扫描剩余未排序部分，找出最小值放到已排序序列的末尾。' },
  insertion: { name: '插入排序', complexity: 'O(n²)', desc: '类似整理扑克牌，将新元素插入到已排序部分的正确位置。对近乎有序的数据极快。' },
  shell: { name: '希尔排序', complexity: 'O(n log n)', desc: '插入排序的改进版。先按大间隔分组排序，间隔逐渐缩小，最后进行一次微调。' },
  heap: { name: '堆排序', complexity: 'O(n log n)', desc: '利用二叉堆结构。先构建最大堆，然后不断将堆顶（最大值）移到末尾。' },
  quick: { name: '快速排序', complexity: 'O(n log n)', desc: '分治法经典。选基准值(Pivot)，小的放左边，大的放右边，递归处理。实战中最快。' },
  merge: { name: '归并排序', complexity: 'O(n log n)', desc: '分治法。将数组对半拆分直到只有1个元素，然后两两有序合并。稳定但需要额外空间。' },
};

// 颜色定义
const PRIMARY_COLOR = '#6366f1'; 
const COMPARE_COLOR = '#fbbf24'; 
const SWAP_COLOR = '#f43f5e';    
const SORTED_COLOR = '#10b981';  

const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export default function App() {
  // --- 核心状态 ---
  const [array, setArray] = useState([]);
  const [isSorting, setIsSorting] = useState(false);
  const [algorithm, setAlgorithm] = useState('bubble');
  const [speed, setSpeed] = useState(30); 
  const [arraySize, setArraySize] = useState(60);
  
  // --- 增强功能状态 ---
  const [isMuted, setIsMuted] = useState(false);
  const [viewMode, setViewMode] = useState('bars'); // bars, dots, radial
  const [dataPreset, setDataPreset] = useState('random'); // random, reversed, nearly, unique
  
  // --- 视觉状态 ---
  const [compareIndices, setCompareIndices] = useState([]);
  const [swapIndices, setSwapIndices] = useState([]);
  const [sortedIndices, setSortedIndices] = useState([]);
  const [stats, setStats] = useState({ comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 });

  // --- Refs ---
  const speedRef = useRef(speed);
  const arrayRef = useRef(array);
  const abortRef = useRef(false);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null); // 音频上下文

  // --- 初始化与音频 ---
  useEffect(() => {
    resetArray();
    return () => {
        stopTimer();
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  
  // 当大小或预设模式改变时重置
  useEffect(() => { resetArray(); }, [arraySize, dataPreset]);

  // 音频播放逻辑
  const playNote = (value) => {
    if (isMuted) return;
    if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
    }
    
    const ctx = audioCtxRef.current;
    if(ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // 映射值到频率 (100Hz - 1000Hz)
    const minFreq = 120;
    const maxFreq = 1200;
    const freq = minFreq + (value / 100) * (maxFreq - minFreq);

    osc.type = 'triangle'; // 三角波听起来比较像 8-bit 游戏
    osc.frequency.value = freq;

    gainNode.gain.value = 0.05; // 音量很小，避免刺耳
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  // --- 数组生成逻辑 ---
  const generateArray = () => {
      const newArray = [];
      if (dataPreset === 'random') {
          for (let i = 0; i < arraySize; i++) newArray.push(randomIntFromInterval(5, 100));
      } else if (dataPreset === 'reversed') {
          for (let i = 0; i < arraySize; i++) newArray.push(5 + (i / arraySize) * 95);
          newArray.sort((a, b) => b - a);
      } else if (dataPreset === 'nearly') {
          for (let i = 0; i < arraySize; i++) newArray.push(5 + (i / arraySize) * 95);
          // 交换几对
          for(let k=0; k<arraySize/5; k++) {
              let idx1 = randomIntFromInterval(0, arraySize-1);
              let idx2 = randomIntFromInterval(0, arraySize-1);
              [newArray[idx1], newArray[idx2]] = [newArray[idx2], newArray[idx1]];
          }
      } else if (dataPreset === 'unique') {
          // 只有几种离散值
          for (let i = 0; i < arraySize; i++) newArray.push(randomIntFromInterval(1, 5) * 20);
      }
      return newArray;
  };

  const resetArray = () => {
    if (isSorting) abortRef.current = true;
    
    const newArray = generateArray();
    setArray(newArray);
    arrayRef.current = newArray;
    
    setSortedIndices([]);
    setCompareIndices([]);
    setSwapIndices([]);
    setStats({ comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 });
    setIsSorting(false);
    abortRef.current = false;
    stopTimer();
  };

  // --- 工具逻辑 ---
  const startTimer = () => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setStats(prev => ({ ...prev, elapsed: ((Date.now() - start) / 1000).toFixed(2) }));
    }, 100);
  };
  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };
  const checkAbort = () => { if (abortRef.current) throw new Error("Aborted"); };
  
  // 带音频的延时
  const sleep = async (ms, valueToPlay = null) => {
      if (valueToPlay !== null) playNote(valueToPlay);
      return new Promise(resolve => setTimeout(resolve, ms));
  };

  // --- 排序算法 (带音频触发) ---

  const handleSort = async () => {
    if (isSorting) return;
    setIsSorting(true);
    abortRef.current = false;
    setSortedIndices([]);
    setStats({ comparisons: 0, swaps: 0, startTime: Date.now(), elapsed: 0 });
    startTimer();
    
    // 唤醒音频上下文（浏览器策略）
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }

    const currentArray = [...array];
    arrayRef.current = currentArray;

    try {
        const funcs = {
            bubble: bubbleSort, selection: selectionSort, insertion: insertionSort,
            shell: shellSort, heap: heapSort, quick: (arr) => quickSort(arr, 0, arr.length-1),
            merge: (arr) => mergeSort(arr, 0, arr.length-1)
        };
        await funcs[algorithm](currentArray);
        
        stopTimer();
        setCompareIndices([]);
        setSwapIndices([]);
        // 胜利动画
        for (let i = 0; i < currentArray.length; i++) {
            if (abortRef.current) break;
            setSortedIndices(prev => [...prev, i]);
            // 胜利的音效是快速的扫频
            playNote(currentArray[i]); 
            await sleep(Math.max(5, 200 / arraySize));
        }
    } catch (e) {
        console.log("Sorting aborted");
    } finally {
        setIsSorting(false);
        stopTimer();
    }
  };

  // 1. 冒泡
  const bubbleSort = async (arr) => {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        checkAbort();
        setCompareIndices([j, j + 1]);
        setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
        await sleep(speedRef.current, arr[j]);

        if (arr[j] > arr[j + 1]) {
          setSwapIndices([j, j + 1]);
          setStats(s => ({ ...s, swaps: s.swaps + 1 }));
          [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
          setArray([...arr]);
          await sleep(speedRef.current);
        }
        setSwapIndices([]);
      }
      setSortedIndices(prev => [...prev, n - 1 - i]);
    }
    setSortedIndices(prev => [...prev, 0]);
  };

  // 2. 选择
  const selectionSort = async (arr) => {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            checkAbort();
            setCompareIndices([minIdx, j]);
            setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
            await sleep(speedRef.current, arr[j]); // Play sound on compare
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        if (minIdx !== i) {
            setSwapIndices([i, minIdx]);
            setStats(s => ({ ...s, swaps: s.swaps + 1 }));
            [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
            setArray([...arr]);
            await sleep(speedRef.current, arr[i]); // Play sound on swap
            setSwapIndices([]);
        }
        setSortedIndices(prev => [...prev, i]);
    }
  };

  // 3. 插入
  const insertionSort = async (arr) => {
    const n = arr.length;
    setSortedIndices([0]); 
    for (let i = 1; i < n; i++) {
        let key = arr[i];
        let j = i - 1;
        checkAbort();
        setCompareIndices([i, j]);
        await sleep(speedRef.current);
        setSwapIndices([i]); 
        while (j >= 0 && arr[j] > key) {
            checkAbort();
            setStats(s => ({ ...s, comparisons: s.comparisons + 1, swaps: s.swaps + 1 }));
            setCompareIndices([j, j + 1]);
            arr[j + 1] = arr[j];
            setArray([...arr]);
            await sleep(speedRef.current, arr[j]);
            j = j - 1;
        }
        arr[j + 1] = key;
        setArray([...arr]);
        setSwapIndices([]);
        const newSorted = [];
        for(let k=0; k<=i; k++) newSorted.push(k);
        setSortedIndices(newSorted);
    }
  };

  // 4. 希尔
  const shellSort = async (arr) => {
    let n = arr.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
            let temp = arr[i];
            let j;
            checkAbort();
            setCompareIndices([i, i - gap]); 
            await sleep(speedRef.current);
            setSwapIndices([i]); 
            for (j = i; j >= gap && arr[j - gap] > temp; j -= gap) {
                checkAbort();
                setCompareIndices([j, j - gap]);
                setStats(s => ({ ...s, comparisons: s.comparisons + 1, swaps: s.swaps + 1 }));
                arr[j] = arr[j - gap];
                setSwapIndices([j]); 
                setArray([...arr]);
                await sleep(speedRef.current, arr[j]);
            }
            arr[j] = temp;
            setSwapIndices([j]); 
            setArray([...arr]);
            await sleep(speedRef.current);
        }
    }
  };

  // 5. 堆
  const heapSort = async (arr) => {
      let n = arr.length;
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await heapify(arr, n, i);
      for (let i = n - 1; i > 0; i--) {
          checkAbort();
          setSwapIndices([0, i]);
          setStats(s => ({ ...s, swaps: s.swaps + 1 }));
          [arr[0], arr[i]] = [arr[i], arr[0]];
          setArray([...arr]);
          setSortedIndices(prev => [...prev, i]);
          await sleep(speedRef.current, arr[i]);
          await heapify(arr, i, 0);
      }
      setSortedIndices(prev => [...prev, 0]);
  };
  const heapify = async (arr, n, i) => {
      let largest = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n) {
          checkAbort();
          setCompareIndices([l, largest]);
          setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
          await sleep(speedRef.current);
          if (arr[l] > arr[largest]) largest = l;
      }
      if (r < n) {
          checkAbort();
          setCompareIndices([r, largest]);
          setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
          await sleep(speedRef.current);
          if (arr[r] > arr[largest]) largest = r;
      }
      if (largest !== i) {
          checkAbort();
          setSwapIndices([i, largest]);
          setStats(s => ({ ...s, swaps: s.swaps + 1 }));
          [arr[i], arr[largest]] = [arr[largest], arr[i]];
          setArray([...arr]);
          await sleep(speedRef.current, arr[i]);
          await heapify(arr, n, largest);
      }
      setCompareIndices([]); setSwapIndices([]);
  };

  // 6. 快速
  const quickSort = async (arr, low, high) => {
      if (low < high) {
          let pi = await partition(arr, low, high);
          setSortedIndices(prev => [...prev, pi]);
          await quickSort(arr, low, pi - 1);
          await quickSort(arr, pi + 1, high);
      } else if (low === high) setSortedIndices(prev => [...prev, low]);
  };
  const partition = async (arr, low, high) => {
      let pivot = arr[high];
      let i = (low - 1);
      setSwapIndices([high]); 
      for (let j = low; j <= high - 1; j++) {
          checkAbort();
          setCompareIndices([j, high]); 
          setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
          await sleep(speedRef.current, arr[j]);
          if (arr[j] < pivot) {
              i++;
              setSwapIndices([i, j]);
              setStats(s => ({ ...s, swaps: s.swaps + 1 }));
              [arr[i], arr[j]] = [arr[j], arr[i]];
              setArray([...arr]);
              await sleep(speedRef.current);
          }
      }
      setSwapIndices([i + 1, high]);
      setStats(s => ({ ...s, swaps: s.swaps + 1 }));
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      setArray([...arr]);
      await sleep(speedRef.current, arr[i+1]);
      setSwapIndices([]);
      return (i + 1);
  };

  // 7. 归并
  const mergeSort = async (arr, l, r) => {
      if (l >= r) return;
      const m = l + Math.floor((r - l) / 2);
      await mergeSort(arr, l, m);
      await mergeSort(arr, m + 1, r);
      await merge(arr, l, m, r);
  };
  const merge = async (arr, l, m, r) => {
      const n1 = m - l + 1;
      const n2 = r - m;
      let L = new Array(n1), R = new Array(n2);
      for (let i = 0; i < n1; i++) L[i] = arr[l + i];
      for (let j = 0; j < n2; j++) R[j] = arr[m + 1 + j];
      let i = 0, j = 0, k = l;
      while (i < n1 && j < n2) {
          checkAbort();
          setCompareIndices([l + i, m + 1 + j]); 
          setStats(s => ({ ...s, comparisons: s.comparisons + 1 }));
          await sleep(speedRef.current);
          setSwapIndices([k]); 
          setStats(s => ({ ...s, swaps: s.swaps + 1 }));
          if (L[i] <= R[j]) { arr[k] = L[i]; i++; } 
          else { arr[k] = R[j]; j++; }
          setArray([...arr]);
          await sleep(speedRef.current, arr[k]);
          k++;
      }
      while (i < n1) {
          checkAbort();
          setSwapIndices([k]); arr[k] = L[i];
          setArray([...arr]); await sleep(speedRef.current, arr[k]);
          i++; k++;
      }
      while (j < n2) {
          checkAbort();
          setSwapIndices([k]); arr[k] = R[j];
          setArray([...arr]); await sleep(speedRef.current, arr[k]);
          j++; k++;
      }
      setSwapIndices([]);
  };

  // --- 渲染 ---
  
  const getHsl = (val) => {
      const hue = Math.floor((val / 100) * 280);
      return `hsl(${hue}, 75%, 60%)`;
  };

  const getColor = (val, idx) => {
    if (sortedIndices.includes(idx)) return SORTED_COLOR;
    if (swapIndices.includes(idx)) return SWAP_COLOR;
    if (compareIndices.includes(idx)) return COMPARE_COLOR;
    return getHsl(val);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
          {/* 第一行：Logo和主操作 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                <Activity size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                SortingVisualizer
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                 <button onClick={() => setViewMode('bars')} className={`p-1.5 rounded ${viewMode==='bars'?'bg-slate-700 text-white':'text-slate-500'}`} title="柱状图"><BarChart3 size={18}/></button>
                 <button onClick={() => setViewMode('dots')} className={`p-1.5 rounded ${viewMode==='dots'?'bg-slate-700 text-white':'text-slate-500'}`} title="散点图"><CircleDot size={18}/></button>
                 <button onClick={() => setViewMode('radial')} className={`p-1.5 rounded ${viewMode==='radial'?'bg-slate-700 text-white':'text-slate-500'}`} title="径向图"><Hexagon size={18}/></button>
              </div>
              <div className="h-6 w-px bg-slate-800 mx-1 hidden md:block"></div>
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`p-2 rounded-full transition-colors ${isMuted ? 'text-slate-500 hover:bg-slate-900' : 'text-indigo-400 bg-indigo-400/10 hover:bg-indigo-400/20'}`}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button onClick={resetArray} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="重置">
                <RotateCcw size={20} />
              </button>
              <button
                onClick={handleSort} disabled={isSorting}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20 ${
                  isSorting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'
                }`}
              >
                <Play size={18} fill="currentColor" />
                <span className="hidden sm:inline">RUN</span>
              </button>
            </div>
          </div>

          {/* 第二行：配置栏 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
             <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
                {Object.keys(ALGO_INFO).map((key) => (
                    <button
                    key={key}
                    onClick={() => !isSorting && setAlgorithm(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        algorithm === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    } ${isSorting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSorting}
                    >
                    {ALGO_INFO[key].name}
                    </button>
                ))}
             </div>

             <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
                <span className="px-2 text-slate-500 font-bold">模式</span>
                <button onClick={() => setDataPreset('random')} className={`px-2 py-1 rounded ${dataPreset==='random'?'bg-slate-700 text-white':'text-slate-400'}`}>随机</button>
                <button onClick={() => setDataPreset('reversed')} className={`px-2 py-1 rounded ${dataPreset==='reversed'?'bg-slate-700 text-white':'text-slate-400'}`}>倒序</button>
                <button onClick={() => setDataPreset('nearly')} className={`px-2 py-1 rounded ${dataPreset==='nearly'?'bg-slate-700 text-white':'text-slate-400'}`}>有序</button>
                <button onClick={() => setDataPreset('unique')} className={`px-2 py-1 rounded ${dataPreset==='unique'?'bg-slate-700 text-white':'text-slate-400'}`}>重复</button>
             </div>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-7xl mx-auto w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox icon={<BarChart3 className="text-indigo-400" />} label="N (数据量)" value={arraySize} />
            <StatBox icon={<Layers className="text-amber-400" />} label="Comparisons" value={stats.comparisons} />
            <StatBox icon={<Zap className="text-rose-400" />} label="Swaps/Access" value={stats.swaps} />
            <StatBox icon={<Settings className="text-emerald-400" />} label="Time (s)" value={stats.elapsed} />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-3">
             {/* 算法信息 */}
             <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{ALGO_INFO[algorithm].name}</span>
                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 border border-indigo-500/30">
                    {ALGO_INFO[algorithm].complexity}
                </span>
             </div>
             <p className="text-xs text-slate-500 leading-relaxed h-8 overflow-hidden text-ellipsis line-clamp-2">
                {ALGO_INFO[algorithm].desc}
             </p>
             
             {/* 滑块 */}
             <div className="grid grid-cols-2 gap-4 mt-1">
                 <label className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Quantity</span>
                    <input type="range" min="10" max="200" value={arraySize} onChange={(e) => setArraySize(Number(e.target.value))} disabled={isSorting} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 opacity-80 hover:opacity-100" />
                 </label>
                 <label className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Speed</span>
                    <input type="range" min="1" max="150" value={151 - speed} onChange={(e) => setSpeed(151 - Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 opacity-80 hover:opacity-100" />
                 </label>
             </div>
          </div>
        </div>

        {/* 可视化舞台 */}
        <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl relative min-h-[450px] shadow-2xl shadow-black/50 overflow-hidden flex items-center justify-center">
            
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/0 to-slate-950/0 pointer-events-none"></div>

            {/* 渲染模式切换 */}
            {viewMode === 'bars' && (
                <div className="absolute inset-x-4 bottom-0 top-8 flex items-end justify-center gap-[1px]">
                    {array.map((value, idx) => (
                        <div key={idx}
                            style={{ height: `${value}%`, width: `${100/arraySize}%`, backgroundColor: getColor(value, idx) }}
                            className="rounded-t-[1px] transition-colors duration-75 relative group"
                        >
                           <div className="absolute bottom-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'dots' && (
                <div className="absolute inset-4 flex items-end justify-between border-l border-b border-slate-800/50 p-2">
                    {array.map((value, idx) => (
                        <div key={idx} className="relative h-full w-full flex items-end justify-center">
                            <div 
                                style={{ 
                                    bottom: `${value}%`, 
                                    backgroundColor: getColor(value, idx),
                                    width: Math.max(4, 600/arraySize) + 'px',
                                    height: Math.max(4, 600/arraySize) + 'px'
                                }}
                                className="absolute rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                            ></div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'radial' && (
                 <div className="relative w-[400px] h-[400px] animate-[spin_60s_linear_infinite]">
                    {array.map((value, idx) => {
                        const angle = (idx / arraySize) * 360;
                        return (
                            <div key={idx}
                                style={{ 
                                    transform: `rotate(${angle}deg)`,
                                    height: '50%', // 半径
                                    width: `${360/arraySize}deg`,
                                    position: 'absolute',
                                    bottom: '50%',
                                    left: '50%',
                                    transformOrigin: 'bottom center',
                                }}
                                className="flex flex-col justify-end items-center"
                            >
                                <div 
                                    style={{ 
                                        height: `${value}%`, 
                                        width: Math.max(2, 400/arraySize) + 'px',
                                        backgroundColor: getColor(value, idx) 
                                    }}
                                    className="rounded-full"
                                ></div>
                            </div>
                        )
                    })}
                    <div className="absolute inset-0 m-auto w-16 h-16 bg-slate-900 rounded-full border border-slate-800 z-10"></div>
                 </div>
            )}
            
        </div>
      </main>
    </div>
  );
}

function StatBox({ icon, label, value }) {
    return (
        <div className="flex flex-col justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-700/30 hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-2 mb-2 opacity-80">
                {React.cloneElement(icon, { size: 14 })}
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
            </div>
            <div className="text-slate-100 text-xl font-mono font-medium">{value}</div>
        </div>
    );
}
