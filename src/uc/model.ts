import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type * as THREE from "three";
import { SRGBColorSpace, TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// 3D modeli yükler; model hazır olana kadar kare çekimini bekletir.
// 3D tuvalin (ThreeCanvas) DIŞINDA çağrılmalı: tuvalin içi ayrı bir React köküdür.
export const useModel = (file: string) => {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`3D model: ${file}`));
  useEffect(() => {
    new GLTFLoader().load(
      staticFile(file),
      (gltf) => setScene(gltf.scene),
      undefined,
      (err) => cancelRender(err),
    );
  }, [file]);
  useEffect(() => {
    if (scene) continueRender(handle);
  }, [scene, handle]);
  return scene;
};

// Uygulama ekran görüntüleri gibi dokular: 3D tuval kurulmadan ÖNCE yüklenir
// (tuvalin içinde sonradan yüklenen doku, o karenin çekiminde görünmez).
export const TEXTURES = new Map<string, THREE.Texture>();
export const useTextures = (files: string[]) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`dokular: ${files.join(", ")}`));
  useEffect(() => {
    Promise.all(
      files.map(
        (f) =>
          TEXTURES.get(f) ??
          new Promise<THREE.Texture>((res, rej) =>
            new TextureLoader().load(
              staticFile(f),
              (t) => {
                t.colorSpace = SRGBColorSpace;
                TEXTURES.set(f, t);
                res(t);
              },
              undefined,
              rej,
            ),
          ),
      ),
    )
      .then(() => setReady(true))
      .catch((e) => cancelRender(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.join("|")]);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready;
};
