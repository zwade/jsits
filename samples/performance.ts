import { Eval } from "../utils";
import { Parse } from "../parser";
import { Tokenize } from "../tokenizer";
import { Lex } from "../lexer";


type Expensive = Eval<`
    (limit) => {
        let rec = (x) => {
            if (x > limit) {
                return x;
            }

            return rec(x + 1);
        };

        return rec(0);
    }
`, [5]>
