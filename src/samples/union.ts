import { Eval } from "../utils";

export type PlusDistributes = Eval<`
    (x, y) => {
        return x + y;
    }
`, [
    1 | 2,
    3 | 4,
]>

export type TimesDistributes = Eval<`
    (x, y) => {
        return x * y;
    }
`, [
    1 | 2,
    3 | 4,
]>

export type Distribution = Eval<`
    (x) => {
        let test = (y) => {
            return 5 > y;
        };

        return test(x);
    }
`, [4 | 6]>