const BASE = (import.meta.env.VITE_MODEL_BASE_URL || import.meta.env.VITE_MODEL_API_BASE || '/api/models').replace(/\/$/, '');

function assetUrl(filename) {
  const encoded = filename.split('/').map(encodeURIComponent).join('/');
  return `${BASE}/${encoded}`;
}

export const MODEL_URLS = {
  skull:                    assetUrl('skull.glb'),
  trung_giay:               assetUrl('trung_giay.glb'),
  mitosis_animation:        assetUrl('mitosis_animation.glb'),
  mitosis_stages:           assetUrl('mitosis_stages.glb'),
  human_heart:              assetUrl('human_heart_3d.glb'),
  lungs:                    assetUrl('realistic_human_lungs.glb'),
};

export function modelUrl(key) {
  return MODEL_URLS[key] || key;
}
