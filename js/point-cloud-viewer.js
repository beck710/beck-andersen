/**
 * Point Cloud Viewer — Three.js PLY renderer with orbit controls.
 *
 * Requires Three.js loaded via import map in the HTML:
 *   <script type="importmap">
 *   {
 *     "imports": {
 *       "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js",
 *       "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.172.0/examples/jsm/"
 *     }
 *   }
 *   </script>
 */

import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CDN_BASE } from './config.js';

class PointCloudViewer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentCloud = null;
    this.loader = new PLYLoader();
    this.animationId = null;
    this.pointSize = 0.02;
    this.colorMode = 'vertex'; // 'vertex', 'height', 'solid'

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0a);
    this.container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    this.camera.position.set(0, 0, 5);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 100;

    // Touch support
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Resize handler
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);

    // Start render loop
    this.animate();
  }

  /**
   * Load a PLY file from the given URL.
   * Dispatches 'load-progress' custom events on the container.
   * Returns a Promise that resolves with the loaded Points object.
   */
  async loadPLY(url) {
    const fullUrl = url.startsWith('http') ? url : `${CDN_BASE}${url.startsWith('/') ? '' : '/'}${url}`;

    return new Promise((resolve, reject) => {
      this.loader.load(
        fullUrl,
        (geometry) => {
          // Remove existing cloud
          if (this.currentCloud) {
            this.scene.remove(this.currentCloud);
            this.currentCloud.geometry.dispose();
            this.currentCloud.material.dispose();
            this.currentCloud = null;
          }

          // Center geometry
          geometry.computeBoundingBox();
          geometry.center();

          // Determine if geometry has vertex colors
          const hasColors = geometry.hasAttribute('color');

          // Create material based on color mode
          const material = this.createMaterial(geometry, hasColors);

          this.currentCloud = new THREE.Points(geometry, material);
          this.scene.add(this.currentCloud);

          // Fit camera to the model
          this.fitCameraToObject(this.currentCloud);

          // Dispatch point count info
          const pointCount = geometry.attributes.position.count;
          this.container.dispatchEvent(
            new CustomEvent('cloud-loaded', {
              detail: {
                pointCount,
                hasColors,
                boundingBox: geometry.boundingBox
              }
            })
          );

          resolve(this.currentCloud);
        },
        (progress) => {
          const pct = progress.total > 0
            ? Math.round((progress.loaded / progress.total) * 100)
            : -1;
          this.container.dispatchEvent(
            new CustomEvent('load-progress', { detail: { percent: pct, loaded: progress.loaded } })
          );
        },
        (error) => {
          console.error('[PointCloudViewer] Load error:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Create a PointsMaterial based on the current color mode.
   */
  createMaterial(geometry, hasColors) {
    switch (this.colorMode) {
      case 'height': {
        // Color by Y position (height gradient)
        const positions = geometry.attributes.position;
        const count = positions.count;
        const colors = new Float32Array(count * 3);
        const box = geometry.boundingBox;
        const minY = box.min.y;
        const rangeY = box.max.y - minY || 1;

        for (let i = 0; i < count; i++) {
          const y = positions.getY(i);
          const t = (y - minY) / rangeY;
          // Blue (low) -> Cyan -> Green -> Yellow -> Red (high)
          const color = new THREE.Color();
          color.setHSL(0.7 - t * 0.7, 0.9, 0.5);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        return new THREE.PointsMaterial({
          size: this.pointSize,
          vertexColors: true,
          sizeAttenuation: true
        });
      }

      case 'solid':
        return new THREE.PointsMaterial({
          size: this.pointSize,
          color: 0xffffff,
          sizeAttenuation: true
        });

      case 'vertex':
      default:
        return new THREE.PointsMaterial({
          size: this.pointSize,
          vertexColors: hasColors,
          color: hasColors ? undefined : 0xffffff,
          sizeAttenuation: true
        });
    }
  }

  /**
   * Fit the camera so the entire object is visible.
   */
  fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2));

    this.camera.position.set(0, 0, distance * 1.5);
    this.camera.near = distance * 0.01;
    this.camera.far = distance * 10;
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Update point size on the current cloud.
   */
  setPointSize(size) {
    this.pointSize = size;
    if (this.currentCloud) {
      this.currentCloud.material.size = size;
    }
  }

  /**
   * Switch color mode and rebuild material.
   */
  setColorMode(mode) {
    this.colorMode = mode;
    if (this.currentCloud) {
      const geometry = this.currentCloud.geometry;
      const hasColors = geometry.hasAttribute('color');
      const oldMaterial = this.currentCloud.material;
      this.currentCloud.material = this.createMaterial(geometry, hasColors);
      oldMaterial.dispose();
    }
  }

  /**
   * Toggle auto-rotation.
   */
  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
  }

  /**
   * Animation loop.
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle window resize.
   */
  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Clean up resources.
   */
  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeHandler);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.currentCloud) {
      this.currentCloud.geometry.dispose();
      this.currentCloud.material.dispose();
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default PointCloudViewer;
