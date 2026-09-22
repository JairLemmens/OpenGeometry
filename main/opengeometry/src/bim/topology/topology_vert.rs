use crate::bim::*;
use openmaths::{Vector3};
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TopologyVertData {
    pub coords: [f64; 3],
    pub edges: Vec<String>,
    pub dictionary: Dictionary,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct TopologyVert {
    pub(crate) uuid: String, 
    pub coords: Vector3, 
    pub(crate) edges: Vec<Id>, 
    pub(crate) dictionary: Dictionary
}
