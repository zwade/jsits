# JavaScript in TypeScript (jsits)

Ready to commit crimes&trade; against your type system? Look no further than js-in-ts, the worlds first (probably (hopefully)) JavaScript interpreter written in TypeScript's type system!

## What?

What.

## Examples

```ts
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
```

## Getting started

```
yarn add jsits
```

## How does it work?

Blood, sweat, and arcane magiks. For full details, check out this writeup:

[dttw.tech/posts/zi_YFfq15](https://dttw.tech/posts/zi_YFfq15)

## Contributions?

Yeah, go for it! Just try not to make it too imperformant that the demos fail.

## Credits

Zach Wade <zach@dttw.tech> ([@zwad3](https://twitter.com/zwad3))