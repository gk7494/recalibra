/**
 * Photo annotation and markup tools
 */

import React, { useRef, useState, useCallback } from 'react';

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  text?: string;
  color: string;
}

interface PhotoAnnotationProps {
  imageBlob: Blob;
  onSave: (annotatedBlob: Blob) => void;
  onClose: () => void;
}

export const PhotoAnnotation: React.FC<PhotoAnnotationProps> = ({ imageBlob, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<'arrow' | 'circle' | 'rectangle' | 'text'>('arrow');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    const imgUrl = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setImageLoaded(true);
        redrawAnnotations();
      }
      URL.revokeObjectURL(imgUrl);
    };
    img.src = imgUrl;
  }, [imageBlob]);

  const redrawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const imgUrl = URL.createObjectURL(imageBlob);
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      annotations.forEach(ann => {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = ann.color;
        
        if (ann.type === 'arrow' && ann.x2 !== undefined && ann.y2 !== undefined) {
          drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2);
        } else if (ann.type === 'circle' && ann.x2 !== undefined && ann.y2 !== undefined) {
          const radius = Math.sqrt(Math.pow(ann.x2 - ann.x1, 2) + Math.pow(ann.y2 - ann.y1, 2));
          ctx.beginPath();
          ctx.arc(ann.x1, ann.y1, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (ann.type === 'rectangle' && ann.x2 !== undefined && ann.y2 !== undefined) {
          ctx.strokeRect(ann.x1, ann.y1, ann.x2 - ann.x1, ann.y2 - ann.y1);
        } else if (ann.type === 'text' && ann.text) {
          ctx.font = '20px Arial';
          ctx.fillText(ann.text, ann.x1, ann.y1);
        }
      });
      
      URL.revokeObjectURL(imgUrl);
    };
    img.src = imgUrl;
  }, [annotations, imageBlob, imageLoaded]);

  React.useEffect(() => {
    redrawAnnotations();
  }, [annotations, redrawAnnotations]);

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 15;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - Math.PI / 6),
      y2 - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + Math.PI / 6),
      y2 - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        setAnnotations([...annotations, {
          id: Date.now().toString(),
          type: 'text',
          x1: x,
          y1: y,
          text,
          color: currentColor,
        }]);
      }
    } else {
      setIsDrawing(true);
      setStartPos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    redrawAnnotations();
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 3;
      
      if (currentTool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, x, y);
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'rectangle') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setAnnotations([...annotations, {
      id: Date.now().toString(),
      type: currentTool,
      x1: startPos.x,
      y1: startPos.y,
      x2: x,
      y2: y,
      color: currentColor,
    }]);
    
    setIsDrawing(false);
    setStartPos(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        onClose();
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="bg-white p-4 flex justify-between items-center">
        <div className="flex gap-2">
          {(['arrow', 'circle', 'rectangle', 'text'] as const).map(tool => (
            <button
              key={tool}
              onClick={() => setCurrentTool(tool)}
              className={`px-4 py-2 rounded-lg font-medium ${
                currentTool === tool
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-12 h-10 rounded border"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full max-h-full border border-gray-300 cursor-crosshair"
        />
      </div>
    </div>
  );
};


