import { BinOps, LexTokenValues, Tok } from "./tokens";

export type ParseTree =
    | { kind: "expression", value: ParseTree }
    | { kind: "number-literal", value: number }
    | { kind: "string-literal", value: string }
    | { kind: "bool-literal", value: boolean }
    | { kind: "assignment-word" }
    | { kind: "declaration-word" }
    | { kind: "conditional-word" }
    | { kind: "antecedent-word" }
    | { kind: "semicolon" }
    | { kind: "open-brace" }
    | { kind: "close-brace" }
    | { kind: "open-paren" }
    | { kind: "close-paren" }
    | { kind: "return-word" }
    | { kind: "comma" }
    | { kind: "arrow" }
    | { kind: "arrow-fn", args: ParseTree[], body: ParseTree }
    | { kind: "fn-header", args: ParseTree[] }
    | { kind: "conditional-header", condition: ParseTree }
    | { kind: "conditional", condition: ParseTree, body: ParseTree }
    | { kind: "antecedent", condition: ParseTree, trueCase: ParseTree, falseCase: ParseTree }
    | { kind: "comma-series", values: ParseTree[] } // Could be declaration args, function calls, or use of the comma operator
    | { kind: "return", value: ParseTree }
    | { kind: "token", value: string }
    | { kind: "binop-word", value: keyof BinOps }
    | { kind: "call", fn: ParseTree, args: ParseTree[] }
    | { kind: "binop", op: keyof BinOps, left: ParseTree, right: ParseTree }
    | { kind: "declaration", name: string, value: ParseTree }
    | { kind: "statement", value: ParseTree }
    | { kind: "statement-list", values: ParseTree[] }
    | { kind: "block", values: ParseTree[] }


type OperatorPrecedences = {
    "*":   { "1": true },
    "/":   { "1": true },
    "+":   { "1": true; "2": true },
    "-":   { "1": true; "2": true },
    "==":  { "1": true; "2": true; "3": true },
    "===": { "1": true; "2": true; "3": true },
    ">":   { "1": true; "2": true; "3": true },
    ">=":  { "1": true; "2": true; "3": true },
    "<":   { "1": true; "2": true; "3": true },
    "<=":  { "1": true; "2": true; "3": true },
    "||":  { "1": true; "2": true; "3": true, "4": true },
    "&&":  { "1": true; "2": true; "3": true, "4": true },
}

type ShouldShiftNewOp<Existing extends keyof BinOps, New extends keyof BinOps> =
    OperatorPrecedences[Existing] extends OperatorPrecedences[New] ?
        OperatorPrecedences[New] extends OperatorPrecedences[Existing] ? false : true :
        false;

export type Parse<Tokens extends Tok[], SR extends ParseTree[] = []> =
    // Start by doing fairly innocuous reductions
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            { kind: "assignment-word" },
            { kind: "token" },
            { kind: "declaration-word" },
            ...any[]
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "assignment-word" },
            { kind: "token", value: infer Name extends string },
            { kind: "declaration-word" },
            ...infer Rest extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "declaration", name: Name, value: Exp } }, ...Rest]
        > :
        never :
    // // Then, with fairly high priority manage the binop shift/reduce (so we can handle priority)
    [Tokens, SR] extends [
            [
                [string, "binop"],
                ...any[]
            ],
            [
                { kind: "expression" },
                { kind: "binop-word" },
                { kind: "expression" },
                ...any[]
            ]
        ] ?
        [Tokens, SR] extends [
            [
                [infer New extends keyof BinOps, "binop"],
                ...infer RestTok extends Tok[],
            ], [
                { kind: "expression", value: infer Right extends ParseTree },
                { kind: "binop-word", value: infer Existing extends keyof BinOps },
                { kind: "expression", value: infer Left extends ParseTree },
                ...infer RestSR extends ParseTree[]
            ]
        ] ?
        ShouldShiftNewOp<Existing, New> extends true ?
            Parse<RestTok, [{ kind: "binop-word", value: New }, ...SR]> :
            Parse<Tokens, [{ kind: "expression", value: { kind: "binop", op: Existing, left: Left, right: Right } }, ...RestSR]> :
        never :
    [Tokens, SR] extends [
            [
                // We treat function calls as having infinite priority
                [string, Exclude<LexTokenValues, "open-paren">],
                ...any[]
            ] | [],
            [
                { kind: "expression" },
                { kind: "binop-word" },
                { kind: "expression" },
                ...any[]
            ]
        ] ?
        SR extends [
            { kind: "expression", value: infer Right extends ParseTree },
            { kind: "binop-word", value: infer Existing extends keyof BinOps },
            { kind: "expression", value: infer Left extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ?
        Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "binop", op: Existing, left: Left, right: Right } }, ...RestSR]
        > :
        never :
    // Afterward, start reducing into statements
    SR extends [
            { kind: "expression" },
            { kind: "comma" },
            { kind: "expression" },
            ...any[],
        ] ?
        SR extends [
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "comma" },
            { kind: "expression", value: { kind: "comma-series", values: infer Exps extends ParseTree[] } },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "comma-series", values: [...Exps, Exp] } }, ...RestSR]
        > :
        SR extends [
            { kind: "expression", value: infer Exp2 extends ParseTree },
            { kind: "comma" },
            { kind: "expression", value: infer Exp1 extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "comma-series", values: [Exp1, Exp2] } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            { kind: "return-word" },
            ...any[],
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "return-word" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "return", value: Exp } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement" },
            { kind: "statement-list" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement", value: infer Exp extends ParseTree },
            { kind: "statement-list", values: infer Exps extends ParseTree[] },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement-list", values: [...Exps, Exp]}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-brace" },
            { kind: "statement-list" },
            { kind: "open-brace" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-brace" },
            { kind: "statement-list", values: infer Exps extends ParseTree[] },
            { kind: "open-brace" },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "block", values: Exps } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-brace" },
            { kind: "open-brace" },
            ...any[],
        ] ?
        SR extends [
            { kind: "close-brace" },
            { kind: "open-brace" },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "block", values: [] } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            ...any[],
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "statement", value: Exp }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "open-paren" },
            ...any[]
        ] ?
        SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "open-paren" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "fn-header", args: [] }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            ...any[]
        ] ?
        SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression", value: { kind: "comma-series", values: infer Args extends { kind: "token", value: string }[] } },
            { kind: "open-paren" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "fn-header", args: Args }, ...RestSR]
        > :
        SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends { kind: "token", value: string } },
            { kind: "open-paren" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "fn-header", args: [Arg] }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            { kind: "conditional-word" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends ParseTree },
            { kind: "open-paren" },
            { kind: "conditional-word" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "conditional-header", condition: Arg}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement-list" },
            { kind: "fn-header" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement-list", values: [infer Body extends ParseTree] },
            { kind: "fn-header", args: infer Args extends ParseTree[] },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "arrow-fn", args: Args, body: Body } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-paren" },
            { kind: "open-paren" },
            { kind: "expression" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-paren" },
            { kind: "open-paren" },
            { kind: "expression", value: infer Fn extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "call", fn: Fn, args: [] }}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            { kind: "expression" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: { kind: "comma-series", values: infer Args extends ParseTree[] } },
            { kind: "open-paren" },
            { kind: "expression", value: infer Fn extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "call", fn: Fn, args: Args }}, ...RestSR]
        > :
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends ParseTree },
            { kind: "open-paren" },
            { kind: "expression", value: infer Fn extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "call", fn: Fn, args: [Arg] }}, ...RestSR]
        > :
        never :
    [Tokens, SR] extends [
            [
                // Negative lookahead against `=`
                // We're trying to avoid over-optimizing if ... else ... chains
                [string, Exclude<LexTokenValues, "antecedent">],
                ...any[]
            ] | [],
            [
                { kind: "statement-list"},
                { kind: "conditional-header" },
                ...any[]
            ]
        ] ?
        SR extends[
            { kind: "statement-list", values: [infer Body extends ParseTree] },
            { kind: "conditional-header", condition: infer Condition extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "conditional", condition: Condition, body: Body } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement-list" },
            { kind: "antecedent-word" },
            { kind: "statement-list" },
            { kind: "conditional-header" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement-list", values: [infer FalseCase extends ParseTree] },
            { kind: "antecedent-word" },
            { kind: "statement-list", values: [infer TrueCase extends ParseTree] },
            { kind: "conditional-header", condition: infer Condition extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "antecedent", condition: Condition, trueCase: TrueCase, falseCase: FalseCase }}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement", value: infer Exp extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement-list", values: [Exp] }, ...RestSR]
        > :
        never :
    [Tokens, SR] extends [
            [
                // Negative lookahead against `=`
                [string, Exclude<LexTokenValues, "assignment">],
                ...any[]
            ],
            [
                { kind: "token" },
                ...any[]
            ]
        ] ?
        SR extends [
            infer Tok extends { kind: "token", value: string },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: Tok }, ...RestSR]
        > :
        never :
    // Then, shift in any new tokens
    Tokens extends [
            [string, "binop"],
            ...any[]
        ] ?
        Tokens extends [
            [infer Op extends keyof BinOps, "binop"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "binop-word", value: Op }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "digit"],
            ...any[]
        ] ?
        Tokens extends [
            [`${infer Num extends number}`, "digit"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "number-literal", value: Num } }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "bool"],
            ...any[]
        ] ?
        Tokens extends [
            [`${infer Bool extends boolean}`, "bool"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "bool-literal", value: Bool } }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "semicolon"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "semicolon"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "semicolon"}, ...SR]
        > :
        never :
    Tokens extends [
            [string, "token"],
            ...any[]
        ] ?
        Tokens extends [
            [infer Name extends string, "token"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "token", value: Name }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "string"],
            ...any[]
        ] ?
        Tokens extends [
            [`"${infer Str extends string}"` | `'${infer Str extends string}'`, "string"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "string-literal", value: Str } }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "assignment"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "assignment"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "assignment-word"}, ...SR]
        > :
        never :
    Tokens extends [
            [string, "declare"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "declare"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "declaration-word"}, ...SR]
        > :
        never :
    Tokens extends [
            [string, "open-brace"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "open-brace"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "open-brace" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "close-brace"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "close-brace"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "close-brace" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "open-paren"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "open-paren"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "open-paren" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "close-paren"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "close-paren"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "close-paren" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "ret"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "ret"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "return-word" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "comma"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "comma"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "comma" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "arrow"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "arrow"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "arrow" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "conditional"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "conditional"],
            ...infer RestTok extends Tok[]
        ] ? Parse<
            RestTok,
            [{ kind: "conditional-word" }, ...SR]
        > :
        never :
    Tokens extends [
            [string, "antecedent"],
            ...any[],
        ] ?
        Tokens extends [
            [string, "antecedent"],
            ...infer RestTok extends Tok[]
        ] ? Parse<
            RestTok,
            [{ kind: "antecedent-word" }, ...SR]
        > :
        never :
    [Tokens, SR] extends [[], [infer Res]] ? { kind: "success", program: Res } :
    { kind: "parse-error", tokens: Tokens, stack: SR }

