import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Pencil,
  ArrowRight,
  Minus,
  Square,
  Circle,
  Eraser,
  RotateCcw,
  Trash2,
  Send,
  Sparkles,
  Move,
} from 'lucide-react';
import { ChatAttachment } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachSketch: (attachment: ChatAttachment, prefilledPrompt?: string) => void;
}

type DrawingTool = 'pencil' | 'arrow' | 'line' | 'axes' | 'rect' | 'circle' | 'eraser';
type GridType = 'graph' | 'dot' | 'none';

const COLOR_PALETTE = [
  { name: 'White', color: '#ffffff', label: 'General / Chalk' },
  { name: 'Amber', color: '#f59e0b', label: 'Forces & Vectors' },
  { name: 'Cyan', color: '#06b6d4', label: 'Velocity & Rays' },
  { name: 'Emerald', color: '#10b981', label: 'Surfaces / Signs' },
  { name: 'Rose', color: '#f43f5e', label: 'Friction / Opposing' },
  { name: 'Purple', color: '#c084fc', label: 'Fields & Curves' },
];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  isOpen,
  onClose,
  onAttachSketch,
}) => {
  // Triple-Canvas:
  // 1. bgCanvas: Permanent crisp chalkboard background with graph/dot grid
  // 2. baseCanvas: Persistent transparent artwork canvas (strokes, drawings)
  // 3. previewCanvas: 60fps real-time drag preview & dimension HUD
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [color, setColor] = useState<string>('#ffffff');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [gridType, setGridType] = useState<GridType>('graph');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ x: number; y: number } | null>(null);
  const [activeDimensionText, setActiveDimensionText] = useState<string>('Ready to sketch');

  // History stack for Undo
  const historyStack = useRef<ImageData[]>([]);
  const lastPencilPoint = useRef<{ x: number; y: number } | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Background Grid Painter (Chalkboard with crisp, high-contrast engineering graph & dots)
  const drawCanvasBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, grid: GridType) => {
      // 1. Solid chalkboard background
      ctx.fillStyle = '#0b1120'; // deep slate chalkboard
      ctx.fillRect(0, 0, width, height);

      if (grid === 'graph') {
        const step = 28;
        // Minor grid lines - clean slate lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Major accent guide lines (every 4 cells = 112px) - purple engineering grid
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step * 4) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += step * 4) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      } else if (grid === 'dot') {
        // High-contrast, clean circular dots (clearly visible immediately upon opening)
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
        const step = 24;
        ctx.beginPath();
        for (let x = step / 2; x < width; x += step) {
          for (let y = step / 2; y < height; y += step) {
            ctx.moveTo(x + 1.8, y);
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      }
    },
    []
  );

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyStack.current.push(data);
    if (historyStack.current.length > 25) {
      historyStack.current.shift();
    }
  }, []);

  // Clear preview canvas completely and restore DPR transform
  const clearPreviewCanvas = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;
    const dpr = window.devicePixelRatio || 1;
    previewCtx.save();
    previewCtx.setTransform(1, 0, 0, 1, 0, 0);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.restore();
    previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // Setup canvases on open and keep synchronized with exact pixel bounds via ResizeObserver
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      return;
    }

    const setupCanvases = () => {
      const container = containerRef.current;
      const bgCanvas = bgCanvasRef.current;
      const baseCanvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (!container || !bgCanvas || !baseCanvas || !previewCanvas) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(rect.width * dpr);
      const pixelHeight = Math.round(rect.height * dpr);

      // 1. Background Grid Canvas: ALWAYS redraw freshly with exact pixel clarity
      bgCanvas.width = pixelWidth;
      bgCanvas.height = pixelHeight;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCanvasBackground(bgCtx, rect.width, rect.height, gridType);
      }

      // 2. Base Artwork Canvas (Transparent user sketches)
      if (!isInitializedRef.current) {
        baseCanvas.width = pixelWidth;
        baseCanvas.height = pixelHeight;
        const baseCtx = baseCanvas.getContext('2d');
        if (baseCtx) {
          baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          baseCtx.clearRect(0, 0, rect.width, rect.height);
          historyStack.current = [];
          saveState();
        }
        isInitializedRef.current = true;
      } else if (baseCanvas.width !== pixelWidth || baseCanvas.height !== pixelHeight) {
        // Window resized while sketching: preserve artwork
        let prevCanvasCopy: HTMLCanvasElement | null = null;
        if (baseCanvas.width > 0 && baseCanvas.height > 0) {
          prevCanvasCopy = document.createElement('canvas');
          prevCanvasCopy.width = baseCanvas.width;
          prevCanvasCopy.height = baseCanvas.height;
          const copyCtx = prevCanvasCopy.getContext('2d');
          copyCtx?.drawImage(baseCanvas, 0, 0);
        }

        baseCanvas.width = pixelWidth;
        baseCanvas.height = pixelHeight;
        const baseCtx = baseCanvas.getContext('2d');
        if (baseCtx) {
          baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (prevCanvasCopy) {
            baseCtx.drawImage(prevCanvasCopy, 0, 0, rect.width, rect.height);
          }
        }
      }

      // 3. Top Preview Canvas
      previewCanvas.width = pixelWidth;
      previewCanvas.height = pixelHeight;
      const previewCtx = previewCanvas.getContext('2d');
      if (previewCtx) {
        previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        clearPreviewCanvas();
      }
    };

    // Immediate initial setup + requestAnimationFrame to catch post-animation dimensions
    setupCanvases();
    const raf = requestAnimationFrame(setupCanvases);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        setupCanvases();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [isOpen, gridType, drawCanvasBackground, saveState, clearPreviewCanvas]);

  const handleUndo = () => {
    if (historyStack.current.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyStack.current.pop(); // Pop current
    const prev = historyStack.current[historyStack.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Redraw background grid freshly
    const bgCanvas = bgCanvasRef.current;
    if (bgCanvas) {
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        const rect = bgCanvas.getBoundingClientRect();
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCanvasBackground(bgCtx, rect.width, rect.height, gridType);
      }
    }

    clearPreviewCanvas();
    historyStack.current = [];
    saveState();
  };

  const handleGridChange = (newGrid: GridType) => {
    soundEffects.playSoftClick();
    setGridType(newGrid);
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    const rect = bgCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Redraw chalkboard background with the newly selected grid cleanly
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCanvasBackground(bgCtx, rect.width, rect.height, newGrid);
  };

  // Pixel-perfect coordinate calculation: 1:1 mapping directly under the mouse pointer
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Helper to draw Arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // Live HUD dimension badge on preview canvas
  const renderDimensionHUD = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string
  ) => {
    ctx.save();
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 16;
    const boxH = 22;

    const baseCanvas = canvasRef.current;
    const maxW = baseCanvas ? baseCanvas.getBoundingClientRect().width : 800;
    const px = Math.max(10, Math.min(x + 14, maxW - boxW - 10));
    const py = Math.max(30, y - 18);

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(px, py - 14, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, px + 8, py + 1);
    ctx.restore();
  };

  // 1. Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentCoords(coords);
    lastPencilPoint.current = coords;

    const baseCanvas = canvasRef.current;
    if (!baseCanvas) return;
    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) return;

    const dpr = window.devicePixelRatio || 1;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (tool === 'pencil' || tool === 'eraser') {
      baseCtx.save();
      if (tool === 'eraser') {
        baseCtx.globalCompositeOperation = 'destination-out';
        baseCtx.fillStyle = '#000000';
      } else {
        baseCtx.globalCompositeOperation = 'source-over';
        baseCtx.fillStyle = color;
      }
      baseCtx.beginPath();
      baseCtx.arc(
        coords.x,
        coords.y,
        tool === 'eraser' ? 14 : lineWidth / 2,
        0,
        Math.PI * 2
      );
      baseCtx.fill();
      baseCtx.restore();
      setActiveDimensionText(`Drawing with ${lineWidth}px ${tool}`);
    }
  };

  // 2. Pointer Move (Zero-Lag 60fps Real-Time Rubber Banding directly under native cursor)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setCurrentCoords(coords);

    const previewCanvas = previewCanvasRef.current;
    const baseCanvas = canvasRef.current;
    if (!previewCanvas || !baseCanvas) return;

    const previewCtx = previewCanvas.getContext('2d');
    const baseCtx = baseCanvas.getContext('2d');
    if (!previewCtx || !baseCtx) return;

    const dpr = window.devicePixelRatio || 1;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Always clear preview canvas cleanly on move
    clearPreviewCanvas();

    if (isDrawing && startPos) {
      if (tool === 'pencil' || tool === 'eraser') {
        // Continuous smooth stroke on base canvas
        baseCtx.save();
        if (tool === 'eraser') {
          baseCtx.globalCompositeOperation = 'destination-out';
          baseCtx.strokeStyle = '#000000';
          baseCtx.lineWidth = 28;
        } else {
          baseCtx.globalCompositeOperation = 'source-over';
          baseCtx.strokeStyle = color;
          baseCtx.lineWidth = lineWidth;
        }
        baseCtx.beginPath();
        baseCtx.moveTo(lastPencilPoint.current?.x || startPos.x, lastPencilPoint.current?.y || startPos.y);
        baseCtx.lineTo(coords.x, coords.y);
        baseCtx.lineCap = 'round';
        baseCtx.lineJoin = 'round';
        baseCtx.stroke();
        baseCtx.restore();

        lastPencilPoint.current = coords;
        setActiveDimensionText(`${tool === 'eraser' ? 'Eraser' : 'Pen'} stroke at (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
      } else {
        // Shape tools: Live Real-time Rubber Banding on Preview Canvas
        previewCtx.save();
        previewCtx.strokeStyle = color;
        previewCtx.fillStyle = color;
        previewCtx.lineWidth = lineWidth;
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';

        let hudText = '';

        if (tool === 'line') {
          previewCtx.beginPath();
          previewCtx.moveTo(startPos.x, startPos.y);
          previewCtx.lineTo(coords.x, coords.y);
          previewCtx.stroke();

          const len = Math.round(Math.hypot(coords.x - startPos.x, coords.y - startPos.y));
          hudText = `Length: ${len}px`;
          renderDimensionHUD(previewCtx, coords.x, coords.y, hudText);
        } else if (tool === 'arrow') {
          drawArrow(previewCtx, startPos.x, startPos.y, coords.x, coords.y, Math.max(12, lineWidth * 3.5));

          const len = Math.round(Math.hypot(coords.x - startPos.x, coords.y - startPos.y));
          const angle = Math.round(
            (Math.atan2(coords.y - startPos.y, coords.x - startPos.x) * 180) / Math.PI
          );
          hudText = `Vector: ${len}px (${angle}°)`;
          renderDimensionHUD(previewCtx, coords.x, coords.y, hudText);
        } else if (tool === 'rect') {
          const w = coords.x - startPos.x;
          const h = coords.y - startPos.y;

          // Subtle tinted fill to make the box clearly visible
          previewCtx.fillStyle = color + '18';
          previewCtx.fillRect(startPos.x, startPos.y, w, h);

          // Solid border
          previewCtx.strokeRect(startPos.x, startPos.y, w, h);

          // Guide dashed outline
          previewCtx.setLineDash([4, 4]);
          previewCtx.strokeStyle = '#ffffff80';
          previewCtx.strokeRect(startPos.x, startPos.y, w, h);

          hudText = `${Math.abs(Math.round(w))} × ${Math.abs(Math.round(h))} px`;
          renderDimensionHUD(previewCtx, coords.x, coords.y, hudText);
        } else if (tool === 'circle') {
          const radius = Math.hypot(coords.x - startPos.x, coords.y - startPos.y);

          // Subtle tinted fill
          previewCtx.fillStyle = color + '15';
          previewCtx.beginPath();
          previewCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
          previewCtx.fill();

          // Stroke outline
          previewCtx.beginPath();
          previewCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
          previewCtx.stroke();

          // Radius dashed guide line
          previewCtx.setLineDash([3, 3]);
          previewCtx.strokeStyle = '#ffffff90';
          previewCtx.beginPath();
          previewCtx.moveTo(startPos.x, startPos.y);
          previewCtx.lineTo(coords.x, coords.y);
          previewCtx.stroke();

          hudText = `Radius: ${Math.round(radius)}px (Dia: ${Math.round(radius * 2)}px)`;
          renderDimensionHUD(previewCtx, coords.x, coords.y, hudText);
        } else if (tool === 'axes') {
          const ox = startPos.x;
          const oy = startPos.y;
          const lenX = Math.max(40, Math.abs(coords.x - startPos.x));
          const lenY = Math.max(40, Math.abs(coords.y - startPos.y));

          drawArrow(previewCtx, ox - lenX * 0.15, oy, ox + lenX, oy, 10);
          drawArrow(previewCtx, ox, oy + lenY * 0.15, ox, oy - lenY, 10);

          previewCtx.font = 'bold 12px sans-serif';
          previewCtx.fillText('+x', ox + lenX + 6, oy + 4);
          previewCtx.fillText('+y', ox - 4, oy - lenY - 8);
          previewCtx.fillText('O (0,0)', ox - 24, oy + 16);

          hudText = `Axes: ${Math.round(lenX)} × ${Math.round(lenY)} px`;
          renderDimensionHUD(previewCtx, coords.x, coords.y, hudText);
        }

        previewCtx.restore();
        setActiveDimensionText(hudText);
      }
    } else {
      setActiveDimensionText(`Position: (${Math.round(coords.x)}, ${Math.round(coords.y)}) | Ready to draw`);
    }
  };

  // 3. Pointer Up (Commit Shape cleanly to Base Canvas)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    setIsDrawing(false);

    const coords = getCanvasCoords(e);
    const baseCanvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!baseCanvas || !previewCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');
    if (!baseCtx || !previewCtx) return;

    // Clear preview canvas immediately
    clearPreviewCanvas();

    const dpr = window.devicePixelRatio || 1;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Commit final shape to base canvas
    baseCtx.save();
    if (tool === 'eraser') {
      baseCtx.globalCompositeOperation = 'destination-out';
      baseCtx.strokeStyle = '#000000';
      baseCtx.fillStyle = '#000000';
      baseCtx.lineWidth = 28;
    } else {
      baseCtx.globalCompositeOperation = 'source-over';
      baseCtx.strokeStyle = color;
      baseCtx.fillStyle = color;
      baseCtx.lineWidth = lineWidth;
    }
    baseCtx.lineCap = 'round';
    baseCtx.lineJoin = 'round';

    if (tool === 'line') {
      baseCtx.beginPath();
      baseCtx.moveTo(startPos.x, startPos.y);
      baseCtx.lineTo(coords.x, coords.y);
      baseCtx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(baseCtx, startPos.x, startPos.y, coords.x, coords.y, Math.max(12, lineWidth * 3.5));
    } else if (tool === 'rect') {
      const w = coords.x - startPos.x;
      const h = coords.y - startPos.y;
      baseCtx.strokeRect(startPos.x, startPos.y, w, h);
    } else if (tool === 'circle') {
      const radius = Math.hypot(coords.x - startPos.x, coords.y - startPos.y);
      baseCtx.beginPath();
      baseCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
      baseCtx.stroke();
    } else if (tool === 'axes') {
      const ox = startPos.x;
      const oy = startPos.y;
      const lenX = Math.max(40, Math.abs(coords.x - startPos.x));
      const lenY = Math.max(40, Math.abs(coords.y - startPos.y));

      drawArrow(baseCtx, ox - lenX * 0.15, oy, ox + lenX, oy, 10);
      drawArrow(baseCtx, ox, oy + lenY * 0.15, ox, oy - lenY, 10);

      baseCtx.font = 'bold 12px sans-serif';
      baseCtx.fillText('+x', ox + lenX + 6, oy + 4);
      baseCtx.fillText('+y', ox - 4, oy - lenY - 8);
      baseCtx.fillText('O', ox - 12, oy + 14);
    }

    baseCtx.restore();

    setStartPos(null);
    lastPencilPoint.current = null;
    saveState();
  };

  const handlePointerCancel = () => {
    setIsDrawing(false);
    setStartPos(null);
    lastPencilPoint.current = null;
    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const previewCtx = previewCanvas.getContext('2d');
      if (previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    }
  };

  // Export sketch & attach to chat
  const handleExport = (prefilledPrompt?: string) => {
    const bgCanvas = bgCanvasRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundEffects.playSuccessChime();

    // Composite background chalkboard grid + user artwork
    let dataUrl = canvas.toDataURL('image/png');
    if (bgCanvas && bgCanvas.width > 0 && bgCanvas.height > 0) {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = bgCanvas.width;
      exportCanvas.height = bgCanvas.height;
      const expCtx = exportCanvas.getContext('2d');
      if (expCtx) {
        expCtx.drawImage(bgCanvas, 0, 0);
        expCtx.drawImage(canvas, 0, 0);
        dataUrl = exportCanvas.toDataURL('image/png');
      }
    }

    const attachment: ChatAttachment = {
      id: `whiteboard-${Date.now()}`,
      name: `JEE-Whiteboard-Sketch-${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.png`,
      mimeType: 'image/png',
      data: dataUrl,
      previewUrl: dataUrl,
      type: 'whiteboard',
    };

    onAttachSketch(attachment, prefilledPrompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-neutral-900 border border-neutral-750 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Whiteboard Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-100">
                  Live JEE Doubt-Solving Whiteboard
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/40">
                  Real-time STEM Canvas
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Sketch Free-Body Diagrams (FBD), calculus graphs, or circuits with live size preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEffects.playPop();
                handleUndo();
              }}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors text-xs flex items-center gap-1"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playDeleteSoft();
                handleClear();
              }}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-300 transition-colors text-xs flex items-center gap-1"
              title="Clear canvas"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playDrawerClose();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tools and Palette Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 shrink-0 text-xs">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('pencil');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'pencil' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Freehand Pencil"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pen</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('arrow');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'arrow' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Force Vector Arrow (for FBD, velocities, rays)"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Vector Arrow</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('axes');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'axes' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="X-Y Coordinate Axes (for calculus & kinematics graphs)"
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden md:inline">X-Y Axes</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('line');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'line' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Straight Line (inclined planes, surfaces)"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Line</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('rect');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'rect' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Block / Rectangle (masses, capacitors)"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Block</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playSoftClick();
                setTool('circle');
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'circle' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Circle / Pulley"
            >
              <Circle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pulley</span>
            </button>

            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                tool === 'eraser' ? 'bg-purple-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Eraser</span>
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.color}
                onClick={() => {
                  setColor(c.color);
                  if (tool === 'eraser') setTool('pencil');
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  color === c.color ? 'scale-125 border-white shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={`${c.name} (${c.label})`}
              />
            ))}
          </div>

          {/* Stroke Width & Grid Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              {[2, 3, 5, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    lineWidth === w ? 'bg-neutral-800 text-purple-300 font-bold' : 'text-neutral-400'
                  }`}
                  title={`${w}px stroke thickness`}
                >
                  {w}px
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              {(['graph', 'dot', 'none'] as GridType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => handleGridChange(g)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                    gridType === g ? 'bg-neutral-800 text-cyan-300 font-bold' : 'text-neutral-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Coordinate & Dimension Status Strip */}
        <div className="px-4 py-1.5 bg-neutral-950/90 border-b border-neutral-850 flex items-center justify-between text-[11px] font-mono text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-200">{activeDimensionText}</span>
          </div>
          {currentCoords && (
            <div className="text-[10px] text-neutral-400 hidden sm:block">
              Pos: ({currentCoords.x}, {currentCoords.y}) • Tool: {tool.toUpperCase()} ({lineWidth}px)
            </div>
          )}
        </div>

        {/* Interactive Triple-Canvas Stage (Background Grid + Artwork + Real-Time Preview) */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-slate-900 cursor-crosshair overflow-hidden touch-none select-none"
        >
          {/* 0. Background Canvas (Persistent crisp chalkboard & graph/dot grid) */}
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />

          {/* 1. Base Canvas (Persistent transparent artwork) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />

          {/* 2. Top Preview Canvas (Zero-lag 60fps live rubber banding & HUD) */}
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full block z-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
          />
        </div>

        {/* Footer Quick Action Tray */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-950 border-t border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-neutral-300">Quick AI Diagnosis Presets:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick FBD Diagnosis Button */}
            <button
              onClick={() =>
                handleExport(
                  'Please inspect my Free-Body Diagram (FBD) sketch. Check my force directions (Normal, Friction, Gravity, Tension) and verify if my coordinate sign convention and equations are correct.'
                )
              }
              className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs rounded-xl font-medium transition-colors shadow-xs"
              title="Inspect Free Body Diagram forces & sign conventions"
            >
              🎯 Diagnose FBD & Signs
            </button>

            {/* Quick Graph Analysis Button */}
            <button
              onClick={() =>
                handleExport(
                  'Please analyze this graph sketch. Check its slope, critical points, concavity, and physical meaning for JEE.'
                )
              }
              className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs rounded-xl font-medium transition-colors shadow-xs"
              title="Analyze calculus or kinematics graph curve"
            >
              📈 Analyze Graph Curve
            </button>

            {/* Send Sketch directly to chat */}
            <button
              onClick={() => handleExport()}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Attach Sketch to Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
