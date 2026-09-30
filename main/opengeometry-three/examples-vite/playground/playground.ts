import "../src/styles/theme.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import wasmUrl from "../../../opengeometry/pkg/opengeometry_bg.wasm?url";
import {WorkPlane, projectToFrame, line_intersection, offsetPerSegments, offsetPerSegments2d,Building,Topology,ConstructionSet,Id, JointType} from "../../../opengeometry/pkg/opengeometry.js";
import { OpenGeometry, Polygon, Vector3} from "opengeometry";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {createShapeOutlineMesh,disposeShapeOutlineMesh,ShapeOutlineMesh,} from "../../src/shapes/outline-utils";
import { OGPolygon } from "../../../opengeometry/pkg/opengeometry";
import {
  loftPolygonSections,
  type PolygonLoftOptions,
  type PolygonLoftPoint,
} from "../../src/operations/loft";
export class PolygonWrapper extends THREE.Mesh {
  polygon: OGPolygon;

  #outlineMesh: ShapeOutlineMesh | null = null;
  private _outlineEnabled = true;
  private _outlineColor = 0x000000;
  private _fatOutlines = false;
  private _outlineWidth = 1;

  constructor(
    polygon: OGPolygon,
    {
      color = 0x00ff00,
      outline = true,
      outlineColor = 0x000000,
      fatOutlines = false,
      outlineWidth = 1,
    }: {
      color?: number;
      outline?: boolean;
      outlineColor?: number;
      fatOutlines?: boolean;
      outlineWidth?: number;
    } = {}
  ) {
    super(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
      })
    );

    this.polygon = polygon;
    this._outlineColor = outlineColor;
    this._fatOutlines = fatOutlines;
    this._outlineWidth = outlineWidth;

    this.generateGeometry();
    this.outline = outline;
  }

  getAnchor() {
    const anchor = this.polygon.get_anchor();
    return new Vector3(anchor.x, anchor.y, anchor.z);
  }
  
  worldProfilePoints(): PolygonLoftPoint[] {
    const data = this.polygon.get_outline_geometry_buffer();

    const points: PolygonLoftPoint[] = [];

    for (let i = 0; i < data.length; i += 6) {
      points.push([data[i], data[i + 1], data[i + 2]]);
    }

    return points;
  }

  loftTo(other: PolygonWrapper, options: PolygonLoftOptions = {}) {
    if (!(other instanceof PolygonWrapper)) throw new Error("Polygon.loftTo requires another Polygon");

    return loftPolygonSections(
      
      [this.worldProfilePoints(), other.worldProfilePoints()],
      { color: 'green', },
    );
  }


  generateGeometry() {
    const positions = Array.from(this.polygon.get_geometry_buffer());

    const geometry = this.geometry as THREE.BufferGeometry;

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    if (!this._outlineEnabled) return;

    const outlinePositions = Array.from(
      this.polygon.get_outline_geometry_buffer()
    );

    if (!this.#outlineMesh) {
      this.outline = true;
      return;
    }

    if (this.#outlineMesh instanceof THREE.LineSegments) {
      const outlineGeometry =
        this.#outlineMesh.geometry as THREE.BufferGeometry;

      outlineGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(outlinePositions, 3)
      );

      outlineGeometry.computeBoundingBox();
      outlineGeometry.computeBoundingSphere();
      return;
    }

    const fatGeometry =
      this.#outlineMesh.geometry as LineSegmentsGeometry;

    fatGeometry.setPositions(outlinePositions);
  }

  set outline(enabled: boolean) {
    this._outlineEnabled = enabled;

    this.clearOutline();

    if (!enabled) return;

    const positions = Array.from(
      this.polygon.get_outline_geometry_buffer()
    );

    this.#outlineMesh = createShapeOutlineMesh({
      positions,
      color: this._outlineColor,
      fatOutlines: this._fatOutlines,
      outlineWidth: this._outlineWidth,
    });

    this.add(this.#outlineMesh);
  }

  get outline() {
    return this._outlineEnabled;
  }

  private clearOutline() {
    if (!this.#outlineMesh) return;

    this.remove(this.#outlineMesh);
    disposeShapeOutlineMesh(this.#outlineMesh);
    this.#outlineMesh = null;
  }

  dispose() {
    this.geometry.dispose();

    if (this.material instanceof THREE.Material) {
      this.material.dispose();
    }

    this.clearOutline();
  }
}

const app = document.getElementById("app");
if (!app) {
throw new Error("Missing #app container");
}

function mountStats() {
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = "fixed";
stats.dom.style.left = "12px";
stats.dom.style.bottom = "12px";
stats.dom.style.top = "auto";
stats.dom.style.zIndex = "1000";
document.body.appendChild(stats.dom);
return stats;
} 


async function main() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2ff);

    const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(25, 10, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const app = document.getElementById("app")!;
    app.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.2, 0);
    controls.update();

    scene.add(new THREE.GridHelper(20, 20, 0x4460ff, 0xd5ddff));
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(6, 8, 4);
    scene.add(light);

    const stats = mountStats();

    await OpenGeometry.create({ wasmURL: wasmUrl });

    let topology_response = await fetch("/topology.json");
    if (!topology_response.ok) {
        throw new Error(
            `Failed to load geometry.json: ${topology_response.status} ${topology_response.statusText}`
        );
    }

    let construction_response = await fetch("/construction.json");
    if (!construction_response.ok) {
        throw new Error(
            `Failed to load geometry.json: ${construction_response.status} ${construction_response.statusText}`
        );
    }

    const building = new Building(await topology_response.text(),await construction_response.text())
    building.solve_joints()
    console.log(building.face_ids().length)
    for (const face_id of building.face_ids()) {
      let layer_geom;

      try {
          layer_geom = building.layer_geometry(face_id);
      } catch (err) {
          console.error("layer_geometry failed for face:", face_id, err);
          continue;
      }

      for (const poly of layer_geom) {
          try {
              //scene.add(new )
              let inside =new PolygonWrapper(poly.inner)
              try {
                  let outside = new PolygonWrapper(poly.outer)
                  
                  scene.add(inside.loftTo(outside));
              } catch (err) {
                  console.error(err)
                  //console.error("outer polygon failed:", face_id, poly.outer, err);
              }
          } catch (err) {
              console.error("inner polygon failed:", face_id, poly.inner, err);
          }

         
      }
  }

    
    renderer.setAnimationLoop(() => {
        stats.update();
        controls.update();
        renderer.render(scene, camera);
    });

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// void main();
main().catch((err) => {
    console.error("main failed:", err);
});