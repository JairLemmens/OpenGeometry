use crate::bim::*;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TopologyCellData {
    pub faces: Vec<String>,
    pub dictionary: Dictionary,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct TopologyCell {
    pub(crate) uuid: String, 
    pub(crate) faces: Vec<Id>, 
    pub(crate) dictionary: Dictionary
}
