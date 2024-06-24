import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as fal from "@fal-ai/serverless-client";

const CanvasComponent = React.forwardRef(({ id, onGenerate, onCopy, copiedImageData, singleCanvas }, ref) => {
  const [canvas, setCanvas] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prompt, setPrompt] = useState('fairy');
  const [seed, setSeed] = useState(0);
  const [steps, setSteps] = useState(25);
  const [cfg, setCfg] = useState(7);
  const [denoise, setDenoise] = useState(1);
  const [strength, setStrength] = useState(0.8);
  const [imageResult, setImageResult] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  const initializeCanvas = useCallback((canvas) => {
    const context = canvas.getContext('2d');
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setCanvas(canvas);
    setCtx(context);
    
    if (imageData) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
      img.src = imageData;
    }
  }, [imageData]);

  useEffect(() => {
    if (canvas) {
      initializeCanvas(canvas);
    }
  }, [canvas, initializeCanvas]);

  const handleCanvasRef = (ref) => {
    if (ref) {
      initializeCanvas(ref);
    }
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.strokeStyle = isEraser ? 'black' : 'white';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setImageData(canvas.toDataURL());
    }
  };

  const getBase64Image = () => {
    return canvas.toDataURL().split(',')[1];
  };

  const handleGenerate = async () => {
    const base64Image = getBase64Image();
    const imageUrl = await onGenerate({
      prompt,
      seed,
      steps,
      cfg,
      denoise,
      strength,
      base64Image
    });
    if (imageUrl) {
      setImageResult(imageUrl);
    } else {
      console.error("Failed to generate image");
    }
  };

  const copyCanvas = () => {
    const imageData = canvas.toDataURL();
    onCopy(imageData);
    console.log('Canvas content copied');
  };

  const clearCanvas = () => {
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setImageData(null);
    }
  };

  const pasteCanvas = useCallback(() => {
    if (copiedImageData && ctx) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageData(copiedImageData);
      };
      img.src = copiedImageData;
    } else {
      console.log('No copied image data available or context not ready');
    }
  }, [copiedImageData, ctx, canvas]);

  useEffect(() => {
    document.addEventListener('paste', pasteCanvas);
    return () => {
      document.removeEventListener('paste', pasteCanvas);
    };
  }, [pasteCanvas]);

  React.useImperativeHandle(ref, () => ({
    generate: handleGenerate
  }));

  return (
    <div 
      style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        borderRadius: '5px', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        boxSizing: 'border-box' 
      }}
      onPaste={pasteCanvas}
    >
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <input
          type="text"
          placeholder="Seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
        <div>
          <label>Steps: {steps}</label>
          <input
            type="range"
            min="1"
            max="100"
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
        </div>
        <div>
          <label>CFG: {cfg}</label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            value={cfg}
            onChange={(e) => setCfg(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Denoise: {denoise}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={denoise}
            onChange={(e) => setDenoise(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Strength: {strength}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Brush Size: {brushSize}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>
        <button onClick={() => setIsEraser(!isEraser)}>
          {isEraser ? 'Swap to Draw' : 'Swap to Eraser'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexGrow: 1, minHeight: 0 }}>
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
          <canvas
            ref={handleCanvasRef}
            width={400}
            height={400}
            style={{ border: '1px solid black', width: '90%', height: 'auto', maxHeight: '90%', objectFit: 'contain' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <button onClick={copyCanvas}>Copy</button>
            <button onClick={clearCanvas}>Clear</button>
            <button onClick={pasteCanvas}>Paste</button>
            <button onClick={handleGenerate}>Generate</button>
          </div>
        </div>
        <div style={{ width: '50%', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90%' }}>
          {imageResult ? (
            <img src={imageResult} alt="Generated" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span>Generated image will appear here</span>
          )}
        </div>
      </div>
    </div>
  );
});

const GridCanvas = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const correctPassword = 'Commune'; // Replace with your desired password

  const [canvases, setCanvases] = useState([{ id: 1 }]);
  const [copiedImageData, setCopiedImageData] = useState(null);
  const canvasRefs = useRef({});

  const addCanvas = () => {
    const newId = canvases.length + 1;
    setCanvases([...canvases, { id: newId }]);
  };

  const handleCopy = (imageData) => {
    setCopiedImageData(imageData);
  };

  const generateImage = async (params) => {
    try {      
      fal.config({
        credentials: "YOUR_FAL_CREDENTIALS",
      });       
      console.log("Generating image with params:", params);
      const result = await fal.subscribe("comfy/RhizoNymph/sketch", {
        input: {
          cliptextencode_text: params.prompt,
          ksampler_seed: params.seed,
          ksampler_steps: params.steps,
          ksampler_cfg: params.cfg,
          ksampler_denoise: params.denoise,
          loadimagefromurl_fal_url: `data:image/png;base64,${params.base64Image}`,
          controlnetapplyadvanced_strength: params.strength,
          emptylatentimage_batch_size: 1
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log(update);
          }
        },
      });
      console.log("Image generation result:", result);
      
      if (result.outputs && result.outputs["20"] && result.outputs["20"].images && result.outputs["20"].images.length > 0) {
        return result.outputs["20"].images[0].url;
      }
      
      console.error("No image URL found in the result");
      return null;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  };

  const generateAllImages = () => {
    Object.values(canvasRefs.current).forEach(ref => {
      if (ref && ref.generate) {
        ref.generate();
      }
    });
  };

  const columns = Math.ceil(Math.sqrt(canvases.length));

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={addCanvas}>Add Canvas</button>
        {canvases.length > 1 && <button onClick={generateAllImages}>Generate All</button>}
      </div>
      <div style={{ 
        flexGrow: 1, 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`, 
        gridAutoRows: '1fr', 
        gap: '20px', 
        overflowY: 'auto'
      }}>
        {canvases.map((canvas) => (
          <CanvasComponent
            key={canvas.id}
            ref={el => canvasRefs.current[canvas.id] = el}
            id={canvas.id}
            onGenerate={generateImage}
            onCopy={handleCopy}
            copiedImageData={copiedImageData}
            singleCanvas={canvases.length === 1}
          />
        ))}
      </div>
    </div>
  );
};

export default GridCanvas;
