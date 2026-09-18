import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

// Minimal DOM shim for Three.js
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Read GLB as ArrayBuffer
const buffer = readFileSync('./trung_giay.glb');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  console.log('=== GLB Scene Hierarchy ===\n');
  
  function traverse(obj, depth = 0) {
    const indent = '  '.repeat(depth);
    const type = obj.type;
    const meshInfo = obj.isMesh ? ` [Mesh: vertices=${obj.geometry?.attributes?.position?.count || '?'}]` : '';
    const matInfo = obj.material ? ` (material: ${obj.material.name || 'unnamed'})` : '';
    console.log(`${indent}- ${obj.name || '(unnamed)'} (${type})${meshInfo}${matInfo}`);
    
    if (obj.children) {
      obj.children.forEach(child => traverse(child, depth + 1));
    }
  }
  
  traverse(gltf.scene);
  
  // Also list all mesh names
  console.log('\n=== All Mesh Names ===');
  gltf.scene.traverse((obj) => {
    if (obj.isMesh) {
      console.log(`  Mesh: "${obj.name}" | Material: "${obj.material?.name || 'unnamed'}" | Vertices: ${obj.geometry?.attributes?.position?.count || '?'}`);
    }
  });
}, (error) => {
  console.error('Error parsing GLB:', error);
});
