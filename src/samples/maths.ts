import { Eval } from "../utils";

const polynomial = <X extends number, Y extends number>(x: X, y: Y): Eval<`
    (x, y) => {
        if (y < 0 || x < 0) {
            return 0;
        }

        return 3*x*x + 2*x*y + 4*y;
    }
`, [X, Y]> => {
    if (y === 0) {
        return 0 as any;
    }

    return (3*x*x + 2*x*y + 4*y) as any;
}

export const firstResult = polynomial(5, 10);
export const secondResult = polynomial(10, 7);
export const noResult = polynomial(10, -4);
