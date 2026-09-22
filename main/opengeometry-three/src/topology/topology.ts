import { LayeredAssembly} from '../bim/bim';

//VERTS
interface TopologyVertData {
    coords: [number, number, number];
    edges: string[];
    dictionary: Record<string, unknown>;
}

export class TopologyVert {
    edges: TopologyEdge[] = [];

    constructor(
        public readonly uuid: string,
        public readonly coords: [number, number, number],
        public readonly dictionary: Record<string, unknown>,
    ) {}
}

//EDGES
interface TopologyEdgeData {
    verts: string[];
    faces: string[];
    dictionary: Record<string, unknown>;
}

export class TopologyEdge {
    verts: TopologyVert[] = [];
    faces: TopologyFace[] = [];

    constructor(
        public readonly uuid: string,
        public readonly dictionary: Record<string, unknown>,
    ) {}
}

//FACES
interface TopologyFaceData {
    cells: string[];
    edges: string[];
    verts: string[];
    construction: string;
    type: string;
    uvn: number[][];
    layer_edge_offsets: Float64Array[][];
    dictionary: Record<string, unknown>;
}

export class TopologyFace {
    cells: TopologyCell[] = [];
    assembly?: LayeredAssembly;
    constructor(
        public readonly uuid: string,
        public readonly verts: TopologyVert[],
        public readonly edges: TopologyEdge[],
        public readonly construction: string,
        public readonly type: string,
        public readonly uvn: number[][],
        public readonly layer_edge_offsets: Float64Array[][],
        public readonly dictionary: Record<string, unknown>,
    ) {}
}

//CELLS
interface TopologyCellData {
    faces: string[];
    dictionary: Record<string, unknown>;
}

export class TopologyCell {
    faces: TopologyFace[] = [];

    constructor(
        public readonly uuid: string,
        public readonly dictionary: Record<string, unknown>,
    ) {}
}

//TOPOLOGY
export interface TopologyData {
  verts: Record<string, TopologyVertData>;
  edges: Record<string, TopologyEdgeData>;
  faces: Record<string, TopologyFaceData>;
  cells: Record<string, TopologyCellData>;
}

export class Topology {
    verts: Record<string, TopologyVert>;
    edges: Record<string, TopologyEdge>;
    faces: Record<string, TopologyFace>;
    cells: Record<string, TopologyCell>;

    constructor(data: TopologyData) {
        this.verts = {};
        this.edges = {};
        this.faces = {};
        this.cells = {};

        for (const [uuid, vert] of Object.entries(data.verts)) {
            this.verts[uuid] = new TopologyVert(
                uuid,
                vert.coords,
                vert.dictionary,
            );
        }

        for (const [uuid, edge] of Object.entries(data.edges)) {
            this.edges[uuid] = new TopologyEdge(
                uuid,
                edge.dictionary,
            );

            this.edges[uuid].verts = edge.verts.map(
                vertUUID => this.verts[vertUUID]
            );
        }

        for (const [uuid, face] of Object.entries(data.faces)) {
            this.faces[uuid] = new TopologyFace(
                uuid,
                face.verts.map(uuid => this.verts[uuid]),
                face.edges.map(uuid => this.edges[uuid]),
                face.construction,
                face.type,
                face.uvn,
                face.layer_edge_offsets,
                face.dictionary,
            );
        }

        for (const [uuid, cell] of Object.entries(data.cells)) {
            this.cells[uuid] = new TopologyCell(
                uuid,
                cell.dictionary,
            );

            this.cells[uuid].faces = cell.faces.map(
                uuid => this.faces[uuid]
            );
        }

        this.buildTopology();
    }

    private buildTopology() {
        for (const edge of Object.values(this.edges)) {
            for (const vert of edge.verts) {
                vert.edges.push(edge);
            }
        }

        for (const face of Object.values(this.faces)) {
            for (const edge of face.edges) {
                edge.faces.push(face);
            }
        }

        for (const cell of Object.values(this.cells)) {
            for (const face of cell.faces) {
                face.cells.push(cell);
            }
        }
    }
    
    public serialize(): TopologyData {
        return {
            verts: Object.fromEntries(
                Object.entries(this.verts).map(([uuid, vert]) => [
                    uuid,
                    {
                        coords: vert.coords,
                        edges: vert.edges.map(edge => edge.uuid),
                        dictionary: vert.dictionary,
                    },
                ])
            ),

            edges: Object.fromEntries(
                Object.entries(this.edges).map(([uuid, edge]) => [
                    uuid,
                    {
                        verts: edge.verts.map(vert => vert.uuid),
                        faces: edge.faces.map(face => face.uuid),
                        dictionary: edge.dictionary,
                    },
                ])
            ),

            faces: Object.fromEntries(
                Object.entries(this.faces).map(([uuid, face]) => [
                    uuid,
                    {
                        cells: face.cells.map(cell => cell.uuid),
                        edges: face.edges.map(edge => edge.uuid),
                        verts: face.verts.map(vert => vert.uuid),
                        construction: face.construction,
                        type: face.type,
                        uvn: face.uvn,
                        layer_edge_offsets: face.layer_edge_offsets,
                        dictionary: face.dictionary,
                    },
                ])
            ),

            cells: Object.fromEntries(
                Object.entries(this.cells).map(([uuid, cell]) => [
                    uuid,
                    {
                        faces: cell.faces.map(face => face.uuid),
                        dictionary: cell.dictionary,
                    },
                ])
            ),
        };
    }
    public saveTopology(filename = "/topology.json") {
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

export async function loadTopology(filename = '/topology.json'): Promise<Topology> {
  const response = await fetch(filename);

  if (!response.ok) {
    throw new Error(
      `Failed to load geometry.json: ${response.status} ${response.statusText}`
    );
  }
  let topologyData = await response.json() as TopologyData
  return new Topology(topologyData);
}