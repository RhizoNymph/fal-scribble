import React, { useState, useEffect, useCallback } from 'react';
import * as fal from "@fal-ai/serverless-client";

const CanvasComponent = ({ id, onGenerate }) => {
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
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
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

  return (
    <div style={{ border: '1px solid #ccc', padding: '2px', margin: '2px', borderRadius: '5px' }}>
      <div style={{ display: 'flex', gap: '1px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <canvas
          ref={handleCanvasRef}
          width={500}
          height={500}
          style={{ border: '1px solid black' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
        {imageResult && (
          <img src={imageResult} alt="Generated" style={{ width: 500, height: 500 }} />
        )}
      </div>
      <button onClick={handleGenerate} style={{ marginTop: '10px' }}>Generate</button>
    </div>
  );
};

const MultipleCanvasComponent = () => {
  const [canvases, setCanvases] = useState([{ id: 1 }]);

  const addCanvas = () => {
    setCanvases([...canvases, { id: canvases.length + 1 }]);
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
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.forEach(log => console.log(log.message));
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

  return (
    <div>
      <button onClick={addCanvas} style={{ marginBottom: '20px' }}>Add Canvas</button>
      {canvases.map((canvas) => (
        <CanvasComponent key={canvas.id} id={canvas.id} onGenerate={generateImage} />
      ))}
    </div>
  );
};

export default MultipleCanvasComponent;