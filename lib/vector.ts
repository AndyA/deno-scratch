export type Vector = number[];

export type RadixSource = (prefix: Vector) => Vector;
export type Radix = RadixSource[];
export type CarryOut = {
  vector: Vector;
  prefix: Vector;
  carry: boolean;
};

const zeros = (vector: Vector): Vector => vector.map(() => 0);
const carry = (co: CarryOut): CarryOut => ({ ...co, carry: true });

export const snapNext = (
  vector: Vector,
  radix: Radix,
  prefix: Vector = [],
): CarryOut => {
  if (vector.length === 0) return { vector, prefix, carry: false };
  if (radix.length === 0) throw new Error(`Radix too small`);

  const [vh, ...vtail] = vector;
  const [rh, ...rtail] = radix;
  const point = rh(prefix);

  // Can't make progress so send it upstairs
  if (point.length === 0) return { vector, prefix, carry: true };

  let idx = point.findIndex((n) => n >= vh);

  const roll = (next: number) =>
    snapNext(zeros(vtail), rtail, [...prefix, next]);

  // Wrapped? Always carry
  if (idx < 0) return carry(roll(point[0]));

  // Incremented? Zero tail, no carry
  if (point[idx] > vh) return roll(point[idx]);

  // No increment at this level? Recurse and handle any carry
  let next = snapNext(vtail, rtail, [...prefix, point[idx]]);
  while (next.carry) {
    if (++idx === point.length) return carry(roll(point[0]));
    next = roll(point[idx]);
  }
  return next;
};

export const snapVector = (
  vector: Vector,
  radix: Radix,
): Vector | undefined => {
  const { prefix, carry } = snapNext(vector, radix);
  if (!carry) return prefix;
};
