use openmaths::Vector3;
use wasm_bindgen::prelude::*;
use crate::spatial::workplane::WorkPlane;

const EPSILON: f64 = 1.0e-12;


pub fn dot_3d(a: &Vector3, b: &Vector3) -> f64 {a.x * b.x + a.y * b.y + a.z * b.z}

pub fn cross_product(a: Vector3, b: Vector3) -> Vector3{
    Vector3 {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    }
}

pub fn cross_2d(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {ax * by - ay * bx}

pub fn normalize_2d(v: (f64, f64)) -> (f64, f64) {
    let len = (v.0 * v.0 + v.1 * v.1).sqrt();

    if len > f64::EPSILON {
        (v.0 / len, v.1 / len)
    } else {
        (0.0, 0.0)
    }
}

pub fn normalize_3d(v: Vector3) -> Vector3 {
    let len = (v.x * v.x + v.y * v.y + v.z * v.z).sqrt();

    if len > f64::EPSILON {
        Vector3::new(v.x / len, v.y / len, v.z / len)
    } else {
        Vector3::new(0.0, 0.0, 0.0)
    }
}

pub fn offset_from_intersection(intersection: (f64, f64),origin: (f64, f64),normal: (f64, f64),) -> f64 {
    (intersection.0 - origin.0) * normal.0
    + (intersection.1 - origin.1) * normal.1
}

/// Projects a 3D world-space point into this work plane's 2D `(u, v)` coordinates.
/// The returned vector contains `(u, v)`, where `u` and `v` are the
/// coordinates along the work plane's local axes.
#[wasm_bindgen(js_name = projectToFrame)]
pub fn project_to_frame_js(work_plane: &WorkPlane, point: &Vector3) -> Vec<f64> {
    let (u, v) = project_to_frame(&work_plane, &point);
    vec![u, v]
}

pub fn project_vector_to_frame(work_plane: &WorkPlane,v: &Vector3) -> (f64, f64) {
    let u =v.x * work_plane.u_axis().x + v.y * work_plane.u_axis().y + v.z * work_plane.u_axis().z;
    let v_coord = v.x * work_plane.v_axis().x + v.y * work_plane.v_axis().y + v.z * work_plane.v_axis().z;
    (u, v_coord)
}

pub fn project_to_frame(work_plane: &WorkPlane,point: &Vector3,) -> (f64, f64) {
    let (dx, dy, dz) = (
        point.x - work_plane.origin().x,
        point.y - work_plane.origin().y,
        point.z - work_plane.origin().z,
    );

    let u = dx * work_plane.u_axis().x+ dy * work_plane.u_axis().y+ dz * work_plane.u_axis().z;

    let v = dx * work_plane.v_axis().x+ dy * work_plane.v_axis().y+ dz * work_plane.v_axis().z;

    (u, v)
}


#[wasm_bindgen(js_name = line_intersection)]
pub fn line_intersection_js(origin_a: Vector3, direction_a: Vector3, origin_b: Vector3, direction_b: Vector3, work_plane: Option<WorkPlane>) -> Option<Vector3> {
    let default_plane;
    let work_plane = match work_plane {
        Some(ref wp) => wp,
        None => {
            default_plane = WorkPlane::new(
                Vector3::new(0.0, 0.0, 0.0),
                Vector3::new(0.0, 0.0, 1.0),
                Vector3::new(1.0, 0.0, 0.0),
            );
            &default_plane
        }
    };
    line_intersection(&origin_a,&direction_a,&origin_b,&direction_b,work_plane)

}

fn line_intersection(origin_a: &Vector3, direction_a: &Vector3, origin_b: &Vector3, direction_b: &Vector3, work_plane: &WorkPlane) -> Option<Vector3> {   
    let a = project_to_frame(work_plane, origin_a);
    let b = project_to_frame(work_plane, origin_b);

    let u_axis = work_plane.u_axis();
    let v_axis = work_plane.v_axis();

    let da = (
        direction_a.x * u_axis.x + direction_a.y * u_axis.y + direction_a.z * u_axis.z,
        direction_a.x * v_axis.x + direction_a.y * v_axis.y + direction_a.z * v_axis.z,
    );

    let db = (
        direction_b.x * u_axis.x + direction_b.y * u_axis.y + direction_b.z * u_axis.z,
        direction_b.x * v_axis.x + direction_b.y * v_axis.y + direction_b.z * v_axis.z,
    );
    
    if da.0.abs() < EPSILON && da.1.abs() < EPSILON {return None;}
    if db.0.abs() < EPSILON && db.1.abs() < EPSILON {return None;}

    line_intersection_2d(a, da, b, db).map(|(u, v)| work_plane.lift_point(u, v))
}

/// Intersects two infinite 2D lines:
///
/// A + t * da
/// B + s * db
///
/// Returns None for parallel or coincident lines.
pub fn line_intersection_2d(a: (f64, f64),da: (f64, f64),b: (f64, f64),db: (f64, f64),) -> Option<(f64, f64)> {
    let denominator = cross_2d(da.0, da.1, db.0, db.1);
    if denominator.abs() < EPSILON {
        return None;
    }
    let q = (b.0 - a.0, b.1 - a.1);
    let t = cross_2d(q.0, q.1, db.0, db.1) / denominator;
    Some((a.0 + t * da.0,a.1 + t * da.1,))
}

#[wasm_bindgen(js_name = offsetPerSegments)]
pub fn offset_per_segments_js(corners: Vec<Vector3>, offsets: Vec<f64>, work_plane: Option<WorkPlane>) -> Result<Vec<Vector3>, JsValue> {
    let default_plane;
    let work_plane = match work_plane {
        Some(ref wp) => wp,
        None => {
            default_plane = WorkPlane::new(
                Vector3::new(0.0, 0.0, 0.0),
                Vector3::new(0.0, 0.0, 1.0),
                Vector3::new(1.0, 0.0, 0.0),
            );
            &default_plane
        }
    };
    let points: Vec<(f64, f64)> = corners
        .iter()
        .map(|point| project_to_frame(work_plane,point))
        .collect();
    let offset_points = offset_per_segments(&points,&offsets)?;
    let lifted_points: Vec<Vector3> = offset_points.iter().map(|&(u, v)| work_plane.lift_point(u, v)).collect();
    Ok(lifted_points)
}

#[wasm_bindgen(js_name = offsetPerSegments2d)]
pub fn offset_per_segments_2d_js(corners: Vec<f64>,offsets: Vec<f64>,) -> Result<Vec<f64>, JsValue> {
    if corners.len() % 2 != 0 {
        return Err(JsValue::from_str(
            "corners must contain pairs of coordinates",
        ));
    }

    let points: Vec<(f64, f64)> = corners
        .chunks_exact(2)
        .map(|p| (p[0], p[1]))
        .collect();

    let offset_points = offset_per_segments(&points, &offsets)?;

    Ok(offset_points
        .into_iter()
        .flat_map(|(u, v)| [u, v])
        .collect())
}

pub fn offset_per_segments(corners: &Vec<(f64, f64)>,offsets: &[f64]) -> Result<Vec<(f64, f64)>, JsValue> {
    if corners.len() != offsets.len() {
        return Err(JsValue::from_str(
            "corners and offsets must have the same length",
        ));
    }

    if corners.len() < 2 {
        return Err(JsValue::from_str(
            "at least two corners are required",
        ));
    }   

    let count = corners.len();

    // Calculate normalized edge tangents and their right-hand
    // perpendicular offset directions.
    let mut tangents = Vec::with_capacity(count);
    let mut offset_dirs = Vec::with_capacity(count);

    for n in 0..count {
        let n1 = (n + 1) % count;

        let dx = corners[n1].0 - corners[n].0;
        let dy = corners[n1].1 - corners[n].1;

        let length = (dx * dx + dy * dy).sqrt();

        if length < EPSILON {
            return Err(JsValue::from_str(
                "corners must not contain consecutive duplicate points",
            ));
        }

        let tx = dx / length;
        let ty = dy / length;

        tangents.push((tx, ty));

        // Same as Python:
        // tangents[:, ::-1] * [1, -1]
        //
        // (tx, ty) -> (ty, -tx)
        offset_dirs.push((ty, -tx));
    }

    let mut result = Vec::with_capacity(count);

    for n in 0..count {
        let n1 = (n + 1) % count;

        let offset_a = offsets[n];
        let offset_b = offsets[n1];

        let p1 = (
            corners[n].0 + offset_dirs[n].0 * offset_a,
            corners[n].1 + offset_dirs[n].1 * offset_a,
        );

        let p2 = (
            corners[n1].0 + offset_dirs[n1].0 * offset_b,
            corners[n1].1 + offset_dirs[n1].1 * offset_b,
        );

        let tangent_dot = tangents[n].0 * tangents[n1].0 + tangents[n].1 * tangents[n1].1;

        if tangent_dot > 0.9 {
            let p1 = (
                corners[n1].0 + offset_dirs[n].0 * offset_a,
                corners[n1].1 + offset_dirs[n].1 * offset_a,
            );
            // Nearly parallel edges: preserve both offset points.
            result.push((p1.0, p1.1));
            result.push((p2.0, p2.1));
        } else {
            // Intersect the two offset lines.
            if let Some((u, v)) = line_intersection_2d(p1,tangents[n],p2,tangents[n1]) {
                result.push((u,v));
            } else {
                return Err(JsValue::from_str("Failed intersection"));
            }
        }
    }

    Ok(result)
}

#[wasm_bindgen(js_name = ccwAngle)]
pub fn ccw_angle_js(vector: Vector3, work_plane: Option<WorkPlane>) -> f64 {
    let default_plane;
    let work_plane = match work_plane {
        Some(ref wp) => wp,
        None => {
            default_plane = WorkPlane::new(
                Vector3::new(0.0, 0.0, 0.0),
                Vector3::new(0.0, 0.0, 1.0),
                Vector3::new(1.0, 0.0, 0.0),
            );
            &default_plane
        }
    };

    ccw_angle(&vector, &work_plane)
}

pub fn ccw_angle(vector: &Vector3, work_plane: &WorkPlane) -> f64 {
    let normal = work_plane.normal();
    let ref_axis = work_plane.u_axis();

    let dot = vector.x * normal.x
        + vector.y * normal.y
        + vector.z * normal.z;

    let vp = Vector3::new(
        vector.x - dot * normal.x,
        vector.y - dot * normal.y,
        vector.z - dot * normal.z,
    );

    let y = normal.x * (ref_axis.y * vp.z - ref_axis.z * vp.y)
        + normal.y * (ref_axis.z * vp.x - ref_axis.x * vp.z)
        + normal.z * (ref_axis.x * vp.y - ref_axis.y * vp.x);

    let x = ref_axis.x * vp.x
        + ref_axis.y * vp.y
        + ref_axis.z * vp.z;

    let mut angle = y.atan2(x);

    if angle < 0.0 {angle += std::f64::consts::TAU;}

    angle
}

pub fn lift_points_with_offset(work_plane: &WorkPlane, points: &[(f64, f64)], offset: f64) -> Vec<Vector3> {
    let normal = work_plane.normal();
    points
        .iter()
        .map(|(u, v)| {
            let p = work_plane.lift_point(*u, *v);

            Vector3::new(
                p.x + normal.x * offset,
                p.y + normal.y * offset,
                p.z + normal.z * offset,
            )
        })
        .collect()
}
