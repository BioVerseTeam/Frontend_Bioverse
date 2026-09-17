const BASE = import.meta.env.VITE_MODEL_BASE_URL || '';

export const MODEL_URLS = {
  beaker:                   `${BASE}/beaker.glb`,
  glass_test_tube:          `${BASE}/glass_test_tube.glb`,
  lab_flask:                `${BASE}/lab_flask.glb`,
  phenol_bottle:            `${BASE}/phenol_bottle.glb`,
  phenol_body_bottle:       `${BASE}/phenol_body_bottle.glb`,
  phenol_pipette:           `${BASE}/phenol_pipette.glb`,
  phenol_bottle_meshed:     `${BASE}/phenolphthalein bottle 3d model (1).glb`,
  skull:                    `${BASE}/skull.glb`,
  trung_giay:               `${BASE}/trung_giay.glb`,
  mitosis_animation:        `${BASE}/mitosis_animation.glb`,
  mitosis_stages:           `${BASE}/mitosis_stages.glb`,
  human_heart:              `${BASE}/human_heart_3d.glb`,
  lungs:                    `${BASE}/realistic_human_lungs.glb`,
};

export function modelUrl(key) {
  return MODEL_URLS[key] || key;
}
