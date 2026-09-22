use crate::bim::*;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct ConstructionLayerGroupData {
    pub name: String,
    pub layers: Vec<String>,
    pub layer_offsets: Vec<f64>,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct ConstructionLayerGroup {
    pub(crate) uuid: String,
    pub(crate) name: String,
    pub(crate) layers: Vec<Id>,
    pub(crate) layer_offsets: Vec<f64>,
}

