use crate::bim::*;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use crate::spatial::workplane::WorkPlane;
use crate::primitives::polygon::{OGPolygon};

#[derive(Serialize, Deserialize, Debug)]
pub struct TopologyFaceData {
    pub verts: Vec<String>,
    pub edges: Vec<String>,
    pub cells: Vec<String>,
    pub construction: String,
    #[serde(rename = "type")]
    pub face_type: String,
    pub uvn: Vec<[f64; 3]>,
    pub dictionary: Dictionary,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct TopologyFace {
    pub(crate) uuid: String,
    pub(crate) verts: Vec<Id>,
    pub(crate) edges: Vec<Id>,
    pub(crate) cells: Vec<Id>,

    pub(crate) construction: ConstructionRef,

    #[serde(default)]
    pub(crate) layer_group_id: Option<Id>,

    #[serde(default)]
    pub(crate) inner_edge_offsets: EdgeOffsets,

    #[serde(default)]
    pub(crate) outer_edge_offsets: EdgeOffsets,

    pub(crate) face_type: String,
    pub(crate) frame: WorkPlane,
    pub(crate) dictionary: Dictionary,
}

impl TopologyFace {
    pub fn geometry(&self,topology: &Topology,construction_set: &ConstructionSet,) -> Result<Vec<LayerGeometry>, JsValue> {
        let layer_group_id = self
            .layer_group_id
            .ok_or_else(|| JsValue::from_str("Face has no layer group"))?;

        let layer_group = construction_set
            .layer_group(layer_group_id)
            .ok_or_else(|| JsValue::from_str("Layer group not found"))?;

        let layer_count = layer_group.layers.len();

        if self.inner_edge_offsets.len() != layer_count {
            return Err(JsValue::from_str(
                "inner_edge_offsets does not match layer count",
            ));
        }

        if self.outer_edge_offsets.len() != layer_count {
            return Err(JsValue::from_str(
                "outer_edge_offsets does not match layer count",
            ));
        }

        let corners = topology.face_coords_2d(self);

        let edge_count = corners.len();

        let mut geometry = Vec::with_capacity(layer_count);
        
        for (layer_index, layer_id) in layer_group.layers.iter().enumerate() {
            let layer = construction_set
                .layer(*layer_id)
                .ok_or_else(|| JsValue::from_str("Construction layer not found"))?;

            let inner_offsets = &self.inner_edge_offsets[layer_index];
            let outer_offsets = &self.outer_edge_offsets[layer_index];

            if inner_offsets.len() != edge_count {
                return Err(JsValue::from_str(
                    "inner edge offset count does not match face edge count",
                ));
            }

            if outer_offsets.len() != edge_count {
                return Err(JsValue::from_str(
                    "outer edge offset count does not match face edge count",
                ));
            }

            let z_in = layer_group.layer_offsets[layer_index];
            let z_out = z_in + layer.thickness;

            let inner_2d = offset_per_segments(
                &corners,
                inner_offsets,
            )?;

            let outer_2d = offset_per_segments(
                &corners,
                outer_offsets,
            )?;

            let mut inner = OGPolygon::new(self.uuid.clone());
            inner.add_vertices(
                lift_points_with_offset(
                    &self.frame,
                    &inner_2d,
                    z_in,
                ),
            )?;

            let mut outer = OGPolygon::new(self.uuid.clone());
            outer.add_vertices(
                lift_points_with_offset(
                    &self.frame,
                    &outer_2d,
                    z_out,
                ),
            )?;

            geometry.push(LayerGeometry {
                inner,
                outer,
            });
        }

        Ok(geometry)
    }
}