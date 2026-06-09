declare module 'libraw-wasm' {
  interface LibRawIParams {
    width?: number;
    height?: number;
    image_width?: number;
    image_height?: number;
    raw_width?: number;
    raw_height?: number;
    camera_make?: string;
    camera_model?: string;
    iso_speed?: number;
    shutter?: number;
    aperture?: number;
    focal_len?: number;
    [key: string]: unknown;
  }

  interface LibRawImgOther {
    iso_speed?: number;
    shutter?: number;
    aperture?: number;
    focal_len?: number;
    timestamp?: string;
    [key: string]: unknown;
  }

  interface LibRawMemImage {
    data: Uint8Array;
    width?: number;
    height?: number;
    bpp?: number;  // bytes per pixel
    type?: number;
  }

  interface LibRawInstance {
    open(data: Uint8Array): void;
    unpack(): void;
    unpackThumb(): void;
    dcrawProcess(): void;
    getIParams(): LibRawIParams;
    getImgOther(): LibRawImgOther;
    getLensInfo?(): unknown;
    getMakernotes?(): unknown;
    getShootingInfo?(): unknown;
    dcrawMakeMemImage(): LibRawMemImage | null;
    dcrawMakeMemThumb(): LibRawMemImage | null;
  }

  interface LibRawConstructor {
    new (): LibRawInstance;
    initialize(): Promise<void>;
    version(): string;
    cameraList(): string[];
  }

  const LibRaw: LibRawConstructor;
  export default LibRaw;
}
