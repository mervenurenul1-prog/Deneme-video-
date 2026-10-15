import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type * as THREE from "three";
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
