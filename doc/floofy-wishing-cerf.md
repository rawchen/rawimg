# Twhai RAW Image Editor - Implementation Plan

## Context

This project is being refactored from an image gallery/blog application into a web-based RAW image editor similar to Adobe Lightroom (lightroom.adobe.com). The goal is to create a professional-grade RAW photo editing application that runs entirely in the browser using WebGPU/WebGL for GPU-accelerated image processing.

### Current State
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Radix UI + Ant Design
- **Backend**: Spring Boot + MyBatis Plus + MySQL + Redis
- **Current Functionality**: Image gallery with upload, comments, favorites, user authentication

### Target Architecture
Five-layer architecture: Decode Layer → Rendering Layer → Edit Layer → Cache Layer → Export Layer

### Key Decisions (Confirmed by User)
1. **RAW Decoding**: Browser-only using WebAssembly (LibRaw WASM). No server fallback.
2. **GPU Technology**: WebGPU primary, WebGL 2.0 fallback for unsupported browsers (Safari).
3. **Legacy Features**: Keep gallery as a photo library/manager view within the editor.
4. **MVP Scope**: Complete basic editor with Light panel, Color panel, and JPEG export.

---

## Phase 1: Foundation Setup (Week 1-2)

### 1.1 Project Restructure
- Rename `PicchubApplication` → `TwhaiApplication`
- Update package namespace from `com.rawchen` to `com.twhai` (optional)
- **Keep existing gallery as "Library" view**:
  - Gallery → Library (photo management view)
  - GalleryImage → Photo (individual photo)
  - Keep: `SysUser`, `SysConfig` for authentication and settings
  - Keep: `Comment` for photo comments (optional)
  - **Remove**: `CardKey`, `VipPackage`, `Order` (VIP/payment system not needed)
  - Repurpose: `Gallery` entity for photo albums/collections in library view

### 1.2 New Frontend Dependencies
```json
{
  "dependencies": {
    "@webgpu/types": "^0.1.40",
    "idb": "^8.0.0",
    "zustand": "^4.5.0",
    "react-zoom-pan-pinch": "^3.4.0"
  }
}
```

### 1.3 Directory Structure (New)
```
front/src/
├── components/
│   ├── editor/
│   │   ├── EditorCanvas.tsx        # Main canvas with zoom/pan
│   │   ├── EditorLayout.tsx        # Full editor layout
│   │   ├── Histogram.tsx           # RGB histogram display
│   │   ├── AdjustmentPanel.tsx     # Right sidebar adjustments
│   │   ├── AdjustmentSlider.tsx    # Slider component
│   │   ├── Toolbar.tsx             # Top toolbar
│   │   ├── Filmstrip.tsx           # Bottom filmstrip
│   │   ├── CurvesEditor.tsx        # Curves adjustment UI
│   │   └── ColorWheel.tsx          # Color grading wheel
│   ├── library/
│   │   ├── LibraryLayout.tsx       # Photo library view (repurposed HomePage)
│   │   ├── PhotoCard.tsx           # Photo thumbnail card
│   │   ├── PhotoGrid.tsx           # Grid view of photos
│   │   └── ImportPanel.tsx         # Import photos panel
│   └── ...
├── hooks/
│   ├── useGPURenderer.ts          # WebGPU/WebGL initialization
│   ├── useImageProcessor.ts       # Image processing pipeline
│   ├── useHistory.ts              # Undo/redo history
│   └── useIndexedDB.ts            # IndexedDB cache
├── stores/
│   ├── editorStore.ts             # Zustand store for editor state
│   ├── libraryStore.ts            # Photo library state
│   └── imageCacheStore.ts         # Image cache state
├── workers/
│   ├── rawDecoder.worker.ts       # RAW decoding worker
│   └── histogram.worker.ts        # Histogram calculation
├── shaders/
│   ├── webgpu/
│   │   ├── exposure.wgsl          # Exposure adjustment
│   │   ├── contrast.wgsl          # Contrast adjustment
│   │   ├── whiteBalance.wgsl      # WB adjustment
│   │   ├── curves.wgsl            # Curves adjustment
│   │   └── hsl.wgsl               # HSL adjustment
│   └── webgl/
│   │   ├── main.frag              # Main fragment shader
│   │   └── adjustments.glsl       # Adjustment functions
└── utils/
    ├── rawDecoder.ts              # LibRaw WASM wrapper
    ├── colorSpace.ts              # Color space utilities
    ├── exifParser.ts              # EXIF extraction
    └── xmpWriter.ts               # XMP sidecar generation
```

---

## Phase 2: RAW Decoding Layer (Week 2-3)

### 2.1 LibRaw WASM Integration (Browser-only)
- Create WASM module wrapper for LibRaw
- Support formats: NEF, ARW, CR2, CR3, DNG
- Implement demosaic algorithms
- Fallback to browser's native image decoder for JPEG/PNG

### 2.2 Web Worker for RAW Decoding
```typescript
// workers/rawDecoder.worker.ts
import LibRaw from 'libraw-wasm';

self.onmessage = async (e: MessageEvent) => {
  const { file, id } = e.data;
  const raw = await LibRaw.open(file);
  const result = {
    id,
    width: raw.width,
    height: raw.height,
    rgb16: raw.getRGB16(),      // Float32Array
    exif: raw.getExif(),
    thumbnail: raw.getThumbnail(),
  };
  self.postMessage(result, [result.rgb16.buffer]);
};
```

### 2.3 Image Data Structure
```typescript
interface RawImage {
  id: string;
  filename: string;
  width: number;
  height: number;
  rgb16: Float32Array;      // 16-bit linear RGB data
  exif: ExifData;
  histogram: HistogramData;
  thumbnail: string;         // Base64 thumbnail
  editParams: EditParams;    // Non-destructive edits
}

interface EditParams {
  exposure: number;          // -5 to +5
  contrast: number;          // -100 to +100
  highlights: number;        // -100 to +100
  shadows: number;           // -100 to +100
  whites: number;            // -100 to +100
  blacks: number;            // -100 to +100
  temperature: number;       // 2000 to 50000 K
  tint: number;              // -150 to +150
  vibrance: number;          // -100 to +100
  saturation: number;        // -100 to +100
  curves: {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
  };
  hsl: {
    hue: HSLAdjustment[];
    saturation: HSLAdjustment[];
    luminance: HSLAdjustment[];
  };
  clarity: number;           // -100 to +100
  sharpening: {
    amount: number;
    radius: number;
    detail: number;
    masking: number;
  };
  noiseReduction: {
    luminance: number;
    detail: number;
    contrast: number;
  };
}
```

---

## Phase 3: GPU Processing Pipeline (Week 3-4)

### 3.1 GPU Renderer with Fallback
```typescript
// hooks/useGPURenderer.ts
export function useGPURenderer() {
  const [renderer, setRenderer] = useState<WebGPURenderer | WebGLRenderer | null>(null);
  const [rendererType, setRendererType] = useState<'webgpu' | 'webgl'>('webgpu');

  useEffect(() => {
    const initRenderer = async () => {
      // Try WebGPU first
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          const device = await adapter.requestDevice();
          setRenderer(new WebGPURenderer(device));
          setRendererType('webgpu');
          return;
        } catch (e) {
          console.warn('WebGPU initialization failed, falling back to WebGL');
        }
      }
      // Fallback to WebGL 2.0
      const gl = document.createElement('canvas').getContext('webgl2');
      if (gl) {
        setRenderer(new WebGLRenderer(gl));
        setRendererType('webgl');
      } else {
        throw new Error('Neither WebGPU nor WebGL 2.0 is supported');
      }
    };
    initRenderer();
  }, []);

  return { renderer, rendererType };
}
```

### 3.2 WebGPU Renderer Class
- Primary renderer using WebGPU compute shaders
- Supports 16-bit per channel processing
- WGSL shader pipeline

### 3.3 WebGL 2.0 Fallback Renderer
- Secondary renderer for Safari and older browsers
- GLSL fragment shaders
- 16-bit simulated with floating-point textures

### 3.2 Shader Pipeline
Create WGSL shaders for each adjustment:
1. **Exposure** - Multiply RGB values
2. **Contrast** - Apply S-curve transformation
3. **White Balance** - Color temperature conversion
4. **Tone Curve** - User-defined curves
5. **HSL** - Hue/Saturation/Luminance adjustments
6. **Sharpening** - Unsharp mask
7. **Noise Reduction** - Bilateral filter

### 3.3 Processing Chain
```
RAW Texture (GPU)
    ↓
[Exposure Pass]
    ↓
[White Balance Pass]
    ↓
[Contrast Pass]
    ↓
[Tone Curve Pass]
    ↓
[HSL Pass]
    ↓
[Color Grading Pass]
    ↓
[Sharpening Pass]
    ↓
Output Texture
```

---

## Phase 4: Editor UI Components (Week 4-6)

### 4.1 Main Editor Layout
Similar to Lightroom's layout:
- **Top**: Toolbar with undo/redo, zoom controls, export
- **Center**: Canvas with image preview
- **Right**: Adjustment panels (collapsible sections)
- **Bottom**: Filmstrip with thumbnails

### 4.2 Adjustment Panels (Right Sidebar)
Following the Lightroom structure provided:

1. **Edit Panel** - Auto, B&W, HDR buttons
2. **Profile** - Color profile selection
3. **Light Panel**
   - Exposure slider
   - Contrast slider
   - Highlights slider
   - Shadows slider
   - Whites slider
   - Blacks slider
   - Point Curve editor

4. **Color Panel**
   - White Balance dropdown
   - Temperature slider
   - Tint slider
   - Vibrance slider
   - Saturation slider
   - Color Mixer (HSL)
   - Point Color picker
   - Color Grading wheels

5. **Effects Panel**
   - Texture slider
   - Clarity slider
   - Dehaze slider
   - Vignette controls
   - Grain controls

6. **Detail Panel**
   - Sharpening controls
   - Noise Reduction controls

7. **Optics Panel**
   - Chromatic Aberration toggle
   - Lens Correction toggle

### 4.3 Slider Component
```tsx
// components/editor/AdjustmentSlider.tsx
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  onChange: (value: number) => void;
  onReset: () => void;
  backgroundGradient?: string;
}
```

---

## Phase 5: State Management & History (Week 6-7)

### 5.1 Zustand Store
```typescript
// stores/editorStore.ts
interface EditorState {
  // Current image
  currentImage: RawImage | null;

  // Edit parameters
  params: EditParams;

  // History
  history: EditParams[];
  historyIndex: number;

  // UI State
  zoom: number;
  pan: { x: number; y: number };
  activePanel: string;

  // Actions
  setParam: (key: keyof EditParams, value: any) => void;
  undo: () => void;
  redo: () => void;
  resetParams: () => void;
}
```

### 5.2 History System
- Store only parameter changes (not image data)
- Maximum 100 history states
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)

---

## Phase 6: Caching System (Week 7-8)

### 6.1 IndexedDB Schema
```typescript
// IndexedDB stores
const DB_SCHEMA = {
  images: 'id, filename, width, height, timestamp',
  thumbnails: 'id, data',
  editParams: 'id, params, timestamp',
  previews: 'id, level, data',  // Pyramid previews
};
```

### 6.2 Pyramid Preview System
Generate multiple resolution levels:
- Level 0: 256px
- Level 1: 512px
- Level 2: 1024px
- Level 3: 2048px
- Level 4: 4096px
- Level 5: Full resolution

---

## Phase 7: XMP & Export (Week 8-9)

### 7.1 XMP Sidecar Files
```xml
<x:xmpmeta>
  <rdf:RDF>
    <rdf:Description>
      <twhai:Exposure>0.8</twhai:Exposure>
      <twhai:Contrast>20</twhai:Contrast>
      <twhai:Temperature>5600</twhai:Temperature>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

### 7.2 Export Formats
- JPEG (quality 1-100)
- PNG
- TIFF (8/16-bit)
- WebP
- AVIF (if browser supports)

### 7.3 Export API
```typescript
interface ExportOptions {
  format: 'jpeg' | 'png' | 'tiff' | 'webp' | 'avif';
  quality: number;
  width?: number;
  height?: number;
  colorSpace: 'srgb' | 'adobe-rgb' | 'prophoto-rgb';
  bitDepth: 8 | 16;
}
```

---

## Phase 8: Backend API Changes (Week 9-10)

### 8.1 New Entities
```java
@Entity
public class Photo {
    private Long id;
    private String filename;
    private String originalPath;
    private String thumbnailPath;
    private Integer width;
    private Integer height;
    private String exifJson;
    private LocalDateTime createTime;
}

@Entity
public class PhotoEdit {
    private Long id;
    private Long photoId;
    private String paramsJson;  // EditParams as JSON
    private LocalDateTime updateTime;
}
```

### 8.2 New Endpoints
```java
@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    @PostMapping("/upload")
    public R<Photo> uploadPhoto(MultipartFile file);

    @GetMapping("/{id}")
    public R<Photo> getPhoto(Long id);

    @GetMapping("/{id}/params")
    public R<EditParams> getEditParams(Long id);

    @PutMapping("/{id}/params")
    public R<Void> saveEditParams(Long id, EditParams params);

    @GetMapping("/{id}/export")
    public ResponseEntity<Resource> exportPhoto(Long id, ExportOptions options);
}
```

---

## Files to Modify/Create

### Frontend (Create - Editor)
- `front/src/components/editor/EditorLayout.tsx`
- `front/src/components/editor/EditorCanvas.tsx`
- `front/src/components/editor/Histogram.tsx`
- `front/src/components/editor/AdjustmentPanel.tsx`
- `front/src/components/editor/AdjustmentSlider.tsx`
- `front/src/components/editor/Toolbar.tsx`
- `front/src/components/editor/Filmstrip.tsx`
- `front/src/components/editor/CurvesEditor.tsx`
- `front/src/components/editor/ColorWheel.tsx`

### Frontend (Create - Library)
- `front/src/components/library/LibraryLayout.tsx`
- `front/src/components/library/PhotoCard.tsx`
- `front/src/components/library/PhotoGrid.tsx`
- `front/src/components/library/ImportPanel.tsx`

### Frontend (Create - Core)
- `front/src/hooks/useGPURenderer.ts`
- `front/src/hooks/useImageProcessor.ts`
- `front/src/hooks/useHistory.ts`
- `front/src/hooks/useIndexedDB.ts`
- `front/src/stores/editorStore.ts`
- `front/src/stores/libraryStore.ts`
- `front/src/workers/rawDecoder.worker.ts`
- `front/src/workers/histogram.worker.ts`
- `front/src/shaders/webgpu/*.wgsl`
- `front/src/shaders/webgl/*.frag`
- `front/src/utils/rawDecoder.ts`
- `front/src/utils/colorSpace.ts`
- `front/src/utils/exifParser.ts`
- `front/src/utils/xmpWriter.ts`

### Frontend (Modify)
- `front/src/App.tsx` - Add editor route, update routing
- `front/src/api/index.ts` - Add photo API endpoints
- `front/src/types/index.ts` - Add photo and editor types
- `front/src/pages/HomePage.tsx` - Repurpose as Library view
- `front/src/pages/GalleryDetailPage.tsx` - Convert to photo detail/edit view

### Backend (Create)
- `src/main/java/com/rawchen/entity/Photo.java`
- `src/main/java/com/rawchen/entity/PhotoEdit.java`
- `src/main/java/com/rawchen/controller/PhotoController.java`
- `src/main/java/com/rawchen/service/PhotoService.java`
- `src/main/java/com/rawchen/mapper/PhotoMapper.java`

### Backend (Modify)
- `src/main/java/com/rawchen/PicchubApplication.java` - Rename to TwhaiApplication
- Keep existing: `SysUser`, `AuthController`, `SysConfig`

### Backend (Remove)
- `src/main/java/com/rawchen/entity/CardKey.java`
- `src/main/java/com/rawchen/entity/VipPackage.java`
- `src/main/java/com/rawchen/entity/Order.java`
- Related controllers and services for above entities

---

## Verification Plan

1. **RAW Loading Test**
   - Upload NEF, ARW, CR2, CR3, DNG files
   - Verify metadata extraction
   - Check thumbnail generation

2. **Adjustment Tests**
   - Apply each adjustment individually
   - Verify real-time preview at 60 FPS
   - Test undo/redo functionality

3. **Export Tests**
   - Export to JPEG, PNG, TIFF
   - Verify color accuracy
   - Check full-resolution output

4. **Performance Tests**
   - Load 50MP image
   - Verify smooth zooming/panning
   - Memory usage monitoring

---

## Implementation Priority (Based on MVP Scope: Complete Basic Editor)

### Phase 1: MVP Foundation (Priority 1)
1. **Basic RAW Loading**
   - LibRaw WASM integration
   - JPEG/PNG fallback for non-RAW files
   - Basic thumbnail generation
   
2. **Editor Layout**
   - Main canvas with zoom/pan
   - Right sidebar with adjustment panels
   - Top toolbar with undo/redo

3. **Light Panel (Full)**
   - Exposure slider
   - Contrast slider
   - Highlights slider
   - Shadows slider
   - Whites slider
   - Blacks slider
   - Point Curve editor

4. **Color Panel (Basic)**
   - White Balance dropdown (presets)
   - Temperature slider
   - Tint slider
   - Vibrance slider
   - Saturation slider

5. **History System**
   - Undo/Redo with Ctrl+Z / Ctrl+Shift+Z
   - Store only parameter changes

6. **Basic Export**
   - JPEG export with quality slider
   - Full resolution output

### Phase 2: Enhanced Features (Priority 2)
- Color Mixer (HSL adjustments)
- Color Grading wheels
- Effects panel (Texture, Clarity, Dehaze)
- Pyramid preview system
- XMP sidecar support

### Phase 3: Polish (Priority 3)
- Detail panel (Sharpening, Noise Reduction)
- Optics panel (Chromatic Aberration, Lens Correction)
- Filmstrip view
- Multi-photo editing
- Presets system
