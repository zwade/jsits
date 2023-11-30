import { Eval } from "../utils";

const factorial = <N extends number>(limit: N): Eval<`
    (limit) => {
        let rec = (val) => {
            if (val > limit) {
                return 1;
            }

            return val * rec(val + 1);
        };

        return rec(1);
    }
`, [N]> => {
    let rec = (val: number) => {
        if (val > limit) {
            return 0;
        }

        return val * rec(val + 1);
    };

    return rec(1) as any;
}

// Can compute up to 9, but TSServer complains after 6

const resultGood: 720 = factorial(6);
