// 2D collision world: axis-aligned boxes [x1, z1, x2, z2].
export const col = [];

// Segment vs AABB (slab method)
export function seg(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, b[0], b[2]], [az, dz, b[1], b[3]]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; }
    else {
      let a = (lo - p) / d, c = (hi - p) / d;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      if (t0 > t1) return false;
    }
  }
  return true;
}
export const los = (ax, az, bx, bz) => !col.some(b => seg(ax, az, bx, bz, b));

export function hit(x, z, r) {
  for (const b of col) {
    const cx = Math.max(b[0], Math.min(x, b[2])), cz = Math.max(b[1], Math.min(z, b[3]));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
  }
  return false;
}
export function move(o, dx, dz, r) {
  if (!hit(o.x + dx, o.z, r)) o.x += dx;
  if (!hit(o.x, o.z + dz, r)) o.z += dz;
}
export const angD = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
