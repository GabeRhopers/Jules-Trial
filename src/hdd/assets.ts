// Loads the CC0 assets (Poly Haven textures, sky HDRI, a few models) once per browser tab, holding the
// render (delayRender) until they are ready, so every frame renders with the same materials.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const TEX = [
  "asphalt_02",
  "brushed_concrete",
  "red_brick_03",
  "grey_plaster_02",
  "brown_mud_02",
  "brown_mud_dry",
  "aerial_sand",
  "bicolour_gravel",
  "grass_path_2",
  "clean_pebbles",
  "coast_sand_rocks_02",
  "forest_leaves_02",
  "metal_plate",
] as const;
export type TexName = (typeof TEX)[number];
const MODELS = ["shrub_02", "fire_hydrant", "street_lamp_01", "concrete_road_barrier", "grass_medium_01"] as const;
export type ModelName = (typeof MODELS)[number];

export type TexSet = { diff: THREE.Texture; nor?: THREE.Texture; rough?: THREE.Texture };
export type Assets = { tex: Record<TexName, TexSet>; hdri: THREE.DataTexture; models: Record<ModelName, THREE.Group>; images: Record<TexName, HTMLImageElement> };

let promise: Promise<Assets> | null = null;
let loaded: Assets | null = null;

const loadAll = async (): Promise<Assets> => {
  const tl = new THREE.TextureLoader();
  const load = (url: string) => tl.loadAsync(url);
  const tex = {} as Record<TexName, TexSet>;
  const images = {} as Record<TexName, HTMLImageElement>;
  await Promise.all(
    TEX.map(async (t) => {
      const base = staticFile(`hdd/cc0/tex/${t}`);
      const [diff, nor, rough] = await Promise.all([load(`${base}_diff.jpg`), load(`${base}_nor.jpg`).catch(() => undefined), load(`${base}_rough.jpg`).catch(() => undefined)]);
      diff.colorSpace = THREE.SRGBColorSpace;
      for (const x of [diff, nor, rough]) {
        if (!x) continue;
        x.wrapS = THREE.RepeatWrapping;
        x.wrapT = THREE.RepeatWrapping;
        x.anisotropy = 8;
      }
      tex[t] = { diff, nor, rough };
      images[t] = diff.image as HTMLImageElement;
    }),
  );
  const hdri = await new RGBELoader().loadAsync(staticFile("hdd/cc0/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr"));
  hdri.mapping = THREE.EquirectangularReflectionMapping;
  const gl = new GLTFLoader();
  const models = {} as Record<ModelName, THREE.Group>;
  await Promise.all(
    MODELS.map(async (m) => {
      const g = await gl.loadAsync(staticFile(`hdd/cc0/models/${m}/${m}.gltf`));
      g.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      models[m] = g.scene;
    }),
  );
  return { tex, hdri, models, images };
};

/** Assets for this tab (null until loaded; the render is held until then) */
export const useAssets = (): Assets | null => {
  const [a, setA] = useState<Assets | null>(loaded);
  const [handle] = useState(() => (loaded ? null : delayRender("Loading CC0 assets", { timeoutInMilliseconds: 120000 })));
  useEffect(() => {
    if (loaded) {
      if (handle !== null) continueRender(handle);
      return;
    }
    promise ??= loadAll();
    promise.then((x) => {
      loaded = x;
      setA(x);
      if (handle !== null) continueRender(handle);
    });
  }, [handle]);
  return a;
};

/** A texture set with its own repeat (clones share the image) */
export const repeatTex = (s: TexSet, rx: number, ry: number): TexSet => {
  const c = (t?: THREE.Texture) => {
    if (!t) return undefined;
    const k = t.clone();
    k.repeat.set(rx, ry);
    k.needsUpdate = true;
    return k;
  };
  return { diff: c(s.diff)!, nor: c(s.nor), rough: c(s.rough) };
};
