use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use wasm_bindgen::prelude::*;
use crate::primitives::polygon::OGPolygon;

pub type Dictionary = HashMap<String, Value>;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash,Deserialize,Serialize)]
pub struct Id {
    pub(crate) index: u32,
    pub(crate) generation: u32,
}

#[wasm_bindgen]
impl Id {
    #[wasm_bindgen(constructor)]
    pub fn new(index:u32,generation:u32) -> Id {
        Id {index, generation}
    }
}

pub type EdgeOffsets = Vec<Vec<f64>>;

#[wasm_bindgen]
pub struct LayerGeometry {
    pub(crate) inner: OGPolygon,
    pub(crate) outer: OGPolygon,
}

#[wasm_bindgen]
impl LayerGeometry {
    #[wasm_bindgen(getter)]
    pub fn inner(&self) -> OGPolygon {
        self.inner.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn outer(&self) -> OGPolygon {
        self.outer.clone()
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConstructionRef {
    Uuid(String),
    Id(Id),
}


#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JointType {Miter, Butt, DoubleButt}