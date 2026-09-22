import { Topology, TopologyFace, TopologyEdge} from '../topology/topology';
import {
    Vector3, 
    WorkPlane, 
    projectToFrame, 
    line_intersection, 
    offsetPerSegments, 
    buildLayerGeometry,  
    JointFaceRust,
    JointLayerRust,
    JointRust,
    JointTypeRust
} from "../../../opengeometry/pkg/opengeometry.js";


//MATERIAL
export interface ConstructionMaterialData {
    name: string;
    density: number;
    heat_transfer_coefficient: number;
    specific_heat_capacity: number;
    meta?: Record<string, unknown>;
}

export interface ConstructionMaterialOptions {
    uuid?: string;
    name: string;
    density: number;
    heat_transfer_coefficient: number;
    specific_heat_capacity: number;
    meta?: Record<string, unknown>;
}

export class ConstructionMaterial{
    readonly uuid: string;
    name: string;
    density: number;
    heat_transfer_coefficient: number;
    specific_heat_capacity: number;
    meta: Record<string, unknown>;
    
    constructor(options: ConstructionMaterialOptions){
            this.uuid = options.uuid ?? crypto.randomUUID();
            this.name = options.name;
            this.density = options.density;
            this.heat_transfer_coefficient = options.heat_transfer_coefficient;
            this.specific_heat_capacity = options.specific_heat_capacity;
            this.meta = options.meta ?? {};
        }
}

//COMPOSITE
export interface ConstructionCompositeData {
    name: string;
    part1: string;
    part2: string;
    part1_fraction: number;
    part2_fraction: number;
    meta?: Record<string, unknown>;
}

export interface ConstructionCompositeOptions {
    uuid?: string;
    name: string;
    part1: ConstructionMaterial | ConstructionComposite;
    part2: ConstructionMaterial | ConstructionComposite;
    part1_fraction: number;
    meta?: Record<string, unknown>;
}

export class ConstructionComposite {
    readonly uuid: string;
    name: string;
    part1: ConstructionMaterial | ConstructionComposite;
    part2: ConstructionMaterial | ConstructionComposite;
    part1_fraction: number;
    part2_fraction: number;
    meta: Record<string, unknown>;

    constructor(options: ConstructionCompositeOptions) {
        this.uuid = options.uuid ?? crypto.randomUUID();
        this.name = options.name;
        this.part1 = options.part1;
        this.part2 = options.part2;
        this.part1_fraction = options.part1_fraction;
        this.part2_fraction = 1 - this.part1_fraction;
        this.meta = options.meta ?? {};
    }

    get heat_transfer_coefficient(): number {
        return (
            this.part1_fraction * this.part1.heat_transfer_coefficient +
            this.part2_fraction * this.part2.heat_transfer_coefficient
        );
    }

    get specific_heat_capacity(): number {
        return (
            this.part1_fraction * this.part1.specific_heat_capacity +
            this.part2_fraction * this.part2.specific_heat_capacity
        );
    }

    get density(): number {
        return (
            this.part1_fraction * this.part1.density +
            this.part2_fraction * this.part2.density
        );
    }
}


//CONSTRUCTION LAYER
type JointType = "miter_joint" | "butt_joint";

export interface ConstructionLayerData {
    name: string;
    material: string;
    thickness: number;
    priority: number;
    joint_type: JointType;
    meta?: Record<string, unknown>;
}

export interface ConstructionLayerOptions {
    uuid?: string;
    name: string;
    material: ConstructionMaterial | ConstructionComposite;
    thickness: number;
    priority: number;
    joint_type: JointType;
    meta?: Record<string, unknown>;
}

export class ConstructionLayer{
    readonly uuid: string;
    name: string;
    material: ConstructionMaterial | ConstructionComposite;
    thickness: number;
    priority: number;
    joint_type: JointType;
    meta: Record<string, unknown>;
    
    constructor(options:ConstructionLayerOptions){
        this.uuid = options.uuid ?? crypto.randomUUID();
        this.name = options.name;
        this.material = options.material;
        this.thickness = options.thickness;
        this.priority = options.priority;
        this.joint_type = options.joint_type
        this.meta = options.meta ?? {};
    }
}


//LAYERGROUP
export interface LayerGroupData {
    name: string;
    layers: string[];
    layer_offsets: number[];
}

export interface LayerGroupOptions{
    uuid?: string;
    name: string;
    layers: ConstructionLayer[];
    layer_offsets: number[];
}

export class LayerGroup{
    readonly uuid: string;
    name: string;
    layers: ConstructionLayer[];
    layer_offsets: number[];
    constructor(options:LayerGroupOptions){
        this.uuid = options.uuid ?? crypto.randomUUID();
        this.name = options.name;
        this.layers = options.layers;
        this.layer_offsets = options.layer_offsets
    }
}

//CONSTRUCTIONSET
export interface ConstructionSetData {
    materials: Record<string, ConstructionMaterialData>;
    composites: Record<string, ConstructionCompositeData>;
    layers: Record<string, ConstructionLayerData>;
    layer_groups: Record<string, LayerGroupData>;
}


export class ConstructionSet {
    materials: Record<string, ConstructionMaterial>;
    composites: Record<string, ConstructionComposite>;
    layers: Record<string, ConstructionLayer>;
    layer_groups: Record<string, LayerGroup>;

    constructor(data: ConstructionSetData) {

        this.materials = {};
        this.composites = {};
        this.layers = {};
        this.layer_groups = {};

        for (const [uuid, materialData] of Object.entries(data.materials)) {
            this.materials[uuid] = new ConstructionMaterial({
                uuid,
                ...materialData
            });
        }

        for (const [uuid, compositeData] of Object.entries(data.composites)) {
            this.composites[uuid] = new ConstructionComposite({
                uuid,
                name: compositeData.name,
                part1: this.getMaterialOrComposite(compositeData.part1),
                part2: this.getMaterialOrComposite(compositeData.part2),
                part1_fraction: compositeData.part1_fraction,
                meta: compositeData.meta
            });
        }

        for (const [uuid, layerData] of Object.entries(data.layers)) {
            this.layers[uuid] = new ConstructionLayer({
                uuid,
                name: layerData.name,
                material: this.getMaterialOrComposite(layerData.material),
                thickness: layerData.thickness,
                priority: layerData.priority,
                joint_type: layerData.joint_type,
                meta: layerData.meta
            });
        }

        for (const [uuid, groupData] of Object.entries(data.layer_groups)) {
            this.layer_groups[uuid] = new LayerGroup({
                uuid,
                name: groupData.name,
                layers: groupData.layers.map(layerUuid => this.layers[layerUuid]),
                layer_offsets: groupData.layer_offsets
            });
        }
    }

    private getMaterialOrComposite(uuid: string): ConstructionMaterial | ConstructionComposite {
        if (this.materials[uuid]) {
            return this.materials[uuid];
        }
        if (this.composites[uuid]) {
            return this.composites[uuid];
        }
        throw new Error(`Unknown material or composite UUID: ${uuid}`);
    }

    public serialize(): ConstructionSetData {
        return {
            materials: Object.fromEntries(
                Object.entries(this.materials).map(([uuid, material]) => [
                    uuid,
                    {
                        name: material.name,
                        density: material.density,
                        heat_transfer_coefficient: material.heat_transfer_coefficient,
                        specific_heat_capacity: material.specific_heat_capacity,
                        meta: material.meta,
                    },
                ])
            ),

            composites: Object.fromEntries(
                Object.entries(this.composites).map(([uuid, composite]) => [
                    uuid,
                    {
                        name: composite.name,
                        part1: composite.part1.uuid,
                        part2: composite.part2.uuid,
                        part1_fraction: composite.part1_fraction,
                        part2_fraction: composite.part2_fraction,
                        meta: composite.meta,
                    },
                ])
            ),

            layers: Object.fromEntries(
                Object.entries(this.layers).map(([uuid, layer]) => [
                    uuid,
                    {
                        name: layer.name,
                        material: layer.material.uuid,
                        thickness: layer.thickness,
                        priority: layer.priority,
                        joint_type: layer.joint_type,
                        meta: layer.meta,
                    },
                ])
            ),

            layer_groups: Object.fromEntries(
                Object.entries(this.layer_groups).map(([uuid, group]) => [
                    uuid,
                    {
                        name: group.name,
                        layers: group.layers.map(layer => layer.uuid),
                        layer_offsets: group.layer_offsets,
                    },
                ])
            ),
        };
    }

    public saveConstructionSet(filename = "/construction.json") {
        const json = JSON.stringify(this.serialize(), null, 2);
        const blob = new Blob([json], { type: "application/json" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }
}

export async function loadConstructionSet(filename = '/construction.json'): Promise<ConstructionSet> {
    const response = await fetch(filename);
    if (!response.ok) {
        throw new Error(
            `Failed to load construction.json: ${response.status} ${response.statusText}`
        );
    }
    const constructionData = await response.json() as ConstructionSetData;
    return new ConstructionSet(constructionData);
}

//LAYEREDASSEMBLY
export interface LayeredAssemblyOptions {
    face: TopologyFace;
    layer_group: LayerGroup;
    meta?: Record<string, unknown>;
}

export interface LayerGeometry {
  outer: Vector3[];
  inner: Vector3[];
}

export class LayeredAssembly{
    face: TopologyFace;
    layer_group: LayerGroup;
    meta?: Record<string, unknown>;

    constructor(options: LayeredAssemblyOptions){
        this.face = options.face
        this.layer_group = options.layer_group;
        this.meta = options.meta ?? {}
    }

    get face_coords(): Vector3[]{
        return this.face.verts.map(vert =>{
            return new Vector3(vert.coords[0],vert.coords[1],vert.coords[2])
        })
    }

    get face_coords_2d(): Float64Array {
        return new Float64Array(this.face.verts.flatMap(vert =>
            Array.from(
                projectToFrame(this.frame,new Vector3(vert.coords[0],vert.coords[1],vert.coords[2]))
            )
        ));
    }

    get layer_geometric_data(): LayerGeometry[] {
        const thicknesses = new Float64Array(this.layer_group.layers.map(layer => layer.thickness));
        const offsets = new Float64Array(this.layer_group.layer_offsets)
     
        const layer_edge_offsets_flat = new Float64Array(this.face.layer_edge_offsets.flatMap(layer =>layer.flatMap(offsets => Array.from(offsets))));
        const polys = buildLayerGeometry(this.face_coords_2d,thicknesses,offsets,layer_edge_offsets_flat,this.frame);
        return polys
    }

    get frame(): WorkPlane{
        let vert = this.face.verts[0]
        let origin = new Vector3(vert.coords[0],vert.coords[1],vert.coords[2])
        let u = new Vector3(this.face.uvn[0][0],this.face.uvn[0][1],this.face.uvn[0][2])
        let normal = new Vector3(this.face.uvn[2][0],this.face.uvn[2][1],this.face.uvn[2][2])
        return(new WorkPlane(origin,normal,u))
    }
}

export function makeJoint(edge: TopologyEdge): JointRust {
    const p0 = new Vector3(...edge.verts[0].coords);
    const p1 = new Vector3(...edge.verts[1].coords);

    const origin = new Vector3((p0.x + p1.x) / 2,(p0.y + p1.y) / 2,(p0.z + p1.z) / 2,);
    const normal = new Vector3(p1.x - p0.x,p1.y - p0.y,p1.z - p0.z,);

    const frame = WorkPlane.fromOriginNormal(origin, normal);

    // Joint is built with `new` + `addFace`, since Vec<JointFace> can't be
    // passed straight into the wasm constructor.
    const joint = new JointRust(frame);

    for (const face of edge.faces) {
        if (!face.assembly) {throw new Error(`Initialize assemblies for face ${face.uuid}`);}

        const edge_idx = face.edges.indexOf(edge);
        if (edge_idx < 0) {throw new Error(`Edge ${edge.uuid} not found on face ${face.uuid}`);}

        const assembly = face.assembly;
        const group = assembly.layer_group;

        // JointFace is built with `new` + `addLayer`, same reasoning as above.
        const jointFace = new JointFaceRust(p0, p1, edge_idx, assembly.frame);

        group.layers.forEach((layer, index) => {
            const joint_type = layer.joint_type === "miter_joint" ? JointTypeRust.Miter : JointTypeRust.Butt;

            const jointLayer = new JointLayerRust(layer.thickness,group.layer_offsets[index],layer.priority,joint_type,);

            jointFace.addLayer(jointLayer);
        });

        joint.addFace(jointFace);
    }

    return joint;
}