use crate::bim::*;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use openmaths::{Vector3};

#[derive(Serialize, Deserialize, Debug)]
pub struct TopologyEdgeData {
    pub verts: Vec<String>,
    pub faces: Vec<String>,
    pub dictionary: Dictionary,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct TopologyEdge {
    pub(crate) uuid: String, 
    pub(crate) verts: Vec<Id>, 
    pub(crate) faces: Vec<Id>, 
    pub(crate) dictionary: Dictionary
}

impl TopologyEdge{
    pub fn tangent(&self,topology:&Topology)->Vector3{
        let p0 = topology.vert(self.verts[0]).unwrap().coords;
        let p1 = topology.vert(self.verts[1]).unwrap().coords;
        let mut dir = Vector3::new(p1.x-p0.x,p1.y-p0.y,p1.z-p0.z);
        dir.normalize()
    }
}