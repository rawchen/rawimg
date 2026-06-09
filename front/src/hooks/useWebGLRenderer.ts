import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditParams } from '@/types';

// Vertex shader source - simple fullscreen quad
const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// Fragment shader source - image adjustments
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform float u_temperature;
uniform float u_tint;
uniform float u_vibrance;
uniform float u_saturation;
uniform float u_clarity;
uniform float u_dehaze;
uniform float u_texture;
uniform vec2 u_resolution;

// Convert RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Helper function for HSL to RGB conversion
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

// Convert RGB to HSL
vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;

  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }

  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;

  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;

  return vec3(h, s, l);
}

// Convert HSL to RGB
vec3 hsl2rgb(vec3 c) {
  if (c.y == 0.0) {
    return vec3(c.z);
  }

  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;

  float r = hue2rgb(p, q, c.x + 1.0/3.0);
  float g = hue2rgb(p, q, c.x);
  float b = hue2rgb(p, q, c.x - 1.0/3.0);

  return vec3(r, g, b);
}

// Apply exposure adjustment - Camera Raw inspired with smooth highlight handling
vec3 applyExposure(vec3 color, float exposure) {
  if (exposure == 0.0) return color;

  // Exposure multiplier - gentle linear scaling
  // exposure=1 → mult=1.15, exposure=5 → mult=1.75
  float mult = 1.0 + exposure * 0.15;

  vec3 result = color * mult;

  // For positive exposure: smooth highlight compression
  if (exposure > 0.0) {
    // Use filmic curve but blend smoothly near zero
    // This ensures linearity for small adjustments
    float blendFactor = smoothstep(0.0, 1.0, exposure);

    // ACES filmic tone mapping approximation
    vec3 x = max(vec3(0.0), result);
    float a = 0.6;
    float b = 0.5;
    float c = 0.1;
    float d = 0.533;
    vec3 compressed = clamp((x * (a * x + b)) / (x * (a * x + c * b) + d), 0.0, 1.0);

    // Blend between linear and compressed based on exposure strength
    result = mix(result, compressed, blendFactor);
  }

  // For negative exposure: protect shadows from going pure black
  if (exposure < 0.0) {
    float blendFactor = smoothstep(0.0, -1.0, exposure);
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float shadowFloor = 0.02 * lum;
    vec3 protected = max(result, vec3(shadowFloor));
    result = mix(result, protected, blendFactor);
  }

  return result;
}

// Apply contrast adjustment using S-curve
vec3 applyContrast(vec3 color, float contrast) {
  contrast = contrast / 100.0;
  return (color - 0.5) * (1.0 + contrast) + 0.5;
}

// Apply highlights/shadows adjustment - Camera Raw style
vec3 applyHighlightsShadows(vec3 color, float highlights, float shadows) {
  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // Highlights: affect bright areas with gentle shoulder curve
  float highlightMask = smoothstep(0.5, 0.95, lum);

  if (abs(highlights) > 0.001) {
    // Use gentler compression curve - Camera Raw style
    float strength = highlights / 100.0;

    if (highlights < 0.0) {
      // Lowering highlights: very gentle compression
      // For -100 (param -10): white -> ~#f6f6f6 (only ~3% reduction)
      float compression = 1.0 + strength * highlightMask * 0.3;
      float newLum = lum * compression;
      // Preserve color ratio
      color = color * (newLum / max(0.001, lum));
    } else {
      // Raising highlights
      color *= 1.0 + strength * highlightMask * 0.5;
    }
  }

  // Shadows: affect dark areas
  float shadowMask = smoothstep(0.5, 0.05, lum);

  if (abs(shadows) > 0.001) {
    float strength = shadows / 100.0;

    if (shadows < 0.0) {
      // Lowering shadows
      float compression = 1.0 + strength * shadowMask * 0.3;
      float newLum = lum * compression;
      color = color * (newLum / max(0.001, lum));
    } else {
      // Raising shadows
      color *= 1.0 + strength * shadowMask * 0.5;
    }
  }

  return clamp(color, 0.0, 1.0);
}

// Apply whites/blacks adjustment
vec3 applyWhitesBlacks(vec3 color, float whites, float blacks) {
  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // Whites: affect brightest areas
  float whiteMask = smoothstep(0.7, 1.0, lum);
  color += (whites / 200.0) * whiteMask;

  // Blacks: affect darkest areas
  float blackMask = smoothstep(0.3, 0.0, lum);
  color -= (blacks / 200.0) * blackMask;

  return clamp(color, 0.0, 1.0);
}

// Apply white balance (temperature and tint)
vec3 applyWhiteBalance(vec3 color, float temperature, float tint) {
  // Temperature: 2000K (warm) to 50000K (cool), default 6500K
  // Convert to adjustment value
  float temp = (temperature - 6500.0) / 100.0;

  // Apply temperature
  color.r += temp * 0.01;
  color.b -= temp * 0.01;

  // Apply tint (green-magenta)
  color.g += tint * 0.002;

  return clamp(color, 0.0, 1.0);
}

// Apply vibrance (smart saturation)
vec3 applyVibrance(vec3 color, float vibrance) {
  float maxVal = max(color.r, max(color.g, color.b));
  float minVal = min(color.r, min(color.g, color.b));
  float sat = maxVal - minVal;
  float avg = (color.r + color.g + color.b) / 3.0;

  // Less effect on already saturated colors
  float amt = (1.0 - sat) * vibrance / 100.0;

  color.r += (color.r - avg) * amt;
  color.g += (color.g - avg) * amt;
  color.b += (color.b - avg) * amt;

  return clamp(color, 0.0, 1.0);
}

// Apply saturation
vec3 applySaturation(vec3 color, float saturation) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, 1.0 + saturation / 100.0);
}

// Apply clarity (local contrast)
vec3 applyClarity(vec3 color, float clarity, vec2 uv, sampler2D img, vec2 resolution) {
  if (clarity == 0.0) return color;

  // Simple unsharp mask approximation
  vec2 texelSize = 1.0 / resolution;
  vec3 blur = vec3(0.0);
  float kernel[9];
  kernel[0] = 1.0; kernel[1] = 2.0; kernel[2] = 1.0;
  kernel[3] = 2.0; kernel[4] = 4.0; kernel[5] = 2.0;
  kernel[6] = 1.0; kernel[7] = 2.0; kernel[8] = 1.0;
  float kernelWeight = 16.0;

  int index = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      blur += texture(img, uv + offset).rgb * kernel[index];
      index++;
    }
  }
  blur /= kernelWeight;

  float strength = clarity / 100.0;
  return color + (color - blur) * strength;
}

// Apply dehaze
vec3 applyDehaze(vec3 color, float dehaze) {
  if (dehaze == 0.0) return color;

  float strength = dehaze / 100.0;
  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // Estimate haze (lighter areas have more haze)
  float haze = max(0.0, lum - 0.5) * 2.0;

  // Reduce haze by increasing contrast and saturation
  color = (color - haze * 0.5) / (1.0 - haze * strength * 0.5);

  return clamp(color, 0.0, 1.0);
}

void main() {
  vec4 texColor = texture(u_image, v_texCoord);
  vec3 color = texColor.rgb;

  // 1. White Balance (should be early in pipeline)
  color = applyWhiteBalance(color, u_temperature, u_tint);

  // 2. Exposure
  color = applyExposure(color, u_exposure);

  // 3. Highlights/Shadows
  color = applyHighlightsShadows(color, u_highlights, u_shadows);

  // 4. Whites/Blacks
  color = applyWhitesBlacks(color, u_whites, u_blacks);

  // 5. Contrast
  color = applyContrast(color, u_contrast);

  // 6. Clarity (local contrast) - only sample if clarity != 0
  if (abs(u_clarity) > 0.001) {
    color = applyClarity(color, u_clarity, v_texCoord, u_image, u_resolution);
  }

  // 7. Dehaze
  color = applyDehaze(color, u_dehaze);

  // 8. Vibrance
  color = applyVibrance(color, u_vibrance);

  // 9. Saturation
  color = applySaturation(color, u_saturation);

  fragColor = vec4(clamp(color, 0.0, 1.0), texColor.a);
}
`;

interface WebGLRendererState {
  gl: WebGL2RenderingContext | null;
  program: WebGLProgram | null;
  texture: WebGLTexture | null;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  isReady: boolean;
  error: string | null;
}

export function useWebGLRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WebGLRendererState>({
    gl: null,
    program: null,
    texture: null,
    uniforms: {},
    isReady: false,
    error: null,
  });

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compile shader
  const compileShader = useCallback((gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }, []);

  // Create program
  const createProgram = useCallback((gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null => {
    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }, [compileShader]);

  // Initialize WebGL
  const initialize = useCallback((canvas: HTMLCanvasElement): boolean => {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      setError('WebGL2 not supported');
      return false;
    }

    const program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    if (!program) {
      setError('Failed to create shader program');
      return false;
    }

    // Get uniform locations
    const uniforms = {
      u_image: gl.getUniformLocation(program, 'u_image'),
      u_exposure: gl.getUniformLocation(program, 'u_exposure'),
      u_contrast: gl.getUniformLocation(program, 'u_contrast'),
      u_highlights: gl.getUniformLocation(program, 'u_highlights'),
      u_shadows: gl.getUniformLocation(program, 'u_shadows'),
      u_whites: gl.getUniformLocation(program, 'u_whites'),
      u_blacks: gl.getUniformLocation(program, 'u_blacks'),
      u_temperature: gl.getUniformLocation(program, 'u_temperature'),
      u_tint: gl.getUniformLocation(program, 'u_tint'),
      u_vibrance: gl.getUniformLocation(program, 'u_vibrance'),
      u_saturation: gl.getUniformLocation(program, 'u_saturation'),
      u_clarity: gl.getUniformLocation(program, 'u_clarity'),
      u_dehaze: gl.getUniformLocation(program, 'u_dehaze'),
      u_texture: gl.getUniformLocation(program, 'u_texture'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    };

    // Create VAO with fullscreen quad
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Position buffer (fullscreen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // TexCoord buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]), gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    stateRef.current = {
      gl,
      program,
      texture,
      uniforms,
      isReady: true,
      error: null,
    };

    setIsReady(true);
    setError(null);
    return true;
  }, [createProgram]);

  // Load image to texture (supports various input types)
  const loadImage = useCallback((image: HTMLImageElement | ImageBitmap | ImageData | { data: Uint8ClampedArray; width: number; height: number }): boolean => {
    const { gl, texture } = stateRef.current;
    if (!gl || !texture) return false;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Check if it's ImageData-like object with data, width, height
    if ('data' in image && image.data instanceof Uint8ClampedArray) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        image.width,
        image.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image.data
      );
    } else {
      // HTMLImageElement or ImageBitmap
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as HTMLImageElement | ImageBitmap);
    }

    return true;
  }, []);

  // Render with params - supports downscaled rendering for performance
  const render = useCallback((params: EditParams, imageWidth: number, imageHeight: number, scale: number = 1) => {
    const { gl, program, uniforms, isReady: ready } = stateRef.current;
    if (!gl || !program || !ready) return;

    // Calculate render dimensions based on scale
    const renderWidth = Math.floor(imageWidth * scale);
    const renderHeight = Math.floor(imageHeight * scale);

    gl.viewport(0, 0, renderWidth, renderHeight);
    gl.useProgram(program);

    // Set uniforms
    gl.uniform1i(uniforms.u_image, 0);
    gl.uniform1f(uniforms.u_exposure, params.exposure);
    gl.uniform1f(uniforms.u_contrast, params.contrast);
    gl.uniform1f(uniforms.u_highlights, params.highlights);
    gl.uniform1f(uniforms.u_shadows, params.shadows);
    gl.uniform1f(uniforms.u_whites, params.whites);
    gl.uniform1f(uniforms.u_blacks, params.blacks);
    gl.uniform1f(uniforms.u_temperature, params.temperature);
    gl.uniform1f(uniforms.u_tint, params.tint);
    gl.uniform1f(uniforms.u_vibrance, params.vibrance);
    gl.uniform1f(uniforms.u_saturation, params.saturation);
    gl.uniform1f(uniforms.u_clarity, params.clarity);
    gl.uniform1f(uniforms.u_dehaze, params.dehaze);
    gl.uniform1f(uniforms.u_texture, params.texture);
    gl.uniform2f(uniforms.u_resolution, imageWidth, imageHeight);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    const { gl, program, texture } = stateRef.current;
    if (gl) {
      if (program) gl.deleteProgram(program);
      if (texture) gl.deleteTexture(texture);
    }
    stateRef.current = {
      gl: null,
      program: null,
      texture: null,
      uniforms: {},
      isReady: false,
      error: null,
    };
    setIsReady(false);
  }, []);

  // Set canvas ref and initialize
  const setCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRef.current = canvas;
      initialize(canvas);
    } else {
      cleanup();
    }
  }, [initialize, cleanup]);

  return {
    setCanvas,
    canvasRef,
    isReady,
    error,
    loadImage,
    render,
    cleanup,
  };
}
